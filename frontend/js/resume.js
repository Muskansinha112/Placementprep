/**
 * PlacementPrep AI - Resume Analyzer Module
 */

let selectedResumeFile = null;

export function initResume() {
  const dropZone = document.getElementById('resume-drop-zone');
  const fileInput = document.getElementById('resume-file-input');
  const removeBtn = document.getElementById('resume-file-remove');
  const form = document.getElementById('form-upload-resume');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearFileSelect();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedResumeFile) {
        window.showToast('Please select a PDF resume file first.', 'error');
        return;
      }
      await uploadResumeFile(selectedResumeFile);
    });
  }

  // Load existing resume if present in DB
  loadLatestResume();
}

function handleFileSelect(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    window.showToast('Only PDF files are supported.', 'error');
    return;
  }
  selectedResumeFile = file;
  const fileInfo = document.getElementById('resume-file-info');
  const filename = document.getElementById('resume-filename');
  const dropZone = document.getElementById('resume-drop-zone');

  if (filename) filename.innerText = `${file.name} (${Math.round(file.size / 1024)} KB)`;
  if (fileInfo) fileInfo.classList.remove('hidden');
  if (dropZone) dropZone.classList.add('hidden');
}

function clearFileSelect() {
  selectedResumeFile = null;
  const fileInput = document.getElementById('resume-file-input');
  const fileInfo = document.getElementById('resume-file-info');
  const dropZone = document.getElementById('resume-drop-zone');

  if (fileInput) fileInput.value = '';
  if (fileInfo) fileInfo.classList.add('hidden');
  if (dropZone) dropZone.classList.remove('hidden');
}

async function uploadResumeFile(file) {
  const submitBtn = document.getElementById('btn-submit-resume');
  const originalText = submitBtn ? submitBtn.innerText : 'Upload';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Extracting Profile with AI... ⏳';
    }

    const formData = new FormData();
    formData.append('resume', file);

    const res = await window.api.uploadResume(formData);
    window.showToast('Resume parsed and validated successfully!', 'success');
    renderResumeProfile(res.data);
    clearFileSelect();

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

export async function loadLatestResume() {
  try {
    const res = await window.api.getResumes();
    if (res.data && res.data.length > 0) {
      renderResumeProfile(res.data[0]);
    }
  } catch (error) {
    console.error('Error loading latest resume:', error);
  }
}

export function renderResumeProfile(resumeDoc) {
  const container = document.getElementById('resume-profile-viewer');
  const badge = document.getElementById('resume-status-badge');
  if (!container) return;

  const profile = resumeDoc.parsedProfile || {};
  const personal = profile.personalInfo || {};
  const skills = profile.skills || {};
  const education = profile.education || [];
  const projects = profile.projects || [];
  const experience = profile.workExperience || [];

  if (badge) {
    badge.innerText = `Verified: ${resumeDoc.filename}`;
    badge.className = 'badge badge-success';
  }

  let html = `
    <!-- Personal Information -->
    <div class="profile-section">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="color: #fff; font-size: 18px; margin-bottom: 2px;">${personal.name || 'Candidate'}</h3>
          <div style="font-size: 12.5px; color: var(--text-muted); display: flex; gap: 12px; flex-wrap: wrap;">
            ${personal.email ? `<span>📧 ${personal.email}</span>` : ''}
            ${personal.phone ? `<span>📱 ${personal.phone}</span>` : ''}
          </div>
        </div>
      </div>
      ${personal.links && personal.links.length > 0 ? `
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          ${personal.links.map(link => `<a href="${link.startsWith('http') ? link : 'https://' + link}" target="_blank" class="badge badge-accent" style="text-decoration:none;">🔗 ${link.replace(/https?:\/\/(www\.)?/, '')}</a>`).join('')}
        </div>
      ` : ''}
      ${personal.summary ? `<p style="font-size: 13px; color: var(--text-muted); margin-top: 10px; line-height: 1.5;">${personal.summary}</p>` : ''}
    </div>

    <!-- Technical Skills by Category -->
    <div class="profile-section">
      <h4>Technical Skills</h4>
      
      ${renderSkillCategory('Languages', skills.languages)}
      ${renderSkillCategory('Frameworks & Libraries', skills.frameworks)}
      ${renderSkillCategory('Databases & Storage', skills.databases)}
      ${renderSkillCategory('Tools & Platforms', skills.tools)}
      ${renderSkillCategory('Cloud & DevOps', skills.cloudDevops)}
      ${renderSkillCategory('Core CS & Concepts', skills.coreConcepts)}
    </div>

    <!-- Education -->
    ${education.length > 0 ? `
      <div class="profile-section">
        <h4>Education</h4>
        ${education.map(e => `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 13.5px; color: #fff;">
              <span>${e.institution}</span>
              <span class="text-muted" style="font-size: 12px;">${e.graduationYear}</span>
            </div>
            <div style="font-size: 12.5px; color: var(--accent);">${e.degree} ${e.fieldOfStudy ? `in ${e.fieldOfStudy}` : ''} ${e.gpa ? `(GPA: ${e.gpa})` : ''}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Projects -->
    ${projects.length > 0 ? `
      <div class="profile-section">
        <h4>Key Projects</h4>
        ${projects.map(p => `
          <div class="project-item-card">
            <h5>${p.title}</h5>
            <p>${p.description}</p>
            ${p.technologies && p.technologies.length > 0 ? `
              <div class="skill-tags" style="margin-top: 6px;">
                ${p.technologies.map(t => `<span class="skill-tag" style="font-size:10.5px;">${t}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Work Experience -->
    ${experience.length > 0 ? `
      <div class="profile-section">
        <h4>Experience & Internships</h4>
        ${experience.map(exp => `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 13.5px; color: #fff;">
              <span>${exp.role} @ ${exp.company}</span>
              <span class="text-muted" style="font-size: 12px;">${exp.duration}</span>
            </div>
            <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 4px;">${exp.description}</p>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  container.innerHTML = html;
}

function renderSkillCategory(title, list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return `
    <div style="margin-bottom: 10px;">
      <div style="font-size: 11.5px; color: var(--text-faint); margin-bottom: 4px;">${title}</div>
      <div class="skill-tags">
        ${list.map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
    </div>
  `;
}

window.initResume = initResume;
window.loadLatestResume = loadLatestResume;
window.renderResumeProfile = renderResumeProfile;
