import { describe, it, expect } from 'vitest';
import {
  ResumeProfileSchema,
  JobDescriptionSchema,
  InterviewQuestionSchema,
  AnswerEvaluationSchema,
  StudyPlanModuleSchema,
  ChatQueryRequestSchema,
} from '../../src/validators/schemas.js';

describe('Zod Validation Schemas', () => {
  describe('ResumeProfileSchema', () => {
    it('validates a complete structured resume profile', () => {
      const validProfile = {
        personalInfo: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+1 555-0199',
          links: ['https://github.com/janedoe'],
          summary: 'Passionate software engineer',
        },
        education: [
          {
            institution: 'State University',
            degree: 'B.S.',
            fieldOfStudy: 'Computer Science',
            graduationYear: '2026',
            gpa: '3.9',
          },
        ],
        skills: {
          languages: ['JavaScript', 'TypeScript', 'Python'],
          frameworks: ['Express.js', 'React'],
          databases: ['MongoDB', 'PostgreSQL'],
          tools: ['Git', 'Docker'],
          cloudDevops: ['AWS'],
          coreConcepts: ['Data Structures', 'REST APIs'],
        },
        projects: [
          {
            title: 'PlacementPrep AI',
            description: 'GenAI preparation suite',
            technologies: ['Node.js', 'ChromaDB'],
            highlights: ['Built full RAG pipeline'],
          },
        ],
        workExperience: [],
        certifications: [],
      };

      const result = ResumeProfileSchema.parse(validProfile);
      expect(result.personalInfo.name).toBe('Jane Doe');
      expect(result.skills.languages).toContain('JavaScript');
      expect(result.projects).toHaveLength(1);
    });

    it('supplies safe defaults for missing optional resume fields', () => {
      const result = ResumeProfileSchema.parse({});
      expect(result.personalInfo).toBeDefined();
      expect(result.skills.languages).toEqual([]);
      expect(result.education).toEqual([]);
      expect(result.projects).toEqual([]);
    });
  });

  describe('JobDescriptionSchema', () => {
    it('validates valid job description data', () => {
      const validJD = {
        jobTitle: 'Backend Engineer',
        company: 'Stripe',
        requiredSkills: ['Node.js', 'MongoDB', 'REST APIs'],
        preferredSkills: ['Docker', 'AWS'],
        responsibilities: ['Build scalable APIs'],
        technicalTopics: ['System Design', 'Databases'],
        experienceRequirements: '1-3 years',
      };

      const parsed = JobDescriptionSchema.parse(validJD);
      expect(parsed.jobTitle).toBe('Backend Engineer');
      expect(parsed.requiredSkills).toHaveLength(3);
    });

    it('rejects JD missing jobTitle', () => {
      expect(() => {
        JobDescriptionSchema.parse({ requiredSkills: ['Node.js'] });
      }).toThrow();
    });
  });

  describe('InterviewQuestionSchema', () => {
    it('validates a technical interview question', () => {
      const q = {
        id: 'q_1',
        questionText: 'Explain the difference between process.nextTick and setImmediate in Node.js.',
        topic: 'Node.js Event Loop',
        difficulty: 'Intermediate',
        questionType: 'Conceptual',
        expectedKeyConcepts: ['Microtask queue', 'Macrotask queue', 'Libuv check phase'],
        hints: ['Consider which executes before I/O events.'],
      };

      const parsed = InterviewQuestionSchema.parse(q);
      expect(parsed.difficulty).toBe('Intermediate');
      expect(parsed.expectedKeyConcepts).toHaveLength(3);
    });

    it('rejects an invalid difficulty level', () => {
      expect(() => {
        InterviewQuestionSchema.parse({
          id: 'q_2',
          questionText: 'Explain caching.',
          topic: 'System Design',
          difficulty: 'SuperHard', // Invalid enum
          questionType: 'Conceptual',
          expectedKeyConcepts: ['Cache hit'],
          hints: [],
        });
      }).toThrow();
    });
  });

  describe('AnswerEvaluationSchema (4-Criterion Rubric)', () => {
    it('validates standard 0-10 rubric evaluation', () => {
      const evaluation = {
        score: {
          technicalCorrectness: 4,
          coverageOfKeyConcepts: 3,
          clarity: 2,
          relevantExample: 1,
          totalScore: 10,
        },
        criterionFeedback: {
          technicalCorrectness: 'Excellent accuracy.',
          coverageOfKeyConcepts: 'Covered all key concepts.',
          clarity: 'Articulate and clear.',
          relevantExample: 'Provided production scenario.',
        },
        correctConcepts: ['Event Loop', 'Microtask Queue'],
        missingConcepts: [],
        suggestions: ['Keep up the great work.'],
        improvedAnswer: 'Model answer text.',
        studyReferences: ['Node.js Docs'],
      };

      const parsed = AnswerEvaluationSchema.parse(evaluation);
      expect(parsed.score.totalScore).toBe(10);
      expect(parsed.score.technicalCorrectness).toBe(4);
    });

    it('rejects out-of-range rubric score (e.g. Correctness > 4)', () => {
      expect(() => {
        AnswerEvaluationSchema.parse({
          score: {
            technicalCorrectness: 5, // Max is 4
            coverageOfKeyConcepts: 2,
            clarity: 1,
            relevantExample: 0,
            totalScore: 8,
          },
          criterionFeedback: {},
          correctConcepts: [],
          missingConcepts: [],
          suggestions: [],
          improvedAnswer: '',
        });
      }).toThrow();
    });
  });

  describe('ChatQueryRequestSchema', () => {
    it('validates valid chat query', () => {
      const q = { question: 'How does indexing speed up query retrieval in MongoDB?' };
      const parsed = ChatQueryRequestSchema.parse(q);
      expect(parsed.question).toContain('indexing');
      expect(parsed.k).toBe(4); // Default k
    });

    it('rejects too short question', () => {
      expect(() => {
        ChatQueryRequestSchema.parse({ question: '?' });
      }).toThrow();
    });
  });
});
