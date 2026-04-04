import { Router } from 'express';

export const resultsRouter = Router();

resultsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  res.status(501).json({ error: 'Not implemented', job_id: id });
});
