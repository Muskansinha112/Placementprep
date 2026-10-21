import { ChatPromptTemplate } from '@langchain/core/prompts';

export const RAG_STUDY_SYSTEM_PROMPT = `You are PlacementPrep AI's Study Assistant, an expert technical mentor for college students preparing for technical interviews.

Your role is to answer questions strictly and accurately grounded in the retrieved study materials provided below.

CRITICAL RULES:
1. Grounding: Answer ONLY based on the facts provided in the "Retrieved Study Materials" context. Do NOT fabricate or assume information not present in the materials.
2. Insufficient Evidence: If the provided context does not contain sufficient facts to answer the question thoroughly, you MUST explicitly state:
"Based on the provided study materials, there is not enough information to answer this question."
Do not make up facts to compensate.
3. Citations: Every key claim or definition must cite its source in the format: [Source: <filename>, Page: <pageNumber>].
4. Clarity: Provide clear, concise, well-structured explanations suitable for interview preparation.

Retrieved Study Materials:
{context}
`;

export const RAG_CHAT_PROMPT = ChatPromptTemplate.fromMessages([
  ['system', RAG_STUDY_SYSTEM_PROMPT],
  ['human', '{question}'],
]);

export const RESUME_EXTRACTION_PROMPT = `You are an expert technical recruiter and resume analyzer.
Extract the student's background from the resume text into a structured JSON profile.

Resume Text:
"""
{resumeText}
"""

Instructions:
- Extract personalInfo: name, email, phone, links, and a concise summary.
- Extract education: list of institutions, degree, fieldOfStudy, graduationYear, gpa.
- Extract skills organized by category:
  - languages (e.g. JavaScript, Python, C++, Java, Go)
  - frameworks (e.g. Express.js, React, Django, Spring Boot)
  - databases (e.g. MongoDB, PostgreSQL, Redis, MySQL)
  - tools (e.g. Git, Docker, Kubernetes, Postman, Linux)
  - cloudDevops (e.g. AWS, GCP, Azure, CI/CD, Terraform)
  - coreConcepts (e.g. Data Structures, Algorithms, OOP, System Design, REST APIs, DBMS)
- Extract projects: title, description, technologies (array of strings), highlights (key achievements).
- Extract workExperience: company, role, duration, description, achievements.
- Extract certifications: name, issuer, year.

DO NOT invent or hallucinate missing information. If a field or category is not mentioned in the resume, leave it as an empty array or empty string.

Return ONLY valid JSON matching this structure.`;

export const JD_EXTRACTION_PROMPT = `You are a technical hiring manager and recruitment specialist.
Extract key requirements and technical expectations from the job description below into a structured JSON object.

Job Description:
"""
{jdText}
"""

Instructions:
- jobTitle: Exact or inferred job title (e.g. "Software Engineer Intern", "Backend Developer").
- company: Company name if present.
- requiredSkills: Array of mandatory technical skills, languages, and tools explicitly mentioned.
- preferredSkills: Array of nice-to-have or bonus skills mentioned.
- responsibilities: Array of core job duties and day-to-day responsibilities.
- technicalTopics: Array of core computer science and engineering topics (e.g. "Distributed Systems", "Concurrency", "Database Optimization", "Data Structures & Algorithms", "RESTful API Design").
- experienceRequirements: Extracted experience level (e.g. "0-2 years", "New Graduate 2025/2026", "Bachelor's degree in CS").

Return ONLY valid JSON.`;

