import { Router } from 'express';
import {
  generateInterview,
  getInterviews,
  getInterviewById,
  submitInterviewAnswer,
  getInterviewEvaluations,
  getInterviewHistory,
} from '../controllers/interviewController.js';

const router = Router();

router.post('/generate', generateInterview);
router.get('/history', getInterviewHistory);
router.get('/', getInterviews);
router.get('/:id', getInterviewById);
router.post('/:id/answer', submitInterviewAnswer);
router.get('/:id/evaluations', getInterviewEvaluations);

export default router;
