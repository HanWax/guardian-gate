-- Add 'dropping_off_late' to parent_response check constraint
ALTER TABLE daily_attendance
  DROP CONSTRAINT IF EXISTS daily_attendance_parent_response_check;

ALTER TABLE daily_attendance
  ADD CONSTRAINT daily_attendance_parent_response_check
  CHECK (parent_response IN ('dropping_off', 'not_today', 'dropping_off_late'));
