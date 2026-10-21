import { getEmbeddings, isEmbeddingsConfigured } from '../config/llm.js';

/**
 * Generates embeddings for an array of text strings.
 * Falls back to deterministic semantic hashing if live embeddings are unconfigured.
 * 
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function generateEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const liveEmbedder = getEmbeddings();

  if (liveEmbedder) {
    try {
      const vectors = await liveEmbedder.embedDocuments(texts);
      return vectors;
    } catch (error) {
      console.warn(`[Embeddings] Live embedding API call failed (${error.message}). Falling back to local semantic vectorizer.`);
    }
  }

  // Deterministic local feature vectorizer (1536 dimensions, normalized)
  return texts.map((t) => createLocalFeatureEmbedding(t, 1536));
}

/**
 * Generates an embedding for a single text query.
 * 
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateQueryEmbedding(text) {
  const vectors = await generateEmbeddings([text]);
  return vectors[0];
}

/**
 * Generates a normalized N-dimensional feature embedding based on term hashing & n-grams.
 * Ensures consistent cosine similarity behavior when testing without live LLM keys.
 */
export function createLocalFeatureEmbedding(text, dimensions = 1536) {
  const vector = new Float32Array(dimensions);
  if (!text || typeof text !== 'string') {
    return Array.from(vector);
  }

  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 1);

  // Term frequencies and position-weighted character n-grams
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1.0;

    // Bigram context
    if (i > 0) {
      const biWord = `${words[i - 1]}_${word}`;
      let biHash = 0;
      for (let c = 0; c < biWord.length; c++) {
        biHash = ((biHash << 5) - biHash) + biWord.charCodeAt(c);
        biHash |= 0;
      }
      const biIdx = Math.abs(biHash) % dimensions;
      vector[biIdx] += 1.5;
    }
  }

  // Normalize to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}
