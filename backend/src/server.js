import { app } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { checkChromaHealth } from './config/chroma.js';
import { isLlmConfigured } from './config/llm.js';
import { config } from './config/env.js';

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting PlacementPrep AI Server...');
  console.log('----------------------------------------------------');

  // Connect to MongoDB
  try {
    await connectDB();
  } catch (err) {
    console.warn(`[Server] Initial MongoDB connection notice: ${err.message}`);
  }

  // Check ChromaDB
  const chromaStatus = await checkChromaHealth();
  if (chromaStatus.status === 'connected') {
    console.log(`[ChromaDB] Connected successfully (v${chromaStatus.version})`);
  } else {
    console.warn(`[ChromaDB] Notice: Server not currently reachable at ${config.chromaUrl} (${chromaStatus.error || 'offline'}). Running with local fallback.`);
  }

  // Check LLM
  if (isLlmConfigured()) {
    console.log(`[LLM] Hosted model active: ${config.llmModel}`);
  } else {
    console.log(`[LLM] Notice: No LLM_API_KEY detected in .env. Running in offline/development mode.`);
  }

  const server = app.listen(config.port, () => {
    console.log(`✅ PlacementPrep AI running at: http://localhost:${config.port}`);
    console.log(`📡 Health Check endpoint:      http://localhost:${config.port}/api/health`);
    console.log('----------------------------------------------------');
  });

  const gracefulShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await disconnectDB();
      console.log('[Server] Cleanup complete. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
