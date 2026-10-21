/**
 * PlacementPrep AI - Performance Analytics Module
 */

export async function initAnalytics() {
  await loadAnalyticsView();
}

export async function loadAnalyticsView() {
  try {
    const res = await window.api.getAnalytics();
    const data = res.data || {};

    // 1. Metric numbers
    const totalQEl = document.getElementById('an-total-q');
    const avgScoreEl = document.getElementById('an-avg-score');
    const weakCountEl = document.getElementById('an-weak-count');

    if (totalQEl) totalQEl.innerText = data.totalQuestionsAttempted || '0';
    if (avgScoreEl) {
      avgScoreEl.innerHTML = data.totalQuestionsAttempted > 0
        ? `${data.averageScore}<span class="unit">/10</span>`
        : `0.0<span class="unit">/10</span>`;
    }
    if (weakCountEl) weakCountEl.innerText = (data.weakTopics || []).length;

    // 2. Rubric Breakdown
    renderRubricBreakdown(data.rubricAverages || {});

    // 3. Topic Performance
    renderTopicPerformance(data.topicPerformance || []);

    // 4. Suggested Revision Topics
    renderRevisionTopics(data.suggestedRevisionTopics || []);

    // 5. Score Timeline
    renderScoreTimeline(data.scoreTrends || []);

  } catch (error) {
    console.error('Failed to load analytics view:', error);
  }
}

function renderRubricBreakdown(rubric) {
  const container = document.getElementById('an-rubric-breakdown');
  if (!container) return;

  const items = [
    { name: 'Technical Correctness', value: rubric.technicalCorrectness || 0, max: 4, color: '#6366f1' },
    { name: 'Coverage of Key Concepts', value: rubric.coverageOfKeyConcepts || 0, max: 3, color: '#06b6d4' },
    { name: 'Clarity & Communication', value: rubric.clarity || 0, max: 2, color: '#10b981' },
    { name: 'Relevant Example / Scenario', value: rubric.relevantExample || 0, max: 1, color: '#f59e0b' },
  ];

  let html = `<div class="grid-2-col" style="gap: 16px;">`;

  for (const item of items) {
    const percent = Math.min(100, Math.round((item.value / item.max) * 100));
    html += `
      <div style="background: var(--bg-input); padding: 14px 18px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
          <span style="font-weight: 600; color: #fff;">${item.name}</span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: ${item.color};">${item.value} / ${item.max}</span>
        </div>
        <div class="progress-bar-container" style="height: 8px; margin: 0;">
          <div class="progress-bar-fill" style="width: ${percent}%; background: ${item.color};"></div>
        </div>
        <small style="color: var(--text-faint); display: block; margin-top: 4px; font-size: 11px;">${percent}% average mastery</small>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function renderTopicPerformance(topics) {
  const container = document.getElementById('an-topic-performance-list');
  if (!container) return;

  if (topics.length === 0) {
    container.innerHTML = `<div class="empty-state">No topic evaluation data yet. Complete interview questions to see statistics.</div>`;
    return;
  }

  let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
  for (const t of topics) {
    const isStrong = t.averageScore >= 7.5;
    const isWeak = t.averageScore < 6.0;
    const tagClass = isStrong ? 'badge-success' : (isWeak ? 'badge-danger' : 'badge-info');
    const tagLabel = isStrong ? 'Strong' : (isWeak ? 'Needs Work' : 'Moderate');

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <div>
          <div style="font-size: 13.5px; font-weight: 600; color: #fff;">${t.topic}</div>
          <span style="font-size: 11px; color: var(--text-muted);">${t.count} questions attempted</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge ${tagClass}">${tagLabel}</span>
          <span style="font-family: var(--font-mono); font-weight: 700; font-size: 14px; color: #fff;">${t.averageScore}/10</span>
        </div>
      </div>
    `;
  }
  html += `</div>`;
  container.innerHTML = html;
}

function renderRevisionTopics(revisionList) {
  const container = document.getElementById('an-revision-topics-list');
  if (!container) return;

  if (revisionList.length === 0) {
    container.innerHTML = `<div class="empty-state">No revision areas flagged. Keep practicing!</div>`;
    return;
  }

  let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
  for (const topic of revisionList) {
    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-sm);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--warning);">⚡</span>
          <span style="font-size: 13px; font-weight: 600; color: #fff;">${topic}</span>
        </div>
        <button class="btn btn-outline btn-xs" onclick="startInterviewForJob('${encodeURIComponent(topic)}')">
          Practice Topic
        </button>
      </div>
    `;
  }
  html += `</div>`;
  container.innerHTML = html;
}

function renderScoreTimeline(trends) {
  const container = document.getElementById('an-score-timeline');
  if (!container) return;

  if (trends.length === 0) {
    container.innerHTML = `<div class="empty-state">Practice more questions to see your score timeline!</div>`;
    return;
  }

  let html = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-faint); text-transform: uppercase; padding: 0 10px;">
        <span>Chronological Attempt</span>
        <span>Topic</span>
        <span>Score (0-10)</span>
      </div>
  `;

  trends.forEach((item, idx) => {
    const percent = (item.score / 10) * 100;
    const scoreColor = item.score >= 7.5 ? 'var(--success)' : (item.score >= 5 ? 'var(--accent)' : 'var(--warning)');

    html += `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border-color); gap: 14px;">
        <span style="font-size: 12px; color: var(--text-muted); min-width: 80px;">#${idx + 1} (${item.date})</span>
        <span style="font-size: 12.5px; color: #fff; font-weight: 500; flex: 1;">${item.topic}</span>
        <div style="display: flex; align-items: center; gap: 8px; min-width: 140px; justify-content: flex-end;">
          <div class="progress-bar-container" style="width: 70px; height: 6px; margin: 0;">
            <div class="progress-bar-fill" style="width: ${percent}%; background: ${scoreColor};"></div>
          </div>
          <span style="font-family: var(--font-mono); font-weight: 700; color: ${scoreColor}; font-size: 13px; width: 36px; text-align: right;">
            ${item.score}/10
          </span>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

window.initAnalytics = initAnalytics;
window.loadAnalyticsView = loadAnalyticsView;
