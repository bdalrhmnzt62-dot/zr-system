ALTER TABLE public.profiles DROP COLUMN IF EXISTS license_key_id;
DROP TABLE IF EXISTS public.license_keys;
DROP FUNCTION IF EXISTS public.has_active_license(uuid);