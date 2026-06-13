CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  system_name TEXT NOT NULL DEFAULT 'ZR System' CHECK (char_length(system_name) BETWEEN 1 AND 120),
  currency TEXT NOT NULL DEFAULT 'ج.م' CHECK (char_length(currency) BETWEEN 1 AND 12),
  auto_sync BOOLEAN NOT NULL DEFAULT true,
  inventory_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage own settings" ON public.admin_settings
FOR ALL TO authenticated
USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.inventory_items
ADD COLUMN min_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (min_quantity >= 0);