import express from 'express';
import cors from 'cors';
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

// Global Error Handler — returns JSON instead of default HTML
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] Unhandled error:', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export { app };
