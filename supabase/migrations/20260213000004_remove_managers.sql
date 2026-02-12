-- Remove the manager role entirely.
-- Escalation alerts now go to admins; nursery settings become admin-only.

-- Drop manager RLS policies
DROP POLICY IF EXISTS admin_all_managers ON managers;
DROP POLICY IF EXISTS manager_select_nurseries ON nurseries;
DROP POLICY IF EXISTS manager_select_children ON children;
DROP POLICY IF EXISTS manager_insert_children ON children;
DROP POLICY IF EXISTS manager_update_children ON children;
DROP POLICY IF EXISTS manager_select_parents ON parents;
DROP POLICY IF EXISTS manager_insert_parents ON parents;
DROP POLICY IF EXISTS manager_update_parents ON parents;
DROP POLICY IF EXISTS manager_select_children_parents ON children_parents;
DROP POLICY IF EXISTS manager_insert_children_parents ON children_parents;
DROP POLICY IF EXISTS manager_update_children_parents ON children_parents;
DROP POLICY IF EXISTS manager_select_daily_attendance ON daily_attendance;
DROP POLICY IF EXISTS manager_update_daily_attendance ON daily_attendance;

-- Drop helper function
DROP FUNCTION IF EXISTS public.get_manager_nursery_id();

-- Drop managers table (CASCADE removes indexes and FK constraints)
DROP TABLE IF EXISTS managers CASCADE;
