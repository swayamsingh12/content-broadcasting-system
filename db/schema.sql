-- ============================================================================
-- Content Broadcasting System — PostgreSQL schema
-- Run after creating the database:
--   createdb content_broadcasting
--   psql -d content_broadcasting -f db/schema.sql
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto on PG <13. On PG 13+ it's built-in,
-- but the CREATE EXTENSION is idempotent and harmless either way.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- users: principals and teachers share one table; role gates behaviour.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('principal', 'teacher')),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------------
-- content: every uploaded image, with its lifecycle state and air-window.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    subject           VARCHAR(50)  NOT NULL,
    file_url          VARCHAR(500) NOT NULL,
    file_type         VARCHAR(10)  NOT NULL CHECK (file_type IN ('jpg','jpeg','png','gif')),
    file_size         INTEGER      NOT NULL,
    uploaded_by       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status            VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    rejection_reason  TEXT,
    approved_by       UUID         REFERENCES users(id) ON DELETE SET NULL,
    approved_at       TIMESTAMP,
    start_time        TIMESTAMP,
    end_time          TIMESTAMP,
    rotation_duration INTEGER      DEFAULT 5,
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Indexes that real query patterns will use:
--   /content/my-content filters by uploaded_by + (optional) status/subject
--   /content/live       filters by uploaded_by + status='approved' + window
CREATE INDEX IF NOT EXISTS idx_content_uploaded_by  ON content (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_content_status       ON content (status);
CREATE INDEX IF NOT EXISTS idx_content_subject      ON content (subject);
CREATE INDEX IF NOT EXISTS idx_content_live_window  ON content (uploaded_by, status, start_time, end_time);

-- --------------------------------------------------------------------------
-- content_slots: one row per distinct (lower-cased) subject ever scheduled.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_slots (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject    VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------------
-- content_schedules: places a content row into a slot at rotation_order.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_schedules (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id     UUID NOT NULL REFERENCES content(id)       ON DELETE CASCADE,
    slot_id        UUID NOT NULL REFERENCES content_slots(id) ON DELETE CASCADE,
    rotation_order INTEGER NOT NULL,
    duration       INTEGER NOT NULL DEFAULT 5,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_slot ON content_schedules (slot_id, rotation_order);
