-- Staff tables: managers and teachers linked to nurseries and auth.users

-- Managers: one per nursery, linked to Supabase auth for dashboard login
CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID NOT NULL REFERENCES nurseries(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_managers_nursery_id ON managers(nursery_id);
CREATE INDEX idx_managers_user_id ON managers(user_id);

-- Teachers: one or more per nursery, linked to Supabase auth for dashboard login
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID NOT NULL REFERENCES nurseries(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teachers_nursery_id ON teachers(nursery_id);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
