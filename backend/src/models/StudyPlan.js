import mongoose from 'mongoose';

const studyModuleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  estimatedHours: { type: Number, default: 2 },
  topics: { type: [String], default: [] },
  activities: { type: [String], default: [] },
  practiceQuestions: { type: [String], default: [] },
  completed: { type: Boolean, default: false },
});

const studyPlanSchema = new mongoose.Schema(
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
    targetRole: {
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
    durationDays: {
      type: Number,
      default: 7,
    },
    modules: {
      type: [studyModuleSchema],
      default: [],
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    completedItems: {
      type: Number,
      default: 0,
    },
    progressPercentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed'],
      default: 'Not Started',
    },
  },
  { timestamps: true }
);

export const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema);
