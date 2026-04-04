import 'dotenv/config';
import { app } from './app';
import './jobs/analyzeJob';

const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`VeritasAI API running on port ${PORT}`);
});
