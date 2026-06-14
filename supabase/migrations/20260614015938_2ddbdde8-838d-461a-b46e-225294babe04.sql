REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_active_license(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_license(uuid) TO service_role;