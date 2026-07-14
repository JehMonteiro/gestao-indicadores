
-- 1) Scope policies to authenticated instead of public
ALTER POLICY "settings admin update" ON public.app_settings TO authenticated;

ALTER POLICY "audit read admin or auditor" ON public.audit_logs TO authenticated;

ALTER POLICY "franchises admin manage" ON public.franchises TO authenticated;

ALTER POLICY "entries delete admin" ON public.indicator_entries TO authenticated;
ALTER POLICY "entries read scope" ON public.indicator_entries TO authenticated;

ALTER POLICY "indicators admin or sector manager manage" ON public.indicators TO authenticated;
ALTER POLICY "indicators read scope" ON public.indicators TO authenticated;

ALTER POLICY "profiles admin manage" ON public.profiles TO authenticated;

ALTER POLICY "sectors admin manage" ON public.sectors TO authenticated;

ALTER POLICY "targets manage admin/manager" ON public.targets TO authenticated;
ALTER POLICY "targets read via indicator" ON public.targets TO authenticated;

ALTER POLICY "user_franchises admin manage" ON public.user_franchises TO authenticated;
ALTER POLICY "user_franchises read own or admin" ON public.user_franchises TO authenticated;

ALTER POLICY "roles admin manage" ON public.user_roles TO authenticated;
ALTER POLICY "roles read own or admin" ON public.user_roles TO authenticated;

ALTER POLICY "user_sectors admin manage" ON public.user_sectors TO authenticated;
ALTER POLICY "user_sectors read own or admin" ON public.user_sectors TO authenticated;

-- 2) Convert log_audit to SECURITY INVOKER and allow signed-in users to insert their own audit rows.
CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
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

-- Ensure signed-in users can insert their own audit rows (function runs as invoker now).
GRANT INSERT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "audit insert own" ON public.audit_logs;
CREATE POLICY "audit insert own"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
