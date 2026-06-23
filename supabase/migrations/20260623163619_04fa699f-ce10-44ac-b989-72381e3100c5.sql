ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS strategic_pillar text,
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'ambos' CHECK (audience IN ('interno', 'franqueado', 'ambos')),
  ADD COLUMN IF NOT EXISTS input_method text NOT NULL DEFAULT 'manual' CHECK (input_method IN ('manual', 'importacao', 'integracao', 'calculo')),
  ADD COLUMN IF NOT EXISTS default_target numeric,
  ADD COLUMN IF NOT EXISTS minimum_value numeric,
  ADD COLUMN IF NOT EXISTS maximum_value numeric,
  ADD COLUMN IF NOT EXISTS warning_threshold numeric,
  ADD COLUMN IF NOT EXISTS critical_threshold numeric,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS data_source text;

UPDATE public.indicators
SET start_date = COALESCE(start_date, created_at::date)
WHERE start_date IS NULL;