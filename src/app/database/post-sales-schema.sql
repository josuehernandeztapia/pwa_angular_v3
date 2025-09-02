-- POST-SALES DATABASE SCHEMA FOR NEON
-- Implements complete post-sales system as specified

-- Expediente postventa (uno por VIN)
CREATE TABLE IF NOT EXISTS post_sales_record (
  id SERIAL PRIMARY KEY,
  vin TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL,
  post_sales_agent TEXT,
  warranty_status TEXT CHECK (warranty_status IN ('active','expired')) DEFAULT 'active',
  service_package TEXT CHECK (service_package IN ('basic','premium','extended')) DEFAULT 'basic',
  next_maintenance_date DATE,
  next_maintenance_km INTEGER,
  odometer_km_delivery INTEGER NOT NULL,
  warranty_start DATE NOT NULL,
  warranty_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Servicios realizados / tickets
CREATE TABLE IF NOT EXISTS post_sales_service (
  id SERIAL PRIMARY KEY,
  vin TEXT NOT NULL,
  service_type TEXT CHECK (service_type IN ('mantenimiento','reparacion','garantia','revision')) NOT NULL,
  service_date DATE NOT NULL,
  odometer_km INTEGER,
  description TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  technician TEXT,
  customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
  service_time_minutes INTEGER DEFAULT 0,
  notes TEXT,
  photos JSON, -- Array de URLs
  parts_used JSON, -- Array de ServicePart objects
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Contactos / encuestas
CREATE TABLE IF NOT EXISTS post_sales_contact (
  id SERIAL PRIMARY KEY,
  vin TEXT NOT NULL,
  contact_date TIMESTAMP NOT NULL DEFAULT NOW(),
  channel TEXT CHECK (channel IN ('whatsapp','sms','email','phone')) NOT NULL,
  purpose TEXT CHECK (purpose IN ('delivery','30_days','90_days','6_months','12_months','maintenance_reminder','warranty_claim')) NOT NULL,
  outcome TEXT CHECK (outcome IN ('sent','answered','escalated','no_response')) DEFAULT 'sent',
  mensaje TEXT,
  respuesta_cliente TEXT,
  notes TEXT,
  programar_seguimiento TIMESTAMP,
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Recordatorios programados
CREATE TABLE IF NOT EXISTS maintenance_reminder (
  id SERIAL PRIMARY KEY,
  vin TEXT NOT NULL,
  due_date DATE NOT NULL,
  due_km INTEGER NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'mantenimiento',
  reminder_30d_sent BOOLEAN DEFAULT FALSE,
  reminder_15d_sent BOOLEAN DEFAULT FALSE,
  reminder_7d_sent BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  scheduled_service TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Ingresos por post-venta (opcional pero útil para analytics)
CREATE TABLE IF NOT EXISTS post_sales_revenue (
  id SERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  vin TEXT NOT NULL,
  service_revenue NUMERIC(12,2) DEFAULT 0,
  parts_revenue NUMERIC(12,2) DEFAULT 0,
  warranty_work NUMERIC(12,2) DEFAULT 0,
  profit_margin NUMERIC(5,2) DEFAULT 0, -- Percentage
  ltv NUMERIC(12,2) DEFAULT 0, -- Customer Lifetime Value
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Respuestas de encuestas de satisfacción
CREATE TABLE IF NOT EXISTS post_sales_survey_response (
  id SERIAL PRIMARY KEY,
  vin TEXT NOT NULL,
  client_id TEXT NOT NULL,
  survey_type TEXT CHECK (survey_type IN ('delivery','30_days','90_days','6_months','12_months','service_satisfaction')) NOT NULL,
  respuestas JSON NOT NULL, -- Object with question-answer pairs
  nps INTEGER CHECK (nps BETWEEN 0 AND 10), -- Net Promoter Score
  csat INTEGER CHECK (csat BETWEEN 1 AND 5), -- Customer Satisfaction Score
  comentarios TEXT,
  completed_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Archivos y documentos relacionados con entrega
CREATE TABLE IF NOT EXISTS delivery_documents (
  id SERIAL PRIMARY KEY,
  vin TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('factura','poliza_seguro','endoso','contrato','tarjeta_circulacion','foto_vehiculo','firma_digital','foto_placas')) NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER DEFAULT 0, -- bytes
  file_type TEXT CHECK (file_type IN ('pdf','image','document')) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by TEXT, -- ID del usuario que subió
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Datos específicos de entrega (Fase 6)
CREATE TABLE IF NOT EXISTS delivery_data (
  id SERIAL PRIMARY KEY,
  vin TEXT UNIQUE NOT NULL,
  odometro_entrega INTEGER NOT NULL,
  fecha_entrega DATE NOT NULL,
  hora_entrega TIME NOT NULL,
  domicilio_entrega TEXT NOT NULL,
  checklist_entrega JSON, -- Array de DeliveryChecklistItem
  incidencias JSON, -- Array de strings
  entregado_por TEXT NOT NULL, -- ID del asesor
  firma_digital_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Datos legales (Fase 7)
CREATE TABLE IF NOT EXISTS legal_transfer_data (
  id SERIAL PRIMARY KEY,
  vin TEXT UNIQUE NOT NULL,
  fecha_transferencia DATE NOT NULL,
  proveedor_seguro TEXT NOT NULL,
  duracion_poliza INTEGER NOT NULL, -- meses
  titular TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Datos de placas (Fase 8)
CREATE TABLE IF NOT EXISTS plates_data (
  id SERIAL PRIMARY KEY,
  vin TEXT UNIQUE NOT NULL,
  numero_placas TEXT UNIQUE NOT NULL,
  estado TEXT NOT NULL,
  fecha_alta DATE NOT NULL,
  hologramas BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (vin) REFERENCES post_sales_record(vin) ON DELETE CASCADE
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_post_sales_record_client_id ON post_sales_record(client_id);
CREATE INDEX IF NOT EXISTS idx_post_sales_record_vin ON post_sales_record(vin);
CREATE INDEX IF NOT EXISTS idx_post_sales_record_next_maintenance ON post_sales_record(next_maintenance_date);
CREATE INDEX IF NOT EXISTS idx_post_sales_service_vin ON post_sales_service(vin);
CREATE INDEX IF NOT EXISTS idx_post_sales_service_date ON post_sales_service(service_date);
CREATE INDEX IF NOT EXISTS idx_post_sales_contact_vin ON post_sales_contact(vin);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminder_vin ON maintenance_reminder(vin);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminder_due_date ON maintenance_reminder(due_date);
CREATE INDEX IF NOT EXISTS idx_delivery_documents_vin ON delivery_documents(vin);

-- Triggers para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_sales_record_updated_at 
  BEFORE UPDATE ON post_sales_record 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_sales_revenue_updated_at 
  BEFORE UPDATE ON post_sales_revenue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views útiles para consultas comunes
CREATE OR REPLACE VIEW post_sales_summary AS
SELECT 
  psr.vin,
  psr.client_id,
  psr.post_sales_agent,
  psr.warranty_status,
  psr.service_package,
  psr.next_maintenance_date,
  psr.next_maintenance_km,
  psr.odometer_km_delivery,
  COUNT(pss.id) as total_services,
  AVG(pss.customer_satisfaction) as avg_satisfaction,
  SUM(pss.cost) as total_service_cost,
  MAX(pss.service_date) as last_service_date,
  psr.created_at as delivery_date
FROM post_sales_record psr
LEFT JOIN post_sales_service pss ON psr.vin = pss.vin
GROUP BY psr.vin, psr.client_id, psr.post_sales_agent, 
         psr.warranty_status, psr.service_package, 
         psr.next_maintenance_date, psr.next_maintenance_km,
         psr.odometer_km_delivery, psr.created_at;

CREATE OR REPLACE VIEW upcoming_maintenance AS
SELECT 
  psr.vin,
  psr.client_id,
  psr.next_maintenance_date,
  psr.next_maintenance_km,
  psr.post_sales_agent,
  CASE 
    WHEN psr.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
    WHEN psr.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'soon'
    ELSE 'scheduled'
  END as urgency_level
FROM post_sales_record psr
WHERE psr.next_maintenance_date IS NOT NULL
  AND psr.warranty_status = 'active'
ORDER BY psr.next_maintenance_date ASC;

CREATE OR REPLACE VIEW post_sales_kpis AS
SELECT
  COUNT(*) as total_vehicles_delivered,
  COUNT(CASE WHEN warranty_status = 'active' THEN 1 END) as vehicles_under_warranty,
  COUNT(CASE WHEN service_package = 'premium' THEN 1 END) as premium_packages,
  COUNT(CASE WHEN service_package = 'extended' THEN 1 END) as extended_packages,
  AVG(
    (SELECT AVG(customer_satisfaction) 
     FROM post_sales_service pss 
     WHERE pss.vin = psr.vin)
  ) as overall_satisfaction,
  COUNT(CASE WHEN next_maintenance_date <= CURRENT_DATE THEN 1 END) as overdue_maintenance
FROM post_sales_record psr;

-- Función para calcular próximo mantenimiento
CREATE OR REPLACE FUNCTION calculate_next_maintenance(
  p_vin TEXT,
  p_current_km INTEGER,
  p_service_interval_km INTEGER DEFAULT 5000
) RETURNS TABLE(next_date DATE, next_km INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (CURRENT_DATE + INTERVAL '3 months')::DATE as next_date,
    (p_current_km + p_service_interval_km) as next_km;
END;
$$ LANGUAGE plpgsql;

-- Función para crear recordatorio de mantenimiento
CREATE OR REPLACE FUNCTION create_maintenance_reminder(
  p_vin TEXT,
  p_due_date DATE,
  p_due_km INTEGER,
  p_service_type TEXT DEFAULT 'mantenimiento'
) RETURNS INTEGER AS $$
DECLARE
  reminder_id INTEGER;
BEGIN
  INSERT INTO maintenance_reminder (vin, due_date, due_km, service_type)
  VALUES (p_vin, p_due_date, p_due_km, p_service_type)
  RETURNING id INTO reminder_id;
  
  RETURN reminder_id;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE post_sales_record IS 'Expediente principal de post-venta por VIN';
COMMENT ON TABLE post_sales_service IS 'Historial de servicios realizados (mantenimiento, reparaciones, garantía)';
COMMENT ON TABLE post_sales_contact IS 'Historial de contactos con clientes (recordatorios, encuestas)';
COMMENT ON TABLE maintenance_reminder IS 'Recordatorios programados de mantenimiento';
COMMENT ON TABLE post_sales_revenue IS 'Análisis financiero de ingresos por post-venta y LTV';
COMMENT ON TABLE delivery_documents IS 'Archivos y documentos relacionados con la entrega';
COMMENT ON TABLE delivery_data IS 'Datos específicos de la fase de entrega (Fase 6)';
COMMENT ON TABLE legal_transfer_data IS 'Datos de transferencia legal (Fase 7)';
COMMENT ON TABLE plates_data IS 'Datos de placas y documentación oficial (Fase 8)';