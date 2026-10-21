import { getLLM, isLlmConfigured } from '../config/llm.js';
import { querySimilarChunks } from './vectorStore.js';
import { RAG_STUDY_SYSTEM_PROMPT } from './prompts.js';

/**
 * Executes the complete RAG query pipeline:
 * 1. Retrieve top-k semantic chunks from ChromaDB for the user/document.
 * 2. Format context with source metadata.
 * 3. Send grounded prompt to LLM (or execute grounded extraction fallback).
 * 4. Return answer + verified source references.
 * 
 * @param {string} question - The user's technical question
 * @param {Object} options - { ownerId, documentId, k }
 * @returns {Promise<{ answer: string, sources: Array<{ filename: string, pageNumber: number, chunkIndex: number, snippet: string }>, isGrounded: boolean }>}
 */
export async function generateGroundedAnswer(question, options = {}) {
  const k = options.k || 4;

  // Step 1: Retrieve relevant chunks from ChromaDB
  let retrievedChunks = [];
  try {
    retrievedChunks = await querySimilarChunks(question, {
      ownerId: options.ownerId,
      documentId: options.documentId,
      k,
    });
  } catch (error) {
    console.error('[RAG] Retrieval error:', error.message);
    retrievedChunks = [];
  }

  // Handle case where no study materials exist or none matched
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      answer: "Based on the provided study materials, there is not enough information to answer this question. Please upload relevant notes, PDFs, or documentation so I can help you study this topic.",
      sources: [],
      isGrounded: false,
    };
  }

  // Format retrieved context with document citations
  const contextSections = retrievedChunks.map((chunk, idx) => {
    const meta = chunk.metadata || {};
    const filename = meta.filename || 'Unknown Document';
    const page = meta.pageNumber || 1;
    return `[Context Chunk ${idx + 1}] (Document: ${filename}, Page: ${page})\n${chunk.text}`;
  }).join('\n\n---\n\n');

  const sources = retrievedChunks.map((chunk) => {
    const meta = chunk.metadata || {};
    return {
      filename: meta.filename || 'Unknown Document',
      pageNumber: meta.pageNumber || 1,
      chunkIndex: meta.chunkIndex || 0,
      snippet: chunk.text.length > 200 ? `${chunk.text.substring(0, 200)}...` : chunk.text,
    };
  });

  // Step 2: Use LangChain LLM if configured
  if (isLlmConfigured()) {
    try {
      const llm = getLLM({ temperature: 0.1 });
      const prompt = RAG_STUDY_SYSTEM_PROMPT.replace('{context}', contextSections);

      const response = await llm.invoke([
        { role: 'system', content: prompt },
        { role: 'user', content: question },
      ]);

      const answerText = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      return {
        answer: answerText,
        sources,
        isGrounded: true,
      };
    } catch (llmError) {
      console.warn(`[RAG] LLM call failed (${llmError.message}). Using grounded extraction fallback.`);
    }
  }

  // Fallback grounded answer synthesizer when live API key is not present
  // Extracts relevant sentences directly from retrieved chunks
  const synthesizedAnswer = synthesizeOfflineGroundedAnswer(question, retrievedChunks);

  return {
    answer: synthesizedAnswer,
    sources,
    isGrounded: true,
  };
}

/**
 * Deterministic offline answer synthesizer that ensures strict grounding from retrieved chunks.
 */
function synthesizeOfflineGroundedAnswer(question, chunks) {
  const qWords = question.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const relevantSentences = [];

  for (const chunk of chunks) {
    const meta = chunk.metadata || {};
    const filename = meta.filename || 'Study Materials';
    const page = meta.pageNumber || 1;
    const sentences = chunk.text.split(/(?<=[.?!])\s+/);

    for (const sent of sentences) {
      const lowerSent = sent.toLowerCase();
      const matchCount = qWords.filter(w => lowerSent.includes(w)).length;
      if (matchCount >= 1 && sent.length > 25) {
        relevantSentences.push({
          sentence: sent.trim(),
          source: `[Source: ${filename}, Page: ${page}]`,
          score: matchCount,
        });
      }
    }
  }

  if (relevantSentences.length === 0) {
    return "Based on the provided study materials, there is not enough information to answer this question. Please upload additional notes covering this topic.";
  }

  // Sort by relevance score and pick top sentences
  relevantSentences.sort((a, b) => b.score - a.score);
  const topExcerpts = relevantSentences.slice(0, 4);

  let formatted = `Based on your uploaded study materials, here is what was found regarding your question:\n\n`;
  for (const item of topExcerpts) {
    formatted += `• ${item.sentence} ${item.source}\n\n`;
  }

  formatted += `\n*Note: Running in local study mode. Provide an LLM_API_KEY in .env for full conversational synthesis.*`;
  return formatted;
}
