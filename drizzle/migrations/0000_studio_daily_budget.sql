CREATE TABLE public.studio_daily_budget (
  day date PRIMARY KEY,
  reserved_usd numeric NOT NULL DEFAULT 0 CHECK (reserved_usd >= 0)
);
GRANT ALL ON public.studio_daily_budget TO service_role;
REVOKE ALL ON public.studio_daily_budget FROM anon, authenticated;
ALTER TABLE public.studio_daily_budget ENABLE ROW LEVEL SECURITY;
CREATE POLICY studio_budget_service_only ON public.studio_daily_budget FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE FUNCTION public.reserve_studio_budget(p_amount numeric, p_ceiling numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE accepted boolean := false;
BEGIN
  IF p_amount IS NULL OR p_ceiling IS NULL OR p_amount <= 0 OR p_ceiling <= 0 OR p_amount > p_ceiling THEN RETURN false; END IF;
  INSERT INTO public.studio_daily_budget(day) VALUES ((now() AT TIME ZONE 'UTC')::date) ON CONFLICT DO NOTHING;
  UPDATE public.studio_daily_budget SET reserved_usd = reserved_usd + p_amount
  WHERE day = (now() AT TIME ZONE 'UTC')::date AND reserved_usd + p_amount <= p_ceiling
  RETURNING true INTO accepted;
  RETURN coalesce(accepted, false);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_studio_budget(numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_studio_budget(numeric, numeric) TO service_role;