import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { uploadRouter } from './routes/upload';
import { analyzeRouter } from './routes/analyze';
import { resultsRouter } from './routes/results';
import { historyRouter } from './routes/history';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/status', resultsRouter);
app.use('/api/result', resultsRouter);
app.use('/api/history', historyRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export { app };
