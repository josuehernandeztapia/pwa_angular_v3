-- DELIVERY ETA PERSISTENCE SCHEMA FOR NEON DATABASE
-- Implements delivery tracking and ETA persistence for 77-day delivery cycle
-- Integrates with existing post-sales schema

-- Main delivery orders table
CREATE TABLE IF NOT EXISTS delivery_orders (
  id TEXT PRIMARY KEY, -- DO-xxxx format
  contract_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  route_id TEXT,
  market TEXT CHECK (market IN ('AGS', 'EdoMex')) NOT NULL,
  sku TEXT NOT NULL, -- Vehicle model (CON_asientos vs SIN_asientos)
  qty INTEGER NOT NULL DEFAULT 1,
  status TEXT CHECK (status IN (
    'PO_ISSUED', 'IN_PRODUCTION', 'READY_AT_FACTORY',
    'AT_ORIGIN_PORT', 'ON_VESSEL', 'AT_DEST_PORT',
    'IN_CUSTOMS', 'RELEASED', 'AT_WH',
    'READY_FOR_HANDOVER', 'DELIVERED'
  )) NOT NULL DEFAULT 'PO_ISSUED',
  eta TIMESTAMP, -- Calculated ETA based on current status
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Additional tracking info
  container_number TEXT,
  bill_of_lading TEXT,
  estimated_transit_days INTEGER NOT NULL DEFAULT 77,
  actual_transit_days INTEGER, -- When completed
  
  -- Contract and financial info
  contract_signed_at TIMESTAMP,
  contract_amount NUMERIC(12,2),
  enganche_percentage NUMERIC(5,2),
  enganche_paid NUMERIC(12,2)
);

-- ETA calculation history - tracks how ETAs change over time
CREATE TABLE IF NOT EXISTS delivery_eta_history (
  id SERIAL PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  previous_eta TIMESTAMP,
  new_eta TIMESTAMP NOT NULL,
  status_when_calculated TEXT NOT NULL,
  calculation_method TEXT CHECK (calculation_method IN ('automatic', 'manual', 'delay_adjustment')) NOT NULL DEFAULT 'automatic',
  delay_reason TEXT, -- If ETA was extended due to delays
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  calculated_by TEXT, -- User who triggered manual recalculation
  
  FOREIGN KEY (delivery_id) REFERENCES delivery_orders(id) ON DELETE CASCADE
);

-- Delivery events log - tracks all status transitions
CREATE TABLE IF NOT EXISTS delivery_events (
  id SERIAL PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  event_at TIMESTAMP NOT NULL DEFAULT NOW(),
  event TEXT CHECK (event IN (
    'ISSUE_PO', 'START_PROD', 'FACTORY_READY', 'LOAD_ORIGIN',
    'DEPART_VESSEL', 'ARRIVE_DEST', 'CUSTOMS_CLEAR', 'RELEASE',
    'ARRIVE_WH', 'SCHEDULE_HANDOVER', 'CONFIRM_DELIVERY'
  )) NOT NULL,
  from_status TEXT,
  to_status TEXT,
  
  -- Event-specific metadata
  metadata JSONB DEFAULT '{}', -- Contains containerNumber, portName, vesselName, etc.
  notes TEXT,
  
  -- Actor who triggered the event
  actor_role TEXT CHECK (actor_role IN ('admin', 'ops', 'advisor', 'client')) NOT NULL,
  actor_name TEXT,
  actor_id TEXT,
  
  FOREIGN KEY (delivery_id) REFERENCES delivery_orders(id) ON DELETE CASCADE
);

-- Delivery delays and issues tracking
CREATE TABLE IF NOT EXISTS delivery_delays (
  id SERIAL PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  delay_type TEXT CHECK (delay_type IN (
    'production_delay', 'shipping_delay', 'customs_delay',
    'weather_delay', 'port_congestion', 'documentation_delay', 'other'
  )) NOT NULL,
  estimated_delay_days INTEGER NOT NULL,
  actual_delay_days INTEGER,
  delay_reason TEXT NOT NULL,
  impact_on_eta TIMESTAMP, -- How this affects the ETA
  reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  FOREIGN KEY (delivery_id) REFERENCES delivery_orders(id) ON DELETE CASCADE
);

-- Routes configuration for market-specific delivery
CREATE TABLE IF NOT EXISTS delivery_routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT CHECK (market IN ('AGS', 'EdoMex')) NOT NULL,
  origin_port TEXT NOT NULL,
  destination_port TEXT NOT NULL,
  estimated_days INTEGER NOT NULL DEFAULT 77,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Client delivery preferences and contact info
