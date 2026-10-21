import { computeStudentAnalytics } from '../services/analyticsService.js';

export async function getAnalytics(req, res, next) {
  try {
    const analytics = await computeStudentAnalytics(req.ownerId);
    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
}
