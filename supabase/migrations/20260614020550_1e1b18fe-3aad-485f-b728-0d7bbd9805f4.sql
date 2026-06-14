CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'active' AND start_date <= now() AND end_date > now()
  )
$$;
REVOKE ALL ON FUNCTION app_private.has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_active_subscription(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, app_private
AS $$ SELECT app_private.has_role(_user_id, _role) $$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, app_private
AS $$ SELECT app_private.has_active_subscription(_user_id) $$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;