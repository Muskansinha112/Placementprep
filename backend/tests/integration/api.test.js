import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { JobDescription } from '../../src/models/JobDescription.js';
import { InterviewSession } from '../../src/models/InterviewSession.js';
import { AnswerEvaluation } from '../../src/models/AnswerEvaluation.js';
import { ResumeProfile } from '../../src/models/ResumeProfile.js';

describe('PlacementPrep AI - REST API Integration Tests', () => {
  beforeAll(() => {
    // Mock DB operations to run deterministically in test environment
    vi.spyOn(JobDescription, 'create').mockImplementation(async (data) => ({
      _id: 'mock_job_id_123',
      ...data,
    }));
    vi.spyOn(JobDescription, 'find').mockReturnValue({
      sort: () => ({
        limit: () => Promise.resolve([
          { _id: 'mock_job_id_123', jobTitle: 'Backend Engineer', requiredSkills: ['Node.js'] }
        ]),
      }),
    });
    vi.spyOn(JobDescription, 'findOne').mockResolvedValue({
      _id: 'mock_job_id_123',
      jobTitle: 'Backend Engineer',
      requiredSkills: ['Node.js'],
    });

    vi.spyOn(InterviewSession, 'create').mockImplementation(async (data) => ({
      _id: 'mock_session_id_456',
      ...data,
    }));
    vi.spyOn(InterviewSession, 'find').mockReturnValue({
      sort: () => ({
        limit: () => Promise.resolve([
          { _id: 'mock_session_id_456', title: 'Software Engineer Practice' }
        ]),
      }),
    });
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'mock_session_id_456',
      title: 'Software Engineer Practice',
      questions: [
        { id: 'q_1', questionText: 'Explain the Event Loop', topic: 'Node.js', expectedKeyConcepts: ['Libuv'] }
      ],
    });
    vi.spyOn(InterviewSession, 'countDocuments').mockResolvedValue(1);

    vi.spyOn(AnswerEvaluation, 'create').mockImplementation(async (data) => ({
      _id: 'mock_eval_id_789',
      ...data,
    }));
    vi.spyOn(AnswerEvaluation, 'find').mockReturnValue({
      sort: () => Promise.resolve([
        {
          _id: 'mock_eval_id_789',
          questionText: 'Explain the Event Loop',
          topic: 'Node.js',
          score: { technicalCorrectness: 4, coverageOfKeyConcepts: 3, clarity: 2, relevantExample: 1, totalScore: 10 },
          createdAt: new Date(),
        }
      ]),
    });

    vi.spyOn(ResumeProfile, 'findOne').mockResolvedValue(null);
    vi.spyOn(ResumeProfile, 'find').mockReturnValue({
      sort: () => ({
        limit: () => Promise.resolve([]),
      }),
    });
  });

  describe('GET /api/health', () => {
    it('returns system health status and registered services', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('online');
      expect(res.body.services).toHaveProperty('mongodb');
      expect(res.body.services).toHaveProperty('chromadb');
      expect(res.body.services).toHaveProperty('llm');
    });
  });

  describe('POST /api/jobs/analyze', () => {
    it('analyzes job description text and returns extracted requirements', async () => {
      const payload = {
        jobTitle: 'Full-Stack Developer Intern',
        company: 'Acme Software',
        text: 'We are looking for an intern with strong JavaScript, Node.js, and MongoDB skills to build REST APIs.',
      };

      const res = await request(app)
        .post('/api/jobs/analyze')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.job.jobTitle).toBe('Full-Stack Developer Intern');
      expect(res.body.data.job.requiredSkills).toContain('JavaScript');
    });

    it('rejects too short job description with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/jobs/analyze')
        .send({ text: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/interviews/generate', () => {
    it('generates a personalized interview session with questions', async () => {
      const payload = {
        targetRole: 'Software Engineer',
        difficulty: 'Intermediate',
        count: 3,
      };

      const res = await request(app)
        .post('/api/interviews/generate')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questions).toHaveLength(3);
      expect(res.body.data.questions[0]).toHaveProperty('expectedKeyConcepts');
    });
  });

  describe('GET /api/analytics', () => {
    it('returns calculated analytics and rubric breakdowns', async () => {
      const res = await request(app).get('/api/analytics');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalQuestionsAttempted');
      expect(res.body.data).toHaveProperty('rubricAverages');
      expect(res.body.data).toHaveProperty('suggestedRevisionTopics');
    });
  });

  describe('POST /api/chat (RAG Assistant)', () => {
    it('accepts question and returns grounded response format', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ question: 'Explain how database indexing works.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('answer');
      expect(res.body.data).toHaveProperty('sources');
    });
  });

  describe('POST /api/resumes/upload', () => {
    it('returns 400 when no file is uploaded', async () => {
      const res = await request(app).post('/api/resumes/upload');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Please upload a PDF');
    });
  });

  describe('User isolation via x-user-id header', () => {
    it('attaches user identity from header', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('x-user-id', 'custom_student_123');

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe('custom_student_123');
    });
  });
});
