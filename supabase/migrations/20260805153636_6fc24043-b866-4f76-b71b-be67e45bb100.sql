ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS end_date date;

DROP POLICY IF EXISTS "entries insert own" ON public.indicator_entries;
CREATE POLICY "entries insert own"
ON public.indicator_entries
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());