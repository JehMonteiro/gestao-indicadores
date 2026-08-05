ALTER TABLE public.indicators
  DROP COLUMN IF EXISTS audience,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS input_method,
  DROP COLUMN IF EXISTS allows_attachment,
  DROP COLUMN IF EXISTS data_source;