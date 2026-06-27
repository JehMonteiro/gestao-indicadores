
DROP POLICY IF EXISTS "entries insert own" ON public.indicator_entries;

CREATE POLICY "entries insert own"
ON public.indicator_entries
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status IN ('rascunho','enviado')
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND ((sector_id IS NULL) OR private.is_member_of_sector(auth.uid(), sector_id) OR private.is_admin(auth.uid()))
  AND ((franchise_id IS NULL) OR private.is_member_of_franchise(auth.uid(), franchise_id) OR private.is_admin(auth.uid()))
  AND (
    private.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.indicators i
      WHERE i.id = indicator_entries.indicator_id
        AND i.status = 'ativo'
        AND (
          -- corporate scope visible to all authenticated
          i.scope = 'corporativo'
          -- sector-scoped: user must belong to indicator's owner sector OR entry's sector
          OR (i.owner_sector_id IS NOT NULL AND private.is_member_of_sector(auth.uid(), i.owner_sector_id))
          OR (indicator_entries.sector_id IS NOT NULL AND private.is_member_of_sector(auth.uid(), indicator_entries.sector_id))
          -- franchise-scoped: user must belong to indicator's franchise OR entry's franchise
          OR (i.franchise_id IS NOT NULL AND private.is_member_of_franchise(auth.uid(), i.franchise_id))
          OR (indicator_entries.franchise_id IS NOT NULL AND private.is_member_of_franchise(auth.uid(), indicator_entries.franchise_id))
        )
    )
  )
);
