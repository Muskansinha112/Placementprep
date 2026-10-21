import { getLLM, isLlmConfigured } from '../config/llm.js';
import { INTERVIEW_GENERATION_PROMPT } from '../rag/prompts.js';
import { InterviewQuestionSchema } from '../validators/schemas.js';
import { InterviewSession } from '../models/InterviewSession.js';

/**
 * Generates personalized technical interview questions.
 * 
 * @param {Object} params - { ownerId, resume, job, targetRole, difficulty, count, topics }
 * @returns {Promise<Object>} InterviewSession document
 */
export async function generateInterviewSession(params) {
  const {
    ownerId = 'guest_user',
    resume = null,
    job = null,
    targetRole = 'Software Engineer',
    difficulty = 'Intermediate',
    count = 5,
    topics = [],
  } = params;

  let questions = [];

  // Build summaries for LLM prompt
  const resumeSummary = resume ? buildResumeSummary(resume) : 'No resume provided. Assume standard CS student background.';
  const jdSummary = job ? buildJdSummary(job) : `Target Role: ${targetRole}. Standard industry expectations.`;
  const topicsStr = topics.length > 0 ? topics.join(', ') : 'Core CS, DSA, Web Technologies, Databases, System Design';

  if (isLlmConfigured()) {
    try {
      const llm = getLLM({ temperature: 0.3 });
      const prompt = INTERVIEW_GENERATION_PROMPT
        .replace('{targetRole}', targetRole)
        .replace('{difficulty}', difficulty)
        .replace('{count}', String(count))
        .replace('{resumeSummary}', resumeSummary)
        .replace('{jdSummary}', jdSummary)
        .replace('{topics}', topicsStr);

      const response = await llm.invoke([{ role: 'user', content: prompt }]);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const cleanJson = extractJsonFromText(content);
      const parsedArray = JSON.parse(cleanJson);

      if (Array.isArray(parsedArray)) {
        questions = parsedArray.map((q, idx) => {
          return InterviewQuestionSchema.parse({
            id: q.id || `q_${idx + 1}`,
            questionText: q.questionText,
            topic: q.topic || 'General Technical',
            difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(q.difficulty) ? q.difficulty : 'Intermediate',
            questionType: q.questionType || 'Conceptual',
            expectedKeyConcepts: Array.isArray(q.expectedKeyConcepts) ? q.expectedKeyConcepts : [],
            hints: Array.isArray(q.hints) ? q.hints : [],
          });
        });
      }
    } catch (llmError) {
      console.warn(`[InterviewService] LLM generation failed (${llmError.message}). Using high-fidelity question template generator.`);
    }
  }

  // Fallback high-fidelity question generator
  if (questions.length === 0) {
    questions = generateFallbackQuestions({ resume, job, targetRole, difficulty, count, topics });
  }

  // Persist session to MongoDB
  const session = await InterviewSession.create({
    ownerId,
    title: `${targetRole} Technical Practice (${difficulty})`,
    resumeId: resume?._id ? String(resume._id) : null,
    jobId: job?._id ? String(job._id) : null,
    targetRole,
    difficulty,
    questions,
    status: 'active',
  });

  return session;
}

function buildResumeSummary(resume) {
  const p = resume.parsedProfile || resume;
  const skills = [
    ...(p.skills?.languages || []),
    ...(p.skills?.frameworks || []),
    ...(p.skills?.databases || []),
  ].join(', ');

  const projects = (p.projects || []).map(pr => `${pr.title} (Tech: ${(pr.technologies || []).join(', ')})`).join('; ');
  return `Skills: ${skills || 'None'}\nProjects: ${projects || 'None'}`;
}

