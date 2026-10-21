import fs from 'fs';
import { extractTextFromPDF } from '../services/pdfService.js';
import { processResumeText } from '../services/resumeService.js';
import { ResumeProfile } from '../models/ResumeProfile.js';

export async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF resume file.' });
    }

    const filePath = req.file.path;
    const fileBuffer = await fs.promises.readFile(filePath);

    // Extract text from PDF
    const { text, numPages } = await extractTextFromPDF(fileBuffer);

    // Process and extract structured profile
    const resumeDoc = await processResumeText(text, {
      ownerId: req.ownerId,
      filename: req.file.originalname,
      fileSize: req.file.size,
      pageCount: numPages,
    });

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded and analyzed successfully',
      data: resumeDoc,
    });
  } catch (error) {
    next(error);
  }
}

export async function getResumes(req, res, next) {
  try {
    const resumes = await ResumeProfile.find({ ownerId: req.ownerId }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      count: resumes.length,
      data: resumes,
    });
  } catch (error) {
    next(error);
  }
}

export async function getResumeById(req, res, next) {
  try {
    const resume = await ResumeProfile.findOne({ _id: req.params.id, ownerId: req.ownerId });
    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume profile not found' });
    }
    return res.json({
      success: true,
      data: resume,
    });
  } catch (error) {
    next(error);
  }
}
