-- Rename nine_am_alert_sent → parent_followup_sent
ALTER TABLE daily_attendance
  RENAME COLUMN nine_am_alert_sent TO parent_followup_sent;
