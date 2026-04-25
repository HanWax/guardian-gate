-- Ensure create_child_with_parents works with children.teacher_id NOT NULL.
-- Adds required p_teacher_id argument and validates teacher belongs to nursery.

CREATE OR REPLACE FUNCTION create_child_with_parents(
  p_name TEXT,
  p_nursery_id UUID,
  p_parent_ids UUID[],
  p_teacher_id UUID
) RETURNS UUID AS $$
DECLARE
  v_child_id UUID;
  v_parent_id UUID;
  v_teacher_nursery_id UUID;
BEGIN
  IF array_length(p_parent_ids, 1) IS NULL OR array_length(p_parent_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one parent is required';
  END IF;

  IF p_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Teacher is required';
  END IF;

  SELECT nursery_id
  INTO v_teacher_nursery_id
  FROM teachers
  WHERE id = p_teacher_id;

  IF v_teacher_nursery_id IS NULL THEN
    RAISE EXCEPTION 'Teacher not found';
  END IF;

  IF v_teacher_nursery_id <> p_nursery_id THEN
    RAISE EXCEPTION 'Teacher does not belong to nursery';
  END IF;

  INSERT INTO children (name, nursery_id, teacher_id)
  VALUES (p_name, p_nursery_id, p_teacher_id)
  RETURNING id INTO v_child_id;

  FOREACH v_parent_id IN ARRAY p_parent_ids LOOP
    INSERT INTO children_parents (child_id, parent_id) VALUES (v_child_id, v_parent_id);
  END LOOP;

  RETURN v_child_id;
END;
$$ LANGUAGE plpgsql;
