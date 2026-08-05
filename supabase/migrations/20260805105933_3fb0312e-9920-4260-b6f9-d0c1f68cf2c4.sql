-- Todos os tipos de valor passam a exigir números inteiros
CREATE OR REPLACE FUNCTION public.value_type_requires_integer(_vt value_type)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT true $$;

-- Arredonda valores decimais existentes, registrando no log de auditoria
INSERT INTO public.integer_rounding_log (table_name, record_id, field_name, old_value, new_value)
SELECT 'indicators', id, 'default_target', default_target, round(default_target)
FROM public.indicators WHERE default_target IS NOT NULL AND default_target <> round(default_target);
INSERT INTO public.integer_rounding_log (table_name, record_id, field_name, old_value, new_value)
SELECT 'indicators', id, 'minimum_value', minimum_value, round(minimum_value)
FROM public.indicators WHERE minimum_value IS NOT NULL AND minimum_value <> round(minimum_value);
INSERT INTO public.integer_rounding_log (table_name, record_id, field_name, old_value, new_value)
SELECT 'indicators', id, 'maximum_value', maximum_value, round(maximum_value)
FROM public.indicators WHERE maximum_value IS NOT NULL AND maximum_value <> round(maximum_value);
INSERT INTO public.integer_rounding_log (table_name, record_id, field_name, old_value, new_value)
SELECT 'targets', id, 'target_value', target_value, round(target_value)
FROM public.targets WHERE target_value IS NOT NULL AND target_value <> round(target_value);
INSERT INTO public.integer_rounding_log (table_name, record_id, field_name, old_value, new_value)
SELECT 'indicator_entries', id, 'actual_value', actual_value, round(actual_value)
FROM public.indicator_entries WHERE actual_value IS NOT NULL AND actual_value <> round(actual_value);

UPDATE public.indicators SET
  default_target = round(default_target),
  minimum_value = round(minimum_value),
  maximum_value = round(maximum_value),
  warning_threshold = round(warning_threshold),
  critical_threshold = round(critical_threshold);

UPDATE public.targets SET
  target_value = round(target_value),
  min_value = round(min_value),
  max_value = round(max_value);

UPDATE public.indicator_entries SET actual_value = round(actual_value);