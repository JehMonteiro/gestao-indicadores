
-- Convert callable public SECURITY DEFINER functions to SECURITY INVOKER
-- (callers have sufficient privileges via RLS; internal role checks remain).
ALTER FUNCTION public.log_audit(text, text, uuid, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.clear_demo_data() SECURITY INVOKER;
ALTER FUNCTION public.seed_demo_data() SECURITY INVOKER;

-- log_audit now runs as the caller, so audit_logs needs an INSERT path scoped to the caller.
GRANT INSERT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "audit insert self" ON public.audit_logs;
CREATE POLICY "audit insert self"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- handle_new_user is a trigger fired from the auth schema and must keep SECURITY DEFINER,
-- but it does not need to be callable directly by API roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
