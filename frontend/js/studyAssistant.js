/**
 * PlacementPrep AI - RAG Study Assistant Module
 */

export function initStudyAssistant() {
  const uploadForm = document.getElementById('form-upload-doc');
  const chatForm = document.getElementById('form-chat');
  const clearChatBtn = document.getElementById('btn-clear-chat');

  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleUploadDocument();
    });
  }

  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSendChatMessage();
    });
  }

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
      const container = document.getElementById('chat-messages');
      if (container) {
        container.innerHTML = `
          <div class="chat-bubble ai">
            <div class="bubble-sender">AI Study Assistant 🤖</div>
            <div class="bubble-text">
              Chat cleared. Ask me any technical interview question based on your uploaded notes or documentation!
            </div>
          </div>
        `;
      }
    });
  }

  // Load documents list
  loadStudyDocuments();
}

async function handleUploadDocument() {
  const fileInput = document.getElementById('study-doc-file');
  const submitBtn = document.getElementById('btn-upload-doc');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    window.showToast('Please select a study document (.pdf, .txt, .md).', 'error');
    return;
  }

  const file = fileInput.files[0];
  const originalText = submitBtn ? submitBtn.innerText : 'Upload';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Chunking & Indexing... ⏳';
    }

    const formData = new FormData();
    formData.append('document', file);

    const res = await window.api.uploadDocument(formData);
    window.showToast(`Indexed "${res.data.originalName}" into ChromaDB! (${res.data.chunkCount} chunks)`, 'success');
    fileInput.value = '';
    loadStudyDocuments();

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

export async function loadStudyDocuments() {
  const container = document.getElementById('study-docs-list');
  if (!container) return;

  try {
    const res = await window.api.getDocuments();
    const docs = res.data || [];

    if (docs.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          <p style="font-size: 12.5px;">No study materials uploaded yet. Upload lecture notes, cheatsheets, or docs to enable grounded RAG answering!</p>
        </div>
      `;
      return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
    for (const doc of docs) {
      const kbSize = Math.round(doc.fileSize / 1024);
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="max-width: 75%;">
            <div style="font-size: 13px; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              📑 ${doc.originalName}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              ${kbSize} KB • ${doc.chunkCount} vector chunks • ${doc.pageCount} pages
            </div>
          </div>
          <button class="btn btn-outline btn-xs text-danger" onclick="deleteStudyDoc('${doc._id}', '${encodeURIComponent(doc.originalName)}')" title="Delete Document & Chroma Vectors">
            🗑️
          </button>
        </div>
      `;
    }
    html += `</div>`;

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="text-danger" style="font-size:12px;">Failed to load documents: ${error.message}</div>`;
  }
}

window.deleteStudyDoc = async function(docId, nameEncoded) {
  const docName = decodeURIComponent(nameEncoded);
  if (!confirm(`Delete "${docName}" and its vector embeddings from ChromaDB?`)) {
    return;
  }

  try {
    await window.api.deleteDocument(docId);
    window.showToast(`Deleted "${docName}" from ChromaDB & MongoDB.`, 'success');
    loadStudyDocuments();
    if (window.refreshDashboardData) {
      window.refreshDashboardData();
    }
  } catch (error) {
    window.showToast(error.message, 'error');
  }
};

async function handleSendChatMessage() {
  const input = document.getElementById('chat-input');
  const submitBtn = document.getElementById('btn-send-chat');
  const messagesContainer = document.getElementById('chat-messages');

  const question = input ? input.value.trim() : '';
  if (!question) return;

  // Append User message
  appendChatBubble('user', 'You', question);
  input.value = '';

  // Append Thinking bubble
  const thinkingId = `ai-thinking-${Date.now()}`;
  appendChatBubble('ai', 'AI Study Assistant 🤖', 'Searching ChromaDB vectors and retrieving grounded sources... ⏳', thinkingId);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    if (submitBtn) submitBtn.disabled = true;

    const res = await window.api.askStudyAssistant({ question });
    const { answer, sources } = res.data;

    // Replace thinking bubble with grounded answer
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) {
      thinkingEl.innerHTML = `
        <div class="bubble-sender">AI Study Assistant 🤖</div>
        <div class="bubble-text" style="white-space: pre-wrap;">${escapeHtml(answer)}</div>
        ${renderSourcesList(sources)}
      `;
    }
  } catch (error) {
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) {
      thinkingEl.innerHTML = `
        <div class="bubble-sender text-danger">Error ⚠️</div>
        <div class="bubble-text text-danger">${error.message}</div>
      `;
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function appendChatBubble(type, sender, text, id = null) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${type}`;
  if (id) bubble.id = id;

  bubble.innerHTML = `
    <div class="bubble-sender">${sender}</div>
    <div class="bubble-text">${escapeHtml(text)}</div>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function renderSourcesList(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return '';
  }

  return `
    <div class="citation-list">
      <div style="font-size: 11px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">
        📌 Grounded Vector Sources (${sources.length}):
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        ${sources.map((src, i) => `
          <div style="background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: 4px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="citation-tag">📄 ${src.filename} (Page ${src.pageNumber}, Chunk ${src.chunkIndex + 1})</span>
            </div>
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px; font-style: italic;">
              "${escapeHtml(src.snippet)}"
            </p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.initStudyAssistant = initStudyAssistant;
window.loadStudyDocuments = loadStudyDocuments;
