import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { apiLimiter } from './middleware/rateLimit';
import { authRouter } from './routes/auth';
import { uploadRouter } from './routes/upload';
import { analyzeRouter } from './routes/analyze';
import { contextualRouter } from './routes/contextual';
import { resultsRouter } from './routes/results';
import { historyRouter } from './routes/history';

const app = express();

app.use(cors());
app.use(express.json());
app.use(apiLimiter);

app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/analyze/contextual', contextualRouter);
app.use('/api', resultsRouter);
app.use('/api/history', historyRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Multer rejects (wrong MIME, etc.) call next(err). Without this handler Express
 * can respond with HTML, which breaks clients that expect JSON (DOCTYPE parse errors).
 */
function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    return;
  }
  console.error('[api]', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large. Maximum size is 100MB' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  const msg = err instanceof Error ? err.message : String(err);
  const badRequest =
    /not allowed|unexpected field|file type|file too large|limit file size/i.test(msg);

  if (badRequest) {
    res.status(400).json({ error: msg });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}

app.use(errorHandler);

export { app };
