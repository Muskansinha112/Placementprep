import { AnswerEvaluation } from '../models/AnswerEvaluation.js';
import { InterviewSession } from '../models/InterviewSession.js';

/**
 * Computes performance metrics and revision recommendations based on real MongoDB records.
 * 
 * @param {string} ownerId
 * @returns {Promise<Object>}
 */
export async function computeStudentAnalytics(ownerId = 'guest_user') {
  // Query all evaluations for this user
  const evaluations = await AnswerEvaluation.find({ ownerId }).sort({ createdAt: 1 });
  const totalSessions = await InterviewSession.countDocuments({ ownerId });

  if (evaluations.length === 0) {
    return {
      hasData: false,
      totalQuestionsAttempted: 0,
      totalSessions,
      averageScore: 0,
      rubricAverages: {
        technicalCorrectness: 0,
        coverageOfKeyConcepts: 0,
        clarity: 0,
        relevantExample: 0,
      },
      topicPerformance: [],
      strongTopics: [],
      weakTopics: [],
      scoreTrends: [],
      suggestedRevisionTopics: ['Data Structures & Algorithms', 'System Architecture', 'Database Indexing', 'API Design'],
      recentEvaluations: [],
    };
  }

  const totalQuestions = evaluations.length;
  let totalScoreSum = 0;
  let correctnessSum = 0;
  let conceptsSum = 0;
  let claritySum = 0;
  let exampleSum = 0;

  const topicMap = new Map();
  const missedConceptsList = [];

  for (const ev of evaluations) {
    const s = ev.score || {};
    totalScoreSum += (s.totalScore || 0);
    correctnessSum += (s.technicalCorrectness || 0);
    conceptsSum += (s.coverageOfKeyConcepts || 0);
    claritySum += (s.clarity || 0);
    exampleSum += (s.relevantExample || 0);

    const topic = ev.topic || 'General Technical';
    if (!topicMap.has(topic)) {
      topicMap.set(topic, { count: 0, totalScore: 0 });
    }
    const topicStat = topicMap.get(topic);
    topicStat.count += 1;
    topicStat.totalScore += (s.totalScore || 0);

    if (Array.isArray(ev.missingConcepts)) {
      missedConceptsList.push(...ev.missingConcepts);
    }
  }

  const averageScore = Number((totalScoreSum / totalQuestions).toFixed(1));
  const rubricAverages = {
    technicalCorrectness: Number((correctnessSum / totalQuestions).toFixed(1)),
    coverageOfKeyConcepts: Number((conceptsSum / totalQuestions).toFixed(1)),
    clarity: Number((claritySum / totalQuestions).toFixed(1)),
    relevantExample: Number((exampleSum / totalQuestions).toFixed(1)),
  };

  const topicPerformance = [];
  const strongTopics = [];
  const weakTopics = [];

  for (const [topic, stats] of topicMap.entries()) {
    const avg = Number((stats.totalScore / stats.count).toFixed(1));
    const entry = { topic, count: stats.count, averageScore: avg };
    topicPerformance.push(entry);

    if (avg >= 7.5) {
      strongTopics.push(entry);
    } else if (avg < 6.0) {
      weakTopics.push(entry);
    }
  }

  // Sort topics by lowest average score first for targeted study
  topicPerformance.sort((a, b) => a.averageScore - b.averageScore);

  // Score progression trends
  const scoreTrends = evaluations.map(ev => ({
    date: ev.createdAt ? new Date(ev.createdAt).toISOString().split('T')[0] : 'Today',
    score: ev.score?.totalScore || 0,
    topic: ev.topic || 'General',
    attemptNumber: ev.attemptNumber || 1,
  }));

  // Suggested revision topics from weak areas + frequent missed concepts
  const suggestedRevisionTopics = Array.from(new Set([
    ...weakTopics.map(t => t.topic),
    ...missedConceptsList.slice(0, 5),
  ])).slice(0, 6);

  if (suggestedRevisionTopics.length === 0) {
    suggestedRevisionTopics.push('Concurrency & Asynchronous Patterns', 'System Design Trade-offs', 'Database Optimization');
  }

  return {
    hasData: true,
    totalQuestionsAttempted: totalQuestions,
    totalSessions,
    averageScore,
    rubricAverages,
    topicPerformance,
    strongTopics,
    weakTopics,
    scoreTrends,
    suggestedRevisionTopics,
    recentEvaluations: evaluations.slice(-5).reverse().map(e => ({
      id: e._id,
      questionText: e.questionText,
      topic: e.topic,
      totalScore: e.score?.totalScore,
      createdAt: e.createdAt,
    })),
  };
}
