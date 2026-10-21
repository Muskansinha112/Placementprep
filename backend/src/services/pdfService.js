import pdfParse from 'pdf-parse';
import { config } from '../config/env.js';

/**
 * Extracts raw text and metadata from a PDF file buffer.
 * 
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<{ text: string, numPages: number, info: Object }>}
 */
export async function extractTextFromPDF(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF buffer is empty or missing');
  }

  // When configured, use the Python service for PDF extraction. Keeping it
  // optional means the default local setup stays as simple as before.
  if (config.aiServiceUrl) {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/pdf' }), 'document.pdf');
    let response;
    try {
      response = await fetch(`${config.aiServiceUrl.replace(/\/$/, '')}/extract-pdf`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw new Error(`Python PDF service is unavailable: ${error.message}`);
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.detail || `Python PDF service failed (${response.status})`);
    }
    if (!result.text?.trim()) {
      throw new Error('The uploaded PDF appears to be empty or contains only scanned images without extractable text.');
    }
    return { text: result.text.trim(), numPages: result.num_pages || 1, info: result.info || {} };
  }

  try {
    const data = await pdfParse(buffer);
    const cleanedText = (data.text || '').replace(/\r\n/g, '\n').trim();

    if (cleanedText.length === 0) {
      throw new Error('The uploaded PDF appears to be empty or contains only scanned images without extractable text.');
    }

    return {
      text: cleanedText,
      numPages: data.numpages || 1,
      info: data.info || {},
    };
  } catch (error) {
    if (error.message.includes('empty or contains only scanned images')) {
      throw error;
    }
    throw new Error(`Failed to parse PDF document: ${error.message}`);
  }
}
