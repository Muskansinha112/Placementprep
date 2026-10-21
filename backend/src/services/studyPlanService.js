import { getLLM, isLlmConfigured } from '../config/llm.js';
import { STUDY_PLAN_PROMPT } from '../rag/prompts.js';
import { StudyPlanModuleSchema } from '../validators/schemas.js';
import { StudyPlan } from '../models/StudyPlan.js';
import { ResumeProfile } from '../models/ResumeProfile.js';
import { JobDescription } from '../models/JobDescription.js';
import { computeStudentAnalytics } from './analyticsService.js';

/**
 * Generates a personalized study plan based on student profile, JD, and past performance.
 * 
 * @param {Object} params - { ownerId, targetRole, durationDays, resumeId, jobId }
 * @returns {Promise<Object>} StudyPlan document
 */
export async function createStudyPlan(params) {
  const {
    ownerId = 'guest_user',
    targetRole = 'Software Engineer',
    durationDays = 7,
    resumeId = null,
    jobId = null,
  } = params;

  // Retrieve context
  let resume = null;
  if (resumeId) {
    resume = await ResumeProfile.findOne({ _id: resumeId, ownerId });
  } else {
    const resumes = await ResumeProfile.find({ ownerId }).sort({ createdAt: -1 }).limit(1);
    resume = resumes[0] || null;
  }

  let job = null;
  if (jobId) {
    job = await JobDescription.findOne({ _id: jobId, ownerId });
  } else {
    const jobs = await JobDescription.find({ ownerId }).sort({ createdAt: -1 }).limit(1);
    job = jobs[0] || null;
  }

  const analytics = await computeStudentAnalytics(ownerId);

  const resumeSummary = resume ? JSON.stringify(resume.parsedProfile?.skills || {}) : 'Standard CS fundamentals';
  const jdSummary = job ? `Skills: ${(job.requiredSkills || []).join(', ')}. Topics: ${(job.technicalTopics || []).join(', ')}` : targetRole;
  const performanceGaps = analytics.weakTopics.map(w => `${w.topic} (avg ${w.averageScore}/10)`).join(', ') || 'General revision needed';

  let modules = [];

  if (isLlmConfigured()) {
    try {
      const llm = getLLM({ temperature: 0.3 });
      const prompt = STUDY_PLAN_PROMPT
        .replace('{targetRole}', targetRole)
        .replace('{durationDays}', String(durationDays))
        .replace('{resumeSummary}', resumeSummary)
        .replace('{jdSummary}', jdSummary)
        .replace('{performanceGaps}', performanceGaps);

      const response = await llm.invoke([{ role: 'user', content: prompt }]);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const cleanJson = extractJsonFromText(content);
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed)) {
        modules = parsed.map((m, idx) => StudyPlanModuleSchema.parse({
          id: m.id || `mod_${idx + 1}`,
          title: m.title || `Day ${idx + 1}: Study Module`,
          priority: ['High', 'Medium', 'Low'].includes(m.priority) ? m.priority : 'Medium',
          estimatedHours: Number(m.estimatedHours || 2),
          topics: Array.isArray(m.topics) ? m.topics : [],
          activities: Array.isArray(m.activities) ? m.activities : [],
          practiceQuestions: Array.isArray(m.practiceQuestions) ? m.practiceQuestions : [],
          completed: false,
        }));
      }
    } catch (llmError) {
      console.warn(`[StudyPlanService] LLM generation failed (${llmError.message}). Using dynamic plan synthesizer.`);
    }
  }

  if (modules.length === 0) {
    modules = synthesizeDefaultStudyPlan({ targetRole, durationDays, analytics, job });
  }

  const totalItems = modules.length;
  const completedItems = modules.filter(m => m.completed).length;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const plan = await StudyPlan.create({
    ownerId,
    title: `${durationDays}-Day Mastery Plan for ${targetRole}`,
    targetRole,
    resumeId: resume?._id ? String(resume._id) : null,
    jobId: job?._id ? String(job._id) : null,
    durationDays,
    modules,
    totalItems,
    completedItems,
    progressPercentage,
    status: 'Not Started',
  });

  return plan;
}

/**
 * Toggles a module's completion status and recalculates overall progress.
 * 
 * @param {string} planId
 * @param {string} moduleId
 * @param {boolean} completed
 * @param {string} ownerId
 * @returns {Promise<Object>} Updated StudyPlan document
 */
