DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;

CREATE POLICY "entries update own draft or manager"
ON public.indicator_entries
FOR UPDATE
TO authenticated
USING (
  private.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR ((franchise_id IS NOT NULL) AND private.is_manager_of_franchise(auth.uid(), franchise_id))
)
WITH CHECK (
  private.is_admin(auth.uid())
  OR (
    ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
    AND status = ANY (ARRAY['aprovado'::entry_status, 'rejeitado'::entry_status, 'enviado'::entry_status])
  )
  OR (
    ((franchise_id IS NOT NULL) AND private.is_manager_of_franchise(auth.uid(), franchise_id))
    AND status = ANY (ARRAY['aprovado'::entry_status, 'rejeitado'::entry_status, 'enviado'::entry_status])
  )
  OR (
    user_id = auth.uid()
    AND (
      (
        status = ANY (ARRAY['rascunho'::entry_status, 'enviado'::entry_status])
        AND approved_by IS NULL
        AND approved_at IS NULL
        AND rejection_reason IS NULL
      )
      OR status = ANY (ARRAY['aprovado'::entry_status, 'rejeitado'::entry_status])
    )
  )
);