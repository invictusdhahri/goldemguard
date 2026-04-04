import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { supabase } from '../services/supabase';

export const uploadRouter = Router();

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'application/pdf',
]);

uploadRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    if (!ALLOWED_MIMES.has(file.mimetype)) {
      res.status(400).json({ error: `Unsupported file type: ${file.mimetype}` });
      return;
    }

    const filePath = `${req.userId}/${Date.now()}_${file.originalname}`;

    const { error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      res.status(500).json({ error: `Upload failed: ${error.message}` });
      return;
    }

    res.status(201).json({ file_url: filePath, mime_type: file.mimetype });
  },
);
