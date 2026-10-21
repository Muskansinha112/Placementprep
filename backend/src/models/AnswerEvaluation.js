import mongoose from 'mongoose';

const answerEvaluationSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      default: 'General',
    },
    studentAnswer: {
      type: String,
      required: true,
    },
    score: {
      technicalCorrectness: { type: Number, required: true, min: 0, max: 4 },
      coverageOfKeyConcepts: { type: Number, required: true, min: 0, max: 3 },
      clarity: { type: Number, required: true, min: 0, max: 2 },
      relevantExample: { type: Number, required: true, min: 0, max: 1 },
      totalScore: { type: Number, required: true, min: 0, max: 10 },
    },
    criterionFeedback: {
      technicalCorrectness: { type: String, default: '' },
      coverageOfKeyConcepts: { type: String, default: '' },
      clarity: { type: String, default: '' },
      relevantExample: { type: String, default: '' },
    },
    correctConcepts: {
      type: [String],
      default: [],
    },
    missingConcepts: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    improvedAnswer: {
      type: String,
      default: '',
    },
    studyReferences: {
      type: [String],
      default: [],
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export const AnswerEvaluation = mongoose.model('AnswerEvaluation', answerEvaluationSchema);
