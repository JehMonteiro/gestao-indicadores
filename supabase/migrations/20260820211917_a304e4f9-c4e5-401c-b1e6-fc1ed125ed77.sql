ALTER TABLE public.franchises
  ADD COLUMN IF NOT EXISTS support_group text,
  ADD COLUMN IF NOT EXISTS created_in_system_at date,
  ADD COLUMN IF NOT EXISTS deactivated_at date,
  ADD COLUMN IF NOT EXISTS franchise_model text,
  ADD COLUMN IF NOT EXISTS franchise_type text;