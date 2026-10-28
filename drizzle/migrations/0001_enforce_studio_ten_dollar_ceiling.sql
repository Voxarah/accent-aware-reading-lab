CREATE OR REPLACE FUNCTION public.reserve_studio_budget(p_amount numeric, p_ceiling numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE accepted boolean := false;
BEGIN
  IF p_amount IS NULL OR p_ceiling IS NULL OR p_amount <= 0 OR p_ceiling <= 0 OR p_amount > LEAST(p_ceiling, 10) THEN RETURN false; END IF;
  INSERT INTO public.studio_daily_budget(day) VALUES ((now() AT TIME ZONE 'UTC')::date) ON CONFLICT DO NOTHING;
  UPDATE public.studio_daily_budget SET reserved_usd = reserved_usd + p_amount
  WHERE day = (now() AT TIME ZONE 'UTC')::date AND reserved_usd + p_amount <= LEAST(p_ceiling, 10)
  RETURNING true INTO accepted;
  RETURN coalesce(accepted, false);
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_studio_budget(numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_studio_budget(numeric, numeric) TO service_role;