-- 1. drop policies that reference approval columns/enum values
DROP POLICY IF EXISTS "entries insert own" ON public.indicator_entries;
DROP POLICY IF EXISTS "entries update authenticated" ON public.indicator_entries;

-- 2. drop approval guard triggers/function
DROP TRIGGER IF EXISTS indicator_entries_guard_status ON public.indicator_entries;
DROP TRIGGER IF EXISTS indicator_entries_guard_status_trg ON public.indicator_entries;
DROP FUNCTION IF EXISTS public.indicator_entries_guard_status();

-- 3. enum migration
ALTER TABLE public.indicator_entries ALTER COLUMN status DROP DEFAULT;
CREATE TYPE public.entry_status_new AS ENUM ('rascunho', 'registrado', 'atrasado');
ALTER TABLE public.indicator_entries
  ALTER COLUMN status TYPE public.entry_status_new
  USING (
    CASE status::text
      WHEN 'enviado' THEN 'registrado'
      WHEN 'aprovado' THEN 'registrado'
      WHEN 'rejeitado' THEN 'rascunho'
      WHEN 'atrasado' THEN 'atrasado'
      ELSE 'rascunho'
    END
  )::public.entry_status_new;
DROP TYPE public.entry_status;
ALTER TYPE public.entry_status_new RENAME TO entry_status;
ALTER TABLE public.indicator_entries ALTER COLUMN status SET DEFAULT 'rascunho'::public.entry_status;

-- 4. drop approval columns
ALTER TABLE public.indicator_entries
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS rejection_reason;

ALTER TABLE public.indicators DROP COLUMN IF EXISTS requires_approval;

-- 5. recreate policies without approval logic
CREATE POLICY "entries insert own" ON public.indicator_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      private.is_admin(auth.uid())
      OR (
        ((sector_id IS NULL) OR private.is_member_of_sector(auth.uid(), sector_id))
        AND ((franchise_id IS NULL) OR private.is_member_of_franchise(auth.uid(), franchise_id))
        AND EXISTS (
          SELECT 1 FROM public.indicators i
          WHERE i.id = indicator_entries.indicator_id
            AND i.status = 'ativo'::indicator_status
            AND (
              i.scope = 'corporativo'::indicator_scope
              OR (i.owner_sector_id IS NOT NULL AND private.is_member_of_sector(auth.uid(), i.owner_sector_id))
              OR (indicator_entries.sector_id IS NOT NULL AND private.is_member_of_sector(auth.uid(), indicator_entries.sector_id))
              OR (i.franchise_id IS NOT NULL AND private.is_member_of_franchise(auth.uid(), i.franchise_id))
              OR (indicator_entries.franchise_id IS NOT NULL AND private.is_member_of_franchise(auth.uid(), indicator_entries.franchise_id))
            )
        )
      )
    )
  );

CREATE POLICY "entries update scope" ON public.indicator_entries
  FOR UPDATE TO authenticated
  USING (
    private.is_admin(auth.uid())
    OR user_id = auth.uid()
    OR (sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), sector_id))
    OR (franchise_id IS NOT NULL AND private.is_manager_of_franchise(auth.uid(), franchise_id))
  )
  WITH CHECK (
    private.is_admin(auth.uid())
    OR user_id = auth.uid()
    OR (sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), sector_id))
    OR (franchise_id IS NOT NULL AND private.is_manager_of_franchise(auth.uid(), franchise_id))
  );

-- 6. demo seed uses new status and no requires_approval
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
        tgt := ind.target;
        val := tgt * (0.7 + random() * 0.5);
        INSERT INTO public.targets (indicator_id, franchise_id, period_start, period_end, target_value, created_by, is_demo)
          VALUES (ind.id, fr, ps, pe, tgt, auth.uid(), true);
        INSERT INTO public.indicator_entries (indicator_id, franchise_id, user_id, period_start, period_end, actual_value, status, submitted_at, is_demo)
          VALUES (ind.id, fr, auth.uid(), ps, pe, round(val::numeric, 2), 'registrado'::entry_status, now(), true);
      END LOOP;
    END LOOP;
  END LOOP;
END;
$function$;

-- 7. audit log allowlist without approval actions
CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity_type text, _entity_id uuid, _payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
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