export async function updateModuleProgress(planId, moduleId, completed, ownerId = 'guest_user') {
  const plan = await StudyPlan.findOne({ _id: planId, ownerId });
  if (!plan) {
    throw new Error('Study plan not found');
  }

  const moduleIndex = plan.modules.findIndex(m => m.id === moduleId);
  if (moduleIndex === -1) {
    throw new Error(`Module ${moduleId} not found in this study plan`);
  }

  plan.modules[moduleIndex].completed = Boolean(completed);

  // Recalculate metrics
  plan.totalItems = plan.modules.length;
  plan.completedItems = plan.modules.filter(m => m.completed).length;
  plan.progressPercentage = plan.totalItems > 0 
    ? Math.round((plan.completedItems / plan.totalItems) * 100)
    : 0;

  if (plan.completedItems === 0) {
    plan.status = 'Not Started';
  } else if (plan.completedItems === plan.totalItems) {
    plan.status = 'Completed';
  } else {
    plan.status = 'In Progress';
  }

  await plan.save();
  return plan;
}

function synthesizeDefaultStudyPlan({ targetRole, durationDays, analytics, job }) {
  const weakTopics = analytics?.weakTopics?.map(t => t.topic) || [];
  const jdTopics = job?.technicalTopics || ['REST APIs', 'System Architecture', 'Database Optimization'];

  const highPriorityTopic = weakTopics[0] || jdTopics[0] || 'Data Structures & Algorithms';
  const midPriorityTopic = weakTopics[1] || jdTopics[1] || 'Database Design & Indexing';
  const sysDesignTopic = 'System Design & Scalable Architecture';

  return [
    {
      id: 'mod_1',
      title: `Day 1-2: Core Mastery in ${highPriorityTopic}`,
      priority: 'High',
      estimatedHours: 3,
      topics: [highPriorityTopic, 'Time & Space Complexity', 'Common Edge Cases'],
      activities: [
        `Review theoretical foundations and internal runtime mechanisms of ${highPriorityTopic}`,
        'Solve 4 targeted practice problems on LeetCode/HackerRank',
        'Upload personal notes to RAG Study Assistant and test retrieval',
      ],
      practiceQuestions: [
        `Explain how you would optimize space complexity when processing large-scale inputs in ${highPriorityTopic}.`,
        'Walk through the amortized time analysis of your approach.',
      ],
      completed: false,
    },
    {
      id: 'mod_2',
      title: `Day 3-4: Deep Dive in ${midPriorityTopic}`,
      priority: 'High',
      estimatedHours: 3,
      topics: [midPriorityTopic, 'Query Execution Plans', 'Data Consistency Models'],
      activities: [
        'Analyze B-Tree vs Hash index performance tradeoffs',
        'Write raw SQL / MongoDB aggregation pipelines with explain() plan inspection',
        'Simulate concurrent write scenarios and handle optimistic locking',
      ],
      practiceQuestions: [
        'When should you avoid creating a compound index on a database table?',
        'How do read-replicas impact eventual consistency in a distributed database?',
      ],
      completed: false,
    },
    {
      id: 'mod_3',
      title: `Day 5-6: ${sysDesignTopic}`,
      priority: 'Medium',
      estimatedHours: 4,
      topics: ['Caching Layers (Redis)', 'Load Balancing & Reverse Proxies', 'Idempotent API Design'],
      activities: [
        'Design a high-throughput URL shortener or Rate Limiter service',
        'Draft sequence diagrams depicting cache-aside and write-through caching',
        'Practice answering scenario-based questions out loud with structured rubric alignment',
      ],
      practiceQuestions: [
        'How would you handle cache stampede (thundering herd problem) in a distributed cache?',
        'Describe the 4 HTTP headers you would use to communicate rate limits.',
      ],
      completed: false,
    },
    {
      id: 'mod_4',
      title: `Day 7: Full Mock Interview Simulation & Gap Review`,
      priority: 'Medium',
      estimatedHours: 2,
      topics: ['Full-stack integration', 'Behavioral & Technical Trade-offs', 'STAR Framework'],
      activities: [
        `Generate a full 5-question mock interview session targeting ${targetRole}`,
        'Submit structured answers adhering to the 4-criterion rubric',
        'Review rubric feedback, retry low-scoring questions, and compare score improvements',
      ],
      practiceQuestions: [
        'Describe the most challenging technical roadblock you encountered in your projects and how you resolved it.',
      ],
      completed: false,
    },
  ];
}

function extractJsonFromText(text) {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim();
  }
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return text.substring(firstBracket, lastBracket + 1);
  }
  return text;
}
