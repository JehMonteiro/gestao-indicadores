
-- Audit log allowlist
CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
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

-- Status transition guard for indicator_entries
CREATE OR REPLACE FUNCTION public.indicator_entries_guard_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_priv boolean;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.approved_by IS NOT DISTINCT FROM OLD.approved_by
     AND NEW.approved_at IS NOT DISTINCT FROM OLD.approved_at
     AND NEW.rejection_reason IS NOT DISTINCT FROM OLD.rejection_reason
     AND NEW.submitted_at IS NOT DISTINCT FROM OLD.submitted_at THEN
    RETURN NEW;
  END IF;

  is_priv := private.is_admin(auth.uid())
             OR (NEW.sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), NEW.sector_id))
             OR (OLD.sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), OLD.sector_id));

  IF is_priv THEN
    -- managers cannot self-approve their own entries; admins can
    IF NEW.status = 'aprovado'
       AND OLD.user_id = auth.uid()
       AND NOT private.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'cannot self-approve own entry';
    END IF;
    RETURN NEW;
  END IF;

  -- owner path: allow only resubmission with no approval metadata
  IF OLD.user_id = auth.uid()
     AND NEW.status = 'enviado'
     AND OLD.status IN ('rascunho','rejeitado')
     AND NEW.approved_by IS NULL
     AND NEW.approved_at IS NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'forbidden status transition for indicator_entries';
END;
$$;

DROP TRIGGER IF EXISTS indicator_entries_guard_status ON public.indicator_entries;
CREATE TRIGGER indicator_entries_guard_status
  BEFORE UPDATE ON public.indicator_entries
  FOR EACH ROW EXECUTE FUNCTION public.indicator_entries_guard_status();
