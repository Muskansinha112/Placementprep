import { useEffect, useMemo, useState } from 'react';

const NAV_ITEMS = [
  { id: 'home', icon: '⌂', label: 'Home' },
  { id: 'resume', icon: '▤', label: 'My resume' },
  { id: 'practice', icon: '◷', label: 'Practice interview' },
  { id: 'notes', icon: '▧', label: 'Study notes' },
];

async function api(path, options = {}) {
  const headers = { 'x-user-id': 'student_demo_user', ...options.headers };
  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(`/api${path}`, { ...options, headers, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}

function App() {
  const [page, setPage] = useState('home');
  const [resume, setResume] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [health, setHealth] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [practiceRole, setPracticeRole] = useState('Software Engineer');

  const notify = (message, type = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  async function loadResume() {
    try {
      const result = await api('/resumes');
      setResume(result.data?.[0] || null);
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function loadDocuments() {
    try {
      const result = await api('/documents');
      setDocuments(result.data || []);
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  async function refreshHealth() {
    try {
      setHealth(await api('/health'));
    } catch {
      setHealth(null);
    }
  }

  useEffect(() => {
    loadResume();
    loadDocuments();
    refreshHealth();
  }, []);

  const titles = useMemo(() => ({
    home: ['New session', 'A focused space to prepare for your next interview.'],
    resume: ['My resume', 'Review the experience and skills you want to talk about.'],
    practice: ['Practice interview', 'A few useful questions, one answer at a time.'],
    notes: ['Study notes', 'Get help grounded in the material you uploaded.'],
  }), []);

  async function uploadResume(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      notify('Please choose a PDF resume.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify('The resume must be smaller than 10 MB.', 'error');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('resume', file);
      const result = await api('/resumes/upload', { method: 'POST', body: form });
      setResume(result.data);
      notify('Your resume is ready to review.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function uploadNotes(file) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('document', file);
      const result = await api('/documents/upload', { method: 'POST', body: form });
      notify(`Added ${result.data.originalName} to your notes.`, 'success');
      await loadDocuments();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteNote(id) {
    try {
      await api(`/documents/${id}`, { method: 'DELETE' });
      setDocuments((items) => items.filter((doc) => doc._id !== id));
      notify('Study note removed.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    }
  }

  function startPractice(role) {
    if (role) setPracticeRole(role);
    setPage('practice');
  }

  const [title, subtitle] = titles[page];

  return (
    <div className="app-layout">
      <aside className="sidebar simple-sidebar">
        <a className="logo" href="#home" onClick={(event) => { event.preventDefault(); setPage('home'); }} aria-label="PlacementPrep AI home">
          <span className="logo-icon">✳</span>
          <span className="logo-text"><strong>PlacementPrep</strong><small>interview prep, made simple</small></span>
        </a>
        <button className="btn new-practice" type="button" onClick={() => setPage('practice')}><span>＋</span> New practice</button>
        <div className="side-label">YOUR PREP</div>
        <nav className="nav-menu" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} type="button" onClick={() => setPage(item.id)}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="side-help"><span className="help-mark">?</span><span><strong>Keep it simple</strong><small>Resume → practice → improve</small></span></div>
        <div className="user-profile-badge simple-user"><div className="avatar">S</div><div className="user-details"><span className="user-name">Student</span><span className="user-role">Your prep space</span></div><span className="user-menu-mark">⌄</span></div>
      </aside>

      <main className="main-content simple-main">
        <header className="topbar simple-topbar">
          <div className="page-title-area"><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="topbar-actions">
            <span className="pill">MongoDB <strong>{health?.services?.mongodb?.status === 'connected' ? 'Connected' : 'Checking'}</strong></span>
            <button className="btn btn-outline btn-sm" type="button" title="Refresh service status" onClick={refreshHealth}>↻</button>
          </div>
        </header>

        <div className="content-body simple-content">
          {page === 'home' && <HomeView onNavigate={setPage} onStart={startPractice} />}
          {page === 'resume' && <ResumeView resume={resume} busy={busy} onUpload={uploadResume} />}
          {page === 'practice' && <PracticeView role={practiceRole} onRoleChange={setPracticeRole} notify={notify} />}
          {page === 'notes' && <NotesView documents={documents} busy={busy} onUpload={uploadNotes} onDelete={deleteNote} notify={notify} />}
        </div>
      </main>
      {toast && <div className={`toast ${toast.type}`} role="status">{toast.message}</div>}
    </div>
  );
}

function HomeView({ onNavigate, onStart }) {
  const [role, setRole] = useState('');
  return (
    <section className="welcome-view">
      <div className="welcome-copy">
        <span className="eyebrow"><span>✦</span> YOUR INTERVIEW WORKSPACE</span>
        <h2>One step closer<br />to <span>your next offer.</span></h2>
        <p>Start with your resume, practice a few questions, and use your own notes when you need a hand.</p>
      </div>
      <div className="start-steps">
        <button className="step-card" type="button" onClick={() => onNavigate('resume')}><span className="step-number">01</span><span className="step-icon">▤</span><strong>Add your resume</strong><small>We’ll pull out your skills and projects.</small><span className="step-arrow">↗</span></button>
        <button className="step-card" type="button" onClick={() => onNavigate('practice')}><span className="step-number">02</span><span className="step-icon">◷</span><strong>Practice a question</strong><small>Get questions based on your role.</small><span className="step-arrow">↗</span></button>
        <button className="step-card" type="button" onClick={() => onNavigate('notes')}><span className="step-number">03</span><span className="step-icon">▧</span><strong>Ask your study notes</strong><small>Upload notes and get grounded answers.</small><span className="step-arrow">↗</span></button>
      </div>
      <form className="quick-start" onSubmit={(event) => { event.preventDefault(); if (role.trim()) onStart(role.trim()); else onNavigate('practice'); }}>
        <span className="quick-spark">✦</span><input value={role} onChange={(event) => setRole(event.target.value)} placeholder="What role are you preparing for?" aria-label="Target role" />
        <button type="submit" className="quick-submit" aria-label="Start practice">↑</button>
      </form>
      <p className="quiet-note">No pressure. You can start with one question.</p>
    </section>
  );
}

function ResumeView({ resume, busy, onUpload }) {
  const profile = resume?.parsedProfile || {};
  const skills = profile.skills || {};
  const skillGroups = [
    ['Languages', skills.languages], ['Frameworks', skills.frameworks], ['Databases', skills.databases], ['Tools', skills.tools], ['Cloud & DevOps', skills.cloudDevops], ['Core concepts', skills.coreConcepts],
  ].filter(([, values]) => values?.length);

  return (
    <section className="feature-view">
      <div className="feature-intro"><span className="eyebrow">STEP 01 · YOUR BACKGROUND</span><h2>Start with your resume.</h2><p>Upload a PDF and review the skills and projects we find. Missing details stay blank.</p></div>
      <div className="resume-layout">
        <div className="card simple-card"><div className="card-header"><h3>Your resume</h3><span className="badge badge-info">PDF · 10 MB max</span></div><div className="card-body">
          <label className="drop-zone react-drop-zone"><span className="drop-icon">↑</span><strong>Drop your PDF here</strong><small>or choose a file from your computer</small><input type="file" accept="application/pdf,.pdf" onChange={(event) => onUpload(event.target.files?.[0])} /></label>
          <button className="btn btn-primary btn-block" type="button" disabled={busy} onClick={() => document.querySelector('.react-drop-zone input')?.click()}>{busy ? 'Analyzing resume…' : 'Choose a PDF resume'}</button>
          <p className="quiet-note left-note">Your resume is stored privately for this prep workspace.</p>
        </div></div>
        <div className="card simple-card"><div className="card-header"><h3>What we found</h3><span className="badge badge-subtle">{resume ? 'Ready to review' : 'Waiting for resume'}</span></div><div className="card-body profile-viewer">
          {!resume ? <div className="empty-state"><span className="empty-icon">▤</span><p>Your extracted skills, education, and projects will appear here.</p></div> : <div className="resume-profile">
            <h3>{profile.personalInfo?.name || 'Your profile'}</h3>
            <p className="resume-contact">{[profile.personalInfo?.email, profile.personalInfo?.phone].filter(Boolean).join(' · ')}</p>
            {!!profile.personalInfo?.summary && <p className="profile-summary">{profile.personalInfo.summary}</p>}
            {skillGroups.map(([name, values]) => <div className="profile-group" key={name}><h4>{name}</h4><div className="skill-tags">{values.map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div></div>)}
            {!!profile.education?.length && <div className="profile-group"><h4>Education</h4>{profile.education.map((item, index) => <div key={index} className="profile-entry"><strong>{item.degree} {item.fieldOfStudy && `· ${item.fieldOfStudy}`}</strong><span>{item.institution}</span><small>{item.graduationYear}{item.gpa && ` · GPA ${item.gpa}`}</small></div>)}</div>}
            {!!profile.projects?.length && <div className="profile-group"><h4>Projects</h4>{profile.projects.map((project, index) => <div key={index} className="profile-entry"><strong>{project.title}</strong><span>{project.description}</span>{!!project.technologies?.length && <small>{project.technologies.join(' · ')}</small>}</div>)}</div>}
            {!!profile.workExperience?.length && <div className="profile-group"><h4>Experience</h4>{profile.workExperience.map((item, index) => <div key={index} className="profile-entry" ><strong>{item.role} · {item.company}</strong><span>{item.description}</span></div>)}</div>}
            <p className="quiet-note left-note">Check these details before using them in practice.</p>
          </div>}
        </div></div>
      </div>
    </section>
  );
}

function PracticeView({ role, onRoleChange, notify }) {
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [busy, setBusy] = useState(false);
  const question = session?.questions?.[index];

  async function generate(event) {
    event.preventDefault();
    setBusy(true);
    setEvaluation(null);
    try {
      const result = await api('/interviews/generate', { method: 'POST', body: { targetRole: role.trim(), difficulty, count: 3 } });
      setSession(result.data);
      setIndex(0);
      setAnswer('');
      notify('Your practice questions are ready.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!question || answer.trim().length < 3) return;
    setBusy(true);
    try {
      const result = await api(`/interviews/${session._id}/answer`, { method: 'POST', body: { questionId: question.id, answerText: answer.trim() } });
      setEvaluation(result.data.evaluation);
      notify('Answer reviewed. Keep going!', 'success');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="feature-view">
      <div className="feature-intro"><span className="eyebrow">STEP 02 · PRACTICE</span><h2>Let’s practice.</h2><p>Choose a role and level. Start with three focused questions.</p></div>
      <div className="card simple-card generator-card"><form className="simple-generator" onSubmit={generate}>
        <label className="form-group"><span>Target role</span><input className="form-control" value={role} onChange={(event) => onRoleChange(event.target.value)} required /></label>
        <label className="form-group"><span>Difficulty</span><select className="form-control" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Preparing…' : 'Generate questions'} <span>→</span></button>
      </form></div>
      {!question ? <div className="empty-state card simple-card practice-empty"><span className="empty-icon">◷</span><h3>Your questions will show up here</h3><p>Answer at your own pace. You’ll get practical feedback after each response.</p></div> : <div className="card simple-card question-card-react">
        <div className="question-meta"><span>Question {index + 1} of {session.questions.length}</span><span className="badge badge-info">{question.difficulty}</span><span className="badge badge-subtle">{question.topic}</span></div>
        <h3>{question.questionText}</h3>
        {!!question.hints?.length && <details className="question-hints"><summary>Need a hint?</summary><ul>{question.hints.map((hint, i) => <li key={i}>{hint}</li>)}</ul></details>}
        <form onSubmit={submitAnswer} className="answer-form"><label htmlFor="practice-answer">Your answer</label><textarea id="practice-answer" className="form-control" rows="6" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Explain it in your own words. Add an example if you can." required minLength={3} /><button className="btn btn-primary" disabled={busy || answer.trim().length < 3}>{busy ? 'Reviewing…' : 'Check my answer'}</button></form>
        {evaluation && <EvaluationCard evaluation={evaluation} />}
        {evaluation && <button className="btn btn-outline next-question" type="button" onClick={() => { setIndex((value) => (value + 1) % session.questions.length); setAnswer(''); setEvaluation(null); }}>Next question →</button>}
      </div>}
    </section>
  );
}

function EvaluationCard({ evaluation }) {
  const result = evaluation?.score ? evaluation : evaluation?.evaluation || evaluation;
  const score = result?.score || {};
  return <div className="evaluation-card"><div className="evaluation-score"><strong>{score.totalScore ?? 0}<small>/10</small></strong><span>Practice feedback</span></div>
    <p>{result?.criterionFeedback?.technicalCorrectness || 'Your feedback is ready.'}</p>
    {!!result?.missingConcepts?.length && <div className="feedback-line"><strong>Review:</strong> {result.missingConcepts.join(', ')}</div>}
    {!!result?.suggestions?.length && <div className="feedback-line"><strong>Next step:</strong> {result.suggestions[0]}</div>}
    {!!result?.improvedAnswer && <details className="improved-answer"><summary>See a stronger example</summary><p>{result.improvedAnswer}</p></details>}
    <small>Scores are approximate practice feedback.</small>
  </div>;
}

function NotesView({ documents, busy, onUpload, onDelete, notify }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hi! Add your notes, then ask me to explain a topic or help you review. I’ll tell you when your notes don’t have enough information.' }]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);

  async function ask(event) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt) return;
    setMessages((items) => [...items, { role: 'user', text: prompt }]);
    setQuestion('');
    setSending(true);
    try {
      const result = await api('/chat', { method: 'POST', body: { question: prompt } });
      setMessages((items) => [...items, { role: 'assistant', text: result.data.answer, sources: result.data.sources || [], grounded: result.data.isGrounded }]);
    } catch (error) {
      setMessages((items) => [...items, { role: 'assistant', text: error.message }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="feature-view">
      <div className="feature-intro"><span className="eyebrow">STEP 03 · YOUR STUDY NOTES</span><h2>Ask what you’re studying.</h2><p>Upload a note, then ask a question. Answers point back to the source.</p></div>
      <div className="study-layout">
        <aside className="card simple-card study-library"><div className="card-header"><h3>Your notes</h3><span className="badge badge-subtle">{documents.length}</span></div><div className="card-body">
          <label className="notes-upload"><span>＋</span><strong>{busy ? 'Adding notes…' : 'Add a study file'}</strong><small>PDF, TXT, or Markdown · 10 MB max</small><input type="file" accept=".pdf,.txt,.md,.markdown" disabled={busy} onChange={(event) => { onUpload(event.target.files?.[0]); event.target.value = ''; }} /></label>
          <div className="document-list">{documents.length === 0 ? <p className="document-empty">Your uploaded files will appear here.</p> : documents.map((doc) => <div className="document-row" key={doc._id}><span className="document-icon">▤</span><span className="document-name"><strong>{doc.originalName}</strong><small>{doc.status === 'ready' ? `${doc.chunkCount || 0} sections indexed` : doc.status}</small></span><button type="button" className="remove-document" aria-label={`Remove ${doc.originalName}`} onClick={() => onDelete(doc._id)}>×</button></div>)}</div>
        </div></aside>
        <div className="card simple-card chat-card">
          <div className="chat-messages" aria-live="polite">{messages.map((message, index) => <div className={`chat-bubble ${message.role === 'user' ? 'user' : 'ai'}`} key={`${index}-${message.role}`}><div className="bubble-sender">{message.role === 'user' ? 'You' : 'Prep assistant'}</div><div className="bubble-text">{message.text}</div>{!!message.sources?.length && <div className="message-sources">{message.sources.map((source, i) => <span className="source-pill" key={`${source.filename}-${i}`}>{source.filename}{source.pageNumber ? ` · page ${source.pageNumber}` : ''}</span>)}</div>}</div>)}{sending && <div className="chat-bubble ai"><div className="bubble-sender">Prep assistant</div><div className="bubble-text">Looking through your notes…</div></div>}</div>
          <div className="chat-input-area"><form className="chat-input-form" onSubmit={ask}><textarea className="form-control" rows="2" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about your notes…" required /><button className="btn btn-primary" type="submit" aria-label="Send question" disabled={sending || !question.trim()}>↑</button></form><p className="quiet-note">Answers are based on the study notes you uploaded.</p></div>
        </div>
      </div>
    </section>
  );
}

export default App;
