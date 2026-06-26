
-- Tighten indicator_entries update WITH CHECK so owners cannot self-approve
DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;
CREATE POLICY "entries update own draft or manager"
ON public.indicator_entries
FOR UPDATE
USING (
  private.is_admin(auth.uid())
  OR ((sector_id IS NOT NULL) AND private.is_manager_of_sector(auth.uid(), sector_id))
  OR ((user_id = auth.uid()) AND (status = ANY (ARRAY['rascunho'::entry_status, 'rejeitado'::entry_status, 'enviado'::entry_status])))
)
WITH CHECK (
  private.is_admin(auth.uid())
  OR (
    (sector_id IS NOT NULL)
    AND private.is_manager_of_sector(auth.uid(), sector_id)
    AND user_id <> auth.uid()
  )
  OR (
    user_id = auth.uid()
    AND status = ANY (ARRAY['rascunho'::entry_status, 'enviado'::entry_status])
    AND approved_by IS NULL
    AND approved_at IS NULL
    AND rejection_reason IS NULL
  )
);

-- Block direct INSERTs into audit_logs; all writes must go through log_audit RPC
DROP POLICY IF EXISTS "audit insert own" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;
