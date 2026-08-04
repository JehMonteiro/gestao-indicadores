DROP POLICY IF EXISTS "entries read scope" ON public.indicator_entries;

CREATE POLICY "entries read scope"
ON public.indicator_entries
FOR SELECT
TO authenticated
USING (
  private.is_admin(auth.uid())
  OR private.has_role(auth.uid(), 'auditor'::app_role)
  OR user_id = auth.uid()
  OR (sector_id IS NOT NULL AND private.is_member_of_sector(auth.uid(), sector_id))
  OR (franchise_id IS NOT NULL AND private.is_member_of_franchise(auth.uid(), franchise_id))
  OR (sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR (franchise_id IS NOT NULL AND private.is_manager_of_franchise(auth.uid(), franchise_id))
);