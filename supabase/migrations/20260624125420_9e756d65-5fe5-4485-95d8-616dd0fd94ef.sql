
-- 1. Tighten indicator_entries UPDATE: explicitly forbid owners from setting aprovado/rejeitado
DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;
CREATE POLICY "entries update own draft or manager"
ON public.indicator_entries
FOR UPDATE
USING (
  private.is_admin(auth.uid())
  OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR ((user_id = auth.uid()) AND (status = ANY (ARRAY['rascunho'::entry_status,'rejeitado'::entry_status,'enviado'::entry_status])))
)
WITH CHECK (
  (private.is_admin(auth.uid()) OR user_id <> auth.uid() OR status <> ALL (ARRAY['aprovado'::entry_status,'rejeitado'::entry_status]))
  AND (
    private.is_admin(auth.uid())
    OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
    OR (
      (user_id = auth.uid())
      AND (status = ANY (ARRAY['rascunho'::entry_status,'enviado'::entry_status]))
      AND approved_by IS NULL
      AND approved_at IS NULL
      AND rejection_reason IS NULL
    )
  )
);

-- 2. Franchise read gap: helper + fix read policy
CREATE OR REPLACE FUNCTION private.is_manager_of_franchise(_user_id uuid, _franchise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_franchises uf
    WHERE uf.user_id = _user_id
      AND uf.franchise_id = _franchise_id
      AND uf.role IN ('gestor'::franchise_role, 'franqueado'::franchise_role)
  );
$$;
REVOKE EXECUTE ON FUNCTION private.is_manager_of_franchise(uuid, uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "entries read scope" ON public.indicator_entries;
CREATE POLICY "entries read scope"
ON public.indicator_entries
FOR SELECT
USING (
  private.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR ((franchise_id IS NOT NULL) AND private.is_manager_of_franchise(auth.uid(), franchise_id))
);

-- 3 & 4. log_audit -> SECURITY INVOKER; grant + RLS so authenticated users can insert their own audit rows
GRANT INSERT ON public.audit_logs TO authenticated;
DROP POLICY IF EXISTS "audit insert own" ON public.audit_logs;
CREATE POLICY "audit insert own"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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
