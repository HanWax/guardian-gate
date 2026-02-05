-- Core entity tables: nurseries, children, parents, children_parents

-- Nurseries: root entity with configurable schedule times
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

-- Children: belong to a nursery
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID NOT NULL REFERENCES nurseries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_nursery_id ON children(nursery_id);

-- Parents: identified by unique phone number (WhatsApp)
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children-Parents: many-to-many junction table
CREATE TABLE children_parents (
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  PRIMARY KEY (child_id, parent_id)
);
