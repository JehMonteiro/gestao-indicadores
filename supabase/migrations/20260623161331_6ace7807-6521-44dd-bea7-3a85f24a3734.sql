
-- 1. indicator_entries UPDATE policy: WITH CHECK blocks owner from setting aprovado/rejeitado
DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;
CREATE POLICY "entries update own draft or manager" ON public.indicator_entries
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid()) OR private.is_admin(auth.uid())
    OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
  )
  WITH CHECK (
    private.is_admin(auth.uid())
    OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
    OR (
      user_id = auth.uid()
      AND status IN ('rascunho'::public.entry_status, 'enviado'::public.entry_status)
    )
  );

-- 2. audit_logs: remove direct insert access; route all writes through SECURITY DEFINER RPC
DROP POLICY IF EXISTS "audit insert self" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _action IS NULL OR _action NOT IN ('create','update','delete','submit','draft','approve','reject','login','logout') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;
  IF _entity_type IS NULL OR _entity_type NOT IN ('indicator','entry','target','sector','franchise','user','profile','settings','notification') THEN
    RAISE EXCEPTION 'invalid entity_type';
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, payload)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _payload);
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO authenticated;

-- 3. notifications: insert only by admins (or service_role)
DROP POLICY IF EXISTS "notif insert admin" ON public.notifications;
CREATE POLICY "notif insert admin" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin(auth.uid()));
