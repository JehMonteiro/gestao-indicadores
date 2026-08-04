-- 1. Auditoria de arredondamento
CREATE TABLE public.integer_rounding_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value numeric NOT NULL,
  new_value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.integer_rounding_log TO authenticated;
GRANT ALL ON public.integer_rounding_log TO service_role;

ALTER TABLE public.integer_rounding_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rounding log read admin or auditor"
ON public.integer_rounding_log
FOR SELECT
TO authenticated
USING (private.is_admin(auth.uid()) OR private.has_role(auth.uid(), 'auditor'::app_role));

-- 2. Regra central: quais tipos exigem inteiro
CREATE OR REPLACE FUNCTION public.value_type_requires_integer(_vt public.value_type)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _vt IN ('inteiro'::public.value_type, 'moeda'::public.value_type);
$$;

-- 3. Backfill com log
WITH aff AS (
  SELECT id, default_target, minimum_value, maximum_value
  FROM public.indicators
  WHERE public.value_type_requires_integer(value_type)
),
logged AS (
  INSERT INTO public.integer_rounding_log (table_name, record_id, field_name, old_value, new_value)
  SELECT 'indicators', id, f.field, f.val, round(f.val)
  FROM aff
  CROSS JOIN LATERAL (VALUES
    ('default_target', default_target),
    ('minimum_value', minimum_value),
    ('maximum_value', maximum_value)
  ) AS f(field, val)
  WHERE f.val IS NOT NULL AND f.val <> round(f.val)
  RETURNING 1
)
UPDATE public.indicators i
SET default_target = round(i.default_target),
    minimum_value = round(i.minimum_value),
    maximum_value = round(i.maximum_value)
WHERE public.value_type_requires_integer(i.value_type)
  AND (i.default_target <> round(i.default_target)
    OR i.minimum_value <> round(i.minimum_value)
    OR i.maximum_value <> round(i.maximum_value));

WITH aff AS (
  SELECT t.id, t.target_value, t.min_value, t.max_value
  FROM public.targets t
  JOIN public.indicators i ON i.id = t.indicator_id
  WHERE public.value_type_requires_integer(i.value_type)
),
logged AS (
  INSERT INTO public.integer_rounding_log (table_name, record_id, field_name, old_value, new_value)
  SELECT 'targets', id, f.field, f.val, round(f.val)
  FROM aff
  CROSS JOIN LATERAL (VALUES
    ('target_value', target_value),
    ('min_value', min_value),
    ('max_value', max_value)
  ) AS f(field, val)
  WHERE f.val IS NOT NULL AND f.val <> round(f.val)
  RETURNING 1
)
UPDATE public.targets t
SET target_value = round(t.target_value),
    min_value = round(t.min_value),
    max_value = round(t.max_value)
FROM public.indicators i
WHERE i.id = t.indicator_id
  AND public.value_type_requires_integer(i.value_type)
  AND (t.target_value <> round(t.target_value)
    OR t.min_value <> round(t.min_value)
    OR t.max_value <> round(t.max_value));

WITH aff AS (
  SELECT e.id, e.actual_value
  FROM public.indicator_entries e
  JOIN public.indicators i ON i.id = e.indicator_id
  WHERE public.value_type_requires_integer(i.value_type)
    AND e.actual_value <> round(e.actual_value)
),
logged AS (
  INSERT INTO public.integer_rounding_log (table_name, record_id, field_name, old_value, new_value)
  SELECT 'indicator_entries', id, 'actual_value', actual_value, round(actual_value)
  FROM aff
  RETURNING 1
)
UPDATE public.indicator_entries e
SET actual_value = round(e.actual_value)
WHERE e.id IN (SELECT id FROM aff);

-- 4. Gatilhos de validação
CREATE OR REPLACE FUNCTION public.enforce_indicator_integer_values()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.value_type_requires_integer(NEW.value_type) THEN
    IF NEW.default_target IS NOT NULL AND NEW.default_target <> round(NEW.default_target) THEN
      RAISE EXCEPTION 'A meta padrão deve ser um número inteiro para este tipo de valor.';
    END IF;
    IF NEW.minimum_value IS NOT NULL AND NEW.minimum_value <> round(NEW.minimum_value) THEN
      RAISE EXCEPTION 'O valor mínimo deve ser um número inteiro para este tipo de valor.';
    END IF;
    IF NEW.maximum_value IS NOT NULL AND NEW.maximum_value <> round(NEW.maximum_value) THEN
      RAISE EXCEPTION 'O valor máximo deve ser um número inteiro para este tipo de valor.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_indicators_integer_values
BEFORE INSERT OR UPDATE ON public.indicators
FOR EACH ROW EXECUTE FUNCTION public.enforce_indicator_integer_values();

CREATE OR REPLACE FUNCTION public.enforce_target_integer_values()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  vt public.value_type;
BEGIN
  SELECT value_type INTO vt FROM public.indicators WHERE id = NEW.indicator_id;
  IF vt IS NOT NULL AND public.value_type_requires_integer(vt) THEN
    IF NEW.target_value IS NOT NULL AND NEW.target_value <> round(NEW.target_value) THEN
      RAISE EXCEPTION 'O valor da meta deve ser um número inteiro para este indicador.';
    END IF;
    IF NEW.min_value IS NOT NULL AND NEW.min_value <> round(NEW.min_value) THEN
      RAISE EXCEPTION 'O valor mínimo da meta deve ser um número inteiro para este indicador.';
    END IF;
    IF NEW.max_value IS NOT NULL AND NEW.max_value <> round(NEW.max_value) THEN
      RAISE EXCEPTION 'O valor máximo da meta deve ser um número inteiro para este indicador.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_targets_integer_values
