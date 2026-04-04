import { Router } from 'express';

export const authRouter = Router();

authRouter.post('/register', async (_req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

authRouter.post('/login', async (_req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});
