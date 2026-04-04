// Claude verdict is handled by the ML service (services/ml/app/claude_service.py).
// The backend receives the final verdict from the ML service response.
// This file is kept as a placeholder for any future backend-side AI logic.

export async function getClaudeVerdict(_scores: Record<string, unknown>) {
  throw new Error('Claude verdict is handled by the ML service');
}
