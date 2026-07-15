ALTER TABLE public.indicator_entries REPLICA IDENTITY FULL;
ALTER TABLE public.targets REPLICA IDENTITY FULL;
ALTER TABLE public.indicators REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.indicator_entries;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.targets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.indicators;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;