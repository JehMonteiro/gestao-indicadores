CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION private.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('superadmin','admin_corporativo')
  )
$$;

CREATE OR REPLACE FUNCTION private.is_member_of_sector(_user_id uuid, _sector_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_sectors WHERE user_id = _user_id AND sector_id = _sector_id)
$$;

CREATE OR REPLACE FUNCTION private.is_manager_of_sector(_user_id uuid, _sector_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_sectors WHERE user_id = _user_id AND sector_id = _sector_id AND role = 'gestor')
$$;

CREATE OR REPLACE FUNCTION private.is_member_of_franchise(_user_id uuid, _franchise_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_franchises WHERE user_id = _user_id AND franchise_id = _franchise_id)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_member_of_sector(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_manager_of_sector(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_member_of_franchise(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_member_of_sector(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_manager_of_sector(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_member_of_franchise(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "settings admin update" ON public.app_settings;
CREATE POLICY "settings admin update" ON public.app_settings
  FOR UPDATE USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "audit read admin or auditor" ON public.audit_logs;
CREATE POLICY "audit read admin or auditor" ON public.audit_logs
  FOR SELECT USING (private.is_admin(auth.uid()) OR private.has_role(auth.uid(), 'auditor'::public.app_role));

DROP POLICY IF EXISTS "franchises admin manage" ON public.franchises;
CREATE POLICY "franchises admin manage" ON public.franchises
  FOR ALL USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "entries delete admin" ON public.indicator_entries;
CREATE POLICY "entries delete admin" ON public.indicator_entries
  FOR DELETE USING (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "entries read scope" ON public.indicator_entries;
CREATE POLICY "entries read scope" ON public.indicator_entries
  FOR SELECT USING (
    private.is_admin(auth.uid())
    OR (user_id = auth.uid())
    OR ((sector_id IS NOT NULL) AND private.is_member_of_sector(auth.uid(), sector_id))
    OR ((franchise_id IS NOT NULL) AND private.is_member_of_franchise(auth.uid(), franchise_id))
  );

DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;
CREATE POLICY "entries update own draft or manager" ON public.indicator_entries
  FOR UPDATE USING (
    (user_id = auth.uid()) OR private.is_admin(auth.uid())
    OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
  ) WITH CHECK (
    (user_id = auth.uid()) OR private.is_admin(auth.uid())
    OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
  );

DROP POLICY IF EXISTS "indicators admin or sector manager manage" ON public.indicators;
CREATE POLICY "indicators admin or sector manager manage" ON public.indicators
  FOR ALL USING (
    private.is_admin(auth.uid())
    OR ((owner_sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), owner_sector_id))
  ) WITH CHECK (
    private.is_admin(auth.uid())
    OR ((owner_sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), owner_sector_id))
  );

DROP POLICY IF EXISTS "indicators read scope" ON public.indicators;
CREATE POLICY "indicators read scope" ON public.indicators
  FOR SELECT USING (
    private.is_admin(auth.uid())
    OR (scope = 'corporativo'::public.indicator_scope)
    OR ((owner_sector_id IS NOT NULL) AND private.is_member_of_sector(auth.uid(), owner_sector_id))
  );

DROP POLICY IF EXISTS "notif insert admin" ON public.notifications;
CREATE POLICY "notif insert admin" ON public.notifications
  FOR INSERT WITH CHECK (private.is_admin(auth.uid()) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "profiles admin manage" ON public.profiles;
CREATE POLICY "profiles admin manage" ON public.profiles
  FOR ALL USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "sectors admin manage" ON public.sectors;
CREATE POLICY "sectors admin manage" ON public.sectors
  FOR ALL USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "targets manage admin/manager" ON public.targets;
CREATE POLICY "targets manage admin/manager" ON public.targets
  FOR ALL USING (
    private.is_admin(auth.uid())
    OR (EXISTS (SELECT 1 FROM public.indicators i
                WHERE i.id = targets.indicator_id
                  AND i.owner_sector_id IS NOT NULL
                  AND private.is_manager_of_sector(auth.uid(), i.owner_sector_id)))
  ) WITH CHECK (
    private.is_admin(auth.uid())
    OR (EXISTS (SELECT 1 FROM public.indicators i
                WHERE i.id = targets.indicator_id
                  AND i.owner_sector_id IS NOT NULL
                  AND private.is_manager_of_sector(auth.uid(), i.owner_sector_id)))
  );

DROP POLICY IF EXISTS "targets read via indicator" ON public.targets;
CREATE POLICY "targets read via indicator" ON public.targets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.indicators i
            WHERE i.id = targets.indicator_id
              AND (private.is_admin(auth.uid())
                   OR i.scope = 'corporativo'::public.indicator_scope
                   OR (i.owner_sector_id IS NOT NULL AND private.is_member_of_sector(auth.uid(), i.owner_sector_id))))
  );

DROP POLICY IF EXISTS "user_franchises admin manage" ON public.user_franchises;
CREATE POLICY "user_franchises admin manage" ON public.user_franchises
  FOR ALL USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_franchises read own or admin" ON public.user_franchises;
CREATE POLICY "user_franchises read own or admin" ON public.user_franchises
  FOR SELECT USING ((user_id = auth.uid()) OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "roles admin manage" ON public.user_roles;
CREATE POLICY "roles admin manage" ON public.user_roles
  FOR ALL USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "roles read own or admin" ON public.user_roles;
CREATE POLICY "roles read own or admin" ON public.user_roles
  FOR SELECT USING ((user_id = auth.uid()) OR private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_sectors admin manage" ON public.user_sectors;
CREATE POLICY "user_sectors admin manage" ON public.user_sectors
  FOR ALL USING (private.is_admin(auth.uid())) WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_sectors read own or admin" ON public.user_sectors;
CREATE POLICY "user_sectors read own or admin" ON public.user_sectors
  FOR SELECT USING ((user_id = auth.uid()) OR private.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.clear_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.indicator_entries WHERE is_demo = true;
  DELETE FROM public.targets WHERE is_demo = true;
  DELETE FROM public.indicators WHERE is_demo = true;
  DELETE FROM public.franchises WHERE is_demo = true;
  DELETE FROM public.sectors WHERE is_demo = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  INSERT INTO public.indicators (id, code, name, description, owner_sector_id, scope, value_type, unit, periodicity, direction, requires_approval, allows_attachment, status, created_by, is_demo) VALUES
    (i_fat, 'FAT', 'Faturamento mensal', 'Receita bruta mensal', s_com, 'franquia', 'moeda', 'BRL', 'mensal', 'maior_melhor', true, true, 'ativo', auth.uid(), true),
    (i_nc, 'NC', 'Novos clientes', 'Total de novos clientes no periodo', s_com, 'franquia', 'inteiro', 'clientes', 'mensal', 'maior_melhor', false, false, 'ativo', auth.uid(), true),
    (i_nps, 'NPS', 'NPS', 'Net Promoter Score', s_ops, 'franquia', 'inteiro', 'pts', 'mensal', 'maior_melhor', false, false, 'ativo', auth.uid(), true),
    (i_tic, 'TICKET', 'Ticket medio', 'Ticket medio por venda', s_com, 'franquia', 'moeda', 'BRL', 'mensal', 'maior_melhor', false, false, 'ativo', auth.uid(), true);

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
          VALUES (ind.id, fr, auth.uid(), ps, pe, round(val::numeric, 2),
                  CASE WHEN m = 0 THEN 'enviado'::entry_status ELSE 'aprovado'::entry_status END,
                  now(), true);
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.is_member_of_sector(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_manager_of_sector(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_member_of_franchise(uuid, uuid);

GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO authenticated;