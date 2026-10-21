import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env.js';

// Ensure uploads folder exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${cleanBase}_${uniqueSuffix}${ext}`);
  },
});

export const resumeUpload = multer({
  storage,
  limits: { fileSize: config.maxUploadSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      const error = new Error('Only PDF resume files (.pdf) are supported.');
      error.status = 400;
      cb(error);
    }
  },
});

export const documentUpload = multer({
  storage,
  limits: { fileSize: config.maxUploadSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.txt', '.md', '.markdown'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      const error = new Error(`Unsupported file type. Allowed formats: ${allowed.join(', ')}`);
      error.status = 400;
      cb(error);
    }
  },
});