CREATE TABLE IF NOT EXISTS delivery_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  route_id TEXT,
  market TEXT CHECK (market IN ('AGS', 'EdoMex')) NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  delivery_address TEXT,
  preferred_delivery_time TEXT, -- 'morning', 'afternoon', 'evening'
  delivery_instructions TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY (route_id) REFERENCES delivery_routes(id)
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_eta ON delivery_orders(eta);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_client_id ON delivery_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_market ON delivery_orders(market);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_at ON delivery_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_delivery_eta_history_delivery_id ON delivery_eta_history(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_eta_history_calculated_at ON delivery_eta_history(calculated_at);

CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_id ON delivery_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_event_at ON delivery_events(event_at);
CREATE INDEX IF NOT EXISTS idx_delivery_events_event ON delivery_events(event);

CREATE INDEX IF NOT EXISTS idx_delivery_delays_delivery_id ON delivery_delays(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_delays_reported_at ON delivery_delays(reported_at);

CREATE INDEX IF NOT EXISTS idx_delivery_routes_market ON delivery_routes(market);
CREATE INDEX IF NOT EXISTS idx_delivery_clients_market ON delivery_clients(market);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_delivery_orders_updated_at 
  BEFORE UPDATE ON delivery_orders 
  FOR EACH ROW EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER update_delivery_clients_updated_at 
  BEFORE UPDATE ON delivery_clients 
  FOR EACH ROW EXECUTE FUNCTION update_delivery_updated_at();

-- Function to calculate ETA based on current status and historical data
CREATE OR REPLACE FUNCTION calculate_delivery_eta(
  p_delivery_id TEXT,
  p_current_status TEXT,
  p_created_at TIMESTAMP DEFAULT NOW()
) RETURNS TIMESTAMP AS $$
DECLARE
  eta_result TIMESTAMP;
  base_days INTEGER;
  status_progress INTEGER;
  remaining_days INTEGER;
BEGIN
  -- Status progression and estimated days mapping
  base_days := 77; -- Standard 77-day cycle
  
  status_progress := CASE p_current_status
    WHEN 'PO_ISSUED' THEN 0
    WHEN 'IN_PRODUCTION' THEN 0
    WHEN 'READY_AT_FACTORY' THEN 30
    WHEN 'AT_ORIGIN_PORT' THEN 35
    WHEN 'ON_VESSEL' THEN 35
    WHEN 'AT_DEST_PORT' THEN 65
    WHEN 'IN_CUSTOMS' THEN 65
    WHEN 'RELEASED' THEN 75
    WHEN 'AT_WH' THEN 77
    WHEN 'READY_FOR_HANDOVER' THEN 77
    WHEN 'DELIVERED' THEN 77
    ELSE 0
  END;
  
  remaining_days := base_days - status_progress;
  
  -- Calculate ETA from creation date plus remaining days
  eta_result := p_created_at + (remaining_days || ' days')::INTERVAL;
  
  -- Adjust for delays if any exist
  SELECT eta_result + COALESCE(SUM(estimated_delay_days), 0) * INTERVAL '1 day'
  INTO eta_result
  FROM delivery_delays 
  WHERE delivery_id = p_delivery_id AND resolved_at IS NULL;
  
  RETURN eta_result;
END;
$$ LANGUAGE plpgsql;

-- Function to update ETA when status changes
CREATE OR REPLACE FUNCTION update_delivery_eta()
RETURNS TRIGGER AS $$
DECLARE
  new_eta TIMESTAMP;
  old_eta TIMESTAMP;
BEGIN
  -- Calculate new ETA based on current status
  new_eta := calculate_delivery_eta(NEW.id, NEW.status, NEW.created_at);
  old_eta := OLD.eta;
  
  -- Update the ETA in the delivery order
  NEW.eta := new_eta;
  
  -- Log the ETA change in history
  IF old_eta IS DISTINCT FROM new_eta THEN
    INSERT INTO delivery_eta_history (
      delivery_id, previous_eta, new_eta, status_when_calculated, calculation_method
    ) VALUES (
      NEW.id, old_eta, new_eta, NEW.status, 'automatic'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update ETA when status changes
CREATE TRIGGER trigger_update_delivery_eta
  BEFORE UPDATE OF status ON delivery_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_delivery_eta();

-- Function to log delivery status transitions
CREATE OR REPLACE FUNCTION log_delivery_event()
RETURNS TRIGGER AS $$
DECLARE
  event_name TEXT;
BEGIN
  -- Map status transitions to events
  event_name := CASE NEW.status
    WHEN 'IN_PRODUCTION' THEN 'START_PROD'
    WHEN 'READY_AT_FACTORY' THEN 'FACTORY_READY'
    WHEN 'AT_ORIGIN_PORT' THEN 'LOAD_ORIGIN'
    WHEN 'ON_VESSEL' THEN 'DEPART_VESSEL'
    WHEN 'AT_DEST_PORT' THEN 'ARRIVE_DEST'
    WHEN 'IN_CUSTOMS' THEN 'CUSTOMS_CLEAR'
    WHEN 'RELEASED' THEN 'RELEASE'
    WHEN 'AT_WH' THEN 'ARRIVE_WH'
    WHEN 'READY_FOR_HANDOVER' THEN 'SCHEDULE_HANDOVER'
    WHEN 'DELIVERED' THEN 'CONFIRM_DELIVERY'
    ELSE 'STATUS_CHANGE'
  END;
  
  -- Insert event log
  INSERT INTO delivery_events (
    delivery_id, event, from_status, to_status, actor_role
  ) VALUES (
    NEW.id, event_name, OLD.status, NEW.status, 'ops' -- Default to ops, can be overridden by application
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log events automatically
CREATE TRIGGER trigger_log_delivery_event
  AFTER UPDATE OF status ON delivery_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_delivery_event();

-- Views for common queries
CREATE OR REPLACE VIEW delivery_status_summary AS
SELECT 
  d.id,
  d.client_id,
  d.client_name,
  d.market,
  d.sku,
  d.status,
  d.eta,
  d.created_at,
  d.estimated_transit_days,
  d.actual_transit_days,
  EXTRACT(DAY FROM (d.eta - NOW())) as days_until_eta,
  CASE 
    WHEN d.status = 'DELIVERED' THEN 'completed'
    WHEN d.eta < NOW() THEN 'overdue'
    WHEN d.eta < NOW() + INTERVAL '7 days' THEN 'urgent'
    WHEN d.eta < NOW() + INTERVAL '30 days' THEN 'upcoming'
    ELSE 'scheduled'
  END as eta_urgency,
  (SELECT COUNT(*) FROM delivery_delays dd WHERE dd.delivery_id = d.id AND dd.resolved_at IS NULL) as active_delays
FROM delivery_orders d;

CREATE OR REPLACE VIEW delivery_performance_metrics AS
SELECT
  market,
  COUNT(*) as total_deliveries,
  COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as completed_deliveries,
  COUNT(CASE WHEN eta < NOW() AND status != 'DELIVERED' THEN 1 END) as overdue_deliveries,
  AVG(CASE WHEN actual_transit_days IS NOT NULL THEN actual_transit_days END) as avg_actual_transit_days,
  AVG(estimated_transit_days) as avg_estimated_transit_days,
  COUNT(CASE WHEN actual_transit_days <= estimated_transit_days THEN 1 END) as on_time_deliveries,
  ROUND(
    (COUNT(CASE WHEN actual_transit_days <= estimated_transit_days THEN 1 END)::DECIMAL / 
     NULLIF(COUNT(CASE WHEN actual_transit_days IS NOT NULL THEN 1 END), 0)) * 100, 2
  ) as on_time_percentage
FROM delivery_orders
GROUP BY market;

-- Seed data for routes
INSERT INTO delivery_routes (id, name, market, origin_port, destination_port, estimated_days) VALUES
('route_ags_001', 'Aguascalientes Standard Route', 'AGS', 'Shanghai Port', 'Puerto de Manzanillo', 77),
('route_edomex_001', 'Estado de México Standard Route', 'EdoMex', 'Shanghai Port', 'Puerto de Veracruz', 77)
ON CONFLICT (id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE delivery_orders IS 'Main delivery orders table with ETA tracking for 77-day delivery cycle';
COMMENT ON TABLE delivery_eta_history IS 'Historical record of ETA changes and calculations';
COMMENT ON TABLE delivery_events IS 'Log of all delivery status transitions and events';
COMMENT ON TABLE delivery_delays IS 'Tracking of delays and their impact on delivery ETAs';
COMMENT ON TABLE delivery_routes IS 'Configuration of delivery routes by market';
COMMENT ON TABLE delivery_clients IS 'Client information and delivery preferences';

COMMENT ON FUNCTION calculate_delivery_eta IS 'Calculates ETA based on current status and delays';
COMMENT ON FUNCTION update_delivery_eta IS 'Automatically updates ETA when status changes';
COMMENT ON FUNCTION log_delivery_event IS 'Logs delivery events when status transitions occur';