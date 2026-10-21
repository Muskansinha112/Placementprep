import { Router } from 'express';
import { resumeUpload } from '../middleware/upload.js';
import { uploadResume, getResumes, getResumeById } from '../controllers/resumeController.js';

const router = Router();

router.post('/upload', resumeUpload.single('resume'), uploadResume);
router.get('/', getResumes);
router.get('/:id', getResumeById);

export default router;
