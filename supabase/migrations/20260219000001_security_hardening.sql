-- Security hardening:
-- 1) resolve roles from server-controlled tables (not JWT user metadata)
-- 2) enable RLS and least-privilege policies for tables added after initial RLS migration

CREATE OR REPLACE FUNCTION public.get_admin_nursery_id()
RETURNS UUID AS $$
  SELECT nursery_id
  FROM public.admins
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.admins a
      WHERE a.user_id = auth.uid()
    ) THEN 'admin'
    WHEN EXISTS (
      SELECT 1
      FROM public.teachers t
      WHERE t.user_id = auth.uid()
    ) THEN 'teacher'
    ELSE ''
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morning_message_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admins_select_self ON public.admins;
CREATE POLICY admins_select_self ON public.admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS admins_select_morning_message_runs_by_nursery ON public.morning_message_runs;
CREATE POLICY admins_select_morning_message_runs_by_nursery ON public.morning_message_runs
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'admin'
    AND nursery_id = public.get_admin_nursery_id()
  );

REVOKE ALL ON TABLE public.admins FROM anon;
REVOKE ALL ON TABLE public.admins FROM authenticated;
GRANT SELECT ON TABLE public.admins TO authenticated;

REVOKE ALL ON TABLE public.morning_message_runs FROM anon;
REVOKE ALL ON TABLE public.morning_message_runs FROM authenticated;
GRANT SELECT ON TABLE public.morning_message_runs TO authenticated;
