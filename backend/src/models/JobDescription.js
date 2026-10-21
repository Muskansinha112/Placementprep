import mongoose from 'mongoose';

const jobDescriptionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    jobTitle: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      default: '',
    },
    rawText: {
      type: String,
      default: '',
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    preferredSkills: {
      type: [String],
      default: [],
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    technicalTopics: {
      type: [String],
      default: [],
    },
    experienceRequirements: {
      type: String,
      default: 'Not specified',
    },
  },
  { timestamps: true }
);

export const JobDescription = mongoose.model('JobDescription', jobDescriptionSchema);
