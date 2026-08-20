UPDATE public.indicators
SET entity_scope = 'franquia',
    entity_id = franchise_id
WHERE franchise_id IS NOT NULL
  AND entity_scope = 'empresa';