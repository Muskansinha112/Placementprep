/**
 * PlacementPrep AI - Interview Practice & Rubric Evaluation Module
 */

let currentSession = null;
let currentQuestionIndex = 0;
let sessionEvaluationsMap = new Map(); // questionId -> evaluation

export function initInterview() {
  const form = document.getElementById('form-generate-interview');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleGenerateInterview();
    });
  }

  // Check for any active or latest interview session
  loadLatestSession();
}

async function handleGenerateInterview() {
  const roleInput = document.getElementById('int-role');
  const diffSelect = document.getElementById('int-difficulty');
  const countSelect = document.getElementById('int-count');
  const submitBtn = document.getElementById('btn-generate-questions');

  const targetRole = roleInput ? roleInput.value.trim() : 'Software Engineer';
  const difficulty = diffSelect ? diffSelect.value : 'Intermediate';
  const count = countSelect ? parseInt(countSelect.value, 10) : 5;

  const originalText = submitBtn ? submitBtn.innerText : 'Generate';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Synthesizing Questions... ⏳';
    }

    const payload = {
      targetRole,
      difficulty,
      count,
    };

    const res = await window.api.generateInterview(payload);
    window.showToast(`Generated ${res.data.questions.length} interview questions!`, 'success');
    currentSession = res.data;
    currentQuestionIndex = 0;
    sessionEvaluationsMap.clear();

    renderActiveQuestion();
  } catch (error) {
    window.showToast(error.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  }
}

async function loadLatestSession() {
  try {
    const res = await window.api.getInterviews();
    if (res.data && res.data.length > 0) {
      const latest = res.data[0];
      const sessionDetail = await window.api.getInterviewById(latest._id);
      currentSession = sessionDetail.data.session;
      const evaluations = sessionDetail.data.evaluations || [];

      sessionEvaluationsMap.clear();
      for (const ev of evaluations) {
        sessionEvaluationsMap.set(ev.questionId, ev);
      }

      currentQuestionIndex = 0;
      renderActiveQuestion();
    }
  } catch (error) {
    console.error('Error loading latest interview session:', error);
  }
}

