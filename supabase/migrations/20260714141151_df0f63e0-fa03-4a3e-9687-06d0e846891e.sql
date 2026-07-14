CREATE OR REPLACE FUNCTION public.indicator_entries_guard_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Product decision: any authenticated user may transition entry status,
  -- including approving their own entries. No role/self-approval checks.
  RETURN NEW;
END;
$function$;