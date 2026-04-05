import { getSupabaseServiceRole } from './supabase';

export type ConsumeCreditResult = {
  ok: boolean;
  remaining: number;
  unlimited?: boolean;
  code?: string;
};

/** Normalize PostgREST / rpc() payloads (jsonb may arrive as object, JSON string, or single-element array). */
function parseConsumeTrialCreditRpc(data: unknown): ConsumeCreditResult {
  let raw: unknown = data;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return { ok: false, remaining: 0, code: 'INVALID_RESPONSE' };
    }
  }
  if (Array.isArray(raw) && raw.length === 1) {
    raw = raw[0];
  }
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, remaining: 0, code: 'INVALID_RESPONSE' };
  }
  const row = raw as Record<string, unknown>;
  const ok = row.ok === true;
  let remaining = 0;
  if (typeof row.remaining === 'number' && !Number.isNaN(row.remaining)) {
    remaining = row.remaining;
  } else if (typeof row.remaining === 'string') {
    const n = Number.parseInt(row.remaining, 10);
    if (!Number.isNaN(n)) remaining = n;
  }
  const unlimited = row.unlimited === true;
  const code = typeof row.code === 'string' ? row.code : undefined;
  return { ok, remaining, unlimited, code };
}

/**
 * Decrements one trial credit for free-plan users. Pro/Enterprise pass without decrement.
 */
export async function consumeTrialCredit(userId: string): Promise<ConsumeCreditResult> {
  const admin = getSupabaseServiceRole();
  const { data, error } = await admin.rpc('consume_trial_credit', { p_user_id: userId });

  if (error) {
    console.error('[credits] consume_trial_credit RPC:', error.message);
    return { ok: false, remaining: 0, code: 'RPC_ERROR' };
  }

  return parseConsumeTrialCreditRpc(data);
}

export async function getTrialBalance(userId: string): Promise<{
  trial_credits: number;
  plan: string;
  unlimited: boolean;
}> {
  const admin = getSupabaseServiceRole();
  const { data, error } = await admin
    .from('users')
    .select('trial_credits, plan')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { trial_credits: 0, plan: 'free', unlimited: false };
  }

  const plan = typeof data.plan === 'string' ? data.plan : 'free';
  const unlimited = plan !== 'free';
  return {
    trial_credits: typeof data.trial_credits === 'number' ? data.trial_credits : 0,
    plan,
    unlimited,
  };
}
