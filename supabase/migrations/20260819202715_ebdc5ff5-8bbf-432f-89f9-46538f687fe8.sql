-- 1) Audit logs: no direct client inserts; only the validated log_audit function
DROP POLICY IF EXISTS "audit insert own" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed_pairs CONSTANT text[] := ARRAY[
    'create:indicator','update:indicator','delete:indicator',
    'create:entry','update:entry','delete:entry','submit:entry','draft:entry',
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

-- 2) Chamados: only roles allowed to manage tickets may import them
DROP POLICY IF EXISTS "Autenticados podem inserir chamados" ON public.chamados;
CREATE POLICY "Gestores e admins podem importar chamados"
ON public.chamados
FOR INSERT
TO authenticated
WITH CHECK (
  importado_por = auth.uid()
  AND (
    private.has_role(auth.uid(), 'superadmin'::app_role)
    OR private.has_role(auth.uid(), 'admin_corporativo'::app_role)
    OR private.has_role(auth.uid(), 'gestor_setor'::app_role)
  )
);