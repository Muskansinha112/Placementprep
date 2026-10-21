import { getLLM, isLlmConfigured } from '../config/llm.js';
import { JD_EXTRACTION_PROMPT } from '../rag/prompts.js';
import { JobDescriptionSchema } from '../validators/schemas.js';
import { JobDescription } from '../models/JobDescription.js';

/**
 * Parses and extracts structured requirements from a job description.
 * 
 * @param {string} text - Raw job description text
 * @param {Object} metadata - { ownerId, jobTitle, company }
 * @returns {Promise<Object>}
 */
export async function processJobDescription(text, metadata = {}) {
  let structuredData = null;

  if (isLlmConfigured()) {
    try {
      const llm = getLLM({ temperature: 0.1 });
      const prompt = JD_EXTRACTION_PROMPT.replace('{jdText}', text);

      const response = await llm.invoke([
        { role: 'user', content: prompt }
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const cleanJson = extractJsonFromText(content);
      const parsed = JSON.parse(cleanJson);
      structuredData = JobDescriptionSchema.parse({
        jobTitle: metadata.jobTitle || parsed.jobTitle || 'Software Engineer',
        company: metadata.company || parsed.company || '',
        requiredSkills: parsed.requiredSkills || [],
        preferredSkills: parsed.preferredSkills || [],
        responsibilities: parsed.responsibilities || [],
        technicalTopics: parsed.technicalTopics || [],
        experienceRequirements: parsed.experienceRequirements || 'Not specified',
        rawText: text,
      });
    } catch (llmError) {
      console.warn(`[JobService] LLM parsing failed (${llmError.message}). Falling back to pattern-based JD parser.`);
    }
  }

  // Fallback pattern extractor
  if (!structuredData) {
    const fallbackJD = extractJobPatterns(text, metadata);
    structuredData = JobDescriptionSchema.parse(fallbackJD);
  }

  // Persist to MongoDB
  const jdDoc = await JobDescription.create({
    ownerId: metadata.ownerId || 'guest_user',
    jobTitle: structuredData.jobTitle,
    company: structuredData.company,
    rawText: text,
    requiredSkills: structuredData.requiredSkills,
    preferredSkills: structuredData.preferredSkills,
    responsibilities: structuredData.responsibilities,
    technicalTopics: structuredData.technicalTopics,
    experienceRequirements: structuredData.experienceRequirements,
  });

  return jdDoc;
}

/**
 * Compares a student's structured resume profile against a target job description.
 * Uses deterministic JavaScript logic.
 * 
 * @param {Object} resumeProfile - Parsed resume profile object
 * @param {Object} jobDescription - Parsed job description object
 * @returns {Object} comparison analysis
 */
export function compareResumeAndJob(resumeProfile, jobDescription) {
  if (!resumeProfile || !jobDescription) {
    throw new Error('Both resume profile and job description are required for comparison');
  }

  // Collect all skills from resume
  const resumeSkillsMap = new Map();
  const rawResumeSkills = [
    ...(resumeProfile.skills?.languages || []),
    ...(resumeProfile.skills?.frameworks || []),
    ...(resumeProfile.skills?.databases || []),
    ...(resumeProfile.skills?.tools || []),
    ...(resumeProfile.skills?.cloudDevops || []),
    ...(resumeProfile.skills?.coreConcepts || []),
  ];

  for (const s of rawResumeSkills) {
    if (typeof s === 'string' && s.trim()) {
      resumeSkillsMap.set(normalizeSkillName(s), s.trim());
    }
  }

  const jdRequired = jobDescription.requiredSkills || [];
  const jdPreferred = jobDescription.preferredSkills || [];
  const allJdSkills = [...jdRequired, ...jdPreferred];

  const matchingSkills = [];
  const skillsNotMentionedInResume = [];

  for (const skill of allJdSkills) {
    const normalized = normalizeSkillName(skill);
    if (resumeSkillsMap.has(normalized)) {
      matchingSkills.push({
        name: skill,
        matchedAs: resumeSkillsMap.get(normalized),
        isRequired: jdRequired.includes(skill),
      });
    } else {
      skillsNotMentionedInResume.push({
        name: skill,
        isRequired: jdRequired.includes(skill),
      });
    }
  }

  // Identify relevant projects from resume
  const relevantProjects = [];
  const resumeProjects = resumeProfile.projects || [];

  for (const proj of resumeProjects) {
    const projTech = (proj.technologies || []).map(normalizeSkillName);
    const matchedTech = [];

    for (const jdSkill of allJdSkills) {
      if (projTech.includes(normalizeSkillName(jdSkill))) {
        matchedTech.push(jdSkill);
      }
    }

    if (matchedTech.length > 0) {
      relevantProjects.push({
        title: proj.title,
        description: proj.description,
        matchedTechnologies: matchedTech,
      });
    }
  }

  // Calculate match percentage based primarily on required skills
  const totalRequired = jdRequired.length > 0 ? jdRequired.length : allJdSkills.length;
  const matchedRequiredCount = matchingSkills.filter(s => s.isRequired).length;
  const matchPercentage = totalRequired > 0 
    ? Math.round((matchedRequiredCount / totalRequired) * 100)
    : 70;

  // Suggested preparation topics based on unmentioned skills and JD technical topics
  const suggestedTopics = Array.from(new Set([
    ...(jobDescription.technicalTopics || []),
    ...skillsNotMentionedInResume.map(s => s.name),
  ])).slice(0, 8);

  return {
    matchPercentage,
    matchingSkills,
    skillsNotMentionedInResume,
    relevantProjects,
    suggestedTopics,
    targetRole: jobDescription.jobTitle,
    company: jobDescription.company,
  };
}

/**
 * Normalizes skill names for fuzzy deterministic comparison (e.g. Node.js -> nodejs).
 */
export function normalizeSkillName(name) {
  if (!name || typeof name !== 'string') return '';
  const lower = name.toLowerCase().trim();

  // Known synonyms map
  const synonyms = {
    'js': 'javascript',
    'ts': 'typescript',
    'node': 'nodejs',
    'node.js': 'nodejs',
    'react': 'reactjs',
    'react.js': 'reactjs',
    'mongo': 'mongodb',
    'postgres': 'postgresql',
    'k8s': 'kubernetes',
    'golang': 'go',
    'c++': 'cpp',
    'c#': 'csharp',
  };

  if (synonyms[lower]) return synonyms[lower];
  return lower.replace(/[^a-z0-9]/g, '');
}

function extractJsonFromText(text) {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text;
}

function extractJobPatterns(text, metadata = {}) {
  const lower = text.toLowerCase();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const KNOWN_SKILLS = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust',
    'React', 'Node.js', 'Express', 'Django', 'FastAPI', 'Spring Boot',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kubernetes',
    'AWS', 'GCP', 'Azure', 'Git', 'Linux', 'REST APIs', 'GraphQL',
    'Microservices', 'System Design', 'Data Structures', 'Algorithms'
  ];

  const foundSkills = [];
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      foundSkills.push(skill);
    }
  }

  const required = foundSkills.slice(0, Math.ceil(foundSkills.length * 0.7));
  const preferred = foundSkills.slice(Math.ceil(foundSkills.length * 0.7));

  return {
    jobTitle: metadata.jobTitle || lines[0]?.substring(0, 60) || 'Software Engineer',
    company: metadata.company || '',
    requiredSkills: required.length > 0 ? required : ['JavaScript', 'REST APIs', 'Data Structures'],
    preferredSkills: preferred,
    responsibilities: [
      'Design and build scalable software features and backend APIs',
      'Collaborate with cross-functional teams to deliver production-ready code',
      'Participate in code reviews, testing, and system performance optimizations',
    ],
    technicalTopics: ['Data Structures & Algorithms', 'System Architecture', 'Database Management', 'REST API Design'],
    experienceRequirements: text.match(/(?:[0-9]+(?:\+|-|\s*to\s*[0-9]+)?\s*years?)/i)?.[0] || '0-2 years',
    rawText: text,
  };
}