export const INTERVIEW_GENERATION_PROMPT = `You are a Senior Technical Interviewer conducting a technical interview for a student.

Target Role: {targetRole}
Difficulty Level: {difficulty}
Number of Questions: {count}

Candidate Resume Background:
"""
{resumeSummary}
"""

Target Job Description Requirements:
"""
{jdSummary}
"""

Selected Topics of Interest:
{topics}

Instructions:
Generate {count} high-impact technical interview questions specifically customized for this candidate and job.
Include a mix of:
- Resume & Project-Specific Questions: Reference their actual projects, architectures, and design choices.
- JD-Aligned Technical Questions: Address core required skills and technical topics from the JD.
- Question Types: Conceptual, Scenario-based, System Design, and Technical Follow-ups.
- For each question:
  - id: Unique string ID (e.g. "q_1", "q_2")
  - questionText: Clear, professional interview question.
  - topic: Specific technical topic (e.g. "Concurrency", "MongoDB Aggregations", "REST API Design").
  - difficulty: One of "Beginner", "Intermediate", "Advanced".
  - questionType: One of "Conceptual", "Scenario-based", "Coding/Algorithmic", "System Design", "Follow-up", "Project-specific".
  - expectedKeyConcepts: Array of 3 to 5 core technical concepts an ideal answer should include.
  - hints: Array of 1 to 2 progressive hints to guide the candidate if they get stuck.

Return ONLY valid JSON array of question objects.`;

export const RUBRIC_EVALUATION_PROMPT = `You are a Staff Software Engineer evaluating a candidate's answer during a technical interview.

Question Asked:
"{questionText}"

Topic: {topic}
Difficulty: {difficulty}
Expected Key Concepts:
{expectedKeyConcepts}

Candidate's Answer:
"""
{candidateAnswer}
"""

Evaluation Rubric (Total: 0 to 10 points):
1. Technical Correctness (0 to 4 points):
   - 4: Fully accurate, sound technical reasoning, correct terminology.
   - 3: Mostly correct with minor omissions or slight imprecision.
   - 2: Partially correct; contains some misunderstandings or flawed logic.
   - 1: Significant inaccuracies or misunderstandings.
   - 0: Completely incorrect, irrelevant, or non-answer.

2. Coverage of Key Concepts (0 to 3 points):
   - 3: Addresses all or nearly all expected core concepts in depth.
   - 2: Mentions main concepts but lacks depth or misses one key aspect.
   - 1: Only touches upon 1 minor concept superficially.
   - 0: Fails to address any expected concepts.

3. Clarity and Communication (0 to 2 points):
   - 2: Well-structured, coherent, articulate, and logically organized.
   - 1: Somewhat disorganized, vague, or overly verbose.
   - 0: Confusing, disjointed, or unintelligible.

4. Relevant Example or Scenario Application (0 to 1 point):
   - 1: Provides a concrete, relevant code snippet, architectural scenario, or practical real-world example.
   - 0: Purely theoretical or abstract without practical context.

Provide:
- score: { technicalCorrectness (0-4), coverageOfKeyConcepts (0-3), clarity (0-2), relevantExample (0-1), totalScore (0-10) }
- criterionFeedback: Explanations for each of the 4 scores.
- correctConcepts: List of concepts the candidate explained well.
- missingConcepts: List of concepts the candidate should have included.
- suggestions: 2-3 specific, actionable recommendations to improve the answer.
- improvedAnswer: A model answer demonstrating how a top candidate would answer this question.
- studyReferences: 1-2 suggested topics or documentation sections to review.

Return ONLY valid JSON.`;

export const STUDY_PLAN_PROMPT = `You are an AI Career Coach creating a personalized study plan for a technical interview.

Target Role: {targetRole}
Duration: {durationDays} Days

Candidate's Profile:
"""
{resumeSummary}
"""

Job Requirements:
"""
{jdSummary}
"""

Interview Performance Gaps / Weak Topics:
"""
{performanceGaps}
"""

Instructions:
Create a high-impact, realistic day-by-day or modular study plan tailored to bridge the candidate's skill gaps.
Return a JSON array of modules, where each module has:
- id: e.g. "mod_1", "mod_2"
- title: Actionable module title (e.g. "Day 1-2: Advanced Database Indexing & Query Optimization")
- priority: "High", "Medium", or "Low"
- estimatedHours: number of estimated study hours (e.g. 3)
- topics: Array of specific technical topics
- activities: Array of practical hands-on tasks and reading assignments
- practiceQuestions: Array of 2-3 specific practice questions to master
- completed: false

Return ONLY valid JSON array of modules.`;
