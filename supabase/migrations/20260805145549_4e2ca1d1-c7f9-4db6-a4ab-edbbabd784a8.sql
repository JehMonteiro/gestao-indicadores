CREATE OR REPLACE FUNCTION private.indicator_shared_with_user(_indicator_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.indicator_shared_sectors s
    JOIN public.user_sectors us ON us.sector_id = s.sector_id
    WHERE s.indicator_id = _indicator_id
      AND us.user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION private.can_manage_indicator(_indicator_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.indicators i
    JOIN public.user_sectors us ON us.sector_id = i.owner_sector_id
    WHERE i.id = _indicator_id
      AND us.user_id = _user_id
      AND us.role = 'gestor'::sector_role
  )
$$;

DROP POLICY IF EXISTS "indicators read scope" ON public.indicators;
CREATE POLICY "indicators read scope" ON public.indicators
FOR SELECT TO authenticated
USING (
  private.is_admin(auth.uid())
  OR scope = 'corporativo'::indicator_scope
  OR responsible_user_id = auth.uid()
  OR (owner_sector_id IS NOT NULL AND private.is_member_of_sector(auth.uid(), owner_sector_id))
  OR private.indicator_shared_with_user(id, auth.uid())
);

DROP POLICY IF EXISTS "shared sectors manage" ON public.indicator_shared_sectors;
CREATE POLICY "shared sectors manage" ON public.indicator_shared_sectors
FOR ALL TO authenticated
USING (private.is_admin(auth.uid()) OR private.can_manage_indicator(indicator_id, auth.uid()))
WITH CHECK (private.is_admin(auth.uid()) OR private.can_manage_indicator(indicator_id, auth.uid()));