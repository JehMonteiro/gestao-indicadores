DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sectors','franchises','user_sectors','user_franchises','profiles','user_roles','notifications','app_settings']
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;