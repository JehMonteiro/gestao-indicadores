DROP POLICY "entries insert own" ON public.indicator_entries;
CREATE POLICY "entries insert own" ON public.indicator_entries
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (sector_id IS NULL OR private.is_member_of_sector(auth.uid(), sector_id) OR private.is_admin(auth.uid()))
  AND (franchise_id IS NULL OR private.is_member_of_franchise(auth.uid(), franchise_id) OR private.is_admin(auth.uid()))
);