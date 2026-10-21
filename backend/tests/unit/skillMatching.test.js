import { describe, it, expect } from 'vitest';
import { compareResumeAndJob, normalizeSkillName } from '../../src/services/jobService.js';

describe('Skill Matching & Gap Comparison Logic', () => {
  it('normalizes common technology synonyms', () => {
    expect(normalizeSkillName('Node.js')).toBe('nodejs');
    expect(normalizeSkillName('node')).toBe('nodejs');
    expect(normalizeSkillName('React.js')).toBe('reactjs');
    expect(normalizeSkillName('Postgres')).toBe('postgresql');
    expect(normalizeSkillName('C++')).toBe('cpp');
  });

  it('correctly matches skills present in both resume and JD', () => {
    const resumeProfile = {
      skills: {
        languages: ['JavaScript', 'Python'],
        frameworks: ['Node.js', 'Express.js', 'React'],
        databases: ['MongoDB', 'Redis'],
        tools: ['Git', 'Docker'],
        cloudDevops: ['AWS'],
        coreConcepts: ['Data Structures', 'REST APIs'],
      },
      projects: [
        {
          title: 'E-commerce API',
          description: 'High throughput backend',
          technologies: ['Node.js', 'MongoDB', 'Docker'],
        },
      ],
    };

    const jobDescription = {
      jobTitle: 'Backend Developer',
      company: 'Tech Corp',
      requiredSkills: ['Node.js', 'MongoDB', 'REST APIs', 'Kubernetes'],
      preferredSkills: ['Redis', 'GraphQL'],
      technicalTopics: ['System Design', 'Caching'],
    };

    const comparison = compareResumeAndJob(resumeProfile, jobDescription);

    // Matching skills should contain Node.js, MongoDB, REST APIs, Redis
    const matchingNames = comparison.matchingSkills.map(s => s.name);
    expect(matchingNames).toContain('Node.js');
    expect(matchingNames).toContain('MongoDB');
    expect(matchingNames).toContain('REST APIs');
    expect(matchingNames).toContain('Redis');

    // Skills not mentioned in resume should contain Kubernetes and GraphQL
    const notMentionedNames = comparison.skillsNotMentionedInResume.map(s => s.name);
    expect(notMentionedNames).toContain('Kubernetes');
    expect(notMentionedNames).toContain('GraphQL');

    // Projects matching technologies
    expect(comparison.relevantProjects).toHaveLength(1);
    expect(comparison.relevantProjects[0].title).toBe('E-commerce API');

    // Match percentage calculation (3 of 4 required skills match -> 75%)
    expect(comparison.matchPercentage).toBe(75);
  });

  it('handles empty resume skills gracefully without errors', () => {
    const emptyResume = {
      skills: {
        languages: [],
        frameworks: [],
        databases: [],
        tools: [],
        cloudDevops: [],
        coreConcepts: [],
      },
      projects: [],
    };

    const jd = {
      jobTitle: 'Engineer',
      requiredSkills: ['Java', 'Spring Boot'],
      preferredSkills: [],
    };

    const comparison = compareResumeAndJob(emptyResume, jd);
    expect(comparison.matchingSkills).toHaveLength(0);
    expect(comparison.skillsNotMentionedInResume).toHaveLength(2);
    expect(comparison.matchPercentage).toBe(0);
  });
});
