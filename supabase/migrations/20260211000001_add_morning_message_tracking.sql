-- Track when morning message was sent per attendance record (child-level idempotency)
ALTER TABLE daily_attendance ADD COLUMN message_sent_at TIMESTAMPTZ;

-- Track nursery-level cron runs (nursery-level idempotency + audit)
CREATE TABLE morning_message_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID NOT NULL REFERENCES nurseries(id) ON DELETE CASCADE,
  run_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  messages_sent INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  error_details TEXT,
  UNIQUE (nursery_id, run_date)
);
