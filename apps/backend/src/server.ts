import 'dotenv/config';
import { app } from './app';
// Import worker so it registers against the queue on startup.
// The module handles its own Redis availability check gracefully.
import './jobs/analyzeJob';

const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`VeritasAI API running on port ${PORT}`);
});
