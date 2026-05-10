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
-- Auth Users (admin, teacher)
-- All use password: password123
-- ============================================================

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token,
  reauthentication_token, is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000001-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@test.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"email": "admin@test.com", "email_verified": true, "phone_verified": false, "sub": "d0000001-0000-0000-0000-000000000001", "role": "admin"}',
    '', '', '', '', '', '', '', '', false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000003-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'teacher@test.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"email": "teacher@test.com", "email_verified": true, "phone_verified": false, "sub": "d0000003-0000-0000-0000-000000000003", "role": "teacher"}',
    '', '', '', '', '', '', '', '', false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000002-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'admin2@test.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"email": "admin2@test.com", "email_verified": true, "phone_verified": false, "sub": "d0000002-0000-0000-0000-000000000002", "role": "admin"}',
    '', '', '', '', '', '', '', '', false, false
  );

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
  (
    'd0000001-0000-0000-0000-000000000001',
    'd0000001-0000-0000-0000-000000000001',
    '{"sub": "d0000001-0000-0000-0000-000000000001", "email": "admin@test.com", "email_verified": true}',
    'email',
    'd0000001-0000-0000-0000-000000000001',
    now(), now(), now()
  ),
  (
    'd0000003-0000-0000-0000-000000000003',
    'd0000003-0000-0000-0000-000000000003',
    '{"sub": "d0000003-0000-0000-0000-000000000003", "email": "teacher@test.com", "email_verified": true}',
    'email',
    'd0000003-0000-0000-0000-000000000003',
    now(), now(), now()
  ),
  (
    'd0000002-0000-0000-0000-000000000002',
    'd0000002-0000-0000-0000-000000000002',
    '{"sub": "d0000002-0000-0000-0000-000000000002", "email": "admin2@test.com", "email_verified": true}',
    'email',
    'd0000002-0000-0000-0000-000000000002',
    now(), now(), now()
  );

-- ============================================================
-- Staff (linked to auth users) — teachers BEFORE children (FK)
-- ============================================================

INSERT INTO admins (id, nursery_id, phone, name, user_id) VALUES
  ('dd000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+972501234567', 'מנהל מערכת', 'd0000001-0000-0000-0000-000000000001'),
  ('dd000002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+972500000002', 'מנהל מערכת 2', 'd0000002-0000-0000-0000-000000000002');

INSERT INTO teachers (id, nursery_id, phone, name, user_id) VALUES
  ('cc000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+972524445566', 'ענת ברק', 'd0000003-0000-0000-0000-000000000003'),
  ('cc000002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '+972507778899', 'תמר רוזן', NULL);

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
-- Children-Teachers (many-to-many)
-- Daniel & Michal: Anat; Yonatan & Noa: Tamar; Ori: Anat
-- ============================================================

INSERT INTO children_teachers (child_id, teacher_id) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000001'),
  ('c0000002-0000-0000-0000-000000000002', 'cc000001-0000-0000-0000-000000000001'),
  ('c0000003-0000-0000-0000-000000000003', 'cc000002-0000-0000-0000-000000000002'),
  ('c0000004-0000-0000-0000-000000000004', 'cc000002-0000-0000-0000-000000000002'),
  ('c0000005-0000-0000-0000-000000000005', 'cc000001-0000-0000-0000-000000000001');

-- ============================================================
-- Parents
-- ============================================================

INSERT INTO parents (id, phone, name) VALUES
  ('aa000001-0000-0000-0000-000000000001', '+972521234567', 'רונית כהן'),
  ('aa000002-0000-0000-0000-000000000002', '+972549876543', 'אבי כהן'),
  ('aa000003-0000-0000-0000-000000000003', '+972505551234', 'שירה לוי'),
  ('aa000004-0000-0000-0000-000000000004', '+972537778899', 'יוסי אברהם');

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
-- Daily Attendance: 3 days of sample data
-- ============================================================

-- Day 1 (2026-02-03): Normal day - all responded, most confirmed
INSERT INTO daily_attendance (child_id, date, parent_response, parent_response_time, parent_response_by, teacher_confirmed, teacher_confirmed_time, teacher_confirmed_by) VALUES
  ('c0000001-0000-0000-0000-000000000001', '2026-02-03', 'dropping_off', '2026-02-03 07:35:00+02', 'aa000001-0000-0000-0000-000000000001', TRUE, '2026-02-03 08:15:00+02', 'cc000001-0000-0000-0000-000000000001'),
  ('c0000002-0000-0000-0000-000000000002', '2026-02-03', 'dropping_off', '2026-02-03 07:40:00+02', 'aa000003-0000-0000-0000-000000000003', TRUE, '2026-02-03 08:20:00+02', 'cc000001-0000-0000-0000-000000000001'),
  ('c0000003-0000-0000-0000-000000000003', '2026-02-03', 'not_today', '2026-02-03 07:32:00+02', 'aa000004-0000-0000-0000-000000000004', FALSE, NULL, NULL);

-- Day 2 (2026-02-04): Inconsistency day
INSERT INTO daily_attendance (child_id, date, parent_response, parent_response_time, parent_response_by, teacher_confirmed, teacher_confirmed_time, teacher_confirmed_by, nine_am_alert_sent, nine_am_parent_response, nine_am_parent_response_time, nine_am_parent_response_by, inconsistency, inconsistency_type, inconsistency_resolved, inconsistency_resolved_by, inconsistency_resolved_at, inconsistency_resolution) VALUES
  ('c0000001-0000-0000-0000-000000000001', '2026-02-04', 'dropping_off', '2026-02-04 07:33:00+02', 'aa000001-0000-0000-0000-000000000001', FALSE, NULL, NULL, TRUE, 'in_class', '2026-02-04 09:05:00+02', 'aa000001-0000-0000-0000-000000000001', TRUE, 'parent_says_in_class_teacher_not_confirmed', TRUE, 'cc000001-0000-0000-0000-000000000001', '2026-02-04 09:15:00+02', 'הילד נמצא בכיתה - המורה לא סימנה הגעה');

INSERT INTO daily_attendance (child_id, date, parent_response, parent_response_time, parent_response_by, teacher_confirmed, teacher_confirmed_time, teacher_confirmed_by) VALUES
  ('c0000004-0000-0000-0000-000000000004', '2026-02-04', 'dropping_off', '2026-02-04 07:45:00+02', 'aa000003-0000-0000-0000-000000000003', TRUE, '2026-02-04 08:10:00+02', 'cc000002-0000-0000-0000-000000000002'),
  ('c0000005-0000-0000-0000-000000000005', '2026-02-04', 'not_today', '2026-02-04 07:50:00+02', 'aa000001-0000-0000-0000-000000000001', FALSE, NULL, NULL);

-- Day 3 (2026-02-05): Mixed - some no response yet
INSERT INTO daily_attendance (child_id, date, parent_response, parent_response_time, parent_response_by, teacher_confirmed, teacher_confirmed_time, teacher_confirmed_by) VALUES
  ('c0000001-0000-0000-0000-000000000001', '2026-02-05', 'dropping_off', '2026-02-05 07:31:00+02', 'aa000001-0000-0000-0000-000000000001', TRUE, '2026-02-05 08:05:00+02', 'cc000001-0000-0000-0000-000000000001'),
  ('c0000002-0000-0000-0000-000000000002', '2026-02-05', 'dropping_off', '2026-02-05 07:38:00+02', 'aa000003-0000-0000-0000-000000000003', FALSE, NULL, NULL);

INSERT INTO daily_attendance (child_id, date) VALUES
  ('c0000003-0000-0000-0000-000000000003', '2026-02-05');
