DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;

CREATE POLICY "entries update authenticated"
ON public.indicator_entries
FOR UPDATE
TO authenticated
USING (
  private.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR (sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR (franchise_id IS NOT NULL AND private.is_manager_of_franchise(auth.uid(), franchise_id))
  OR auth.uid() IS NOT NULL
)
WITH CHECK (auth.uid() IS NOT NULL);