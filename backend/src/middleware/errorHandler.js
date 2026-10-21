import { ZodError } from 'zod';
import multer from 'multer';
import { config } from '../config/env.js';

/**
 * Centralized REST error handler middleware.
 */
export function errorHandler(err, req, res, next) {
  // If response has already started streaming, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[Error] [${req.method} ${req.url}] ${err.message}`, err.stack ? err.stack.split('\n')[1] : '');

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fieldErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: fieldErrors,
    });
  }

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum allowed size is ${Math.round(config.maxUploadSize / (1024 * 1024))}MB.`,
      });
    }
    return res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`,
    });
  }

  // Custom client errors
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
    });
  }

  // General server errors
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred',
  });
}
