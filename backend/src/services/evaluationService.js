import { getLLM, isLlmConfigured } from '../config/llm.js';
import { RUBRIC_EVALUATION_PROMPT } from '../rag/prompts.js';
import { AnswerEvaluationSchema } from '../validators/schemas.js';
import { AnswerEvaluation } from '../models/AnswerEvaluation.js';

/**
 * Evaluates candidate's answer against the 4-criterion rubric (0 to 10 points).
 * 
 * @param {Object} params - { ownerId, sessionId, question, answerText }
 * @returns {Promise<Object>} AnswerEvaluation document with attempt comparison
 */
export async function evaluateAnswer(params) {
  const {
    ownerId = 'guest_user',
    sessionId,
    question,
    answerText,
  } = params;

  if (!question || !answerText) {
    throw new Error('Question and candidate answer are required for evaluation');
  }

  // Count existing attempts for this question in this session
  const previousAttempts = await AnswerEvaluation.find({
    ownerId,
    sessionId,
    questionId: question.id,
  }).sort({ attemptNumber: 1 });

  const attemptNumber = previousAttempts.length + 1;

  let evaluationResult = null;

  if (isLlmConfigured()) {
    try {
      const llm = getLLM({ temperature: 0.1 });
      const prompt = RUBRIC_EVALUATION_PROMPT
        .replace('{questionText}', question.questionText)
        .replace('{topic}', question.topic || 'General')
        .replace('{difficulty}', question.difficulty || 'Intermediate')
        .replace('{expectedKeyConcepts}', (question.expectedKeyConcepts || []).map(c => `- ${c}`).join('\n'))
        .replace('{candidateAnswer}', answerText);

      const response = await llm.invoke([{ role: 'user', content: prompt }]);
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const cleanJson = extractJsonFromText(content);
      const parsed = JSON.parse(cleanJson);

      evaluationResult = AnswerEvaluationSchema.parse({
        score: {
          technicalCorrectness: Math.min(4, Math.max(0, Number(parsed.score?.technicalCorrectness || 0))),
          coverageOfKeyConcepts: Math.min(3, Math.max(0, Number(parsed.score?.coverageOfKeyConcepts || 0))),
          clarity: Math.min(2, Math.max(0, Number(parsed.score?.clarity || 0))),
          relevantExample: Math.min(1, Math.max(0, Number(parsed.score?.relevantExample || 0))),
          totalScore: Math.min(10, Math.max(0, Number(parsed.score?.totalScore || 0))),
        },
        criterionFeedback: {
          technicalCorrectness: parsed.criterionFeedback?.technicalCorrectness || 'Good baseline explanation.',
          coverageOfKeyConcepts: parsed.criterionFeedback?.coverageOfKeyConcepts || 'Touched on core concepts.',
          clarity: parsed.criterionFeedback?.clarity || 'Clear and comprehensible structure.',
          relevantExample: parsed.criterionFeedback?.relevantExample || 'Included practical illustration.',
        },
        correctConcepts: Array.isArray(parsed.correctConcepts) ? parsed.correctConcepts : [],
        missingConcepts: Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        improvedAnswer: parsed.improvedAnswer || '',
        studyReferences: Array.isArray(parsed.studyReferences) ? parsed.studyReferences : [],
      });
    } catch (llmError) {
      console.warn(`[EvaluationService] LLM evaluation failed (${llmError.message}). Using rubric evaluation engine.`);
    }
  }

  // Fallback rubric evaluation engine
  if (!evaluationResult) {
    evaluationResult = computeDeterministicRubricEvaluation(question, answerText);
  }

  // Persist evaluation to MongoDB
  const evaluationDoc = await AnswerEvaluation.create({
    ownerId,
    sessionId,
    questionId: question.id,
    questionText: question.questionText,
    topic: question.topic || 'General',
    studentAnswer: answerText,
    score: evaluationResult.score,
    criterionFeedback: evaluationResult.criterionFeedback,
    correctConcepts: evaluationResult.correctConcepts,
    missingConcepts: evaluationResult.missingConcepts,
    suggestions: evaluationResult.suggestions,
    improvedAnswer: evaluationResult.improvedAnswer,
    studyReferences: evaluationResult.studyReferences,
    attemptNumber,
  });

  return {
    evaluation: evaluationDoc,
    previousAttempts,
    isImprovement: previousAttempts.length > 0 
      ? evaluationDoc.score.totalScore > previousAttempts[previousAttempts.length - 1].score.totalScore
      : null,
  };
}

