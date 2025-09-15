-- 🔄 Webhook Retry System with Exponential Backoff
-- P0.4 Surgical Fix - Webhook reliability ≥95%

-- Drop existing tables if they exist
DROP TABLE IF EXISTS webhook_retry_attempts CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TYPE IF EXISTS webhook_status CASCADE;
DROP TYPE IF EXISTS webhook_provider CASCADE;

-- Create enums
CREATE TYPE webhook_provider AS ENUM ('conekta', 'mifiel', 'metamap', 'gnv', 'odoo');
CREATE TYPE webhook_status AS ENUM ('pending', 'processing', 'processed', 'failed', 'dead_letter');

-- Main webhook events table
CREATE TABLE webhook_events (
    id BIGSERIAL PRIMARY KEY,
    provider webhook_provider NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    external_id VARCHAR(255),
    payload JSONB NOT NULL,
    status webhook_status DEFAULT 'pending' NOT NULL,

    -- Retry logic
    retry_count INTEGER DEFAULT 0 NOT NULL,
    max_retries INTEGER DEFAULT 5 NOT NULL,
    next_retry_at TIMESTAMPTZ,
    last_retry_at TIMESTAMPTZ,

    -- Processing tracking
    processing_started_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    error_details JSONB,

    -- Response tracking
    response_status INTEGER,
    response_body JSONB,
    response_headers JSONB,

    -- HMAC validation
    signature_header VARCHAR(500),
    signature_valid BOOLEAN,

    -- Metadata
    priority INTEGER DEFAULT 0 NOT NULL, -- Higher number = higher priority
    source_ip INET,
    user_agent TEXT,
    tags JSONB DEFAULT '{}',

    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT chk_retry_count_positive CHECK (retry_count >= 0),
    CONSTRAINT chk_max_retries_positive CHECK (max_retries >= 0),
    CONSTRAINT chk_priority_range CHECK (priority BETWEEN 0 AND 10)
);

-- Retry attempts history table
CREATE TABLE webhook_retry_attempts (
    id BIGSERIAL PRIMARY KEY,
    webhook_event_id BIGINT NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,

    -- Attempt details
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    duration_ms INTEGER,

    -- Response details
    http_status INTEGER,
    response_body JSONB,
    response_headers JSONB,

    -- Error details
    error_type VARCHAR(100),
    error_message TEXT,
    error_details JSONB,

    -- Retry strategy
    backoff_delay_ms INTEGER,
    next_retry_at TIMESTAMPTZ,

    CONSTRAINT uq_webhook_attempt UNIQUE (webhook_event_id, attempt_number)
);

-- Indexes for performance
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_next_retry ON webhook_events(next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_webhook_events_priority ON webhook_events(priority DESC, created_at ASC) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_webhook_events_external_id ON webhook_events(provider, external_id);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);

-- Partial indexes for active processing
CREATE INDEX idx_webhook_events_processing ON webhook_events(processing_started_at) WHERE status = 'processing';
CREATE INDEX idx_webhook_events_failed_retries ON webhook_events(retry_count, next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;

-- Index for retry attempts
CREATE INDEX idx_retry_attempts_webhook_id ON webhook_retry_attempts(webhook_event_id);
CREATE INDEX idx_retry_attempts_attempted_at ON webhook_retry_attempts(attempted_at);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger
CREATE TRIGGER trigger_webhook_events_updated_at
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();

-- Dead letter cleanup function
CREATE OR REPLACE FUNCTION cleanup_dead_letter_webhooks(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_events
    WHERE status = 'dead_letter'
      AND created_at < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Webhook stats function
CREATE OR REPLACE FUNCTION get_webhook_stats(
    provider_filter webhook_provider DEFAULT NULL,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    provider webhook_provider,
    total_events BIGINT,
    processed_events BIGINT,
    failed_events BIGINT,
    dead_letter_events BIGINT,
    pending_events BIGINT,
    success_rate NUMERIC,
    avg_retry_count NUMERIC,
    avg_processing_time_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        we.provider,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE we.status = 'processed') as processed_events,
        COUNT(*) FILTER (WHERE we.status = 'failed') as failed_events,
        COUNT(*) FILTER (WHERE we.status = 'dead_letter') as dead_letter_events,
        COUNT(*) FILTER (WHERE we.status = 'pending') as pending_events,
        ROUND(
            COUNT(*) FILTER (WHERE we.status = 'processed') * 100.0 / NULLIF(COUNT(*), 0),
            2
        ) as success_rate,
        ROUND(AVG(we.retry_count), 2) as avg_retry_count,
        ROUND(AVG(
            EXTRACT(EPOCH FROM (we.processed_at - we.processing_started_at)) * 1000
        ), 2) as avg_processing_time_ms
    FROM webhook_events we
    WHERE (provider_filter IS NULL OR we.provider = provider_filter)
      AND we.created_at > NOW() - INTERVAL '1 hour' * hours_back
    GROUP BY we.provider
    ORDER BY we.provider;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO webhook_events (provider, event_type, external_id, payload, status, priority)
VALUES
    ('conekta', 'payment.created', 'evt_123', '{"amount": 5000, "currency": "MXN"}', 'pending', 1),
    ('mifiel', 'document.signed', 'doc_456', '{"document_id": "456", "status": "signed"}', 'processed', 2),
    ('metamap', 'verification.completed', 'ver_789', '{"verification_id": "789", "result": "passed"}', 'pending', 3),
    ('gnv', 'station.health', 'st_001', '{"station_id": "ST001", "health": 87.5}', 'pending', 1),
    ('odoo', 'quote.created', 'quo_101', '{"quote_id": 101, "total": 15000}', 'pending', 2);

-- Grant permissions (adjust as needed)
-- GRANT ALL ON webhook_events TO conductores_api;
-- GRANT ALL ON webhook_retry_attempts TO conductores_api;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO conductores_api;

COMMENT ON TABLE webhook_events IS 'Webhook events with retry logic and exponential backoff';
COMMENT ON TABLE webhook_retry_attempts IS 'History of individual webhook retry attempts';
COMMENT ON COLUMN webhook_events.retry_count IS 'Current number of retry attempts';
COMMENT ON COLUMN webhook_events.next_retry_at IS 'When to attempt next retry (exponential backoff)';
COMMENT ON COLUMN webhook_events.signature_valid IS 'Whether HMAC signature validation passed';
COMMENT ON FUNCTION get_webhook_stats IS 'Get webhook reliability statistics by provider';