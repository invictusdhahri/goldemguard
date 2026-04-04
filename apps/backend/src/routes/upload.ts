import { Router } from 'express';

export const uploadRouter = Router();

uploadRouter.post('/', async (_req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});
