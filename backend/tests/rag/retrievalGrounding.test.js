import { describe, it, expect, vi } from 'vitest';
import { generateGroundedAnswer } from '../../src/rag/answerGenerator.js';
import * as vectorStore from '../../src/rag/vectorStore.js';

describe('RAG Retrieval Quality & Grounded Answer Evaluation', () => {
  // Evaluation Knowledge Base Chunks
  const evalKnowledgeBase = [
    {
      text: 'Redis AOF (Append Only File) logs every write command received by the server to disk. During startup, Redis replays the AOF log to reconstruct the dataset. In contrast, RDB persistence creates point-in-time snapshot binaries at scheduled intervals, offering faster disaster recovery but higher potential data loss between snapshots.',
      metadata: {
        documentId: 'doc_redis_01',
        filename: 'redis_caching_and_persistence.pdf',
        ownerId: 'test_student',
        pageNumber: 2,
        chunkIndex: 1,
      },
      distance: 0.12,
    },
    {
      text: 'A MongoDB sharded cluster consists of three main components: shards which store subsets of data as replica sets, mongos query routers which act as interfaces directing client operations to the appropriate shard, and config servers which store the cluster metadata and routing configuration.',
      metadata: {
        documentId: 'doc_mongo_02',
        filename: 'mongodb_distributed_architecture.pdf',
        ownerId: 'test_student',
        pageNumber: 5,
        chunkIndex: 3,
      },
      distance: 0.15,
    },
    {
      text: 'The Libuv thread pool in Node.js handles asynchronous system tasks that cannot be non-blockingly resolved by the OS kernel, including file system operations (fs), DNS lookups, and compute-heavy crypto operations. The default thread pool size is 4 and can be tuned using UV_THREADPOOL_SIZE.',
      metadata: {
        documentId: 'doc_node_03',
        filename: 'nodejs_runtime_internals.pdf',
        ownerId: 'test_student',
        pageNumber: 1,
        chunkIndex: 0,
      },
      distance: 0.18,
    },
  ];

  it('retrieves relevant chunk and formats source citations for Redis persistence query', async () => {
    // Mock querySimilarChunks to return relevant Redis chunk from knowledge base
    vi.spyOn(vectorStore, 'querySimilarChunks').mockResolvedValueOnce([evalKnowledgeBase[0]]);

    const question = 'How does Redis AOF persistence differ from RDB snapshots?';
    const result = await generateGroundedAnswer(question, { ownerId: 'test_student', k: 2 });

    expect(result.isGrounded).toBe(true);
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].filename).toBe('redis_caching_and_persistence.pdf');
    expect(result.sources[0].pageNumber).toBe(2);
    expect(result.answer).toContain('Append Only File');
    expect(result.answer).toContain('[Source: redis_caching_and_persistence.pdf, Page: 2]');
  });

  it('retrieves MongoDB sharding components and cites config servers', async () => {
    vi.spyOn(vectorStore, 'querySimilarChunks').mockResolvedValueOnce([evalKnowledgeBase[1]]);

    const question = 'What are the three main components of a MongoDB sharded cluster?';
    const result = await generateGroundedAnswer(question, { ownerId: 'test_student', k: 2 });

    expect(result.isGrounded).toBe(true);
    expect(result.sources[0].filename).toBe('mongodb_distributed_architecture.pdf');
    expect(result.answer).toContain('mongos query routers');
    expect(result.answer).toContain('config servers');
  });

  it('acknowledges insufficient evidence when question has no matching context', async () => {
    // Vector search returns empty chunks when query has no relevance
    vi.spyOn(vectorStore, 'querySimilarChunks').mockResolvedValueOnce([]);

    const unsupportedQuestion = 'What are the rules of classical Renaissance oil painting composition?';
    const result = await generateGroundedAnswer(unsupportedQuestion, { ownerId: 'test_student' });

    expect(result.isGrounded).toBe(false);
    expect(result.sources).toHaveLength(0);
    expect(result.answer).toContain('Based on the provided study materials, there is not enough information to answer this question.');
  });
});
