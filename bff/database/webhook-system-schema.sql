-- 🗄️ NEON Database Schema - Enterprise Webhook System
-- Production-ready schema for webhook reliability and monitoring

-- Webhook Events Table - Core tracking
CREATE TABLE IF NOT EXISTS webhook_events (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'conekta', 'mifiel', 'metamap', 'gnv', 'odoo'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payload JSONB NOT NULL,
    url VARCHAR(500) NOT NULL,
    headers JSONB,
    
    -- Retry logic
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    last_attempt TIMESTAMPTZ,
    next_retry TIMESTAMPTZ,
    
    -- Error tracking
    last_error TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Processing time tracking
    processing_time_ms INTEGER,
    
    CONSTRAINT webhook_events_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT webhook_events_type_check CHECK (type IN ('conekta', 'mifiel', 'metamap', 'gnv', 'odoo'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry ON webhook_events(next_retry) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type_status ON webhook_events(type, status);

-- Webhook Statistics View for monitoring
CREATE OR REPLACE VIEW webhook_stats AS
SELECT 
    type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as success_rate_percent,
    AVG(processing_time_ms) FILTER (WHERE status = 'completed') as avg_processing_time_ms,
    MAX(attempts) FILTER (WHERE status = 'completed') as max_attempts_to_success,
    AVG(attempts) FILTER (WHERE status = 'completed') as avg_attempts_to_success
FROM webhook_events
GROUP BY type
UNION ALL
SELECT 
    'TOTAL' as type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as success_rate_percent,
    AVG(processing_time_ms) FILTER (WHERE status = 'completed') as avg_processing_time_ms,
    MAX(attempts) FILTER (WHERE status = 'completed') as max_attempts_to_success,
    AVG(attempts) FILTER (WHERE status = 'completed') as avg_attempts_to_success
FROM webhook_events;

-- Enhanced Payment Tracking (extends existing)
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id SERIAL PRIMARY KEY,
    webhook_event_id VARCHAR(255) REFERENCES webhook_events(id),
    
    -- Conekta specific fields
    conekta_order_id VARCHAR(255),
    payment_status VARCHAR(50), -- 'paid', 'pending', 'failed', 'refunded'
    amount_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'MXN',
    
    -- Processing metadata
    processed_at TIMESTAMPTZ,
    odoo_invoice_updated BOOLEAN DEFAULT FALSE,
    odoo_invoice_id VARCHAR(100),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_order_id ON payment_webhooks(conekta_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(payment_status);

-- Contract Signing Tracking (Mifiel)
CREATE TABLE IF NOT EXISTS contract_webhooks (
    id SERIAL PRIMARY KEY,
    webhook_event_id VARCHAR(255) REFERENCES webhook_events(id),
    
    -- Mifiel specific fields
    document_id VARCHAR(255) NOT NULL,
    document_status VARCHAR(50), -- 'pending', 'signed', 'rejected', 'expired'
    signer_email VARCHAR(255),
    signed_at TIMESTAMPTZ,
    
    -- Business context
    quote_id VARCHAR(100),
    protection_type VARCHAR(50), -- 'step_down', 'defer', 'reorder'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_webhooks_document_id ON contract_webhooks(document_id);
CREATE INDEX IF NOT EXISTS idx_contract_webhooks_status ON contract_webhooks(document_status);

-- KYC Verification Tracking (MetaMap)
CREATE TABLE IF NOT EXISTS kyc_webhooks (
    id SERIAL PRIMARY KEY,
    webhook_event_id VARCHAR(255) REFERENCES webhook_events(id),
    
    -- MetaMap specific fields
    verification_id VARCHAR(255) NOT NULL,
    verification_status VARCHAR(50), -- 'approved', 'rejected', 'pending', 'review'
    identity_status VARCHAR(50),
    risk_level VARCHAR(20), -- 'low', 'medium', 'high'
    
    -- Customer context
    customer_id VARCHAR(100),
    health_score_bonus INTEGER DEFAULT 0, -- +15 for approved KYC
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_webhooks_verification_id ON kyc_webhooks(verification_id);
CREATE INDEX IF NOT EXISTS idx_kyc_webhooks_status ON kyc_webhooks(verification_status);

-- GNV Health Monitoring (enhanced)
CREATE TABLE IF NOT EXISTS gnv_webhook_events (
    id SERIAL PRIMARY KEY,
    webhook_event_id VARCHAR(255) REFERENCES webhook_events(id),
    
    -- Station data
    station_id VARCHAR(50) NOT NULL,
    health_score DECIMAL(5,2),
    ingestion_status VARCHAR(50), -- 'healthy', 'degraded', 'failed'
    rows_processed INTEGER,
    rows_rejected INTEGER,
    
    -- Alerting
    alert_level VARCHAR(20), -- 'none', 'warning', 'critical'
    alert_message TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gnv_webhooks_station_id ON gnv_webhook_events(station_id);
CREATE INDEX IF NOT EXISTS idx_gnv_webhooks_health_score ON gnv_webhook_events(health_score);

-- Webhook Performance Monitoring
CREATE TABLE IF NOT EXISTS webhook_performance_log (
    id SERIAL PRIMARY KEY,
    webhook_type VARCHAR(50) NOT NULL,
    
    -- Performance metrics
    request_size_bytes INTEGER,
    processing_time_ms INTEGER,
    memory_usage_mb INTEGER,
    
    -- Status tracking
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Timing
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- System context
    server_instance VARCHAR(100),
    node_env VARCHAR(20) DEFAULT 'production'
);

CREATE INDEX IF NOT EXISTS idx_webhook_perf_type_timestamp ON webhook_performance_log(webhook_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_webhook_perf_success ON webhook_performance_log(success);

-- Daily webhook summary for monitoring dashboards
CREATE OR REPLACE VIEW daily_webhook_summary AS
SELECT 
    DATE(created_at) as date,
    type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'completed') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    ROUND(AVG(processing_time_ms), 2) as avg_processing_time_ms,
    MIN(created_at) as first_event,
    MAX(created_at) as last_event
FROM webhook_events 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), type
ORDER BY date DESC, type;

-- Webhook health check function
CREATE OR REPLACE FUNCTION get_webhook_health()
RETURNS JSON AS $$
DECLARE
    health_data JSON;
BEGIN
    SELECT json_build_object(
        'overall_success_rate', ROUND(
            COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
            NULLIF(COUNT(*), 0) * 100, 2
        ),
        'total_events_24h', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'),
        'failed_events_24h', COUNT(*) FILTER (
            WHERE created_at >= NOW() - INTERVAL '24 hours' 
            AND status = 'failed'
        ),
        'pending_retries', COUNT(*) FILTER (WHERE status = 'pending'),
        'avg_processing_time_ms', ROUND(AVG(processing_time_ms), 2),
        'system_status', CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0) >= 0.95 THEN 'healthy'
            WHEN COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0) >= 0.90 THEN 'degraded'
            ELSE 'unhealthy'
        END,
        'last_updated', NOW()
    ) INTO health_data
    FROM webhook_events
    WHERE created_at >= NOW() - INTERVAL '7 days';
    
    RETURN health_data;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old webhook events (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Keep successful events for 30 days, failed events for 90 days
    DELETE FROM webhook_events 
    WHERE (
        status = 'completed' 
        AND created_at < NOW() - INTERVAL '30 days'
    ) OR (
        status = 'failed' 
        AND created_at < NOW() - INTERVAL '90 days'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO webhook_performance_log (webhook_type, processing_time_ms, success, error_message)
    VALUES ('cleanup', 0, true, format('Cleaned up %s old webhook events', deleted_count));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Updated webhook events timestamp trigger
CREATE OR REPLACE FUNCTION update_webhook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER webhook_events_update_timestamp
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_timestamp();

-- Initial data for testing
INSERT INTO webhook_events (id, type, status, payload, url, attempts, max_attempts)
VALUES 
('test-conekta-001', 'conekta', 'completed', '{"event": "payment.paid", "amount": 38500}', '/internal/conekta/process', 1, 5),
('test-mifiel-001', 'mifiel', 'completed', '{"document_id": "DOC123", "status": "signed"}', '/internal/mifiel/process', 1, 5),
('test-gnv-001', 'gnv', 'completed', '{"station_id": "AGS-01", "health_score": 100}', '/internal/gnv/process', 1, 7)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions (adjust according to your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO webhook_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO webhook_user;

-- Performance optimization
ANALYZE webhook_events;
ANALYZE payment_webhooks;
ANALYZE contract_webhooks;
ANALYZE kyc_webhooks;
ANALYZE gnv_webhook_events;