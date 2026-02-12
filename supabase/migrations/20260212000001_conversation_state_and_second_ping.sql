-- Extend conversation_state with attendance_id and add UNIQUE on parent_id.
-- Add second_ping_sent_at to daily_attendance.

-- 1. Add attendance_id FK to conversation_state
ALTER TABLE conversation_state
  ADD COLUMN attendance_id UUID REFERENCES daily_attendance(id) ON DELETE SET NULL;

-- 2. Enforce one active conversation per parent
ALTER TABLE conversation_state
  ADD CONSTRAINT conversation_state_parent_id_unique UNIQUE (parent_id);

-- 3. Track when second ping was sent
ALTER TABLE daily_attendance
  ADD COLUMN second_ping_sent_at TIMESTAMPTZ;
