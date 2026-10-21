import mongoose from 'mongoose';

const resumeProfileSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    rawText: {
      type: String,
      default: '',
    },
    parsedProfile: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

export const ResumeProfile = mongoose.model('ResumeProfile', resumeProfileSchema);
