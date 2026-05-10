-- Add second_ping_sent_at to daily_attendance so the second-ping cron
-- can mark records after sending and avoid duplicate pings.
ALTER TABLE daily_attendance
  ADD COLUMN second_ping_sent_at TIMESTAMPTZ;

-- Track teacher poll runs per nursery per day to prevent duplicate polls
-- when the cron fires multiple times inside the tolerance window.
CREATE TABLE teacher_poll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID NOT NULL REFERENCES nurseries(id) ON DELETE CASCADE,
  run_date DATE NOT NULL,
  polls_sent INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE (nursery_id, run_date)
);
