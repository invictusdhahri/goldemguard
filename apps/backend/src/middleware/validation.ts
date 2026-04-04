import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// File size validator
export function validateFileSize(maxSizeMB: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.file && req.file.size > maxSizeMB * 1024 * 1024) {
      res.status(400).json({
        error: `File too large. Maximum size is ${maxSizeMB}MB`
      });
      return;
    }
    next();
  };
}

// Sanitize file paths (prevent directory traversal)
export function sanitizeFilePath(filePath: string): string {
  // Remove any path traversal attempts
  return filePath.replace(/\.\./g, '').replace(/^\/+/, '');
}

// UUID validator
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate job ID parameter
export function validateJobId(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  
  if (!id || !isValidUUID(id)) {
    res.status(400).json({
      error: 'Invalid job ID format'
    });
    return;
  }
  
  next();
}

// File type validator (additional to multer)
export function validateMediaType(req: Request, res: Response, next: NextFunction) {
  const allowedTypes = ['image', 'video', 'audio', 'document'];
  const { media_type } = req.body;
  
  if (!media_type || !allowedTypes.includes(media_type)) {
    res.status(400).json({
      error: `Invalid media type. Must be one of: ${allowedTypes.join(', ')}`
    });
    return;
  }
  
  next();
}

// Sanitize filename (prevent malicious filenames)
export function sanitizeFilename(filename: string): string {
  // Remove directory separators and special characters
  return filename
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/[<>:"|?*]/g, '') // Remove Windows reserved chars
    .replace(/\.\./g, '') // Remove double dots
    .substring(0, 255); // Limit length
}

// Validate URL format (basic check)
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Sanitize string input (prevent XSS)
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Rate limit key generator (for future use)
export function getRateLimitKey(req: Request): string {
  // Use user ID if authenticated, otherwise IP
  const userId = (req as any).userId;
  return userId || req.ip || 'unknown';
}
