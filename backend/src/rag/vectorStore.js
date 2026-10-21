import { getStudyCollection } from '../config/chroma.js';
import { generateEmbeddings, generateQueryEmbedding } from './embeddings.js';

/**
 * Adds an array of chunk objects to ChromaDB.
 * 
 * @param {Array<{ text: string, metadata: Object }>} chunks
 * @returns {Promise<{ insertedCount: number, ids: string[] }>}
 */
export async function addDocumentsToStore(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return { insertedCount: 0, ids: [] };
  }

  const collection = await getStudyCollection();

  const ids = chunks.map((chunk, idx) => 
    `${chunk.metadata.documentId || 'doc'}_chunk_${chunk.metadata.chunkIndex ?? idx}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  const texts = chunks.map(c => c.text);
  const embeddings = await generateEmbeddings(texts);
  const metadatas = chunks.map(c => ({
    documentId: String(c.metadata.documentId || ''),
    filename: String(c.metadata.filename || ''),
    ownerId: String(c.metadata.ownerId || 'guest'),
    chunkIndex: Number(c.metadata.chunkIndex || 0),
    pageNumber: Number(c.metadata.pageNumber || 1),
  }));

  await collection.add({
    ids,
    embeddings,
    metadatas,
    documents: texts,
  });

  return { insertedCount: ids.length, ids };
}

/**
 * Searches ChromaDB for relevant chunks matching a query.
 * 
 * @param {string} queryText
 * @param {Object} options - { ownerId, documentId, k }
 * @returns {Promise<Array<{ text: string, metadata: Object, distance: number }>>}
 */
export async function querySimilarChunks(queryText, options = {}) {
  const collection = await getStudyCollection();
  const k = options.k || 4;
  const queryEmbedding = await generateQueryEmbedding(queryText);

  // Build Chroma metadata filter
  const where = {};
  if (options.ownerId) {
    where.ownerId = String(options.ownerId);
  }
  if (options.documentId) {
    where.documentId = String(options.documentId);
  }

  const queryParams = {
    queryEmbeddings: [queryEmbedding],
    nResults: k,
  };

  // Only pass where clause if there are filter keys
  if (Object.keys(where).length === 1) {
    queryParams.where = where;
  } else if (Object.keys(where).length > 1) {
    queryParams.where = {
      $and: Object.entries(where).map(([key, val]) => ({ [key]: val })),
    };
  }

  const results = await collection.query(queryParams);

  const matchedChunks = [];
  if (results && results.documents && results.documents[0]) {
    const docs = results.documents[0];
    const metadatas = results.metadatas ? results.metadatas[0] : [];
    const distances = results.distances ? results.distances[0] : [];

    for (let i = 0; i < docs.length; i++) {
      matchedChunks.push({
        text: docs[i],
        metadata: metadatas[i] || {},
        distance: distances[i] !== undefined ? distances[i] : null,
      });
    }
  }

  return matchedChunks;
}

/**
 * Deletes all vector chunks associated with a document ID from ChromaDB.
 * 
 * @param {string} documentId
 * @param {string} ownerId
 * @returns {Promise<boolean>}
 */
export async function deleteChunksByDocumentId(documentId, ownerId) {
  try {
    const collection = await getStudyCollection();
    const where = { documentId: String(documentId) };
    if (ownerId) {
      where.ownerId = String(ownerId);
    }
    await collection.delete({ where });
    return true;
  } catch (error) {
    console.error(`[ChromaDB] Error deleting chunks for doc ${documentId}:`, error.message);
    throw error;
  }
}
