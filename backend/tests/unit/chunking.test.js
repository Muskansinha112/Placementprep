import { describe, it, expect } from 'vitest';
import { chunkDocument } from '../../src/rag/chunking.js';

describe('Document Chunking with LangChain RecursiveCharacterTextSplitter', () => {
  it('splits long technical text into overlapping chunks and enriches metadata', async () => {
    // Generate text of ~2,500 characters
    const paragraphs = [
      'The Node.js event loop runs on a single thread via Libuv. It processes timers, pending callbacks, idle/prepare, poll, check, and close callbacks in distinct phases.',
      'Microtasks (process.nextTick and resolved Promises) run immediately after each operation finishes and before moving to the next event loop phase.',
      'Database connection pools must be sized carefully. Having too many open connections causes database thread thrashing, whereas too few causes application request queuing.',
      'In MongoDB, replica sets provide high availability via automated failover and election protocols, while sharding provides horizontal read/write scale.',
      'Redis persistence options include RDB (point-in-time point snapshots) and AOF (append-only log of write operations). Most production architectures combine both.',
    ];
    const longText = paragraphs.join('\n\n').repeat(4);

    const metadata = {
      documentId: 'doc_123',
      filename: 'distributed_systems_notes.pdf',
      ownerId: 'student_alex',
      pageCount: 3,
    };

    const chunks = await chunkDocument(longText, metadata, { chunkSize: 500, chunkOverlap: 100 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeGreaterThan(50);
    expect(chunks[0].metadata.documentId).toBe('doc_123');
    expect(chunks[0].metadata.filename).toBe('distributed_systems_notes.pdf');
    expect(chunks[0].metadata.ownerId).toBe('student_alex');
    expect(chunks[0].metadata.chunkIndex).toBe(0);
    expect(chunks[0].metadata.pageNumber).toBeGreaterThanOrEqual(1);
  });

  it('handles empty or blank text gracefully', async () => {
    const emptyChunks = await chunkDocument('', { documentId: 'empty' });
    expect(emptyChunks).toEqual([]);

    const whitespaceChunks = await chunkDocument('   \n\n   ', { documentId: 'blank' });
    expect(whitespaceChunks).toEqual([]);
  });
});
