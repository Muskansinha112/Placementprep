import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

/**
 * Splits text into overlapping semantic chunks and attaches rich metadata.
 * 
 * @param {string} text - Raw text extracted from document
 * @param {Object} metadata - Base metadata { documentId, filename, ownerId, pageCount }
 * @param {Object} options - Splitter options { chunkSize, chunkOverlap }
 * @returns {Promise<Array<{ text: string, metadata: Object }>>}
 */
export async function chunkDocument(text, metadata = {}, options = {}) {
  const chunkSize = options.chunkSize || 800;
  const chunkOverlap = options.chunkOverlap || 150;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', '? ', '! ', '; ', ' ', ''],
  });

  const rawChunks = await splitter.splitText(text);

  const enrichedChunks = rawChunks.map((chunk, index) => {
    // Estimate page number if page markers are not present
    // An average page of printed/PDF text is ~2,000 to 2,500 characters
    const estimatedPage = Math.max(1, Math.ceil(((index + 1) * (chunkSize - chunkOverlap)) / 2000));
    const actualPage = metadata.pageCount && estimatedPage > metadata.pageCount
      ? metadata.pageCount
      : estimatedPage;

    return {
      text: chunk.trim(),
      metadata: {
        documentId: String(metadata.documentId || ''),
        filename: String(metadata.filename || 'unknown'),
        ownerId: String(metadata.ownerId || 'guest'),
        chunkIndex: index,
        totalChunks: rawChunks.length,
        pageNumber: actualPage,
        charLength: chunk.trim().length,
      },
    };
  });

  return enrichedChunks;
}
