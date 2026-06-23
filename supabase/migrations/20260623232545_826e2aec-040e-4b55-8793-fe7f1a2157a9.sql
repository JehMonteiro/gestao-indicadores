
-- 1. Restrict owner-update USING clause to non-final statuses, keeping manager/admin paths intact
DROP POLICY IF EXISTS "entries update own draft or manager" ON public.indicator_entries;
CREATE POLICY "entries update own draft or manager"
ON public.indicator_entries
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
  )
);

-- 2. Ensure the existing guard trigger is attached (prevents owner self-approval at row level)
DROP TRIGGER IF EXISTS indicator_entries_guard_status_trg ON public.indicator_entries;
CREATE TRIGGER indicator_entries_guard_status_trg
BEFORE UPDATE ON public.indicator_entries
FOR EACH ROW EXECUTE FUNCTION public.indicator_entries_guard_status();

-- 3. Revoke direct execute on SECURITY DEFINER functions from signed-in users.
-- handle_new_user and indicator_entries_guard_status are trigger-only.
-- log_audit is an internal helper; clients should not call it directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.indicator_entries_guard_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
