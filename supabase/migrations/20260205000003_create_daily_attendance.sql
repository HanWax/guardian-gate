-- Daily attendance: tracks full lifecycle of each child's attendance per day

CREATE TABLE daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Morning check-in
  parent_response TEXT CHECK (parent_response IN ('dropping_off', 'not_today')),
  parent_response_time TIMESTAMPTZ,
  parent_explanation TEXT,

  -- Teacher confirmation
  teacher_confirmed BOOLEAN DEFAULT FALSE,
  teacher_confirmed_time TIMESTAMPTZ,
  teacher_confirmed_by UUID REFERENCES teachers(id),

  -- 9am alert response
  nine_am_alert_sent BOOLEAN DEFAULT FALSE,
  nine_am_parent_response TEXT CHECK (nine_am_parent_response IN ('in_class', 'with_me', 'other')),
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
