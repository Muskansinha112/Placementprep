import { z } from 'zod';

// ==========================================
// Resume Profile Schemas
// ==========================================
export const EducationItemSchema = z.object({
  institution: z.string().default(''),
  degree: z.string().default(''),
  fieldOfStudy: z.string().default(''),
  graduationYear: z.string().default(''),
  gpa: z.string().default(''),
});

export const ProjectItemSchema = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  technologies: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
});

export const ExperienceItemSchema = z.object({
  company: z.string().default(''),
  role: z.string().default(''),
  duration: z.string().default(''),
  description: z.string().default(''),
  achievements: z.array(z.string()).default([]),
});

export const CertificationItemSchema = z.object({
  name: z.string().default(''),
  issuer: z.string().default(''),
  year: z.string().default(''),
});

export const ResumeProfileSchema = z.object({
  personalInfo: z.object({
    name: z.string().default(''),
    email: z.string().default(''),
    phone: z.string().default(''),
    links: z.array(z.string()).default([]),
    summary: z.string().default(''),
  }).default({}),
  education: z.array(EducationItemSchema).default([]),
  skills: z.object({
    languages: z.array(z.string()).default([]),
    frameworks: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    cloudDevops: z.array(z.string()).default([]),
    coreConcepts: z.array(z.string()).default([]),
  }).default({}),
  projects: z.array(ProjectItemSchema).default([]),
  workExperience: z.array(ExperienceItemSchema).default([]),
  certifications: z.array(CertificationItemSchema).default([]),
});

// ==========================================
// Job Description Schemas
// ==========================================
export const JobDescriptionSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  company: z.string().optional().default(''),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  technicalTopics: z.array(z.string()).default([]),
  experienceRequirements: z.string().default('Not specified'),
  rawText: z.string().optional().default(''),
});

export const AnalyzeJobRequestSchema = z.object({
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  text: z.string().min(10, 'Job description text must be at least 10 characters long'),
  resumeId: z.string().optional(),
});

// ==========================================
// Interview Practice & Generation Schemas
// ==========================================
export const InterviewQuestionSchema = z.object({
  id: z.string(),
  questionText: z.string().min(5),
  topic: z.string(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  questionType: z.enum(['Conceptual', 'Scenario-based', 'Coding/Algorithmic', 'System Design', 'Follow-up', 'Project-specific']),
  expectedKeyConcepts: z.array(z.string()),
  hints: z.array(z.string()).default([]),
});

export const GenerateInterviewRequestSchema = z.object({
  resumeId: z.string().optional(),
  jobId: z.string().optional(),
  targetRole: z.string().min(1, 'Target role is required'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Mixed']).default('Intermediate'),
  topics: z.array(z.string()).optional(),
  count: z.number().int().min(1).max(10).default(5),
});

export const SubmitAnswerRequestSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  answerText: z.string().min(3, 'Answer must be at least 3 characters long'),
});

// Rubric Evaluation Schema
export const AnswerEvaluationSchema = z.object({
  score: z.object({
    technicalCorrectness: z.number().min(0).max(4),
    coverageOfKeyConcepts: z.number().min(0).max(3),
    clarity: z.number().min(0).max(2),
    relevantExample: z.number().min(0).max(1),
    totalScore: z.number().min(0).max(10),
  }),
  criterionFeedback: z.object({
    technicalCorrectness: z.string(),
    coverageOfKeyConcepts: z.string(),
    clarity: z.string(),
    relevantExample: z.string(),
  }),
  correctConcepts: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  suggestions: z.array(z.string()),
  improvedAnswer: z.string(),
  studyReferences: z.array(z.string()).default([]),
});

// ==========================================
// Study Plan Schemas
// ==========================================
export const StudyPlanModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: z.enum(['High', 'Medium', 'Low']),
  estimatedHours: z.number().default(2),
  topics: z.array(z.string()),
  activities: z.array(z.string()),
  practiceQuestions: z.array(z.string()).default([]),
  completed: z.boolean().default(false),
});

export const GenerateStudyPlanRequestSchema = z.object({
  targetRole: z.string().min(1, 'Target role is required'),
  resumeId: z.string().optional(),
  jobId: z.string().optional(),
  durationDays: z.number().int().min(3).max(60).default(7),
});

export const UpdateProgressRequestSchema = z.object({
  moduleId: z.string(),
  completed: z.boolean(),
});

// ==========================================
// RAG & Document Schemas
// ==========================================
export const ChatQueryRequestSchema = z.object({
  question: z.string().min(2, 'Question must be at least 2 characters').max(2000),
  documentId: z.string().optional(),
  k: z.number().int().min(1).max(10).default(4),
});
