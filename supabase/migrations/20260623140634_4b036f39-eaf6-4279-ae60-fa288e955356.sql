
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
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

GRANT EXECUTE ON FUNCTION public.seed_demo_data() TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.indicator_entries WHERE is_demo = true;
  DELETE FROM public.targets WHERE is_demo = true;
  DELETE FROM public.indicators WHERE is_demo = true;
  DELETE FROM public.franchises WHERE is_demo = true;
  DELETE FROM public.sectors WHERE is_demo = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_demo_data() TO authenticated;
