CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  activation_code text NOT NULL UNIQUE,
  client_name text NOT NULL,
  duration_days integer NOT NULL DEFAULT 30 CHECK (duration_days BETWEEN 1 AND 3650),
  start_date timestamptz NULL,
  end_date timestamptz NULL,
  status public.license_status NOT NULL DEFAULT 'pending',
  device_id text NULL,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_active_fields_check CHECK (
    status <> 'active' OR (user_id IS NOT NULL AND start_date IS NOT NULL AND end_date IS NOT NULL AND device_id IS NOT NULL)
  )
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.profiles ADD COLUMN subscription_id uuid NULL REFERENCES public.subscriptions(id) ON DELETE SET NULL;

INSERT INTO public.subscriptions (activation_code, client_name, duration_days, start_date, end_date, status, device_id, notes, user_id, created_by, created_at, updated_at)
SELECT key, client_name, duration_days, activated_at, expires_at, status, device_id, notes, activated_by, created_by, created_at, updated_at
FROM public.license_keys
ON CONFLICT (activation_code) DO NOTHING;

UPDATE public.profiles p
SET subscription_id = s.id
FROM public.subscriptions s
WHERE s.user_id = p.id;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND start_date <= now()
      AND end_date > now()
  )
$$;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_active_license(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_license(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_business_record_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  related_owner uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Record owner cannot be changed';
  END IF;
  IF NEW.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Record owner must match authenticated user';
  END IF;
  IF NOT public.has_active_subscription(NEW.owner_id) THEN
    RAISE EXCEPTION 'Active subscription required';
  END IF;

  IF TG_TABLE_NAME IN ('work_orders', 'invoices', 'inspections') AND NEW.customer_id IS NOT NULL THEN
    SELECT owner_id INTO related_owner FROM public.customers WHERE id = NEW.customer_id;
    IF related_owner IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Cross-tenant customer reference denied'; END IF;
  END IF;
  IF TG_TABLE_NAME IN ('invoices', 'inspections') AND NEW.work_order_id IS NOT NULL THEN
    SELECT owner_id INTO related_owner FROM public.work_orders WHERE id = NEW.work_order_id;
    IF related_owner IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Cross-tenant work order reference denied'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'invoice_items' THEN
    SELECT owner_id INTO related_owner FROM public.invoices WHERE id = NEW.invoice_id;
    IF related_owner IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Cross-tenant invoice reference denied'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'inspection_items' THEN
    SELECT owner_id INTO related_owner FROM public.inspections WHERE id = NEW.inspection_id;
    IF related_owner IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Cross-tenant inspection reference denied'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_business_record_scope() FROM PUBLIC;

DROP POLICY IF EXISTS "owners manage own customers" ON public.customers;
DROP POLICY IF EXISTS "owners manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "owners manage own inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "owners manage own work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "owners manage own invoices" ON public.invoices;
DROP POLICY IF EXISTS "owners manage own invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "owners manage own inspections" ON public.inspections;
DROP POLICY IF EXISTS "owners manage own inspection_items" ON public.inspection_items;

CREATE POLICY "subscribed owners manage own customers" ON public.customers FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.has_active_subscription(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "subscribed owners manage own expenses" ON public.expenses FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.has_active_subscription(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "subscribed owners manage own inventory" ON public.inventory_items FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.has_active_subscription(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "subscribed owners manage own work_orders" ON public.work_orders FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.has_active_subscription(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "subscribed owners manage own invoices" ON public.invoices FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.has_active_subscription(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "subscribed owners manage own invoice_items" ON public.invoice_items FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.has_active_subscription(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "subscribed owners manage own inspections" ON public.inspections FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.has_active_subscription(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "subscribed owners manage own inspection_items" ON public.inspection_items FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.has_active_subscription(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.has_active_subscription(auth.uid()));

CREATE TRIGGER enforce_customers_scope BEFORE INSERT OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.enforce_business_record_scope();
CREATE TRIGGER enforce_expenses_scope BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.enforce_business_record_scope();
CREATE TRIGGER enforce_inventory_scope BEFORE INSERT OR UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.enforce_business_record_scope();
CREATE TRIGGER enforce_work_orders_scope BEFORE INSERT OR UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.enforce_business_record_scope();
CREATE TRIGGER enforce_invoices_scope BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.enforce_business_record_scope();
CREATE TRIGGER enforce_invoice_items_scope BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.enforce_business_record_scope();
CREATE TRIGGER enforce_inspections_scope BEFORE INSERT OR UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.enforce_business_record_scope();
CREATE TRIGGER enforce_inspection_items_scope BEFORE INSERT OR UPDATE ON public.inspection_items FOR EACH ROW EXECUTE FUNCTION public.enforce_business_record_scope();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();