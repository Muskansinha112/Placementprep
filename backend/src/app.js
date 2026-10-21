import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { isDbConnected } from './config/db.js';
import { checkChromaHealth } from './config/chroma.js';
import { isLlmConfigured, isEmbeddingsConfigured } from './config/llm.js';
import { config } from './config/env.js';

import { identifyUser } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

import resumeRoutes from './routes/resumeRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import studyPlanRoutes from './routes/studyPlanRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../../frontend');

export const app = express();

// Core middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach user context (supports custom x-user-id or demo default)
app.use(identifyUser);

// System health check
app.get('/api/health', async (req, res) => {
  const chromaHealth = await checkChromaHealth();
  const dbConnected = isDbConnected();

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: {
        status: dbConnected ? 'connected' : 'disconnected',
      },
      chromadb: chromaHealth,
      llm: {
        configured: isLlmConfigured(),
        model: config.llmModel,
      },
      embeddings: {
        configured: isEmbeddingsConfigured(),
        model: config.embeddingModel,
      },
    },
    user: req.user,
  });
});

// Mount REST API endpoints
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/study-plans', studyPlanRoutes);

// Serve vanilla frontend static files
app.use(express.static(frontendDir));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: `Route not found: ${req.path}` });
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

export default app;
