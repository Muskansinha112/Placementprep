import pdfParse from 'pdf-parse';

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
