/**
 * PlacementPrep AI - Main Application Controller & Router
 */

const TAB_TITLES = {
  'dashboard': { title: 'Dashboard Overview', subtitle: 'Track your interview readiness, AI diagnostics, and study goals.' },
  'resume': { title: 'Resume Analyzer', subtitle: 'Extract and review structured profile details from your PDF resume.' },
  'job': { title: 'JD Analyzer & Gap Match', subtitle: 'Analyze target job descriptions and compare required skills with your resume.' },
  'interview': { title: 'Personalized Interview Practice', subtitle: 'AI question generation and 4-criterion standardized rubric evaluations.' },
  'study-assistant': { title: 'RAG Study Assistant', subtitle: 'Ask technical questions grounded strictly in your uploaded notes with citations.' },
  'analytics': { title: 'Performance Analytics', subtitle: 'Real database metrics, topic strength diagnostics, and revision trends.' },
  'study-plan': { title: 'Adaptive Study Plans', subtitle: 'Tailored study milestones and interactive checklist tracking.' },
  'history': { title: 'Interview Evaluation History', subtitle: 'Review all past question answers and rubric score breakdowns.' },
};

export function switchTab(tabId) {
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Update tab pane active state
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  // Update header text
  const info = TAB_TITLES[tabId] || { title: 'PlacementPrep AI', subtitle: 'Interview Preparation Platform' };
  const titleEl = document.getElementById('page-title');
  const subEl = document.getElementById('page-subtitle');
  if (titleEl) titleEl.innerText = info.title;
  if (subEl) subEl.innerText = info.subtitle;

  // Trigger refresh of views if needed
  if (tabId === 'dashboard' && window.refreshDashboardData) {
    window.refreshDashboardData();
  } else if (tabId === 'analytics' && window.loadAnalyticsView) {
    window.loadAnalyticsView();
  } else if (tabId === 'history') {
    loadHistoryView();
  }
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
  toast.innerHTML = `<span style="font-weight:700;">${icon}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

export async function checkSystemHealth() {
  try {
    const health = await window.api.getHealth();
    const services = health.services || {};

    const dbPill = document.getElementById('pill-db');
    const chromaPill = document.getElementById('pill-chroma');
    const llmPill = document.getElementById('pill-llm');

    if (dbPill) {
      const isDb = services.mongodb?.status === 'connected';
      dbPill.innerHTML = `Mongo: <strong class="${isDb ? 'text-success' : 'text-danger'}">${isDb ? 'Connected' : 'Offline'}</strong>`;
    }

    if (chromaPill) {
      const isChroma = services.chromadb?.status === 'connected';
      chromaPill.innerHTML = `Chroma: <strong class="${isChroma ? 'text-accent' : 'text-warning'}">${isChroma ? 'Connected' : 'Local Fallback'}</strong>`;
    }

    if (llmPill) {
      const isLlm = services.llm?.configured;
      llmPill.innerHTML = `LangChain: <strong class="${isLlm ? 'text-accent' : 'text-muted'}">${isLlm ? services.llm.model : 'Mock/Dev Mode'}</strong>`;
    }
  } catch (err) {
    console.warn('Health check unreachable:', err.message);
  }
}

async function loadHistoryView() {
  const container = document.getElementById('history-container');
  if (!container) return;

  try {
    const res = await window.api.getInterviewHistory();
    const history = res.data || [];

    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No interview attempts recorded yet. Answer questions in the Interview Practice tab to populate history!</p>
        </div>
      `;
      return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 14px;">`;
    for (const ev of history) {
      const total = ev.score?.totalScore || 0;
      const badgeClass = total >= 8 ? 'badge-success' : (total >= 5 ? 'badge-info' : 'badge-warning');
      const dateStr = ev.createdAt ? new Date(ev.createdAt).toLocaleString() : 'Recent';

      html += `
        <div class="card p-3" style="background: var(--bg-input); border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <span class="badge badge-accent" style="margin-right: 6px;">${ev.topic || 'General'}</span>
              <span style="font-size: 11px; color: var(--text-faint);">${dateStr}</span>
            </div>
            <span class="badge ${badgeClass}" style="font-family: var(--font-mono); font-size: 13px;">${total} / 10</span>
          </div>

          <h4 style="color: #fff; font-size: 14px; margin-bottom: 8px;">${ev.questionText}</h4>
          
          <div style="background: rgba(0,0,0,0.3); padding: 10px 12px; border-radius: var(--radius-sm); font-size: 12.5px; color: var(--text-muted); margin-bottom: 8px;">
            <strong style="color: var(--accent);">Your Answer:</strong> ${ev.studentAnswer}
          </div>

          <div style="display: flex; gap: 12px; font-size: 11.5px; color: var(--text-faint); flex-wrap: wrap;">
            <span>Correctness: <strong>${ev.score?.technicalCorrectness}/4</strong></span>
            <span>Concepts: <strong>${ev.score?.coverageOfKeyConcepts}/3</strong></span>
            <span>Clarity: <strong>${ev.score?.clarity}/2</strong></span>
            <span>Example: <strong>${ev.score?.relevantExample}/1</strong></span>
          </div>
        </div>
      `;
    }
    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="text-danger">Failed to load history: ${error.message}</div>`;
  }
}

// Global window bindings
window.switchTab = switchTab;
window.showToast = showToast;
window.checkSystemHealth = checkSystemHealth;

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  // Nav buttons click listener
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  const refreshBtn = document.getElementById('btn-refresh-status');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      checkSystemHealth();
      showToast('Checked service status', 'info');
    });
  }

  // Initialize feature modules
  if (window.initDashboard) window.initDashboard();
  if (window.initResume) window.initResume();
  if (window.initJob) window.initJob();
  if (window.initInterview) window.initInterview();
  if (window.initStudyAssistant) window.initStudyAssistant();
  if (window.initAnalytics) window.initAnalytics();
  if (window.initStudyPlan) window.initStudyPlan();

  // Initial health check
  checkSystemHealth();
});
