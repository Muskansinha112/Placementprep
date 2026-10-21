import { Router } from 'express';
import { analyzeJob, getJobs, getJobById, compareJobWithResume } from '../controllers/jobController.js';

const router = Router();

router.post('/analyze', analyzeJob);
router.post('/compare', compareJobWithResume);
router.get('/', getJobs);
router.get('/:id', getJobById);

export default router;
