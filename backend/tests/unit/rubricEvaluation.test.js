import { describe, it, expect } from 'vitest';
import { computeDeterministicRubricEvaluation } from '../../src/services/evaluationService.js';

describe('Rubric Evaluation Engine (0-10 points)', () => {
  const sampleQuestion = {
    id: 'q_test_1',
    questionText: 'Explain the difference between SQL and NoSQL databases. When would you choose one over the other?',
    topic: 'Database Systems',
    difficulty: 'Intermediate',
    expectedKeyConcepts: [
      'ACID compliance vs BASE properties',
      'Structured schema vs Flexible schema',
      'Horizontal scaling (sharding) vs Vertical scaling',
      'Complex joins and transactions',
    ],
  };

  it('evaluates a thorough, structured answer with high rubric scores', () => {
    const thoroughAnswer = `
      SQL databases are relational and enforce rigid structured schemas with strict ACID compliance (Atomicity, Consistency, Isolation, Durability), making them ideal for financial transactions and complex join operations.
      In contrast, NoSQL databases like MongoDB or Cassandra provide flexible schemas, favor horizontal scaling through sharding, and operate on BASE principles (Basically Available, Soft-state, Eventual consistency).
      For example, in an e-commerce platform, I would choose a SQL database for the order processing and checkout system to prevent double charging, while using a NoSQL store like Redis or MongoDB for user session caching and dynamic product catalogs.
    `;

    const result = computeDeterministicRubricEvaluation(sampleQuestion, thoroughAnswer);

    expect(result.score.technicalCorrectness).toBeGreaterThanOrEqual(3);
    expect(result.score.coverageOfKeyConcepts).toBeGreaterThanOrEqual(2);
    expect(result.score.clarity).toBe(2);
    expect(result.score.relevantExample).toBe(1); // Provided e-commerce scenario
    expect(result.score.totalScore).toBeGreaterThanOrEqual(8);
    expect(result.score.totalScore).toBeLessThanOrEqual(10);
    expect(result.correctConcepts.length).toBeGreaterThan(0);
  });

  it('evaluates a minimal or incomplete answer with appropriately low scores', () => {
    const poorAnswer = 'SQL has tables and NoSQL is just json.';

    const result = computeDeterministicRubricEvaluation(sampleQuestion, poorAnswer);

    expect(result.score.technicalCorrectness).toBeLessThanOrEqual(2);
    expect(result.score.coverageOfKeyConcepts).toBeLessThanOrEqual(1);
    expect(result.score.relevantExample).toBe(0);
    expect(result.score.totalScore).toBeLessThanOrEqual(4);
    expect(result.missingConcepts.length).toBeGreaterThanOrEqual(2);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
