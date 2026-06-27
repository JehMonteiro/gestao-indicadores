DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;

CREATE POLICY "entries update own draft or manager"
ON public.indicator_entries
FOR UPDATE
TO authenticated
USING (
  private.is_admin(auth.uid())
  OR (
    sector_id IS NOT NULL
    AND private.is_manager_of_sector(auth.uid(), sector_id)
    AND user_id <> auth.uid()
  )
  OR (
    user_id = auth.uid()
    AND status = ANY (ARRAY['rascunho'::entry_status, 'rejeitado'::entry_status])
  )
)
WITH CHECK (
  private.is_admin(auth.uid())
  OR (
    sector_id IS NOT NULL
    AND private.is_manager_of_sector(auth.uid(), sector_id)
    AND user_id <> auth.uid()
    AND status = ANY (ARRAY['aprovado'::entry_status, 'rejeitado'::entry_status, 'enviado'::entry_status])
  )
  OR (
    user_id = auth.uid()
    AND status = ANY (ARRAY['rascunho'::entry_status, 'enviado'::entry_status])
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND rejection_reason IS NULL
  )
);

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allowed_pairs CONSTANT text[] := ARRAY[
    'create:indicator','update:indicator','delete:indicator',
    'create:entry','update:entry','delete:entry','submit:entry','draft:entry','approve:entry','reject:entry',
    'create:target','update:target','delete:target',
    'create:sector','update:sector','delete:sector',
    'create:franchise','update:franchise','delete:franchise',
    'create:user','update:user','delete:user',
    'update:profile','update:settings',
    'create:notification','update:notification',
    'login:user','logout:user'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _action IS NULL OR _entity_type IS NULL THEN
    RAISE EXCEPTION 'action and entity_type required';
  END IF;
  IF NOT ((_action || ':' || _entity_type) = ANY (allowed_pairs)) THEN
    RAISE EXCEPTION 'invalid (action, entity_type) pair';
  END IF;
  IF _payload IS NOT NULL AND pg_column_size(_payload) > 8192 THEN
    RAISE EXCEPTION 'payload too large';
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, payload)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _payload);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO authenticated;