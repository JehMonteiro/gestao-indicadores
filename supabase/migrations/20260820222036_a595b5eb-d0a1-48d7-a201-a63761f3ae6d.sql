UPDATE public.indicators
SET entity_scope = 'empresa',
    entity_id = null
WHERE franchise_id IS NOT NULL
  AND entity_scope = 'franquia';