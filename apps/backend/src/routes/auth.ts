import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';

export const authRouter = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post('/register', async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json({
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    session: data.session,
  });
});

authRouter.post('/login', async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    res.status(401).json({ error: error.message });
    return;
  }

  res.json({
    user: { id: data.user.id, email: data.user.email },
    session: data.session,
  });
});
