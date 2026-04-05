-- Shared trial credit pool for free-tier usage (file analysis, Verify Chat, extension reveals).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trial_credits INTEGER NOT NULL DEFAULT 25;

COMMENT ON COLUMN public.users.trial_credits IS
  'Free-tier trial credits; decremented on analysis jobs (non-dedup) and contextual API requests. Paid plans skip deduction.';

-- Atomically decrement one credit for free plan, or allow paid plans through without decrement.
CREATE OR REPLACE FUNCTION public.consume_trial_credit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_new integer;
BEGIN
  SELECT plan INTO v_plan FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'remaining', 0, 'code', 'NO_USER');
  END IF;

  IF v_plan IS NOT NULL AND v_plan <> 'free' THEN
    SELECT trial_credits INTO v_new FROM public.users WHERE id = p_user_id;
    RETURN jsonb_build_object(
      'ok', true,
      'remaining', COALESCE(v_new, 0),
      'unlimited', true
    );
  END IF;

  UPDATE public.users
  SET trial_credits = trial_credits - 1
  WHERE id = p_user_id AND trial_credits > 0
  RETURNING trial_credits INTO v_new;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'remaining', v_new,
      'unlimited', false
    );
  END IF;

  SELECT trial_credits INTO v_new FROM public.users WHERE id = p_user_id;
  RETURN jsonb_build_object(
    'ok', false,
    'remaining', COALESCE(v_new, 0),
    'code', 'INSUFFICIENT_CREDITS'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_trial_credit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_trial_credit(uuid) TO service_role;
