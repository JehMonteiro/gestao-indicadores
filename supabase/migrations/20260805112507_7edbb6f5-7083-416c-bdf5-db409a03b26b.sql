CREATE POLICY "Admins can insert app settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'superadmin') OR private.has_role(auth.uid(), 'admin_corporativo'));

CREATE POLICY "Superadmins can delete app settings"
ON public.app_settings FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'superadmin'));

GRANT INSERT, DELETE ON public.app_settings TO authenticated;