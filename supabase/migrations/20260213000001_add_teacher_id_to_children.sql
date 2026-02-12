ALTER TABLE children ADD COLUMN teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;
CREATE INDEX idx_children_teacher_id ON children(teacher_id);
