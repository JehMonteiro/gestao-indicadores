CREATE TABLE IF NOT EXISTS public.indicator_shared_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  sector_id uuid NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (indicator_id, sector_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicator_shared_sectors TO authenticated;
GRANT ALL ON public.indicator_shared_sectors TO service_role;

ALTER TABLE public.indicator_shared_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared sectors read"
ON public.indicator_shared_sectors FOR SELECT TO authenticated
USING (
  private.is_admin(auth.uid())
  OR private.is_member_of_sector(auth.uid(), sector_id)
);

CREATE POLICY "shared sectors manage"
ON public.indicator_shared_sectors FOR ALL TO authenticated
USING (
  private.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.indicators i
    WHERE i.id = indicator_id
      AND i.owner_sector_id IS NOT NULL
      AND private.is_manager_of_sector(auth.uid(), i.owner_sector_id)
  )
)
WITH CHECK (
  private.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.indicators i
    WHERE i.id = indicator_id
      AND i.owner_sector_id IS NOT NULL
      AND private.is_manager_of_sector(auth.uid(), i.owner_sector_id)
  )
);

CREATE INDEX IF NOT EXISTS idx_iss_indicator ON public.indicator_shared_sectors(indicator_id);
CREATE INDEX IF NOT EXISTS idx_iss_sector ON public.indicator_shared_sectors(sector_id);

DROP POLICY IF EXISTS "indicators read scope" ON public.indicators;
CREATE POLICY "indicators read scope"
ON public.indicators FOR SELECT TO authenticated
USING (
  private.is_admin(auth.uid())
  OR scope = 'corporativo'::indicator_scope
  OR responsible_user_id = auth.uid()
  OR (owner_sector_id IS NOT NULL AND private.is_member_of_sector(auth.uid(), owner_sector_id))
  OR EXISTS (
    SELECT 1 FROM public.indicator_shared_sectors s
    WHERE s.indicator_id = public.indicators.id
      AND private.is_member_of_sector(auth.uid(), s.sector_id)
  )
);