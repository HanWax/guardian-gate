-- Row Level Security policies for all tables
-- Roles: admin (full access), manager (nursery-scoped), teacher (attendance-scoped)

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

ALTER TABLE nurseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: extract role from JWT user_metadata
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    ''
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get nursery_id for current manager
CREATE OR REPLACE FUNCTION public.get_manager_nursery_id()
RETURNS UUID AS $$
  SELECT nursery_id FROM managers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get nursery_id for current teacher
CREATE OR REPLACE FUNCTION public.get_teacher_nursery_id()
RETURNS UUID AS $$
  SELECT nursery_id FROM teachers WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Admin policies: full CRUD on all tables
-- ============================================================

CREATE POLICY admin_all_nurseries ON nurseries
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY admin_all_children ON children
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY admin_all_parents ON parents
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY admin_all_children_parents ON children_parents
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY admin_all_managers ON managers
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY admin_all_teachers ON teachers
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY admin_all_daily_attendance ON daily_attendance
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY admin_all_conversation_state ON conversation_state
  FOR ALL USING (public.get_user_role() = 'admin');

-- ============================================================
-- Manager policies: nursery-scoped access
-- ============================================================

-- Managers can see their own nursery
CREATE POLICY manager_select_nurseries ON nurseries
  FOR SELECT USING (
    public.get_user_role() = 'manager'
    AND id = public.get_manager_nursery_id()
  );

-- Managers can CRUD children in their nursery
CREATE POLICY manager_select_children ON children
  FOR SELECT USING (
    public.get_user_role() = 'manager'
    AND nursery_id = public.get_manager_nursery_id()
  );

CREATE POLICY manager_insert_children ON children
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'manager'
    AND nursery_id = public.get_manager_nursery_id()
  );

CREATE POLICY manager_update_children ON children
  FOR UPDATE USING (
    public.get_user_role() = 'manager'
    AND nursery_id = public.get_manager_nursery_id()
  );

-- Managers can CRUD parents linked to children in their nursery
CREATE POLICY manager_select_parents ON parents
  FOR SELECT USING (
    public.get_user_role() = 'manager'
    AND id IN (
      SELECT cp.parent_id FROM children_parents cp
      JOIN children c ON c.id = cp.child_id
      WHERE c.nursery_id = public.get_manager_nursery_id()
    )
  );

CREATE POLICY manager_insert_parents ON parents
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'manager'
  );

CREATE POLICY manager_update_parents ON parents
  FOR UPDATE USING (
    public.get_user_role() = 'manager'
    AND id IN (
      SELECT cp.parent_id FROM children_parents cp
      JOIN children c ON c.id = cp.child_id
      WHERE c.nursery_id = public.get_manager_nursery_id()
    )
  );

-- Managers can CRUD children_parents junction for their nursery's children
CREATE POLICY manager_select_children_parents ON children_parents
  FOR SELECT USING (
    public.get_user_role() = 'manager'
    AND child_id IN (
      SELECT id FROM children WHERE nursery_id = public.get_manager_nursery_id()
    )
  );

CREATE POLICY manager_insert_children_parents ON children_parents
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'manager'
    AND child_id IN (
      SELECT id FROM children WHERE nursery_id = public.get_manager_nursery_id()
    )
  );

CREATE POLICY manager_update_children_parents ON children_parents
  FOR UPDATE USING (
    public.get_user_role() = 'manager'
    AND child_id IN (
      SELECT id FROM children WHERE nursery_id = public.get_manager_nursery_id()
    )
  );

-- Managers can view and update attendance for their nursery
CREATE POLICY manager_select_daily_attendance ON daily_attendance
  FOR SELECT USING (
    public.get_user_role() = 'manager'
    AND child_id IN (
      SELECT id FROM children WHERE nursery_id = public.get_manager_nursery_id()
    )
  );

CREATE POLICY manager_update_daily_attendance ON daily_attendance
  FOR UPDATE USING (
    public.get_user_role() = 'manager'
    AND child_id IN (
      SELECT id FROM children WHERE nursery_id = public.get_manager_nursery_id()
    )
  );

-- ============================================================
-- Teacher policies: read children/parents, read/update attendance
-- ============================================================

-- Teachers can see children in their nursery
CREATE POLICY teacher_select_children ON children
  FOR SELECT USING (
    public.get_user_role() = 'teacher'
    AND nursery_id = public.get_teacher_nursery_id()
  );

-- Teachers can see parents linked to children in their nursery
CREATE POLICY teacher_select_parents ON parents
  FOR SELECT USING (
    public.get_user_role() = 'teacher'
    AND id IN (
      SELECT cp.parent_id FROM children_parents cp
      JOIN children c ON c.id = cp.child_id
      WHERE c.nursery_id = public.get_teacher_nursery_id()
    )
  );

-- Teachers can view and update attendance for their nursery
CREATE POLICY teacher_select_daily_attendance ON daily_attendance
  FOR SELECT USING (
    public.get_user_role() = 'teacher'
    AND child_id IN (
      SELECT id FROM children WHERE nursery_id = public.get_teacher_nursery_id()
    )
  );

CREATE POLICY teacher_update_daily_attendance ON daily_attendance
  FOR UPDATE USING (
    public.get_user_role() = 'teacher'
    AND child_id IN (
      SELECT id FROM children WHERE nursery_id = public.get_teacher_nursery_id()
    )
  );
