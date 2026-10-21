import mongoose from 'mongoose';

const interviewQuestionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate',
  },
  questionType: {
    type: String,
    default: 'Conceptual',
  },
  expectedKeyConcepts: {
    type: [String],
    default: [],
  },
  hints: {
    type: [String],
    default: [],
  },
});

const interviewSessionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    resumeId: {
      type: String,
      default: null,
    },
    jobId: {
      type: String,
      default: null,
    },
    targetRole: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      default: 'Intermediate',
    },
    questions: {
      type: [interviewQuestionSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);
