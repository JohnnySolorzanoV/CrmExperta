-- Migration v2: Email notifications + Google Calendar linkage + cancellation audit
-- Run this against an existing crm_experta database to apply the new columns.
-- Safe to run multiple times (IF NOT EXISTS guards).

ALTER TABLE Cita ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
ALTER TABLE Cita ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;
ALTER TABLE Cita ADD COLUMN IF NOT EXISTS cancelado_por VARCHAR(50);
