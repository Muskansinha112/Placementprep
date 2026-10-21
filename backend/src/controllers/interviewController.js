import { GenerateInterviewRequestSchema, SubmitAnswerRequestSchema } from '../validators/schemas.js';
import { generateInterviewSession } from '../services/interviewService.js';
import { evaluateAnswer } from '../services/evaluationService.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { AnswerEvaluation } from '../models/AnswerEvaluation.js';
import { ResumeProfile } from '../models/ResumeProfile.js';
import { JobDescription } from '../models/JobDescription.js';

export async function generateInterview(req, res, next) {
  try {
    const validated = GenerateInterviewRequestSchema.parse(req.body);

    let resume = null;
    if (validated.resumeId) {
      resume = await ResumeProfile.findOne({ _id: validated.resumeId, ownerId: req.ownerId });
    } else {
      const resumes = await ResumeProfile.find({ ownerId: req.ownerId }).sort({ createdAt: -1 }).limit(1);
      resume = resumes[0] || null;
    }

    let job = null;
    if (validated.jobId) {
      job = await JobDescription.findOne({ _id: validated.jobId, ownerId: req.ownerId });
    } else {
      const jobs = await JobDescription.find({ ownerId: req.ownerId }).sort({ createdAt: -1 }).limit(1);
      job = jobs[0] || null;
    }

    const session = await generateInterviewSession({
      ownerId: req.ownerId,
      resume,
      job,
      targetRole: validated.targetRole,
      difficulty: validated.difficulty,
      count: validated.count,
      topics: validated.topics || [],
    });

    return res.status(201).json({
      success: true,
      message: 'Interview practice session generated successfully',
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInterviews(req, res, next) {
  try {
    const sessions = await InterviewSession.find({ ownerId: req.ownerId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInterviewById(req, res, next) {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, ownerId: req.ownerId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Interview session not found' });
    }

    // Also fetch evaluations for this session
    const evaluations = await AnswerEvaluation.find({ sessionId: session._id, ownerId: req.ownerId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        session,
        evaluations,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function submitInterviewAnswer(req, res, next) {
  try {
    const sessionId = req.params.id;
    const validated = SubmitAnswerRequestSchema.parse(req.body);

    const session = await InterviewSession.findOne({ _id: sessionId, ownerId: req.ownerId });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Interview session not found' });
    }

    const question = session.questions.find(q => q.id === validated.questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: `Question with id '${validated.questionId}' not found in this session` });
    }

    const evaluationData = await evaluateAnswer({
      ownerId: req.ownerId,
      sessionId,
      question,
      answerText: validated.answerText,
    });

    return res.status(201).json({
      success: true,
      message: 'Answer evaluated against rubric successfully',
      data: evaluationData,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInterviewEvaluations(req, res, next) {
  try {
    const sessionId = req.params.id;
    const evaluations = await AnswerEvaluation.find({ sessionId, ownerId: req.ownerId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: evaluations.length,
      data: evaluations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInterviewHistory(req, res, next) {
  try {
    const evaluations = await AnswerEvaluation.find({ ownerId: req.ownerId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: evaluations.length,
      data: evaluations,
    });
  } catch (error) {
    next(error);
  }
}
