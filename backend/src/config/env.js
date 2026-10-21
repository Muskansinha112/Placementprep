import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/placementprep',
  mongoDbName: process.env.MONGODB_DATABASE || 'placementprep',
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  chromaCollectionName: process.env.CHROMA_COLLECTION_NAME || 'placementprep_study_materials',
  llmApiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  llmBaseUrl: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || '',
  embeddingApiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || `${10 * 1024 * 1024}`, 10), // 10MB
  uploadDir: path.resolve(__dirname, '../../../uploads'),
  jwtSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'placementprep_jwt_secret_key_2026',
};
