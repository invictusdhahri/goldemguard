import path from 'path';
import multer from 'multer';

// Configure multer to store files in memory (as Buffer)
// This is better than saving to disk because we upload to Supabase immediately
const storage = multer.memoryStorage();

/** When MIME is missing or generic, infer from extension (browsers/OS disagree on MP3, etc.). */
const EXT_ALLOWED = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.mp4', '.mov', '.avi', '.webm',
  '.mp3', '.wav', '.ogg', '.flac',
  '.pdf', '.doc', '.docx',
]);

function allowedByExtension(originalName: string): boolean {
  const ext = path.extname(originalName).toLowerCase();
  return EXT_ALLOWED.has(ext);
}

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
    'audio/mpeg', // .mp3 (IANA)
    'audio/mp3', // non-standard but common from browsers / OS
    'audio/x-mpeg',
    'audio/wav',
    'audio/wave', // alternate for .wav
    'audio/x-wav',
    'audio/ogg',
    'audio/flac',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  const looseMime =
    file.mimetype === 'application/octet-stream' ||
    file.mimetype === 'binary/octet-stream' ||
    file.mimetype === '';

  if (looseMime && allowedByExtension(file.originalname)) {
    cb(null, true);
    return;
  }

  cb(new Error(`File type ${file.mimetype} not allowed`));
};

// Create the multer instance with size limit (100MB)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB in bytes
  }
});
