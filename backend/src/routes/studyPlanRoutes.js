import { Router } from 'express';
import { generatePlan, getPlans, getPlanById, updateProgress } from '../controllers/studyPlanController.js';

const router = Router();

router.post('/generate', generatePlan);
router.get('/', getPlans);
router.get('/:id', getPlanById);
router.patch('/:id/progress', updateProgress);

export default router;
