/**
 * TEST CURL COMMANDS:
 * 
 * 1. Register test:
 * curl -X POST http://localhost:3000/api/auth/register \
 *   -H "Content-Type: application/json" \
 *   -d '{"email": "test@example.com", "password": "password123"}'
 * 
 * 2. Login test:
 * curl -X POST http://localhost:3000/api/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email": "test@example.com", "password": "password123"}'
 * 
 * 3. Invalid email test:
 * curl -X POST http://localhost:3000/api/auth/register \
 *   -H "Content-Type: application/json" \
 *   -d '{"email": "invalid-email", "password": "password123"}'
 * 
 * 4. Short password test:
 * curl -X POST http://localhost:3000/api/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email": "test@example.com", "password": "123"}'
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';

export const authRouter = Router();

// --- Zod Validation Schema ---
const authSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user with Supabase Auth
 * @access  Public
 */
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate request body
    const result = authSchema.safeParse(req.body);
    
    if (!result.success) {
      // Return 400 with first validation message
      res.status(400).json({ error: result.error.errors[0].message });
      return;
    }

    const { email, password } = result.data;

    // 2. Call Supabase signUp
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // 3. Handle Supabase error
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // 4. Return success response
    res.status(201).json({
      message: 'Registration successful. Check your email for a confirmation link.',
      user: data.user,
      session: data.session,
    });

  } catch (err) {
    // 5. Handle unexpected errors
    console.error('[AUTH_REGISTER_ERROR]:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user with Supabase Auth
 * @access  Public
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate request body
    const result = authSchema.safeParse(req.body);
    
    if (!result.success) {
      // Return 400 with first validation message
      res.status(400).json({ error: result.error.errors[0].message });
      return;
    }

    const { email, password } = result.data;

    // 2. Call Supabase signInWithPassword
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 3. Handle specific Supabase auth error (Invalid credentials)
    if (error) {
      if (error.status === 400 || error.message.toLowerCase().includes('invalid')) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }

    // 4. Return success response
    res.status(200).json({
      message: 'Login successful',
      user: data.user,
      session: data.session,
    });

  } catch (err) {
    // 5. Handle unexpected errors
    console.error('[AUTH_LOGIN_ERROR]:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

