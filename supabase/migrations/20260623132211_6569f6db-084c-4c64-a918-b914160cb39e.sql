
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM (
  'superadmin','admin_corporativo','gestor_setor','gestor_franquia',
  'analista','colaborador','franqueado','auditor'
);
CREATE TYPE public.sector_role AS ENUM ('gestor','analista','colaborador','leitor');
CREATE TYPE public.franchise_role AS ENUM ('franqueado','gestor','operador','leitor');
CREATE TYPE public.indicator_status AS ENUM ('rascunho','ativo','pausado','arquivado');
CREATE TYPE public.indicator_scope AS ENUM ('corporativo','setor','franquia');
CREATE TYPE public.indicator_direction AS ENUM ('maior_melhor','menor_melhor','faixa_ideal','meta_exata');
CREATE TYPE public.value_type AS ENUM ('inteiro','decimal','percentual','moeda');
CREATE TYPE public.periodicity AS ENUM ('diaria','semanal','mensal','trimestral','semestral','anual');
CREATE TYPE public.entry_status AS ENUM ('rascunho','enviado','aprovado','rejeitado','atrasado');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES (global) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('superadmin','admin_corporativo')
  )
$$;

-- ============ SECTORS ============
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  status TEXT NOT NULL DEFAULT 'ativo',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sectors TO authenticated;
GRANT ALL ON public.sectors TO service_role;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sectors_updated BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FRANCHISES ============
CREATE TABLE public.franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  opened_at DATE,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.franchises TO authenticated;
GRANT ALL ON public.franchises TO service_role;
ALTER TABLE public.franchises ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_franchises_updated BEFORE UPDATE ON public.franchises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ↔ SECTORS ============
CREATE TABLE public.user_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  role public.sector_role NOT NULL DEFAULT 'colaborador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sectors TO authenticated;
GRANT ALL ON public.user_sectors TO service_role;
ALTER TABLE public.user_sectors ENABLE ROW LEVEL SECURITY;

-- ============ USER ↔ FRANCHISES ============
CREATE TABLE public.user_franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  role public.franchise_role NOT NULL DEFAULT 'operador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, franchise_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_franchises TO authenticated;
GRANT ALL ON public.user_franchises TO service_role;
ALTER TABLE public.user_franchises ENABLE ROW LEVEL SECURITY;

