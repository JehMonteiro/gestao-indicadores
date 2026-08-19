DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
    CREATE TYPE public.entity_type AS ENUM ('grupo','empresa','franquia');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_scope') THEN
    CREATE TYPE public.entity_scope AS ENUM ('empresa','franquia');
  END IF;
END $$;

ALTER TABLE public.franchises
  ADD COLUMN IF NOT EXISTS entity_type public.entity_type NULL,
  ADD COLUMN IF NOT EXISTS parent_id uuid NULL REFERENCES public.franchises(id);
CREATE INDEX IF NOT EXISTS idx_franchises_entity_type ON public.franchises(entity_type);
CREATE INDEX IF NOT EXISTS idx_franchises_parent_id ON public.franchises(parent_id);

ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS entity_scope public.entity_scope NULL,
  ADD COLUMN IF NOT EXISTS entity_id uuid NULL REFERENCES public.franchises(id);
CREATE INDEX IF NOT EXISTS idx_indicators_scope_status ON public.indicators(entity_scope, status);

ALTER TABLE public.sectors
  ADD COLUMN IF NOT EXISTS company_id uuid NULL REFERENCES public.franchises(id);

DO $$
DECLARE
  g_id uuid; cor_id uuid; fra_id uuid; fab_id uuid;
BEGIN
  SELECT id INTO g_id FROM public.franchises
   WHERE lower(translate(name,'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç','AAAAEEIOOOUCaaaaeeioouc')) = 'grupo nocta' LIMIT 1;
  IF g_id IS NULL THEN
    INSERT INTO public.franchises (code, name, status, entity_type)
    VALUES ('GRUPO','Grupo Nocta','ativo','grupo') RETURNING id INTO g_id;
  ELSE
    UPDATE public.franchises SET entity_type='grupo', parent_id=NULL WHERE id=g_id;
  END IF;

  SELECT id INTO cor_id FROM public.franchises
   WHERE lower(translate(name,'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç','AAAAEEIOOOUCaaaaeeioouc')) LIKE '%nocta seguros%' LIMIT 1;
  IF cor_id IS NULL THEN
    INSERT INTO public.franchises (code, name, status, entity_type, parent_id)
    VALUES ('COR','Nocta Seguros e Benefícios','ativo','empresa', g_id) RETURNING id INTO cor_id;
  ELSE
    UPDATE public.franchises SET entity_type='empresa', parent_id=g_id WHERE id=cor_id;
  END IF;

  SELECT id INTO fra_id FROM public.franchises
   WHERE lower(translate(name,'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç','AAAAEEIOOOUCaaaaeeioouc')) = 'nocta franquia' LIMIT 1;
  IF fra_id IS NULL THEN
    INSERT INTO public.franchises (code, name, status, entity_type, parent_id)
    VALUES ('FRA','Nocta Franquia','ativo','empresa', g_id) RETURNING id INTO fra_id;
  ELSE
    UPDATE public.franchises SET entity_type='empresa', parent_id=g_id WHERE id=fra_id;
  END IF;

  SELECT id INTO fab_id FROM public.franchises
   WHERE lower(translate(name,'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç','AAAAEEIOOOUCaaaaeeioouc')) LIKE '%fabio gomes%' LIMIT 1;
  IF fab_id IS NULL THEN
    INSERT INTO public.franchises (code, name, status, entity_type, parent_id)
    VALUES ('FAB','Fábio Gomes','ativo','empresa', g_id) RETURNING id INTO fab_id;
  ELSE
    UPDATE public.franchises SET entity_type='empresa', parent_id=g_id WHERE id=fab_id;
  END IF;

  UPDATE public.franchises
     SET entity_type='franquia', parent_id=fra_id
   WHERE id NOT IN (g_id, cor_id, fra_id, fab_id)
     AND (
       lower(translate(name,'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç','AAAAEEIOOOUCaaaaeeioouc')) LIKE 'franquia%'
       OR code ~ '^[0-9]+$'
     );

  UPDATE public.indicators SET entity_scope='empresa', entity_id=cor_id
   WHERE entity_scope IS NULL AND code LIKE '%\_COR';
  UPDATE public.indicators SET entity_scope='empresa', entity_id=fra_id
   WHERE entity_scope IS NULL AND code LIKE '%\_FRA';
  UPDATE public.indicators SET entity_scope='empresa', entity_id=g_id
   WHERE entity_scope IS NULL AND code LIKE '%\_GRUPO\_NOCT';
END $$;