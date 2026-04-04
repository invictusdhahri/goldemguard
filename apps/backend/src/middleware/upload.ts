import multer from 'multer';

// Configure multer to store files in memory (as Buffer)
// This is better than saving to disk because we upload to Supabase immediately
const storage = multer.memoryStorage();

// File filter: only allow specific file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime', // .mov files
    'video/x-msvideo', // .avi files
    'video/webm',
    'audio/mpeg',      // .mp3
    'audio/wav',
    'audio/ogg',
    'audio/flac',
    'application/pdf'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

// Create the multer instance with size limit (100MB)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB in bytes
  }
});
