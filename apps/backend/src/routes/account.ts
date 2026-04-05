import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getTrialBalance } from '../services/creditsService';

export const accountRouter = Router();

/**
 * GET /api/account/credits
 * Trial balance and plan (Pro/Enterprise shown as unlimited on the client).
 */
accountRouter.get('/credits', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const balance = await getTrialBalance(userId);
  res.json(balance);
});
