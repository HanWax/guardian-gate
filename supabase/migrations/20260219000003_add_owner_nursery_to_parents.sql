-- Allow newly-created parents to remain visible/editable before child assignment.
-- Parents now carry owner_nursery_id for nursery-scoped ownership.

ALTER TABLE parents
  ADD COLUMN owner_nursery_id UUID REFERENCES nurseries(id) ON DELETE SET NULL;

CREATE INDEX idx_parents_owner_nursery_id ON parents(owner_nursery_id);

-- Backfill ownership for already-linked parents.
UPDATE parents p
SET owner_nursery_id = src.nursery_id
FROM (
  SELECT
    cp.parent_id,
    (ARRAY_AGG(DISTINCT c.nursery_id))[1] AS nursery_id,
    COUNT(DISTINCT c.nursery_id) AS nursery_count
  FROM children_parents cp
  JOIN children c ON c.id = cp.child_id
  GROUP BY cp.parent_id
) AS src
WHERE p.id = src.parent_id
  AND src.nursery_count = 1
  AND p.owner_nursery_id IS NULL;
