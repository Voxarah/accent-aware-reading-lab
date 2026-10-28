CREATE TABLE public.studio_window_budget (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  reserved_usd numeric(12,6) NOT NULL DEFAULT 0
);

GRANT ALL ON public.studio_window_budget TO service_role;

ALTER TABLE public.studio_window_budget ENABLE ROW LEVEL SECURITY;

INSERT INTO public.studio_window_budget (id, reserved_usd) VALUES (true, 0);

CREATE OR REPLACE FUNCTION public.reserve_studio_budget(p_amount numeric, p_ceiling numeric, p_window_ceiling numeric DEFAULT 40)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_cap numeric := LEAST(p_ceiling, 10);
  window_cap numeric := LEAST(p_window_ceiling, 40);
  ok boolean;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR daily_cap <= 0 OR window_cap <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.studio_daily_budget (day, reserved_usd)
  VALUES (CURRENT_DATE, p_amount)
  ON CONFLICT (day)
  DO UPDATE SET reserved_usd = public.studio_daily_budget.reserved_usd + p_amount
  WHERE public.studio_daily_budget.reserved_usd + p_amount <= daily_cap
  RETURNING true INTO ok;

  IF NOT FOUND OR ok IS DISTINCT FROM true THEN
    RETURN false;
  END IF;

  UPDATE public.studio_window_budget
  SET reserved_usd = reserved_usd + p_amount
  WHERE id = true AND reserved_usd + p_amount <= window_cap
  RETURNING true INTO ok;

  -- A rejected window reservation keeps the daily reservation: conservative,
  -- never refunded, same rule as uncertain provider charges.
  RETURN ok IS TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_studio_budget(numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_studio_budget(numeric, numeric, numeric) TO service_role;