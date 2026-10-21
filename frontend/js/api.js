/**
 * PlacementPrep AI - Centralized API Client
 */

const API_BASE = '/api';

export async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = options.headers || {};

  // Attach demo student identifier
  if (!headers['x-user-id']) {
    headers['x-user-id'] = 'student_demo_user';
  }

  // If body is an object and not FormData, stringify it
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error || (data.details ? data.details.map(d => `${d.field}: ${d.message}`).join(', ') : 'Request failed');
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Health
  getHealth: () => fetchAPI('/health'),

  // Resume
  uploadResume: (formData) => fetchAPI('/resumes/upload', { method: 'POST', body: formData }),
  getResumes: () => fetchAPI('/resumes'),
  getResumeById: (id) => fetchAPI(`/resumes/${id}`),

  // Job Description
  analyzeJob: (payload) => fetchAPI('/jobs/analyze', { method: 'POST', body: payload }),
  getJobs: () => fetchAPI('/jobs'),
  compareJob: (jobId, resumeId) => fetchAPI('/jobs/compare', { method: 'POST', body: { jobId, resumeId } }),

  // Interview Practice
  generateInterview: (payload) => fetchAPI('/interviews/generate', { method: 'POST', body: payload }),
  getInterviews: () => fetchAPI('/interviews'),
  getInterviewById: (id) => fetchAPI(`/interviews/${id}`),
  submitAnswer: (sessionId, payload) => fetchAPI(`/interviews/${sessionId}/answer`, { method: 'POST', body: payload }),
  getInterviewHistory: () => fetchAPI('/interviews/history'),

  // RAG Study Assistant & Documents
  uploadDocument: (formData) => fetchAPI('/documents/upload', { method: 'POST', body: formData }),
  getDocuments: () => fetchAPI('/documents'),
  deleteDocument: (id) => fetchAPI(`/documents/${id}`, { method: 'DELETE' }),
  askStudyAssistant: (payload) => fetchAPI('/chat', { method: 'POST', body: payload }),

  // Analytics
  getAnalytics: () => fetchAPI('/analytics'),

  // Study Plan
  generateStudyPlan: (payload) => fetchAPI('/study-plans/generate', { method: 'POST', body: payload }),
  getStudyPlans: () => fetchAPI('/study-plans'),
  updatePlanProgress: (planId, payload) => fetchAPI(`/study-plans/${planId}/progress`, { method: 'PATCH', body: payload }),
};

window.api = api;
