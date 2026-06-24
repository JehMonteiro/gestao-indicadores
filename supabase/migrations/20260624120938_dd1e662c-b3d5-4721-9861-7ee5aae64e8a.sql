
-- 1) Tighten read policy on indicator_entries: hide peer comments/justifications
DROP POLICY IF EXISTS "entries read scope" ON public.indicator_entries;
CREATE POLICY "entries read scope" ON public.indicator_entries
FOR SELECT
USING (
  private.is_admin(auth.uid())
  OR user_id = auth.uid()
  OR (sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR (franchise_id IS NOT NULL AND private.is_member_of_franchise(auth.uid(), franchise_id) AND private.is_admin(auth.uid()))
);

-- 2) Re-affirm tight update policy: owners cannot set aprovado/rejeitado
DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;
CREATE POLICY "entries update own draft or manager" ON public.indicator_entries
FOR UPDATE
USING (
  private.is_admin(auth.uid())
  OR (sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR (
    user_id = auth.uid()
    AND status = ANY (ARRAY['rascunho'::entry_status, 'rejeitado'::entry_status, 'enviado'::entry_status])
  )
)
WITH CHECK (
  private.is_admin(auth.uid())
  OR (sector_id IS NOT NULL AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR (
    user_id = auth.uid()
    AND status = ANY (ARRAY['rascunho'::entry_status, 'enviado'::entry_status])
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND rejection_reason IS NULL
  )
);

-- 3) log_audit: function is SECURITY DEFINER + allowlist-validated.
-- Re-grant EXECUTE to authenticated so app audit logging works.
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon;