export function renderActiveQuestion() {
  const container = document.getElementById('interview-session-container');
  if (!container || !currentSession || !currentSession.questions || currentSession.questions.length === 0) {
    return;
  }

  const questions = currentSession.questions;
  const q = questions[currentQuestionIndex];
  const evalData = sessionEvaluationsMap.get(q.id);

  let html = `
    <div class="question-card">
      <!-- Session Navigation Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
        <div>
          <h3 style="color: #fff; font-size: 16px;">${currentSession.title}</h3>
          <span style="font-size: 12px; color: var(--text-muted);">Question ${currentQuestionIndex + 1} of ${questions.length}</span>
        </div>
        <div style="display: flex; gap: 6px;">
          ${questions.map((item, idx) => {
            const isAnswered = sessionEvaluationsMap.has(item.id);
            const isCurrent = idx === currentQuestionIndex;
            const btnClass = isCurrent ? 'btn-primary' : (isAnswered ? 'btn-secondary' : 'btn-outline');
            return `
              <button class="btn btn-xs ${btnClass}" onclick="jumpToQuestion(${idx})" style="min-width: 28px;">
                ${idx + 1}${isAnswered ? ' ✓' : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Question Metadata Badges -->
      <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
        <span class="badge badge-accent">${q.topic}</span>
        <span class="badge badge-info">${q.difficulty}</span>
        <span class="badge badge-subtle">${q.questionType}</span>
      </div>

      <!-- Question Text -->
      <div class="question-text">
        ${q.questionText}
      </div>

      <!-- Progressive Hints Accordion -->
      ${q.hints && q.hints.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <button type="button" class="btn btn-outline btn-xs" onclick="toggleHints('${q.id}')" id="hint-toggle-${q.id}">
            💡 Reveal Technical Hint
          </button>
          <div id="hints-box-${q.id}" class="hints-box hidden" style="margin-top: 8px;">
            <h6>Interviewer Hints:</h6>
            <ul>
              ${q.hints.map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>
        </div>
      ` : ''}

      <!-- Answer Submission Form -->
      <form id="form-submit-answer" onsubmit="handleAnswerSubmit(event, '${q.id}')">
        <div class="form-group">
          <label for="answer-input" style="display: flex; justify-content: space-between;">
            <span>Your Response:</span>
            <span id="word-count" style="font-family: var(--font-mono); font-size: 11px;">0 words</span>
          </label>
          <textarea id="answer-input" class="form-control" rows="6" placeholder="Type your technical explanation here. Include key concepts, architectural trade-offs, and concrete examples..." required oninput="updateWordCount(this)">${evalData ? evalData.studentAnswer : ''}</textarea>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-outline btn-sm" onclick="prevQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="nextQuestion()" ${currentQuestionIndex === questions.length - 1 ? 'disabled' : ''}>
              Next →
            </button>
          </div>
          <button type="submit" class="btn btn-primary" id="btn-eval-answer">
            ${evalData ? '🔄 Retry & Re-Evaluate' : '✓ Submit for Rubric Scoring'}
          </button>
        </div>
      </form>

      <!-- Evaluation Result Section -->
      ${evalData ? renderEvaluationCard(evalData) : ''}
    </div>
  `;

  container.innerHTML = html;
}

function renderEvaluationCard(ev) {
  const score = ev.score || {};
  const feedback = ev.criterionFeedback || {};
  const total = score.totalScore !== undefined ? score.totalScore : 0;
  const scoreBadgeClass = total >= 8 ? 'badge-success' : (total >= 5 ? 'badge-info' : 'badge-warning');

  return `
    <div class="eval-card">
      <div class="eval-header">
        <div>
          <h4 style="color: #fff; font-size: 16px; margin-bottom: 2px;">
            AI Rubric Evaluation <span class="badge ${scoreBadgeClass}" style="margin-left: 8px;">Attempt #${ev.attemptNumber || 1}</span>
          </h4>
          <span style="font-size: 12px; color: var(--text-muted);">Standardized 4-Criterion Technical Rubric (0 to 10 points)</span>
        </div>
        <div class="eval-score-ring">
          ${total}<span style="font-size: 15px; color: var(--text-muted);">/10</span>
        </div>
      </div>

      <!-- 4 Rubric Criteria Breakdown -->
      <div class="rubric-grid">
        <div class="rubric-item crit-1">
          <div class="rubric-label">Technical Correctness</div>
          <div class="rubric-score">${score.technicalCorrectness || 0} / 4</div>
          <div class="rubric-desc">${feedback.technicalCorrectness || ''}</div>
        </div>

        <div class="rubric-item crit-2">
          <div class="rubric-label">Coverage of Concepts</div>
          <div class="rubric-score">${score.coverageOfKeyConcepts || 0} / 3</div>
          <div class="rubric-desc">${feedback.coverageOfKeyConcepts || ''}</div>
        </div>

        <div class="rubric-item crit-3">
          <div class="rubric-label">Clarity & Communication</div>
          <div class="rubric-score">${score.clarity || 0} / 2</div>
          <div class="rubric-desc">${feedback.clarity || ''}</div>
        </div>

        <div class="rubric-item crit-4">
          <div class="rubric-label">Relevant Example</div>
          <div class="rubric-score">${score.relevantExample || 0} / 1</div>
          <div class="rubric-desc">${feedback.relevantExample || ''}</div>
        </div>
      </div>

      <!-- Concept Breakdown -->
      <div class="grid-2-col" style="margin-bottom: 16px;">
        <div style="background: var(--bg-input); padding: 12px 14px; border-radius: var(--radius-sm);">
          <div style="font-size: 12px; font-weight: 700; color: var(--success); margin-bottom: 6px;">
            ✓ Concepts Addressed (${(ev.correctConcepts || []).length})
          </div>
          <ul style="padding-left: 18px; font-size: 12px; color: var(--text-main);">
            ${(ev.correctConcepts || []).map(c => `<li>${c}</li>`).join('') || '<li class="text-muted">No key concepts clearly identified.</li>'}
          </ul>
        </div>

        <div style="background: var(--bg-input); padding: 12px 14px; border-radius: var(--radius-sm);">
          <div style="font-size: 12px; font-weight: 700; color: var(--warning); margin-bottom: 6px;">
            ⚠️ Missing Concepts to Cover (${(ev.missingConcepts || []).length})
          </div>
          <ul style="padding-left: 18px; font-size: 12px; color: var(--text-muted);">
            ${(ev.missingConcepts || []).map(c => `<li>${c}</li>`).join('') || '<li class="text-success">All expected key concepts covered!</li>'}
          </ul>
        </div>
      </div>

      <!-- Suggestions for Improvement -->
      ${ev.suggestions && ev.suggestions.length > 0 ? `
        <div style="margin-bottom: 14px;">
          <h5 style="font-size: 12.5px; text-transform: uppercase; color: var(--accent); margin-bottom: 6px;">Actionable Improvement Suggestions</h5>
          <ul style="padding-left: 20px; font-size: 12.5px; color: var(--text-muted);">
            ${ev.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Model Improved Answer -->
      ${ev.improvedAnswer ? `
        <div style="background: rgba(6, 182, 212, 0.05); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: var(--radius-sm); padding: 14px;">
          <h5 style="font-size: 12.5px; color: var(--accent); margin-bottom: 6px; font-weight: 700;">Model Exemplary Answer:</h5>
          <p style="font-size: 12.5px; color: var(--text-main); line-height: 1.6;">${ev.improvedAnswer}</p>
        </div>
      ` : ''}
    </div>
  `;
}

window.jumpToQuestion = function(idx) {
  currentQuestionIndex = idx;
  renderActiveQuestion();
};

window.nextQuestion = function() {
  if (currentSession && currentQuestionIndex < currentSession.questions.length - 1) {
    currentQuestionIndex++;
    renderActiveQuestion();
  }
};

window.prevQuestion = function() {
  if (currentSession && currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderActiveQuestion();
  }
};

window.toggleHints = function(qid) {
  const box = document.getElementById(`hints-box-${qid}`);
  const btn = document.getElementById(`hint-toggle-${qid}`);
  if (box) {
    box.classList.toggle('hidden');
    if (btn) btn.innerText = box.classList.contains('hidden') ? '💡 Reveal Technical Hint' : 'Hide Technical Hint';
  }
};

window.updateWordCount = function(textarea) {
  const countEl = document.getElementById('word-count');
  if (countEl && textarea) {
    const words = textarea.value.trim().split(/\s+/).filter(Boolean);
    countEl.innerText = `${words.length} words`;
  }
};

window.handleAnswerSubmit = async function(event, questionId) {
  event.preventDefault();
  const input = document.getElementById('answer-input');
  const btn = document.getElementById('btn-eval-answer');
  const text = input ? input.value.trim() : '';

  if (!text || text.length < 3) {
    window.showToast('Please write a substantive response before submitting.', 'error');
    return;
  }

  const originalText = btn ? btn.innerText : 'Submit';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Evaluating against Rubric... ⏳';
    }

    const res = await window.api.submitAnswer(currentSession._id, {
      questionId,
      answerText: text,
    });

    const evalDoc = res.data.evaluation;
    sessionEvaluationsMap.set(questionId, evalDoc);

    const improvementMsg = res.data.isImprovement 
      ? ' 🎉 Score improved on this retry!' 
      : '';

    window.showToast(`Scored ${evalDoc.score.totalScore}/10.${improvementMsg}`, 'success');
    renderActiveQuestion();

    if (window.refreshDashboardData) {
      window.refreshDashboardData();
    }
  } catch (error) {
    window.showToast(error.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }
};

window.initInterview = initInterview;
window.renderActiveQuestion = renderActiveQuestion;
