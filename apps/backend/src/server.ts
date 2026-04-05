import './loadEnv';
import { app } from './app';
// Import worker so it registers against the queue on startup.
// The module handles its own Redis availability check gracefully.
import './jobs/analyzeJob';

const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`GolemGuard API running on port ${PORT}`);
});

// Process-level safety net — prevents background crashes from killing the server
process.on('unhandledRejection', (reason: any) => {
  console.error('[server] UNHANDLED REJECTION:', reason?.stack || reason?.message || reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[server] UNCAUGHT EXCEPTION:', err.stack || err.message);
  // Ideally, gracefully shut down here if the error is non-recoverable,
  // but for development, we keep the process alive to show the error.
});
