import { GenerateStudyPlanRequestSchema, UpdateProgressRequestSchema } from '../validators/schemas.js';
import { createStudyPlan, updateModuleProgress } from '../services/studyPlanService.js';
import { StudyPlan } from '../models/StudyPlan.js';

export async function generatePlan(req, res, next) {
  try {
    const validated = GenerateStudyPlanRequestSchema.parse(req.body);

    const plan = await createStudyPlan({
      ownerId: req.ownerId,
      targetRole: validated.targetRole,
      durationDays: validated.durationDays,
      resumeId: validated.resumeId,
      jobId: validated.jobId,
    });

    return res.status(201).json({
      success: true,
      message: 'Personalized study plan created successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPlans(req, res, next) {
  try {
    const plans = await StudyPlan.find({ ownerId: req.ownerId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPlanById(req, res, next) {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, ownerId: req.ownerId });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Study plan not found' });
    }
    return res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProgress(req, res, next) {
  try {
    const planId = req.params.id;
    const validated = UpdateProgressRequestSchema.parse(req.body);

    const updatedPlan = await updateModuleProgress(
      planId,
      validated.moduleId,
      validated.completed,
      req.ownerId
    );

    return res.json({
      success: true,
      message: 'Module progress updated successfully',
      data: updatedPlan,
    });
  } catch (error) {
    next(error);
  }
}
