import fs from 'fs';
import path from 'path';
import { extractTextFromPDF } from '../services/pdfService.js';
import { chunkDocument } from '../rag/chunking.js';
import { addDocumentsToStore, deleteChunksByDocumentId } from '../rag/vectorStore.js';
import { StudyDocument } from '../models/StudyDocument.js';

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a study document (.pdf, .txt, or .md).' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rawText = '';
    let pageCount = 1;

    if (ext === '.pdf') {
      const buffer = await fs.promises.readFile(filePath);
      const parsed = await extractTextFromPDF(buffer);
      rawText = parsed.text;
      pageCount = parsed.numPages;
    } else {
      rawText = await fs.promises.readFile(filePath, 'utf8');
      pageCount = Math.max(1, Math.ceil(rawText.length / 2000));
    }

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Uploaded document is empty or could not be parsed.' });
    }

    // Create MongoDB record
    const studyDoc = await StudyDocument.create({
      ownerId: req.ownerId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || 'application/octet-stream',
      fileSize: req.file.size,
      pageCount,
      status: 'processing',
    });

    // Chunk text with metadata
    const chunks = await chunkDocument(rawText, {
      documentId: String(studyDoc._id),
      filename: studyDoc.originalName,
      ownerId: req.ownerId,
      pageCount,
    });

    // Index chunks into ChromaDB
    try {
      await addDocumentsToStore(chunks);
      studyDoc.status = 'ready';
      studyDoc.chunkCount = chunks.length;
      await studyDoc.save();
    } catch (chromaError) {
      console.error('[DocumentController] ChromaDB indexing error:', chromaError.message);
      studyDoc.status = 'failed';
      studyDoc.chunkCount = chunks.length;
      studyDoc.error = 'Vector indexing failed. Check ChromaDB and try uploading the document again.';
      await studyDoc.save();
      return res.status(503).json({
        success: false,
        error: 'The document was uploaded but could not be indexed. Check that ChromaDB is available, then delete this failed record and retry.',
        data: studyDoc,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Study document uploaded and indexed into ChromaDB successfully',
      data: studyDoc,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDocuments(req, res, next) {
  try {
    const docs = await StudyDocument.find({ ownerId: req.ownerId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: docs.length,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const docId = req.params.id;
    const studyDoc = await StudyDocument.findOne({ _id: docId, ownerId: req.ownerId });

    if (!studyDoc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // 1. Delete vectors from ChromaDB
    try {
      await deleteChunksByDocumentId(docId, req.ownerId);
    } catch (chromaError) {
      console.warn(`[ChromaDB] Could not delete vectors for doc ${docId}:`, chromaError.message);
    }

    // 2. Delete file from local storage if exists
    try {
      const filePath = path.resolve('uploads', studyDoc.filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (fsError) {
      console.warn(`[Storage] Could not remove file for doc ${docId}:`, fsError.message);
    }

    // 3. Delete from MongoDB
    await StudyDocument.deleteOne({ _id: docId, ownerId: req.ownerId });

    return res.json({
      success: true,
      message: 'Study document and associated vector chunks deleted successfully',
      data: { id: docId },
    });
  } catch (error) {
    next(error);
  }
}
