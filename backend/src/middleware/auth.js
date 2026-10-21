import { User } from '../models/User.js';

export const DEFAULT_USER_ID = 'student_demo_user';
export const DEFAULT_USER_NAME = 'Alex Rivers (Student)';
export const DEFAULT_USER_EMAIL = 'student@placementprep.ai';

/**
 * Ensures a valid user identity is attached to the request.
 * Supports x-user-id header or defaults to the persistent demo student.
 */
export async function identifyUser(req, res, next) {
  try {
    const headerUserId = req.headers['x-user-id'];
    const ownerId = headerUserId && typeof headerUserId === 'string' && headerUserId.trim()
      ? headerUserId.trim()
      : DEFAULT_USER_ID;

    req.user = {
      id: ownerId,
      name: ownerId === DEFAULT_USER_ID ? DEFAULT_USER_NAME : `User (${ownerId})`,
      email: ownerId === DEFAULT_USER_ID ? DEFAULT_USER_EMAIL : `${ownerId}@placementprep.ai`,
    };

    req.ownerId = ownerId;
    next();
  } catch (error) {
    next(error);
  }
}
