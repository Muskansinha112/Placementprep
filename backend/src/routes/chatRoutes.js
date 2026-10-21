import { Router } from 'express';
import { queryStudyAssistant } from '../controllers/chatController.js';

const router = Router();

router.post('/', queryStudyAssistant);

export default router;
