-- ============================================================================
-- PROJECT ZKTECO INTEGRATION — MASTER DATABASE INITIALIZATION
-- Target: PostgreSQL 14+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- STRUCTURES & TYPE STATE MACHINES
-- ----------------------------------------------------------------------------
CREATE TYPE command_status AS ENUM ('pending', 'delivered', 'acknowledged', 'failed');
CREATE TYPE template_type AS ENUM ('FINGER', 'FACE', 'PALM');

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE sites (
    site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_code VARCHAR(16) NOT NULL UNIQUE,
    site_name VARCHAR(128) NOT NULL,
    tailscale_subnet VARCHAR(18),
    timezone VARCHAR(32) DEFAULT 'Asia/Kuala_Lumpur',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hr_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(32) NOT NULL UNIQUE,
    pin VARCHAR(16) NOT NULL UNIQUE, 
    full_name VARCHAR(128) NOT NULL,
    department VARCHAR(64),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE devices (
    sn VARCHAR(32) PRIMARY KEY,
    device_name VARCHAR(64),
    model VARCHAR(32) NOT NULL,
    site_id UUID REFERENCES sites(site_id) ON DELETE SET NULL,
    static_ip INET,
    tailscale_ip INET,
    gateway_server_ip INET,
    firmware_version VARCHAR(32),
    last_seen_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE device_algorithm_compatibility (
    device_model VARCHAR(32) PRIMARY KEY,
    fingerprint_algo VARCHAR(16),
    face_algo VARCHAR(16),
    max_templates_per_user SMALLINT DEFAULT 10,
    template_format VARCHAR(16) DEFAULT 'hex'
);

CREATE TABLE attendance_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_sn VARCHAR(32) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
    user_pin VARCHAR(16) NOT NULL REFERENCES hr_users(pin) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    state SMALLINT NOT NULL DEFAULT 0,
    verify_mode SMALLINT NOT NULL DEFAULT 0,
    work_code VARCHAR(16),
    reserved VARCHAR(16),
    raw_payload TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE device_command_queue (
    command_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_sn VARCHAR(32) NOT NULL REFERENCES devices(sn) ON DELETE CASCADE,
    command_type VARCHAR(32) NOT NULL,
    command_payload TEXT NOT NULL,
    status command_status DEFAULT 'pending',
    priority SMALLINT DEFAULT 5 CHECK (priority BETWEEN 1 AND 9),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    retry_count SMALLINT DEFAULT 0,
    max_retries SMALLINT DEFAULT 3,
    error_code VARCHAR(16)
);

CREATE TABLE biometric_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_pin VARCHAR(16) NOT NULL REFERENCES hr_users(pin) ON DELETE CASCADE,
    template_type template_type NOT NULL,
    algorithm_version VARCHAR(16) NOT NULL,
    template_data BYTEA NOT NULL,
    template_size INTEGER NOT NULL,
    finger_id SMALLINT,
    source_device_sn VARCHAR(32) REFERENCES devices(sn) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_unique_biometric_constraint 
ON biometric_templates (user_pin, template_type, algorithm_version, COALESCE(finger_id, -1));

-- ----------------------------------------------------------------------------
-- PERFORMANCE INDEX LAYERS
-- ----------------------------------------------------------------------------
CREATE INDEX idx_attendance_perf ON attendance_logs(user_pin, timestamp DESC);
CREATE INDEX idx_cmd_queue_poll_perf ON device_command_queue(device_sn, status, priority DESC, created_at ASC) WHERE status = 'pending';

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------
CREATE TRIGGER update_hr_users_modtime BEFORE UPDATE ON hr_users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_devices_modtime BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_bio_templates_modtime BEFORE UPDATE ON biometric_templates FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ----------------------------------------------------------------------------
-- STORED PROCEDURES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION poll_next_command(p_device_sn VARCHAR(32))
RETURNS TABLE(command_id UUID, command_payload TEXT) AS $$
DECLARE
    target_id UUID;
    target_payload TEXT;
BEGIN
    SELECT cq.command_id, cq.command_payload INTO target_id, target_payload
    FROM device_command_queue cq
    WHERE cq.device_sn = p_device_sn AND cq.status = 'pending'
    ORDER BY cq.priority DESC, cq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF target_id IS NOT NULL THEN
        UPDATE device_command_queue
        SET status = 'delivered', delivered_at = NOW()
        WHERE device_command_queue.command_id = target_id;
    END IF;

    RETURN QUERY SELECT target_id, target_payload;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION acknowledge_command(p_command_id UUID, p_return_code VARCHAR(16), p_success BOOLEAN)
RETURNS VOID AS $$
BEGIN
    IF p_success THEN
        UPDATE device_command_queue
        SET status = 'acknowledged', acknowledged_at = NOW()
        WHERE command_id = p_command_id;
    ELSE
        UPDATE device_command_queue
        SET status = CASE WHEN retry_count >= max_retries THEN 'failed'::command_status ELSE 'pending'::command_status END,
            failed_at = CASE WHEN retry_count >= max_retries THEN NOW() ELSE NULL END,
            error_code = p_return_code,
            retry_count = retry_count + 1,
            delivered_at = NULL
        WHERE command_id = p_command_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- MONITORING VIEWS
-- ----------------------------------------------------------------------------
CREATE VIEW v_stale_commands AS
SELECT command_id, device_sn, command_type, status, created_at, NOW() - created_at AS pending_duration
FROM device_command_queue WHERE status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes';

CREATE VIEW v_device_health AS
SELECT sn, device_name, model, last_seen_at,
       CASE WHEN last_seen_at IS NULL THEN 'OFFLINE_NEVER_SEEN'
            WHEN NOW() - last_seen_at > INTERVAL '10 minutes' THEN 'OFFLINE_DISCONNECTED'
            ELSE 'ONLINE' END AS connectivity_state
FROM devices;