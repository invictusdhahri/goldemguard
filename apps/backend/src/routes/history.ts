import { Router } from 'express';

export const historyRouter = Router();

historyRouter.get('/', async (_req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});
