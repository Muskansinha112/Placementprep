import { getLLM, isLlmConfigured } from '../config/llm.js';
import { RESUME_EXTRACTION_PROMPT } from '../rag/prompts.js';
import { ResumeProfileSchema } from '../validators/schemas.js';
import { ResumeProfile } from '../models/ResumeProfile.js';

/**
 * Extracts a structured profile from resume text using LangChain with Zod validation.
 * Falls back to deterministic extraction when live LLM is unconfigured.
 * 
 * @param {string} rawText
 * @param {Object} metadata - { ownerId, filename, fileSize }
 * @returns {Promise<Object>}
 */
export async function processResumeText(rawText, metadata = {}) {
  let structuredData = null;

  if (isLlmConfigured()) {
    try {
      const llm = getLLM({ temperature: 0.1 });
      const prompt = RESUME_EXTRACTION_PROMPT.replace('{resumeText}', rawText);

      const response = await llm.invoke([
        { role: 'user', content: prompt }
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const cleanJson = extractJsonFromText(content);
      const parsed = JSON.parse(cleanJson);
      structuredData = ResumeProfileSchema.parse(parsed);
    } catch (llmError) {
      console.warn(`[ResumeService] LLM extraction failed (${llmError.message}). Falling back to pattern-based extractor.`);
    }
  }

  // Fallback pattern-based extractor
  if (!structuredData) {
    const fallbackProfile = extractResumePatterns(rawText);
    structuredData = ResumeProfileSchema.parse(fallbackProfile);
  }

  // Persist to MongoDB
  const resumeDoc = await ResumeProfile.create({
    ownerId: metadata.ownerId || 'guest_user',
    filename: metadata.filename || 'uploaded_resume.pdf',
    fileSize: metadata.fileSize || 0,
    rawText,
    parsedProfile: structuredData,
  });

  return resumeDoc;
}

/**
 * Helper to clean and extract JSON substring from model responses.
 */
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

/**
 * Deterministic pattern-based extractor for resume text.
 */
export function extractResumePatterns(text) {
  const profile = {
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      links: [],
      summary: '',
    },
    education: [],
    skills: {
      languages: [],
      frameworks: [],
      databases: [],
      tools: [],
      cloudDevops: [],
      coreConcepts: [],
    },
    projects: [],
    workExperience: [],
    certifications: [],
  };

  if (!text) return profile;

  // Email regex
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) profile.personalInfo.email = emailMatch[0];

  // Phone regex
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) profile.personalInfo.phone = phoneMatch[0];

  // Links (GitHub, LinkedIn, Portfolio)
  const linkMatches = text.match(/(?:https?:\/\/)?(?:www\.)?(?:github\.com|linkedin\.com|leetcode\.com)\/[a-zA-Z0-9_.-]+/gi);
  if (linkMatches) profile.personalInfo.links = Array.from(new Set(linkMatches));

  // Extract Name (usually in first 3 lines)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    const candidateName = lines[0];
    if (candidateName.length < 50 && !candidateName.includes('@') && !candidateName.includes('http')) {
      profile.personalInfo.name = candidateName;
    }
  }

  // Common Skills Keywords
  const SKILL_PATTERNS = {
    languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'HTML', 'CSS', 'SQL'],
    frameworks: ['React', 'Express', 'Express.js', 'Node.js', 'Next.js', 'Vue.js', 'Angular', 'Django', 'Flask', 'Spring Boot', 'FastAPI'],
    databases: ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'DynamoDB', 'Cassandra', 'ChromaDB'],
    tools: ['Git', 'GitHub', 'Docker', 'Kubernetes', 'Postman', 'Webpack', 'Vite', 'Jira', 'VS Code', 'Linux'],
    cloudDevops: ['AWS', 'GCP', 'Google Cloud', 'Azure', 'CI/CD', 'GitHub Actions', 'Terraform', 'Nginx'],
    coreConcepts: ['Data Structures', 'Algorithms', 'OOP', 'System Design', 'REST API', 'GraphQL', 'Microservices', 'Concurrency', 'DBMS', 'Operating Systems', 'Networking'],
  };

  const textLower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(SKILL_PATTERNS)) {
    for (const kw of keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(text)) {
        profile.skills[category].push(kw);
      }
    }
  }

  // Parse Education section if headers exist
  const eduKeywords = ['Bachelor', 'Master', 'B.Tech', 'B.E.', 'M.Tech', 'Computer Science', 'Information Technology', 'University', 'College', 'Institute'];
  for (const line of lines) {
    if (eduKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))) {
      profile.education.push({
        institution: line.length > 100 ? `${line.substring(0, 100)}...` : line,
        degree: 'Bachelor of Technology / Science',
        fieldOfStudy: 'Computer Science & Engineering',
        graduationYear: (text.match(/202[0-9]/) || ['2025'])[0],
        gpa: (text.match(/(?:GPA|CGPA)[\s:]*([0-9]\.[0-9]+)/i) || ['', ''])[1],
      });
      break;
    }
  }

  // Fallback project extraction
  const projectIdx = lines.findIndex(l => /^(projects|academic projects|key projects)/i.test(l));
  if (projectIdx !== -1) {
    const projectLines = lines.slice(projectIdx + 1, projectIdx + 8);
    if (projectLines.length > 0) {
      profile.projects.push({
        title: projectLines[0] || 'Web Application Project',
        description: projectLines.slice(1, 3).join(' ') || 'Developed full-stack web application with modern APIs.',
        technologies: profile.skills.frameworks.concat(profile.skills.languages).slice(0, 4),
        highlights: projectLines.slice(3, 5),
      });
    }
  }

  return profile;
}
