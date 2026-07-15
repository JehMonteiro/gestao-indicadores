ALTER TABLE public.targets
  ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_targets_sector ON public.targets(sector_id);
CREATE INDEX IF NOT EXISTS idx_targets_user ON public.targets(user_id);