BEFORE INSERT OR UPDATE ON public.targets
FOR EACH ROW EXECUTE FUNCTION public.enforce_target_integer_values();

CREATE OR REPLACE FUNCTION public.enforce_entry_integer_values()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  vt public.value_type;
BEGIN
  SELECT value_type INTO vt FROM public.indicators WHERE id = NEW.indicator_id;
  IF vt IS NOT NULL AND public.value_type_requires_integer(vt)
     AND NEW.actual_value IS NOT NULL AND NEW.actual_value <> round(NEW.actual_value) THEN
    RAISE EXCEPTION 'O valor realizado deve ser um número inteiro para este indicador.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entries_integer_values
BEFORE INSERT OR UPDATE ON public.indicator_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_entry_integer_values();

-- 5. Dados de demonstração com valores inteiros
CREATE OR REPLACE FUNCTION public.seed_demo_data()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  s_com uuid := gen_random_uuid();
  s_mkt uuid := gen_random_uuid();
  s_ops uuid := gen_random_uuid();
  s_fin uuid := gen_random_uuid();
  f_camp uuid := gen_random_uuid();
  f_bh uuid := gen_random_uuid();
  f_sp uuid := gen_random_uuid();
  i_fat uuid := gen_random_uuid();
  i_nc uuid := gen_random_uuid();
  i_nps uuid := gen_random_uuid();
  i_tic uuid := gen_random_uuid();
  fr uuid;
  ind record;
  m int;
  ps date;
  pe date;
  tgt numeric;
  val numeric;
BEGIN
  IF NOT private.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.sectors (id, code, name, description, color, status, is_demo) VALUES
    (s_com, 'COM', 'Comercial', 'Vendas e prospects', '#2563eb', 'ativo', true),
    (s_mkt, 'MKT', 'Marketing', 'Aquisicao e branding', '#db2777', 'ativo', true),
    (s_ops, 'OPS', 'Operacoes', 'Operacoes internas', '#0d9488', 'ativo', true),
    (s_fin, 'FIN', 'Financeiro', 'Financeiro', '#16a34a', 'ativo', true);

  INSERT INTO public.franchises (id, code, name, city, state, opened_at, status, is_demo) VALUES
    (f_camp, 'CAMP', 'Campinas Centro', 'Campinas', 'SP', current_date - interval '2 years', 'ativo', true),
    (f_bh, 'BH', 'Belo Horizonte Savassi', 'Belo Horizonte', 'MG', current_date - interval '1 year', 'ativo', true),
    (f_sp, 'SP', 'Sao Paulo Pinheiros', 'Sao Paulo', 'SP', current_date - interval '6 months', 'ativo', true);

  INSERT INTO public.indicators (id, code, name, description, owner_sector_id, scope, value_type, unit, periodicity, direction, allows_attachment, status, created_by, is_demo) VALUES
    (i_fat, 'FAT', 'Faturamento mensal', 'Receita bruta mensal', s_com, 'franquia', 'moeda', 'BRL', 'mensal', 'maior_melhor', true, 'ativo', auth.uid(), true),
    (i_nc, 'NC', 'Novos clientes', 'Total de novos clientes no periodo', s_com, 'franquia', 'inteiro', 'clientes', 'mensal', 'maior_melhor', false, 'ativo', auth.uid(), true),
    (i_nps, 'NPS', 'NPS', 'Net Promoter Score', s_ops, 'franquia', 'inteiro', 'pts', 'mensal', 'maior_melhor', false, 'ativo', auth.uid(), true),
    (i_tic, 'TICKET', 'Ticket medio', 'Ticket medio por venda', s_com, 'franquia', 'moeda', 'BRL', 'mensal', 'maior_melhor', false, 'ativo', auth.uid(), true);

  FOR m IN 0..2 LOOP
    ps := (date_trunc('month', current_date) - (m || ' months')::interval)::date;
    pe := (date_trunc('month', current_date) - (m || ' months')::interval + interval '1 month - 1 day')::date;
    FOR fr IN SELECT unnest(ARRAY[f_camp, f_bh, f_sp]) LOOP
      FOR ind IN SELECT * FROM (VALUES
        (i_fat, 80000::numeric),
        (i_nc, 50::numeric),
        (i_nps, 70::numeric),
        (i_tic, 250::numeric)
      ) AS t(id, target) LOOP
        tgt := round(ind.target);
        val := round(ind.target * (0.7 + random() * 0.5));
        INSERT INTO public.targets (indicator_id, franchise_id, period_start, period_end, target_value, created_by, is_demo)
          VALUES (ind.id, fr, ps, pe, tgt, auth.uid(), true);
        INSERT INTO public.indicator_entries (indicator_id, franchise_id, user_id, period_start, period_end, actual_value, status, submitted_at, is_demo)
          VALUES (ind.id, fr, auth.uid(), ps, pe, val, 'registrado'::entry_status, now(), true);
      END LOOP;
    END LOOP;
  END LOOP;
END;
$function$;