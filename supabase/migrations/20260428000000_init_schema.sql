-- Complete schema initialization for RoleCall
-- Consolidates all prior migrations with M-to-M relationships for parents/children/teachers

-- ============================================================================
-- Core Entities
-- ============================================================================

CREATE TABLE nurseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dropoff_start TIME NOT NULL,
  dropoff_end TIME NOT NULL,
  first_message_time TIME NOT NULL,
  second_ping_time TIME NOT NULL,
  timezone TEXT DEFAULT 'Asia/Jerusalem',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID NOT NULL REFERENCES nurseries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_nursery_id ON children(nursery_id);

CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_nursery_id UUID REFERENCES nurseries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parents_owner_nursery_id ON parents(owner_nursery_id);

-- Children-Parents: many-to-many junction table
CREATE TABLE children_parents (
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  PRIMARY KEY (child_id, parent_id)
);

-- ============================================================================
-- Staff
-- ============================================================================

CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID NOT NULL REFERENCES nurseries(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_admins_nursery_phone UNIQUE (nursery_id, phone)
);

CREATE INDEX idx_admins_nursery_id ON admins(nursery_id);
CREATE INDEX idx_admins_user_id ON admins(user_id);

CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID NOT NULL REFERENCES nurseries(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_teachers_nursery_phone UNIQUE (nursery_id, phone)
);

CREATE INDEX idx_teachers_nursery_id ON teachers(nursery_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);

-- Children-Teachers: many-to-many junction table
CREATE TABLE children_teachers (
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  PRIMARY KEY (child_id, teacher_id)
);

CREATE INDEX idx_children_teachers_teacher_id ON children_teachers(teacher_id);

-- ============================================================================
-- Daily Attendance & Workflow State
-- ============================================================================

CREATE TABLE daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Morning check-in: only first parent response is accepted
  parent_response TEXT CHECK (parent_response IN ('dropping_off', 'not_today')),
  parent_response_time TIMESTAMPTZ,
  parent_response_by UUID REFERENCES parents(id) ON DELETE SET NULL,
  parent_explanation TEXT,

  -- Teacher confirmation: any teacher of the child can confirm
  teacher_confirmed BOOLEAN DEFAULT FALSE,
  teacher_confirmed_time TIMESTAMPTZ,
  teacher_confirmed_by UUID REFERENCES teachers(id) ON DELETE SET NULL,

  -- 9am alert response: sent only to parents who responded in morning
  nine_am_alert_sent BOOLEAN DEFAULT FALSE,
  nine_am_parent_response TEXT CHECK (nine_am_parent_response IN ('in_class', 'with_me', 'other')),
  nine_am_parent_response_time TIMESTAMPTZ,
  nine_am_parent_response_by UUID REFERENCES parents(id) ON DELETE SET NULL,
  nine_am_explanation TEXT,

  -- Inconsistency tracking
  inconsistency BOOLEAN DEFAULT FALSE,
  inconsistency_type TEXT,
  inconsistency_resolved BOOLEAN DEFAULT FALSE,
  inconsistency_resolved_by UUID,
  inconsistency_resolved_at TIMESTAMPTZ,
  inconsistency_resolution TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (child_id, date)
);

CREATE INDEX idx_daily_attendance_child_id ON daily_attendance(child_id);
CREATE INDEX idx_daily_attendance_date ON daily_attendance(date);

-- WhatsApp conversation state: tracks per-parent conversation flow
CREATE TABLE conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  current_child_index INTEGER DEFAULT 0,
  state TEXT,
  verification_attempts INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_state_parent_id ON conversation_state(parent_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE nurseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- Admins can view their nursery
CREATE POLICY "admins_view_own_nursery" ON nurseries FOR SELECT
  USING (id IN (
    SELECT nursery_id FROM admins
    WHERE user_id = auth.uid()
  ));

-- Managers can view their nursery
CREATE POLICY "managers_view_own_nursery" ON nurseries FOR SELECT
  USING (id IN (
    SELECT nursery_id FROM teachers
    WHERE user_id = auth.uid()
  ));

-- Children scoped to nursery
CREATE POLICY "children_scoped_to_nursery" ON children FOR SELECT
  USING (nursery_id IN (
    SELECT nursery_id FROM admins WHERE user_id = auth.uid()
    UNION
    SELECT nursery_id FROM teachers WHERE user_id = auth.uid()
  ));

-- Parents scoped to owner nursery
CREATE POLICY "parents_scoped_to_owner_nursery" ON parents FOR SELECT
  USING (owner_nursery_id IN (
    SELECT nursery_id FROM admins WHERE user_id = auth.uid()
    UNION
    SELECT nursery_id FROM teachers WHERE user_id = auth.uid()
  ));

-- Children-Parents scoped by child's nursery
CREATE POLICY "children_parents_scoped" ON children_parents FOR SELECT
  USING (child_id IN (
    SELECT id FROM children WHERE nursery_id IN (
      SELECT nursery_id FROM admins WHERE user_id = auth.uid()
      UNION
      SELECT nursery_id FROM teachers WHERE user_id = auth.uid()
    )
  ));

-- Teachers scoped to nursery
CREATE POLICY "teachers_view_nursery_staff" ON teachers FOR SELECT
  USING (nursery_id IN (
    SELECT nursery_id FROM admins WHERE user_id = auth.uid()
    UNION
    SELECT nursery_id FROM teachers WHERE user_id = auth.uid()
  ));

-- Children-Teachers scoped by child's nursery
CREATE POLICY "children_teachers_scoped" ON children_teachers FOR SELECT
  USING (child_id IN (
    SELECT id FROM children WHERE nursery_id IN (
      SELECT nursery_id FROM admins WHERE user_id = auth.uid()
      UNION
      SELECT nursery_id FROM teachers WHERE user_id = auth.uid()
    )
  ));

-- Daily attendance scoped to nursery
CREATE POLICY "daily_attendance_scoped" ON daily_attendance FOR SELECT
  USING (child_id IN (
    SELECT id FROM children WHERE nursery_id IN (
      SELECT nursery_id FROM admins WHERE user_id = auth.uid()
      UNION
      SELECT nursery_id FROM teachers WHERE user_id = auth.uid()
    )
  ));

-- Conversation state: parents view their own, staff view their nursery's
CREATE POLICY "conversation_state_scoped" ON conversation_state FOR SELECT
  USING (
    parent_id IN (
      SELECT id FROM parents WHERE owner_nursery_id IN (
        SELECT nursery_id FROM admins WHERE user_id = auth.uid()
        UNION
        SELECT nursery_id FROM teachers WHERE user_id = auth.uid()
      )
    )
  );

-- Admins can modify their nursery
CREATE POLICY "admins_update_own_nursery" ON admins FOR UPDATE
  USING (nursery_id IN (
    SELECT nursery_id FROM admins WHERE user_id = auth.uid()
  ));

-- Teachers can update daily attendance for their nursery
CREATE POLICY "teachers_update_attendance" ON daily_attendance FOR UPDATE
  USING (child_id IN (
    SELECT id FROM children WHERE nursery_id IN (
      SELECT nursery_id FROM teachers WHERE user_id = auth.uid()
    )
  ));
