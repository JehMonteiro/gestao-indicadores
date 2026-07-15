DROP POLICY IF EXISTS "entries insert own" ON public.indicator_entries;

CREATE POLICY "entries insert own"
ON public.indicator_entries
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    private.is_admin(auth.uid())
    OR (
      ((sector_id IS NULL) OR private.is_member_of_sector(auth.uid(), sector_id))
      AND ((franchise_id IS NULL) OR private.is_member_of_franchise(auth.uid(), franchise_id))
      AND EXISTS (
        SELECT 1
        FROM public.indicators i
        WHERE i.id = indicator_entries.indicator_id
          AND i.status = 'ativo'::indicator_status
          AND (
            i.scope = 'corporativo'::indicator_scope
            OR ((i.owner_sector_id IS NOT NULL) AND private.is_member_of_sector(auth.uid(), i.owner_sector_id))
            OR ((indicator_entries.sector_id IS NOT NULL) AND private.is_member_of_sector(auth.uid(), indicator_entries.sector_id))
            OR ((i.franchise_id IS NOT NULL) AND private.is_member_of_franchise(auth.uid(), i.franchise_id))
            OR ((indicator_entries.franchise_id IS NOT NULL) AND private.is_member_of_franchise(auth.uid(), indicator_entries.franchise_id))
          )
      )
    )
  )
  AND (
    status = ANY (ARRAY['rascunho'::entry_status, 'enviado'::entry_status])
    OR (
      status = 'aprovado'::entry_status
      AND EXISTS (
        SELECT 1
        FROM public.indicators i
        WHERE i.id = indicator_entries.indicator_id
          AND i.requires_approval = false
      )
    )
  )
  AND (
    status <> 'aprovado'::entry_status
    OR (approved_by IS NULL AND approved_at IS NULL)
  )
);