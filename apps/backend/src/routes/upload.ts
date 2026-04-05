import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { createSupabaseWithAccessToken } from '../services/supabase';
import { validateFileSize, storageObjectKey } from '../middleware/validation';
import { sha256Hex } from '../utils/contentHash';
import multer from 'multer';

export const uploadRouter = Router();

/**
 * POST /api/upload
 * Upload a file to Supabase Storage
 * Protected: requires authentication
 */
uploadRouter.post(
  '/',
  requireAuth,           // Must be logged in
  upload.single('file'), // Expect one file with field name 'file'
  validateFileSize(100), // Validate file size (100MB max)
  async (req: AuthRequest, res) => {
    try {
      // Step 1: Check if file exists in request
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Step 2: Get user ID from auth middleware
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Step 3: Unique ASCII-only storage key (original names often break Storage)
      const fileName = storageObjectKey(file.originalname);
      const filePath = `${userId}/${fileName}`;

      const db = createSupabaseWithAccessToken(req.accessToken!);

      // Step 4: Upload to Supabase Storage (RLS requires authenticated user context)
      const { error } = await db.storage
        .from('uploads')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      // Step 5: Check for errors
      if (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
        return;
      }

      // Step 6: Get the public URL
      const { data: urlData } = db.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Step 7: Return success with file URL and metadata (content_hash enables analyze deduplication)
      res.status(200).json({
        message: 'File uploaded successfully',
        file_url: urlData.publicUrl,
        content_hash: sha256Hex(file.buffer),
        file_path: filePath,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle file size limit error
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File too large. Maximum size is 100MB' });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