-- Helpers (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_member_of_sector(_user_id UUID, _sector_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_sectors WHERE user_id = _user_id AND sector_id = _sector_id)
$$;
CREATE OR REPLACE FUNCTION public.is_manager_of_sector(_user_id UUID, _sector_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_sectors WHERE user_id = _user_id AND sector_id = _sector_id AND role = 'gestor')
$$;
CREATE OR REPLACE FUNCTION public.is_member_of_franchise(_user_id UUID, _franchise_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_franchises WHERE user_id = _user_id AND franchise_id = _franchise_id)
$$;

-- ============ INDICATORS ============
CREATE TABLE public.indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  formula TEXT,
  unit TEXT,
  value_type public.value_type NOT NULL DEFAULT 'decimal',
  direction public.indicator_direction NOT NULL DEFAULT 'maior_melhor',
  scope public.indicator_scope NOT NULL DEFAULT 'setor',
  periodicity public.periodicity NOT NULL DEFAULT 'mensal',
  owner_sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  allows_attachment BOOLEAN NOT NULL DEFAULT false,
  status public.indicator_status NOT NULL DEFAULT 'rascunho',
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicators TO authenticated;
GRANT ALL ON public.indicators TO service_role;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_indicators_updated BEFORE UPDATE ON public.indicators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TARGETS ============
CREATE TABLE public.targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_value NUMERIC NOT NULL,
  min_value NUMERIC,
  max_value NUMERIC,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.targets TO authenticated;
GRANT ALL ON public.targets TO service_role;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_targets_updated BEFORE UPDATE ON public.targets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_targets_indicator ON public.targets(indicator_id, period_start);

-- ============ INDICATOR ENTRIES ============
CREATE TABLE public.indicator_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  target_id UUID REFERENCES public.targets(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_value NUMERIC NOT NULL,
  comment TEXT,
  justification TEXT,
  status public.entry_status NOT NULL DEFAULT 'rascunho',
  revision_number INT NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicator_entries TO authenticated;
GRANT ALL ON public.indicator_entries TO service_role;
ALTER TABLE public.indicator_entries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_entries_updated BEFORE UPDATE ON public.indicator_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_entries_indicator ON public.indicator_entries(indicator_id, period_start);
CREATE INDEX idx_entries_status ON public.indicator_entries(status);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);

-- ============ APP SETTINGS (single row) ============
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  threshold_success NUMERIC NOT NULL DEFAULT 100,
  threshold_warning NUMERIC NOT NULL DEFAULT 85,
  threshold_danger NUMERIC NOT NULL DEFAULT 70,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_settings (id) VALUES (1);

-- ============ POLICIES ============

-- profiles
CREATE POLICY "profiles select all auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles admin manage" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "roles read own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- sectors / franchises (todos autenticados leem; admin gerencia)
CREATE POLICY "sectors read all" ON public.sectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "sectors admin manage" ON public.sectors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "franchises read all" ON public.franchises FOR SELECT TO authenticated USING (true);
CREATE POLICY "franchises admin manage" ON public.franchises FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_sectors / user_franchises
CREATE POLICY "user_sectors read own or admin" ON public.user_sectors FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_sectors admin manage" ON public.user_sectors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_franchises read own or admin" ON public.user_franchises FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_franchises admin manage" ON public.user_franchises FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- indicators
CREATE POLICY "indicators read scope" ON public.indicators FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid())
  OR scope = 'corporativo'
  OR (owner_sector_id IS NOT NULL AND public.is_member_of_sector(auth.uid(), owner_sector_id))
);
CREATE POLICY "indicators admin or sector manager manage" ON public.indicators FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR (owner_sector_id IS NOT NULL AND public.is_manager_of_sector(auth.uid(), owner_sector_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR (owner_sector_id IS NOT NULL AND public.is_manager_of_sector(auth.uid(), owner_sector_id)));

-- targets (mesma visibilidade do indicador)
CREATE POLICY "targets read via indicator" ON public.targets FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.indicators i WHERE i.id = indicator_id AND (
    public.is_admin(auth.uid()) OR i.scope = 'corporativo'
    OR (i.owner_sector_id IS NOT NULL AND public.is_member_of_sector(auth.uid(), i.owner_sector_id))
  ))
);
CREATE POLICY "targets manage admin/manager" ON public.targets FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.indicators i WHERE i.id = indicator_id
      AND i.owner_sector_id IS NOT NULL AND public.is_manager_of_sector(auth.uid(), i.owner_sector_id)
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.indicators i WHERE i.id = indicator_id
      AND i.owner_sector_id IS NOT NULL AND public.is_manager_of_sector(auth.uid(), i.owner_sector_id)
    )
  );

-- indicator_entries
CREATE POLICY "entries read scope" ON public.indicator_entries FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR (sector_id IS NOT NULL AND public.is_member_of_sector(auth.uid(), sector_id))
  OR (franchise_id IS NOT NULL AND public.is_member_of_franchise(auth.uid(), franchise_id))
);
CREATE POLICY "entries insert own" ON public.indicator_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "entries update own draft or manager" ON public.indicator_entries FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR (sector_id IS NOT NULL AND public.is_manager_of_sector(auth.uid(), sector_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR (sector_id IS NOT NULL AND public.is_manager_of_sector(auth.uid(), sector_id))
  );
CREATE POLICY "entries delete admin" ON public.indicator_entries FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- audit_logs
CREATE POLICY "audit insert auth" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "audit read admin or auditor" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'auditor'));

-- notifications
CREATE POLICY "notif read own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif update own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif insert admin" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "notif delete own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- app_settings
CREATE POLICY "settings read all" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin update" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ AUTH TRIGGER ============
-- Cria profile + dá role 'superadmin' ao primeiro usuário, 'colaborador' aos demais.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
