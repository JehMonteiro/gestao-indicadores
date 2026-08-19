CREATE TYPE public.kpi_group AS ENUM ('movimento', 'resultado', 'qualidade');

ALTER TABLE public.indicators
  ADD COLUMN kpi_group public.kpi_group NOT NULL DEFAULT 'resultado';

UPDATE public.indicators
SET kpi_group = CASE
  WHEN lower(unaccent_name) ~ '(prospec|reuni|proposta|cotac|atendimento|lead|agendamento|contato|visita)' THEN 'movimento'::public.kpi_group
  WHEN lower(unaccent_name) ~ '(sla|tempo|retrabalho|satisfac|nps|cancelamento|conversao|retencao|inadimplencia|pendencia|chamado)' THEN 'qualidade'::public.kpi_group
  ELSE 'resultado'::public.kpi_group
END
FROM (
  SELECT id AS i_id,
         translate(lower(coalesce(name,'') || ' ' || coalesce(code,'')),
                   'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                   'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC') AS unaccent_name
  FROM public.indicators
) s
WHERE s.i_id = public.indicators.id;

ALTER TABLE public.indicators ALTER COLUMN kpi_group DROP DEFAULT;

CREATE INDEX idx_indicators_kpi_group ON public.indicators (kpi_group);
CREATE INDEX idx_indicators_kpi_group_status ON public.indicators (kpi_group, status);