/**
 * Deterministic rubric evaluation engine calculating score based on concept coverage, length, clarity, and examples.
 */
export function computeDeterministicRubricEvaluation(question, answerText) {
  const cleanAnswer = (answerText || '').trim();
  const lowerAnswer = cleanAnswer.toLowerCase();
  const words = cleanAnswer.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const expected = question.expectedKeyConcepts || [];
  const correctConcepts = [];
  const missingConcepts = [];

  for (const concept of expected) {
    const conceptWords = concept.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const hasConcept = conceptWords.some(w => lowerAnswer.includes(w));
    if (hasConcept) {
      correctConcepts.push(concept);
    } else {
      missingConcepts.push(concept);
    }
  }

  // 1. Technical Correctness (0 - 4)
  let technicalCorrectness = 0;
  if (wordCount < 10) {
    technicalCorrectness = 1;
  } else if (correctConcepts.length >= Math.ceil(expected.length * 0.75)) {
    technicalCorrectness = 4;
  } else if (correctConcepts.length >= Math.ceil(expected.length * 0.5)) {
    technicalCorrectness = 3;
  } else if (correctConcepts.length >= 1 || wordCount >= 30) {
    technicalCorrectness = 2;
  } else {
    technicalCorrectness = 1;
  }

  // 2. Coverage of Key Concepts (0 - 3)
  let coverageOfKeyConcepts = 0;
  const coverageRatio = expected.length > 0 ? (correctConcepts.length / expected.length) : 0.6;
  if (coverageRatio >= 0.75) {
    coverageOfKeyConcepts = 3;
  } else if (coverageRatio >= 0.4) {
    coverageOfKeyConcepts = 2;
  } else if (coverageRatio > 0 || wordCount >= 20) {
    coverageOfKeyConcepts = 1;
  } else {
    coverageOfKeyConcepts = 0;
  }

  // 3. Clarity & Structure (0 - 2)
  let clarity = 1;
  if (wordCount >= 40 && (cleanAnswer.includes('\n') || cleanAnswer.includes('.') || cleanAnswer.includes(':'))) {
    clarity = 2;
  } else if (wordCount < 15) {
    clarity = 0;
  }

  // 4. Relevant Example or Scenario (0 - 1)
  const exampleKeywords = ['for example', 'e.g.', 'such as', 'in my project', 'instance', 'snippet', 'scenario', 'like when', 'consider'];
  const hasExample = exampleKeywords.some(kw => lowerAnswer.includes(kw)) || wordCount >= 70;
  const relevantExample = hasExample ? 1 : 0;

  const totalScore = technicalCorrectness + coverageOfKeyConcepts + clarity + relevantExample;

  return {
    score: {
      technicalCorrectness,
      coverageOfKeyConcepts,
      clarity,
      relevantExample,
      totalScore,
    },
    criterionFeedback: {
      technicalCorrectness: technicalCorrectness >= 3 
        ? 'Strong technical foundation with accurate explanations and proper terminology.' 
        : 'Good effort, but some technical details were either simplified or need deeper accuracy.',
      coverageOfKeyConcepts: coverageOfKeyConcepts >= 2
        ? `Successfully addressed ${correctConcepts.length} of ${expected.length} core concepts.`
        : `Covered ${correctConcepts.length} concepts. Make sure to articulate: ${missingConcepts.slice(0, 2).join(', ')}.`,
      clarity: clarity === 2 
        ? 'Well-organized and easy to follow.' 
        : 'Could be structured more systematically (e.g. Definition -> Mechanism -> Trade-offs).',
      relevantExample: relevantExample === 1 
        ? 'Effectively provided a concrete real-world context or scenario.' 
        : 'Adding a concrete code snippet or production architecture scenario would make this answer stand out.',
    },
    correctConcepts,
    missingConcepts,
    suggestions: [
      missingConcepts.length > 0 ? `Deepen explanation on: ${missingConcepts.join(', ')}.` : 'Incorporate specific metric thresholds or performance characteristics.',
      relevantExample === 0 ? 'Anchor your theoretical points with a real project example or architecture diagram description.' : 'Elaborate on edge cases and failure modes.',
      'Structure future answers with the STAR technique or Mechanism -> Trade-off -> Example flow.',
    ],
    improvedAnswer: `An exemplary answer would begin with a direct definition, then explain the internal mechanism: ${expected.join('; ')}. For example, in a production microservice with high throughput, adopting this approach prevents bottlenecks and provides clear failover guarantees.`,
    studyReferences: [question.topic, 'System Design & Core CS Interview Handbook'],
  };
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
