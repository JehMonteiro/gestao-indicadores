
CREATE OR REPLACE FUNCTION private.is_org_reader(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('superadmin','admin_corporativo','gestor_setor','gestor_franquia','analista','auditor')
  )
$$;

CREATE OR REPLACE FUNCTION private.can_view_chamados(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('superadmin','admin_corporativo','gestor_setor')
  )
$$;

DROP POLICY IF EXISTS "Autenticados podem ler chamados" ON public.chamados;
CREATE POLICY "Gestores e admins podem ler chamados"
ON public.chamados FOR SELECT TO authenticated
USING (private.can_view_chamados(auth.uid()));

DROP POLICY IF EXISTS "Admins podem atualizar chamados" ON public.chamados;
CREATE POLICY "Admins podem atualizar chamados"
ON public.chamados FOR UPDATE TO authenticated
USING (private.is_admin(auth.uid()))
WITH CHECK (private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "sectors read all" ON public.sectors;
CREATE POLICY "sectors read scoped"
ON public.sectors FOR SELECT TO authenticated
USING (
  private.is_org_reader(auth.uid())
  OR private.is_member_of_sector(auth.uid(), id)
);

DROP POLICY IF EXISTS "franchises read all" ON public.franchises;
CREATE POLICY "franchises read scoped"
ON public.franchises FOR SELECT TO authenticated
USING (
  private.is_org_reader(auth.uid())
  OR private.is_member_of_franchise(auth.uid(), id)
  OR EXISTS (
    SELECT 1 FROM public.user_franchises uf
    JOIN public.franchises child ON child.id = uf.franchise_id
    WHERE uf.user_id = auth.uid() AND child.parent_id = franchises.id
  )
);
