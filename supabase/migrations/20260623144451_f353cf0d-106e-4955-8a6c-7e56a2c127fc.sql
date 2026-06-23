
-- 1) Profiles: restrict SELECT to own row (admins covered by existing admin policy)
DROP POLICY IF EXISTS "profiles select all auth" ON public.profiles;
CREATE POLICY "profiles select own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 2) Audit logs: remove user INSERT policy; create controlled RPC
DROP POLICY IF EXISTS "audit insert auth" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _entity_type text,
  _entity_id uuid,
  _payload jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, payload)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _payload);
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO authenticated;

-- 3) Remove public/authenticated EXECUTE on sensitive SECURITY DEFINER functions.
--    Helper functions (has_role, is_admin, is_member_*) must stay callable for RLS evaluation.
REVOKE ALL ON FUNCTION public.seed_demo_data() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_demo_data() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- service_role retains access for admin use; trigger executes as definer
GRANT EXECUTE ON FUNCTION public.seed_demo_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_demo_data() TO service_role;
