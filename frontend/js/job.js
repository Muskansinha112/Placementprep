/**
 * PlacementPrep AI - Job Description Analyzer Module
 */

export function initJob() {
  const form = document.getElementById('form-analyze-job');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleAnalyzeJob();
    });
  }

  // Load latest job if present
  loadLatestJob();
}

async function handleAnalyzeJob() {
  const titleInput = document.getElementById('jd-title');
  const companyInput = document.getElementById('jd-company');
  const textInput = document.getElementById('jd-text');
  const submitBtn = document.getElementById('btn-submit-job');

  const text = textInput ? textInput.value.trim() : '';
  const jobTitle = titleInput ? titleInput.value.trim() : 'Software Engineer';
  const company = companyInput ? companyInput.value.trim() : '';

  if (!text) {
    window.showToast('Please paste a job description.', 'error');
    return;
  }

  const originalText = submitBtn ? submitBtn.innerText : 'Analyze';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Extracting Skills & Comparing... ⏳';
    }

    const payload = {
      jobTitle,
      company,
      text,
    };

    const res = await window.api.analyzeJob(payload);
    window.showToast('Job description analyzed and matched against resume!', 'success');
    renderJobAnalysis(res.data);
  } catch (error) {
    window.showToast(error.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  }
}

export async function loadLatestJob() {
  try {
    const res = await window.api.getJobs();
    if (res.data && res.data.length > 0) {
      // Re-trigger comparison with current resume if possible
      const job = res.data[0];
      const titleInput = document.getElementById('jd-title');
      const companyInput = document.getElementById('jd-company');
      const textInput = document.getElementById('jd-text');

      if (titleInput && !titleInput.value) titleInput.value = job.jobTitle || '';
      if (companyInput && !companyInput.value) companyInput.value = job.company || '';
      if (textInput && !textInput.value) textInput.value = job.rawText || '';
    }
  } catch (error) {
    console.error('Error loading latest job:', error);
  }
}

export function renderJobAnalysis(data) {
  const container = document.getElementById('jd-analysis-results');
  const matchScoreBadge = document.getElementById('jd-match-score-badge');
  if (!container) return;

  const job = data.job || {};
  const comparison = data.comparison;

  if (matchScoreBadge) {
    if (comparison && comparison.matchPercentage !== undefined) {
      matchScoreBadge.innerText = `Match: ${comparison.matchPercentage}%`;
      matchScoreBadge.style.display = 'inline-block';
    } else {
      matchScoreBadge.innerText = 'Analysis Complete';
    }
  }

  let html = `
    <!-- Header Summary -->
    <div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border-color);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="color: #fff; font-size: 17px;">${job.jobTitle}</h3>
          <div style="font-size: 13px; color: var(--accent); margin-top: 2px;">
            ${job.company ? `🏢 ${job.company}` : ''} ${job.experienceRequirements ? `• ⏳ ${job.experienceRequirements}` : ''}
          </div>
        </div>
        <button class="btn btn-accent btn-sm" onclick="startInterviewForJob('${encodeURIComponent(job.jobTitle)}')">
          🎯 Practice for this Role
        </button>
      </div>
    </div>
  `;

  if (comparison) {
    const matching = comparison.matchingSkills || [];
    const notMentioned = comparison.skillsNotMentionedInResume || [];
    const relevantProjects = comparison.relevantProjects || [];
    const suggestedTopics = comparison.suggestedTopics || [];

    html += `
      <!-- Match Progress Meter -->
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;">
          <span style="font-weight:600; color:var(--text-muted);">Required Skills Alignment</span>
          <span style="font-weight:700; color:var(--accent); font-family:var(--font-mono);">${comparison.matchPercentage}% Match</span>
        </div>
        <div class="progress-bar-container" style="height: 10px;">
          <div class="progress-bar-fill" style="width: ${comparison.matchPercentage}%;"></div>
        </div>
      </div>

      <!-- Skills Comparison -->
      <div class="grid-2-col" style="margin-bottom: 20px;">
        <!-- Matching Skills -->
        <div style="background: var(--bg-input); padding: 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--success);">
          <div style="font-size: 12px; font-weight: 700; color: var(--success); text-transform: uppercase; margin-bottom: 8px;">
            ✓ Matching Skills (${matching.length})
          </div>
          <div class="skill-tags">
            ${matching.length > 0 
              ? matching.map(s => `<span class="skill-tag matched">${s.name}</span>`).join('')
              : '<span class="text-muted" style="font-size:12px;">No direct skill matches detected.</span>'
            }
          </div>
        </div>

        <!-- Skills Not Mentioned in Resume -->
        <div style="background: var(--bg-input); padding: 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--warning);">
          <div style="font-size: 12px; font-weight: 700; color: var(--warning); text-transform: uppercase; margin-bottom: 8px;">
            ⚠️ Skills Not Mentioned in Resume (${notMentioned.length})
          </div>
          <div class="skill-tags">
            ${notMentioned.length > 0
              ? notMentioned.map(s => `<span class="skill-tag missing">${s.name}</span>`).join('')
              : '<span class="text-muted" style="font-size:12px;">All JD skills mentioned in resume!</span>'
            }
          </div>
          <small class="text-muted" style="display:block; margin-top:8px; font-size:11px;">* Note: Missing from resume does not imply lack of skill. Review these for interview focus.</small>
        </div>
      </div>

      <!-- Relevant Projects -->
      ${relevantProjects.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 13px; text-transform: uppercase; color: var(--accent); margin-bottom: 10px;">
            Relevant Student Projects for this JD
          </h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${relevantProjects.map(p => `
              <div class="project-item-card">
                <h5>${p.title}</h5>
                <p>${p.description}</p>
                <div class="skill-tags" style="margin-top: 4px;">
                  ${p.matchedTechnologies.map(t => `<span class="skill-tag matched" style="font-size:10px;">Matches: ${t}</span>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Suggested Preparation Topics -->
      ${suggestedTopics.length > 0 ? `
        <div style="margin-bottom: 10px;">
          <h4 style="font-size: 13px; text-transform: uppercase; color: var(--accent); margin-bottom: 8px;">
            Suggested Interview Preparation Topics
          </h4>
          <div class="skill-tags">
            ${suggestedTopics.map(t => `<span class="skill-tag" style="background: rgba(79, 70, 229, 0.2); border-color: var(--primary);">${t}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;
  } else {
    // If no resume was uploaded yet, show extracted JD skills
    html += `
      <div class="info-note mb-4">
        <span>💡 Upload your resume in the <strong>Resume Analyzer</strong> tab to see side-by-side skill comparison and match scores!</span>
      </div>
      <div style="margin-bottom: 16px;">
        <h4 style="font-size: 12px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Required Skills</h4>
        <div class="skill-tags">
          ${(job.requiredSkills || []).map(s => `<span class="skill-tag matched">${s}</span>`).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

window.startInterviewForJob = function(jobTitleEncoded) {
  const jobTitle = decodeURIComponent(jobTitleEncoded);
  const intRoleInput = document.getElementById('int-role');
  if (intRoleInput) intRoleInput.value = jobTitle;
  window.switchTab('interview');
  window.showToast(`Target role set to "${jobTitle}". Ready to generate questions!`, 'info');
};

window.initJob = initJob;
window.renderJobAnalysis = renderJobAnalysis;
