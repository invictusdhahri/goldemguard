import { Router } from 'express';

export const analyzeRouter = Router();

analyzeRouter.post('/', async (_req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});
