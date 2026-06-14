CREATE OR REPLACE FUNCTION public.enforce_business_record_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  related_owner uuid;
  customer_ref uuid;
  work_order_ref uuid;
  invoice_ref uuid;
  inspection_ref uuid;
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

  customer_ref := NULLIF(to_jsonb(NEW)->>'customer_id', '')::uuid;
  work_order_ref := NULLIF(to_jsonb(NEW)->>'work_order_id', '')::uuid;
  invoice_ref := NULLIF(to_jsonb(NEW)->>'invoice_id', '')::uuid;
  inspection_ref := NULLIF(to_jsonb(NEW)->>'inspection_id', '')::uuid;

  IF customer_ref IS NOT NULL THEN
    SELECT owner_id INTO related_owner FROM public.customers WHERE id = customer_ref;
    IF related_owner IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Cross-tenant customer reference denied'; END IF;
  END IF;
  IF work_order_ref IS NOT NULL THEN
    SELECT owner_id INTO related_owner FROM public.work_orders WHERE id = work_order_ref;
    IF related_owner IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Cross-tenant work order reference denied'; END IF;
  END IF;
  IF invoice_ref IS NOT NULL THEN
    SELECT owner_id INTO related_owner FROM public.invoices WHERE id = invoice_ref;
    IF related_owner IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Cross-tenant invoice reference denied'; END IF;
  END IF;
  IF inspection_ref IS NOT NULL THEN
    SELECT owner_id INTO related_owner FROM public.inspections WHERE id = inspection_ref;
    IF related_owner IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Cross-tenant inspection reference denied'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_business_record_scope() FROM PUBLIC, anon, authenticated;