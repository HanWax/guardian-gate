-- Make teacher_id required on children
-- First assign any unassigned children to the first teacher in their nursery
UPDATE children
SET teacher_id = (
  SELECT t.id FROM teachers t
  WHERE t.nursery_id = children.nursery_id
  ORDER BY t.created_at ASC
  LIMIT 1
)
WHERE teacher_id IS NULL;

-- Now add the NOT NULL constraint
ALTER TABLE children ALTER COLUMN teacher_id SET NOT NULL;
