/**
 * PlacementPrep AI - Personalized Study Plan Module
 */

let activeStudyPlan = null;

export function initStudyPlan() {
  const form = document.getElementById('form-generate-plan');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleGenerateStudyPlan();
    });
  }

  loadLatestStudyPlan();
}

async function handleGenerateStudyPlan() {
  const roleInput = document.getElementById('plan-role');
  const daysSelect = document.getElementById('plan-days');
  const submitBtn = document.getElementById('btn-create-plan');

  const targetRole = roleInput ? roleInput.value.trim() : 'Software Engineer';
  const durationDays = daysSelect ? parseInt(daysSelect.value, 10) : 7;

  const originalText = submitBtn ? submitBtn.innerText : 'Generate';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Synthesizing Curriculum... ⏳';
    }

    const payload = {
      targetRole,
      durationDays,
    };

    const res = await window.api.generateStudyPlan(payload);
    window.showToast('Personalized study plan generated!', 'success');
    activeStudyPlan = res.data;
    renderStudyPlan(activeStudyPlan);

    if (window.refreshDashboardData) {
      window.refreshDashboardData();
    }
  } catch (error) {
    window.showToast(error.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  }
}

export async function loadLatestStudyPlan() {
  try {
    const res = await window.api.getStudyPlans();
    if (res.data && res.data.length > 0) {
      activeStudyPlan = res.data[0];
      renderStudyPlan(activeStudyPlan);
    }
  } catch (error) {
    console.error('Error loading study plan:', error);
  }
}

export function renderStudyPlan(plan) {
  const container = document.getElementById('study-plan-container');
  if (!container || !plan) return;

  const modules = plan.modules || [];
  const statusBadge = plan.status === 'Completed' ? 'badge-success' : (plan.status === 'In Progress' ? 'badge-info' : 'badge-subtle');

  let html = `
    <!-- Plan Summary Card -->
    <div class="card mb-4 p-4" style="background: linear-gradient(135deg, rgba(19, 29, 51, 0.9), rgba(15, 23, 42, 0.95)); border-color: rgba(79, 70, 229, 0.3);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="color: #fff; font-size: 19px; margin-bottom: 4px;">${plan.title}</h2>
          <span style="font-size: 13px; color: var(--text-muted);">Target: <strong>${plan.targetRole}</strong> • Duration: ${plan.durationDays} Days</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge ${statusBadge}">${plan.status}</span>
          <span style="font-size: 18px; font-weight: 800; color: var(--accent); font-family: var(--font-mono);">${plan.progressPercentage}%</span>
        </div>
      </div>

      <!-- Overall Checklist Progress Bar -->
      <div class="progress-bar-container" style="height: 10px;">
        <div class="progress-bar-fill" id="plan-overall-progress-bar" style="width: ${plan.progressPercentage}%;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
        <span id="plan-items-completed-label">${plan.completedItems} of ${plan.totalItems} milestones completed</span>
        <span>Interactive Checklist</span>
      </div>
    </div>

    <!-- Modules List -->
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${modules.map((mod, index) => {
        const priorityBadge = mod.priority === 'High' ? 'badge-danger' : (mod.priority === 'Medium' ? 'badge-warning' : 'badge-info');
        return `
          <div class="plan-module-card ${mod.completed ? 'completed' : ''}" id="module-card-${mod.id}">
            <input 
              type="checkbox" 
              class="module-checkbox" 
              id="chk-${mod.id}" 
              ${mod.completed ? 'checked' : ''} 
              onchange="toggleModuleCheck('${plan._id}', '${mod.id}', this.checked)"
              title="Mark module completed"
            >
            <div class="module-content">
              <div class="module-header">
                <span class="module-title" style="${mod.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${mod.title}</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <span class="badge ${priorityBadge}">${mod.priority} Priority</span>
                  <span class="badge badge-subtle">⏱️ ${mod.estimatedHours} hrs</span>
                </div>
              </div>

              <!-- Topics -->
              ${mod.topics && mod.topics.length > 0 ? `
                <div class="skill-tags" style="margin-top: 6px; margin-bottom: 8px;">
                  ${mod.topics.map(t => `<span class="skill-tag" style="font-size:11px;">${t}</span>`).join('')}
                </div>
              ` : ''}

              <!-- Activities -->
              ${mod.activities && mod.activities.length > 0 ? `
                <div class="module-activities">
                  <div style="font-size: 11.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Key Tasks & Activities:</div>
                  <ul>
                    ${mod.activities.map(act => `<li>${act}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              <!-- Practice Questions -->
              ${mod.practiceQuestions && mod.practiceQuestions.length > 0 ? `
                <div style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.25); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                  <div style="font-size: 11.5px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">🎯 Recommended Practice Questions:</div>
                  <ul style="padding-left: 18px; font-size: 12px; color: var(--text-main);">
                    ${mod.practiceQuestions.map(pq => `<li>${pq}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.innerHTML = html;
}

window.toggleModuleCheck = async function(planId, moduleId, isChecked) {
  try {
    const res = await window.api.updatePlanProgress(planId, {
      moduleId,
      completed: isChecked,
    });

    activeStudyPlan = res.data;
    window.showToast(`Updated progress: ${activeStudyPlan.progressPercentage}% complete!`, 'info');
    renderStudyPlan(activeStudyPlan);

    if (window.refreshDashboardData) {
      window.refreshDashboardData();
    }
  } catch (error) {
    window.showToast(error.message, 'error');
    // Revert checkbox on error
    const chk = document.getElementById(`chk-${moduleId}`);
    if (chk) chk.checked = !isChecked;
  }
};

window.initStudyPlan = initStudyPlan;
window.renderStudyPlan = renderStudyPlan;
