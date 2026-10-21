import { ChromaClient } from 'chromadb';
import { config } from './env.js';

let chromaClient = null;

export function getChromaClient() {
  if (!chromaClient) {
    chromaClient = new ChromaClient({
      path: config.chromaUrl,
    });
  }
  return chromaClient;
}

export async function getStudyCollection() {
  const client = getChromaClient();
  try {
    const collection = await client.getOrCreateCollection({
      name: config.chromaCollectionName,
      metadata: { description: 'PlacementPrep Study Materials and Notes' },
    });
    return collection;
  } catch (error) {
    console.error(`[ChromaDB] Error accessing collection '${config.chromaCollectionName}':`, error.message);
    throw error;
  }
}

export async function checkChromaHealth() {
  try {
    const client = getChromaClient();
    const version = await client.version();
    return { status: 'connected', version };
  } catch (error) {
    return { status: 'disconnected', error: error.message };
  }
}
