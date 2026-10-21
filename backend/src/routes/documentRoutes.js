import { Router } from 'express';
import { documentUpload } from '../middleware/upload.js';
import { uploadDocument, getDocuments, deleteDocument } from '../controllers/documentController.js';

const router = Router();

router.post('/upload', documentUpload.single('document'), uploadDocument);
router.get('/', getDocuments);
router.delete('/:id', deleteDocument);

export default router;
