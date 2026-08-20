CREATE OR REPLACE FUNCTION private.can_view_franchise(_user_id uuid, _franchise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT private.is_org_reader(_user_id)
    OR EXISTS (SELECT 1 FROM public.user_franchises uf WHERE uf.user_id = _user_id AND uf.franchise_id = _franchise_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_franchises uf
      JOIN public.franchises child ON child.id = uf.franchise_id
      WHERE uf.user_id = _user_id AND child.parent_id = _franchise_id
    );
$$;

DROP POLICY IF EXISTS "franchises read scoped" ON public.franchises;

CREATE POLICY "franchises read scoped" ON public.franchises
FOR SELECT TO authenticated
USING (private.can_view_franchise(auth.uid(), id));