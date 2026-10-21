import { ChatQueryRequestSchema } from '../validators/schemas.js';
import { generateGroundedAnswer } from '../rag/answerGenerator.js';

export async function queryStudyAssistant(req, res, next) {
  try {
    const validated = ChatQueryRequestSchema.parse(req.body);

    const result = await generateGroundedAnswer(validated.question, {
      ownerId: req.ownerId,
      documentId: validated.documentId,
      k: validated.k,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
