-- Seed data for local development
-- Realistic Hebrew names and Israeli phone numbers

-- ============================================================
-- Nursery
-- ============================================================

INSERT INTO nurseries (id, name, dropoff_start, dropoff_end, first_message_time, second_ping_time, timezone)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'גן שקד',
  '08:00',
  '09:00',
  '07:30',
  '08:15',
  'Asia/Jerusalem'
);

-- ============================================================
-- Children
-- ============================================================

INSERT INTO children (id, nursery_id, name) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'דניאל כהן'),
  ('c0000002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'מיכל לוי'),
  ('c0000003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'יונתן אברהם'),
  ('c0000004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'נועה גולן'),
  ('c0000005-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'אורי שמש');

-- ============================================================
-- Parents
-- ============================================================

INSERT INTO parents (id, phone, name) VALUES
  ('aa000001-0000-0000-0000-000000000001', '052-1234567', 'רונית כהן'),
  ('aa000002-0000-0000-0000-000000000002', '054-9876543', 'אבי כהן'),
  ('aa000003-0000-0000-0000-000000000003', '050-5551234', 'שירה לוי'),
  ('aa000004-0000-0000-0000-000000000004', '053-7778899', 'יוסי אברהם');

-- ============================================================
-- Children-Parents (many-to-many)
-- דניאל כהן has 2 parents (רונית and אבי)
-- מיכל לוי has 1 parent (שירה)
-- יונתן אברהם has 1 parent (יוסי)
-- נועה גולן has 1 parent (שירה - shared with מיכל)
-- אורי שמש has 2 parents (רונית and יוסי - blended family)
-- ============================================================

INSERT INTO children_parents (child_id, parent_id) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'aa000001-0000-0000-0000-000000000001'),
  ('c0000001-0000-0000-0000-000000000001', 'aa000002-0000-0000-0000-000000000002'),
  ('c0000002-0000-0000-0000-000000000002', 'aa000003-0000-0000-0000-000000000003'),
  ('c0000003-0000-0000-0000-000000000003', 'aa000004-0000-0000-0000-000000000004'),
  ('c0000004-0000-0000-0000-000000000004', 'aa000003-0000-0000-0000-000000000003'),
  ('c0000005-0000-0000-0000-000000000005', 'aa000001-0000-0000-0000-000000000001'),
  ('c0000005-0000-0000-0000-000000000005', 'aa000004-0000-0000-0000-000000000004');

-- ============================================================
-- Staff (no user_id since we don't have auth.users in seed)
-- ============================================================

INSERT INTO managers (id, nursery_id, phone, name) VALUES
  ('bb000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '058-1112233', 'דינה מזרחי');

INSERT INTO teachers (id, nursery_id, phone, name) VALUES
  ('cc000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '052-4445566', 'ענת ברק'),
  ('cc000002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '050-7778899', 'תמר רוזן');

-- ============================================================
-- Daily Attendance: 3 days of sample data
-- ============================================================

-- Day 1 (2026-02-03): Normal day - all responded, most confirmed
INSERT INTO daily_attendance (child_id, date, parent_response, parent_response_time, teacher_confirmed, teacher_confirmed_time, teacher_confirmed_by) VALUES
  ('c0000001-0000-0000-0000-000000000001', '2026-02-03', 'dropping_off', '2026-02-03 07:35:00+02', TRUE, '2026-02-03 08:15:00+02', 'cc000001-0000-0000-0000-000000000001'),
  ('c0000002-0000-0000-0000-000000000002', '2026-02-03', 'dropping_off', '2026-02-03 07:40:00+02', TRUE, '2026-02-03 08:20:00+02', 'cc000001-0000-0000-0000-000000000001'),
  ('c0000003-0000-0000-0000-000000000003', '2026-02-03', 'not_today', '2026-02-03 07:32:00+02', FALSE, NULL, NULL);

-- Day 2 (2026-02-04): Inconsistency day
INSERT INTO daily_attendance (child_id, date, parent_response, parent_response_time, teacher_confirmed, teacher_confirmed_time, teacher_confirmed_by, nine_am_alert_sent, nine_am_parent_response, inconsistency, inconsistency_type, inconsistency_resolved, inconsistency_resolved_by, inconsistency_resolved_at, inconsistency_resolution) VALUES
  ('c0000001-0000-0000-0000-000000000001', '2026-02-04', 'dropping_off', '2026-02-04 07:33:00+02', FALSE, NULL, NULL, TRUE, 'in_class', TRUE, 'parent_says_in_class_teacher_not_confirmed', TRUE, 'cc000001-0000-0000-0000-000000000001', '2026-02-04 09:15:00+02', 'הילד נמצא בכיתה - המורה לא סימנה הגעה');

INSERT INTO daily_attendance (child_id, date, parent_response, parent_response_time, teacher_confirmed, teacher_confirmed_time, teacher_confirmed_by) VALUES
  ('c0000004-0000-0000-0000-000000000004', '2026-02-04', 'dropping_off', '2026-02-04 07:45:00+02', TRUE, '2026-02-04 08:10:00+02', 'cc000002-0000-0000-0000-000000000002'),
  ('c0000005-0000-0000-0000-000000000005', '2026-02-04', 'not_today', '2026-02-04 07:50:00+02', FALSE, NULL, NULL);

-- Day 3 (2026-02-05): Mixed - some no response yet
INSERT INTO daily_attendance (child_id, date, parent_response, parent_response_time, teacher_confirmed, teacher_confirmed_time, teacher_confirmed_by) VALUES
  ('c0000001-0000-0000-0000-000000000001', '2026-02-05', 'dropping_off', '2026-02-05 07:31:00+02', TRUE, '2026-02-05 08:05:00+02', 'cc000001-0000-0000-0000-000000000001'),
  ('c0000002-0000-0000-0000-000000000002', '2026-02-05', 'dropping_off', '2026-02-05 07:38:00+02', FALSE, NULL, NULL);

INSERT INTO daily_attendance (child_id, date) VALUES
  ('c0000003-0000-0000-0000-000000000003', '2026-02-05');
