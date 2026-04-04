import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { supabase } from '../services/supabase';
import { validateFileSize, sanitizeFilename } from '../middleware/validation';
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

      // Step 3: Create a unique file path with sanitized filename
      const timestamp = Date.now();
      const sanitizedName = sanitizeFilename(file.originalname);
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = `${userId}/${fileName}`;

      // Step 4: Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')  // Bucket name - you need to create this in Supabase
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false  // Don't overwrite if file exists
        });

      // Step 5: Check for errors
      if (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
        return;
      }

      // Step 6: Get the public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      // Step 7: Return success with file URL and metadata
      res.status(200).json({
        message: 'File uploaded successfully',
        file_url: urlData.publicUrl,
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