function buildJdSummary(job) {
  return `Title: ${job.jobTitle || 'Role'}\nRequired Skills: ${(job.requiredSkills || []).join(', ')}\nTopics: ${(job.technicalTopics || []).join(', ')}`;
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

/**
 * Deterministic question bank generator mapped to candidate context.
 */
export function generateFallbackQuestions({ resume, job, targetRole, difficulty, count = 5 }) {
  const diff = difficulty === 'Mixed' ? 'Intermediate' : difficulty;
  const questions = [];

  // Project-specific question if resume has projects
  const resumeProjects = resume?.parsedProfile?.projects || resume?.projects || [];
  if (resumeProjects.length > 0) {
    const proj = resumeProjects[0];
    questions.push({
      id: 'q_1',
      questionText: `In your project "${proj.title}", what architectural trade-offs did you make when selecting ${(proj.technologies || ['your technology stack']).slice(0, 3).join(', ')}, and how did you handle data consistency and error recovery?`,
      topic: 'System Architecture & Projects',
      difficulty: diff,
      questionType: 'Project-specific',
      expectedKeyConcepts: ['Architectural trade-offs', 'Scalability considerations', 'Error handling and idempotency', 'Component separation'],
      hints: [
        'Think about why this tech was chosen over alternatives like relational vs document stores.',
        'Describe how edge-case errors or network disconnects were caught and recovered from.'
      ],
    });
  } else {
    questions.push({
      id: 'q_1',
      questionText: `Explain the internal workings of the Node.js Event Loop. How do the microtask queue (Promises) and macrotask queue (timers/I-O) interact during asynchronous execution?`,
      topic: 'Node.js & Concurrency',
      difficulty: diff,
      questionType: 'Conceptual',
      expectedKeyConcepts: ['Call Stack', 'Libuv Event Loop phases', 'Microtask Queue vs Macrotask Queue', 'process.nextTick and Promise resolution'],
      hints: [
        'Microtasks execute immediately after the current operation finishes before the loop moves to the next phase.',
        'Contrast setTimeout/setImmediate with Promise.then execution order.'
      ],
    });
  }

  // Database / Storage question
  questions.push({
    id: 'q_2',
    questionText: `How does database indexing work (e.g. B-Trees vs Hash Indexes in MongoDB/PostgreSQL)? When would adding an index degrade write performance, and how do compound indexes resolve query bottlenecks?`,
    topic: 'Database Systems & Indexing',
    difficulty: diff,
    questionType: 'Conceptual',
    expectedKeyConcepts: ['B-Tree structure & lookup time O(log N)', 'Index scan vs Full collection scan', 'Write amplification and overhead on inserts/updates', 'Compound index prefix rule'],
    hints: [
      'Think about what happens to the index tree structure every time a new row/document is inserted.',
      'Remember the "Equality, Sort, Range" rule for compound indexes.'
    ],
  });

  // REST API / System Design question
  questions.push({
    id: 'q_3',
    questionText: `You are designing a rate-limiting middleware for a high-traffic public REST API. Which algorithm (Token Bucket, Leaky Bucket, or Sliding Window Counter) would you choose and how would you implement it with distributed cache (e.g. Redis)?`,
    topic: 'System Design & APIs',
    difficulty: diff,
    questionType: 'Scenario-based',
    expectedKeyConcepts: ['Rate limiting algorithms (Token Bucket / Sliding Window)', 'Atomic operations in distributed cache', 'HTTP 429 Too Many Requests response headers', 'Graceful degradation'],
    hints: [
      'Consider concurrency races when multiple servers update the rate count simultaneously.',
      'Mention headers like X-RateLimit-Remaining and Retry-After.'
    ],
  });

  // Data Structures & Algorithms question
  questions.push({
    id: 'q_4',
    questionText: `Given a large stream of user interview evaluation scores arriving in real-time, explain how you would design a data structure to retrieve the median score in O(1) time and insert new scores efficiently.`,
    topic: 'Data Structures & Algorithms',
    difficulty: diff,
    questionType: 'Coding/Algorithmic',
    expectedKeyConcepts: ['Two Heaps pattern (Max-Heap and Min-Heap)', 'Rebalancing heaps to maintain size invariant', 'Insertion time O(log N)', 'Finding median in O(1)'],
    hints: [
      'Split the numbers into lower half and upper half.',
      'Keep a max-heap for the smaller half and a min-heap for the larger half.'
    ],
  });

  // Scenario / Follow-up question
  questions.push({
    id: 'q_5',
    questionText: `A microservice in your production deployment begins experiencing memory bloat and high latency after running for several hours. Walk through your debugging methodology to pinpoint whether it is a memory leak, unclosed connections, or event listener buildup.`,
    topic: 'Production Debugging & Observability',
    difficulty: diff,
    questionType: 'Scenario-based',
    expectedKeyConcepts: ['Heap dump snapshots comparison', 'Garbage collection metrics & RSS tracking', 'Unclosed DB/WebSocket connection pools', 'Event emitter leak detection'],
    hints: [
      'Start with observability metrics (CPU, RSS memory, GC pause times).',
      'Explain how taking two sequential heap snapshots helps isolate retaining paths.'
    ],
  });

  return questions.slice(0, count);
}
