import { AnalyzeJobRequestSchema } from '../validators/schemas.js';
import { processJobDescription, compareResumeAndJob } from '../services/jobService.js';
import { JobDescription } from '../models/JobDescription.js';
import { ResumeProfile } from '../models/ResumeProfile.js';

export async function analyzeJob(req, res, next) {
  try {
    const validated = AnalyzeJobRequestSchema.parse(req.body);

    const jdDoc = await processJobDescription(validated.text, {
      ownerId: req.ownerId,
      jobTitle: validated.jobTitle,
      company: validated.company,
    });

    let comparison = null;
    let resume = null;

    if (validated.resumeId) {
      resume = await ResumeProfile.findOne({ _id: validated.resumeId, ownerId: req.ownerId });
    } else {
      // Auto-detect most recent resume
      const resumes = await ResumeProfile.find({ ownerId: req.ownerId }).sort({ createdAt: -1 }).limit(1);
      resume = resumes[0] || null;
    }

    if (resume) {
      comparison = compareResumeAndJob(resume.parsedProfile, jdDoc);
    }

    return res.status(201).json({
      success: true,
      message: 'Job description analyzed successfully',
      data: {
        job: jdDoc,
        comparison,
        resumeId: resume?._id || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getJobs(req, res, next) {
  try {
    const jobs = await JobDescription.find({ ownerId: req.ownerId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
}

export async function getJobById(req, res, next) {
  try {
    const job = await JobDescription.findOne({ _id: req.params.id, ownerId: req.ownerId });
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job description not found' });
    }
    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

export async function compareJobWithResume(req, res, next) {
  try {
    const { jobId, resumeId } = req.body;
    if (!jobId || !resumeId) {
      return res.status(400).json({ success: false, error: 'Both jobId and resumeId are required.' });
    }

    const job = await JobDescription.findOne({ _id: jobId, ownerId: req.ownerId });
    const resume = await ResumeProfile.findOne({ _id: resumeId, ownerId: req.ownerId });

    if (!job || !resume) {
      return res.status(404).json({ success: false, error: 'Job description or resume profile not found.' });
    }

    const comparison = compareResumeAndJob(resume.parsedProfile, job);

    return res.json({
      success: true,
      data: {
        job,
        resume,
        comparison,
      },
    });
  } catch (error) {
    next(error);
  }
}
