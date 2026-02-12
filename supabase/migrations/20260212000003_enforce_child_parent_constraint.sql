-- Enforce: every child must have at least one parent
-- 1) RPC for atomic child + parents insert
-- 2) Deferred constraint trigger on children INSERT
-- 3) Constraint trigger to prevent removing last parent

-- ============================================================
-- 1. RPC: create_child_with_parents
-- ============================================================

CREATE OR REPLACE FUNCTION create_child_with_parents(
  p_name TEXT,
  p_nursery_id UUID,
  p_parent_ids UUID[]
) RETURNS UUID AS $$
DECLARE
  v_child_id UUID;
  v_parent_id UUID;
BEGIN
  IF array_length(p_parent_ids, 1) IS NULL OR array_length(p_parent_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one parent is required';
  END IF;

  INSERT INTO children (name, nursery_id) VALUES (p_name, p_nursery_id)
    RETURNING id INTO v_child_id;

  FOREACH v_parent_id IN ARRAY p_parent_ids LOOP
    INSERT INTO children_parents (child_id, parent_id) VALUES (v_child_id, v_parent_id);
  END LOOP;

  RETURN v_child_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Deferred constraint trigger: child must have parent after insert
-- ============================================================

CREATE OR REPLACE FUNCTION check_child_has_parent() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM children_parents WHERE child_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Child must have at least one parent';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_child_must_have_parent
  AFTER INSERT ON children DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_child_has_parent();

-- ============================================================
-- 3. Constraint trigger: prevent removing last parent
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_last_parent_removal() RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM children_parents WHERE child_id = OLD.child_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last parent from a child';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_prevent_last_parent_removal
  AFTER DELETE ON children_parents
  FOR EACH ROW EXECUTE FUNCTION prevent_last_parent_removal();
