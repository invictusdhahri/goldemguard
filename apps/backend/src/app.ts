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
import { accountRouter } from './routes/account';

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
app.use('/api/account', accountRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Global Error Handler — returns JSON instead of default HTML.
 * Handles Multer rejects (wrong MIME, file too large, etc.) as 400s.
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) {
    return;
  }

  console.error('[server] Unhandled error:', err.stack || err.message || err);

  // Handle Multer-specific errors
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

  // Fallback for internal server errors
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export { app };
