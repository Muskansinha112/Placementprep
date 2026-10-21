/**
 * PlacementPrep AI - Dashboard Module
 */

export async function initDashboard() {
  await refreshDashboardData();
}

export async function refreshDashboardData() {
  try {
    // 1. Fetch Analytics
    const analyticsRes = await window.api.getAnalytics();
    const analytics = analyticsRes.data || {};

    // 2. Fetch Documents count
    const docsRes = await window.api.getDocuments();
    const docsCount = docsRes.count || 0;

    // 3. Fetch Study Plans
    const plansRes = await window.api.getStudyPlans();
    const latestPlan = plansRes.data && plansRes.data.length > 0 ? plansRes.data[0] : null;

    // Update Top Stat Cards
    const totalAttemptsEl = document.getElementById('dash-total-attempts');
    const avgScoreEl = document.getElementById('dash-avg-score');
    const docsCountEl = document.getElementById('dash-docs-count');
    const planProgressEl = document.getElementById('dash-plan-progress');
    const planStatusEl = document.getElementById('dash-plan-status');

    if (totalAttemptsEl) totalAttemptsEl.innerText = analytics.totalQuestionsAttempted || '0';
    if (avgScoreEl) {
      if (analytics.totalQuestionsAttempted > 0) {
        avgScoreEl.innerHTML = `${analytics.averageScore}<span class="unit">/10</span>`;
      } else {
        avgScoreEl.innerHTML = `--<span class="unit">/10</span>`;
      }
    }
    if (docsCountEl) docsCountEl.innerText = docsCount;
    if (planProgressEl && planStatusEl) {
      if (latestPlan) {
        planProgressEl.innerText = `${latestPlan.progressPercentage || 0}%`;
        planStatusEl.innerText = `${latestPlan.completedItems}/${latestPlan.totalItems} items completed (${latestPlan.status})`;
      } else {
        planProgressEl.innerText = '0%';
        planStatusEl.innerText = 'No active plan created';
      }
    }

    // Render Topic Performance Bars
    renderDashboardTopicBars(analytics.topicPerformance || []);

    // Render Recent Evaluations
    renderDashboardRecentList(analytics.recentEvaluations || []);

  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

function renderDashboardTopicBars(topics) {
  const container = document.getElementById('dash-topic-bars');
  if (!container) return;

  if (topics.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No questions answered yet. Start an interview practice session to track topic progress!</p>
      </div>
    `;
    return;
  }

  const topTopics = topics.slice(0, 5);
  let html = `<div style="display: flex; flex-direction: column; gap: 14px;">`;

  for (const t of topTopics) {
    const percent = Math.min(100, Math.round((t.averageScore / 10) * 100));
    const colorClass = t.averageScore >= 7.5 ? 'var(--success)' : (t.averageScore >= 6.0 ? 'var(--accent)' : 'var(--warning)');

    html += `
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
          <span><strong>${t.topic}</strong> <span class="text-muted">(${t.count} q)</span></span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: ${colorClass};">${t.averageScore}/10</span>
        </div>
        <div class="progress-bar-container" style="margin: 0; height: 6px;">
          <div class="progress-bar-fill" style="width: ${percent}%; background: ${colorClass};"></div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function renderDashboardRecentList(recent) {
  const container = document.getElementById('dash-recent-list');
  if (!container) return;

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No evaluated interview answers yet.</p>
      </div>
    `;
    return;
  }

  let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;

  for (const item of recent) {
    const scoreColor = item.totalScore >= 7 ? 'badge-success' : (item.totalScore >= 5 ? 'badge-info' : 'badge-warning');
    const truncatedQ = item.questionText.length > 80 ? `${item.questionText.substring(0, 80)}...` : item.questionText;

    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <div style="max-width: 80%;">
          <div style="font-size: 11px; color: var(--accent); font-weight: 600;">${item.topic || 'General'}</div>
          <div style="font-size: 12.5px; color: #fff; margin-top: 2px;">${truncatedQ}</div>
        </div>
        <span class="badge ${scoreColor}" style="font-family: var(--font-mono); font-weight: 700; font-size: 12px;">
          ${item.totalScore}/10
        </span>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

window.initDashboard = initDashboard;
window.refreshDashboardData = refreshDashboardData;
