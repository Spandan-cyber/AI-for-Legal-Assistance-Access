/**
 * js/app.js — Main Application Controller for Judgeman
 * Orchestrates document upload, real-time AI analysis (Gemini 2.5 Flash),
 * Firestore persistence, and all six analysis modules.
 */

import { Icons } from './icons.js';
import { SAMPLES, SAMPLE_COMPARISON } from './sampleData.js';
import { setApiKey, analyzeContractWithGemini, askJudgeman } from './geminiService.js';
import { getSession } from './auth.js';
import { saveDocumentToFirestore, subscribeToUserDocuments, deleteDocumentFromFirestore } from './documentService.js';

/** @type {object|null} The currently loaded contract analysis result */
let currentContract = null;
/** @type {string|null} The key of the active sample chip, or null if custom */
let currentKey = 'lease';
/** @type {Array} Running history of chat Q&A pairs */
let chatHistory = [];
/** @type {Array} User's cloud documents from Firestore real-time listener */
let userDocuments = [];
/** @type {Function|null} Cleanup function for the Firestore onSnapshot listener */
let unsubscribeUserDocs = null;

/** Supported plaintext MIME types and extensions for contract upload */
const SUPPORTED_TEXT_TYPES = new Set([
  'text/plain', 'text/html', 'text/xml', 'application/xml',
  'application/json', 'text/markdown', 'text/csv'
]);
const SUPPORTED_EXTENSIONS = new Set(['.txt', '.text', '.md', '.csv', '.xml', '.json', '.html']);

/** Maximum file size allowed for upload: 5 MB */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  injectIcons();
  bindNav();
  bindSampleChips();
  bindDropzone();
  bindTabs();
  bindRiskFilters();
  bindChat();
  bindModal();
  bindUserDocuments();
  loadSample('lease');
});

/* ═══════════════════════════════════════════════════════════
   ICON INJECTION
═══════════════════════════════════════════════════════════ */
function injectIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    if (Icons[name]) el.innerHTML = Icons[name];
  });
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
function bindNav() {
  document.getElementById('open-modal-btn').addEventListener('click', () => {
    document.getElementById('api-modal').classList.add('open');
  });
}

/* ═══════════════════════════════════════════════════════════
   SAMPLE CHIPS
═══════════════════════════════════════════════════════════ */
function bindSampleChips() {
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      loadSample(chip.dataset.sample);
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   DROPZONE
═══════════════════════════════════════════════════════════ */
function bindDropzone() {
  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dz.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

async function handleFile(file) {
  // ── File Validation ──────────────────────────────────────
  if (file.size > MAX_FILE_SIZE_BYTES) {
    showToast(`File too large (max 5 MB). "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
    return;
  }

  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const isTextType = SUPPORTED_TEXT_TYPES.has(file.type) || SUPPORTED_EXTENSIONS.has(ext);
  if (!isTextType) {
    // Attempt to read anyway (e.g. .txt without MIME) — just warn user
    console.warn('[Judgeman] Unknown file type, attempting text read:', file.type, ext);
  }

  const dz = document.getElementById('dropzone');
  const origDzHtml = dz.innerHTML;
  dz.innerHTML = `
    <div style="padding:1.5rem;text-align:center;" role="status" aria-live="polite" aria-label="Analyzing ${escHtml(file.name)}">
      <div style="width:34px;height:34px;border:3px solid rgba(229,181,79,0.25);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1rem;" aria-hidden="true"></div>
      <div style="font-family:var(--font-heading);font-weight:700;font-size:1rem;color:var(--text-primary);margin-bottom:0.3rem;">
        Analyzing "${escHtml(file.name)}" with Gemini AI...
      </div>
      <div style="font-size:0.78rem;color:var(--text-secondary);max-width:400px;margin:0 auto;line-height:1.5;">
        Extracting clause breakdown, calculating risk radar, and generating real-time executive summary.
      </div>
    </div>
  `;

  announceToScreenReader(`Analyzing ${file.name} with Gemini AI. Please wait.`);

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const text = reader.result;
      if (!text || text.trim().length < 10) {
        showToast('File appears to be empty or unreadable. Please upload a text-based contract.');
        dz.innerHTML = origDzHtml;
        injectIcons();
        return;
      }

      // Real-time AI analysis (uses developer Gemini key automatically)
      const analysis = await analyzeContractWithGemini(text, file.name);

      // Persist to Cloud Firestore under the authenticated user's scope
      const session = getSession();
      const userId = session?.uid || 'guest';
      const savedDoc = await saveDocumentToFirestore(userId, analysis);

      currentContract = savedDoc || analysis;
      currentKey = null;
      document.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));

      updateAllModules(currentContract);
      renderInitialChat();
      showToast(`"${file.name}" analyzed and saved to your cloud library!`);
      announceToScreenReader(`Analysis complete. ${file.name} has been saved to your library.`);

      // Smooth scroll to results workspace
      setTimeout(() => {
        document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
      }, 350);
    } catch (err) {
      console.error('[Judgeman] Analysis error:', err);
      showToast('Analysis failed. Please check your file is a readable text contract and try again.');
      announceToScreenReader('Analysis failed. Please try again.');
    } finally {
      dz.innerHTML = origDzHtml;
      injectIcons();
    }
  };
  reader.onerror = () => {
    showToast('Could not read file. Ensure it is a text-based document (.txt, .md, etc.)');
    dz.innerHTML = origDzHtml;
    injectIcons();
  };
  reader.readAsText(file);
}

/* ═══════════════════════════════════════════════════════════
   USER DOCUMENTS & FIRESTORE REAL-TIME SYNC
═══════════════════════════════════════════════════════════ */
function bindUserDocuments() {
  const session = getSession();
  const userId = session?.uid || 'guest';
  if (unsubscribeUserDocs) unsubscribeUserDocs();
  unsubscribeUserDocs = subscribeToUserDocuments(userId, docs => {
    userDocuments = docs;
    renderUserContractsList(docs);
  });
}

function renderUserContractsList(docs) {
  const container = document.getElementById('user-contracts-list');
  if (!container) return;

  if (!docs || docs.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-muted);font-size:0.85rem;background:rgba(255,255,255,0.02);border-radius:var(--radius-lg);border:1px dashed var(--glass-border);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 0.5rem;opacity:0.6;display:block">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        No custom files uploaded yet. Drag &amp; drop a contract above to analyze in real-time and save to your Cloud Firestore library.
      </div>
    `;
    return;
  }

  container.innerHTML = docs.map((doc) => {
    const isCurrent = currentContract && (currentContract.id === doc.id || currentContract.name === doc.name);
    const highRisks = (doc.risks || []).filter(r => r.level === 'high').length;
    const dateStr = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently uploaded';

    return `
      <div class="glass" style="padding:1.15rem;border-radius:var(--radius-lg);display:flex;flex-direction:column;justify-content:space-between;gap:0.75rem;transition:all var(--trans);border-color:${isCurrent ? 'var(--gold)' : 'var(--glass-border)'};background:${isCurrent ? 'rgba(229,181,79,0.06)' : 'rgba(255,255,255,0.02)'};position:relative;">
        <div>
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.4rem;">
            <div style="font-family:var(--font-heading);font-weight:700;font-size:0.92rem;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;" title="${escHtml(doc.name)}">
              ${escHtml(doc.name)}
            </div>
            <button class="btn-delete-doc" data-id="${doc.id}" title="Delete document" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:2px;border-radius:4px;display:flex;align-items:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
          <div style="font-size:0.75rem;color:var(--text-secondary);display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.6rem;">
            <span class="tag info" style="font-size:0.65rem;padding:0.1rem 0.45rem;">${escHtml(doc.contractType || 'Contract')}</span>
            <span>${doc.wordCount || 0} words</span>
            <span>•</span>
            <span style="color:var(--text-muted);">${dateStr}</span>
          </div>
          <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
            <span class="tag ${highRisks > 0 ? 'high' : 'low'}" style="font-size:0.65rem;padding:0.1rem 0.45rem;">
              ${highRisks} High Risk
            </span>
            <span class="tag info" style="font-size:0.65rem;padding:0.1rem 0.45rem;">
              ${(doc.clauses || []).length} Clauses
            </span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;padding-top:0.6rem;border-top:1px solid rgba(255,255,255,0.06);margin-top:auto;">
          <button class="btn-load-doc" data-id="${doc.id}" style="width:100%;padding:0.45rem 0.75rem;background:${isCurrent ? 'linear-gradient(135deg,#E5B54F,#c98a1a)' : 'rgba(129,140,248,0.12)'};color:${isCurrent ? '#0d0d0d' : 'var(--text-primary)'};border:1px solid ${isCurrent ? 'transparent' : 'rgba(129,140,248,0.3)'};border-radius:var(--radius-sm);font-size:0.75rem;font-weight:600;cursor:pointer;transition:all var(--trans);">
            ${isCurrent ? '✓ Active in Workspace' : 'Load into Workspace →'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-load-doc').forEach(btn => {
    btn.addEventListener('click', () => {
      const docId = btn.dataset.id;
      const targetDoc = docs.find(d => d.id === docId);
      if (targetDoc) {
        document.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
        currentKey = null;
        currentContract = targetDoc;
        chatHistory = [];
        updateAllModules(currentContract);
        renderInitialChat();
        renderUserContractsList(userDocuments);
        showToast(`Loaded "${targetDoc.name}" into workspace`);
        document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  container.querySelectorAll('.btn-delete-doc').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const docId = btn.dataset.id;
      const session = getSession();
      const userId = session?.uid || 'guest';
      if (confirm('Delete this contract and analysis from your library?')) {
        await deleteDocumentFromFirestore(docId, userId);
        showToast('Document deleted from cloud library');
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   LOAD SAMPLE
═══════════════════════════════════════════════════════════ */
function loadSample(key) {
  currentKey = key;
  currentContract = SAMPLES[key];
  chatHistory = [];
  updateAllModules(currentContract);
  // Reset chat
  renderInitialChat();
}

/* ═══════════════════════════════════════════════════════════
   UPDATE ALL MODULES
═══════════════════════════════════════════════════════════ */
function updateAllModules(contract) {
  renderStats(contract);
  renderOverview(contract);
  renderSimplifier(contract);
  renderComparison();
  renderRiskRadar(contract);
  renderPrepKit(contract);
}

/* ═══════════════════════════════════════════════════════════
   STATS STRIP
═══════════════════════════════════════════════════════════ */
function renderStats(c) {
  animateNumber('stat-words', c.wordCount);
  document.getElementById('stat-time').textContent = c.readingTime;
  document.getElementById('stat-grade').textContent = c.gradeLevel.split(' ')[0];
  const highRisks = c.risks ? c.risks.filter(r => r.level === 'high').length : 0;
  document.getElementById('stat-risks').textContent = highRisks;
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = start.toLocaleString();
    if (start >= target) clearInterval(timer);
  }, 30);
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW MODULE
═══════════════════════════════════════════════════════════ */
function renderOverview(c) {
  const el = document.getElementById('overview-content');
  const risks = c.risks || [];
  const high = risks.filter(r => r.level === 'high').length;
  const med = risks.filter(r => r.level === 'medium').length;
  const low = risks.filter(r => r.level === 'low').length;

  // Flesch reading ease simulation
  const readabilityScore = Math.max(10, 100 - (c.wordCount / 60));
  const readabilityLabel = readabilityScore < 30 ? 'Very Difficult' : readabilityScore < 50 ? 'Difficult' : readabilityScore < 70 ? 'Standard' : 'Accessible';
  const readabilityColor = readabilityScore < 30 ? 'var(--red)' : readabilityScore < 50 ? 'var(--amber)' : 'var(--green)';

  el.innerHTML = `
    <div class="overview-grid">
      <div class="glass overview-card">
        <div class="ov-label">Document Identity</div>
        <div style="margin-top:0.5rem">
          <div style="font-family:var(--font-heading);font-size:1rem;font-weight:700;margin-bottom:0.3rem">${escHtml(c.name)}</div>
          <div style="font-size:0.82rem;color:var(--text-secondary)">Type: ${escHtml(c.contractType)}</div>
          <div style="font-size:0.82rem;color:var(--text-secondary)">Jurisdiction: ${escHtml(c.jurisdiction)}</div>
          <div style="font-size:0.82rem;color:var(--text-secondary)">Reading Time: <span style="color:var(--cyan)">${escHtml(c.readingTime)}</span></div>
        </div>
        <div class="tag-list" style="margin-top:0.75rem">
          <span class="tag info">${escHtml(c.type)}</span>
          <span class="tag ${high > 0 ? 'high' : 'low'}">${high} High Risk</span>
          <span class="tag med">${med} Caution</span>
        </div>
      </div>
      <div class="glass overview-card">
        <div class="ov-label">Readability Score</div>
        <div class="ov-val" style="color:${readabilityColor}">${Math.round(readabilityScore)}/100</div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.2rem">${readabilityLabel} — ${escHtml(c.gradeLevel)}</div>
        <div class="ov-bar"><div class="ov-bar-fill" style="width:0%;background:${readabilityColor}" data-target="${Math.round(readabilityScore)}"></div></div>
      </div>
      <div class="glass overview-card">
        <div class="ov-label">Risk Distribution</div>
        <div style="display:flex;gap:1rem;margin-top:0.5rem">
          <div style="text-align:center">
            <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:var(--red)">${high}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">HIGH</div>
          </div>
          <div style="text-align:center">
            <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:var(--amber)">${med}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">MEDIUM</div>
          </div>
          <div style="text-align:center">
            <div style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:var(--green)">${low}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">LOW</div>
          </div>
        </div>
        <div style="margin-top:0.75rem;font-size:0.78rem;color:var(--text-secondary)">${risks.length} total clauses analyzed</div>
      </div>
      <div class="glass overview-card">
        <div class="ov-label">Key Categories Detected</div>
        <div class="tag-list" style="margin-top:0.5rem">
          ${[...new Set(risks.map(r => r.category))].map(cat =>
            `<span class="tag info">${escHtml(cat)}</span>`
          ).join('')}
        </div>
        <div style="margin-top:0.75rem;font-size:0.78rem;color:var(--text-secondary)">
          Full analysis available in the Risk Radar tab →
        </div>
      </div>
    </div>
    ${c.prepKit?.summary ? `
      <div class="glass" style="margin-top:1.5rem;padding:1.5rem 1.75rem;border-left:4px solid var(--gold);background:rgba(229,181,79,0.05);border-radius:var(--radius-lg);position:relative;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem">
          <div style="display:flex;align-items:center;gap:0.6rem">
            <span style="font-family:var(--font-heading);font-weight:700;font-size:1.05rem;color:var(--text-primary)">⚡ Real-Time Executive Summary</span>
            <span class="tag info" style="font-size:0.68rem;padding:0.15rem 0.55rem;">AI Generated</span>
          </div>
          <span style="font-size:0.75rem;color:var(--text-muted)">Live synthesis of duties, liabilities &amp; legal risks</span>
        </div>
        <p style="font-size:0.88rem;color:var(--text-secondary);line-height:1.75;margin:0">${escHtml(c.prepKit.summary)}</p>
      </div>
    ` : ''}
  `;

  // Animate progress bar
  setTimeout(() => {
    const bar = el.querySelector('[data-target]');
    if (bar) bar.style.width = bar.dataset.target + '%';
  }, 200);
}

/* ═══════════════════════════════════════════════════════════
   SIMPLIFIER MODULE
═══════════════════════════════════════════════════════════ */
function renderSimplifier(c) {
  const el = document.getElementById('simplifier-content');
  if (!c.clauses || c.clauses.length === 0) {
    el.innerHTML = `<div class="glass" style="padding:2rem;text-align:center;color:var(--text-muted)">Upload a contract or select a sample to see plain-language breakdown.</div>`;
    return;
  }

  el.innerHTML = c.clauses.map((clause, i) => `
    <div style="margin-bottom:1.5rem" role="article" aria-label="Clause ${i + 1}: ${escHtml(clause.title || '')}">
      <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.06em">
        Clause ${i + 1}
        ${clause.title ? `— <span style="color:var(--text-secondary);text-transform:none;font-style:italic">${escHtml(clause.title)}</span>` : ''}
      </div>
      <div class="simplifier-grid">
        <div class="glass clause-card">
          <div class="clause-card-header">
            <span class="clause-label orig">Original Legal Text</span>
            <span class="tag high" style="font-size:0.65rem">Jargon</span>
          </div>
          <div class="clause-text">"${escHtml(clause.original || 'No original text available.')}"</div>
        </div>
        <div class="glass clause-card" style="border-color:rgba(52,211,153,0.15)">
          <div class="clause-card-header">
            <span class="clause-label plain">Plain English</span>
            <span class="tag low" style="font-size:0.65rem">Simplified</span>
          </div>
          <div class="clause-text plain">${escHtml(clause.simplified || clause.plain || 'Simplified version not available.')}</div>
          ${clause.trap ? `
          <div class="insight-chip" role="note" aria-label="Risk note for this clause">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span><strong>Watch out:</strong> ${escHtml(clause.trap)}</span>
          </div>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════
   COMPARISON MODULE
═══════════════════════════════════════════════════════════ */
function renderComparison() {
  const el = document.getElementById('comparison-content');
  const { original, revised, summary } = SAMPLE_COMPARISON;

  el.innerHTML = `
    <div class="glass" style="padding:1rem 1.4rem;margin-bottom:1.25rem;border-color:rgba(251,176,64,0.2);background:rgba(251,176,64,0.05)">
      <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.8rem;color:var(--amber)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <strong>AI Verdict:</strong> ${escHtml(summary)}
      </div>
    </div>
    <div class="compare-grid">
      <div class="glass compare-card">
        <div class="clause-card-header">
          <span class="clause-label orig">${escHtml(original.label)}</span>
          <span class="tag info">Baseline</span>
        </div>
        ${original.clauses.map(c => `
          <div class="diff-line ${c.type === 'removed' ? 'removed' : 'neutral'}">
            ${c.type === 'removed' ? '− ' : '  '}${escHtml(c.text)}
          </div>
        `).join('')}
      </div>
      <div class="glass compare-card">
        <div class="clause-card-header">
          <span class="clause-label plain">${escHtml(revised.label)}</span>
          <span class="tag high">Revised</span>
        </div>
        ${revised.clauses.map(c => `
          <div class="diff-line ${c.type === 'added' ? 'added' : 'neutral'}">
            ${c.type === 'added' ? '+ ' : '  '}${escHtml(c.text)}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════
   RISK RADAR MODULE
═══════════════════════════════════════════════════════════ */
let currentRiskFilter = 'all';

function bindRiskFilters() {
  document.getElementById('risk-filters').addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentRiskFilter = pill.dataset.filter;
    if (currentContract) renderRiskRadar(currentContract);
  });
}

function renderRiskRadar(c) {
  const el = document.getElementById('risk-content');
  if (!c.risks || c.risks.length === 0) {
    el.innerHTML = `<div class="glass" style="padding:2rem;text-align:center;color:var(--text-muted)">No risk data available for this document.</div>`;
    return;
  }
  const filtered = currentRiskFilter === 'all' ? c.risks : c.risks.filter(r => r.level === currentRiskFilter);
  el.innerHTML = `
    <div class="risk-grid">
      ${filtered.map(r => `
        <div class="risk-row">
          <span class="risk-badge ${r.level}">${r.level}</span>
          <div>
            <div class="risk-title">${escHtml(r.title)}</div>
            <div class="risk-desc">${escHtml(r.desc)}</div>
          </div>
          <span class="risk-cat">${escHtml(r.category)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════════
   CHAT MODULE
═══════════════════════════════════════════════════════════ */
function bindChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  sendBtn.addEventListener('click', sendChatMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });

  document.getElementById('suggested-chips').addEventListener('click', e => {
    const chip = e.target.closest('.sug-chip');
    if (!chip) return;
    document.getElementById('chat-input').value = chip.textContent;
    sendChatMessage();
  });
}

function renderInitialChat() {
  const msgsEl = document.getElementById('chat-messages');
  msgsEl.innerHTML = '';
  chatHistory = [];
  appendBotMessage(
    `👋 Hello! I'm Judgeman AI, your legal document assistant. I've analyzed the **${currentContract?.name || 'document'}** and I'm ready to answer your questions.\n\nAsk me anything — like "What are the biggest risks?" or "Can they fire me without cause?"`,
    null
  );
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question || !currentContract) return;

  input.value = '';
  appendUserMessage(question);

  // Show typing indicator
  const typingId = appendTypingIndicator();

  try {
    const response = await askJudgeman(question, currentContract);
    removeTypingIndicator(typingId);
    appendBotMessage(response.text, response.cite);
  } catch (err) {
    removeTypingIndicator(typingId);
    appendBotMessage("I encountered an issue analyzing that clause. Please try asking in a different way or consult the plain language tab.", null);
  }
}

function appendUserMessage(text) {
  const el = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg user';
  div.innerHTML = `<div class="msg-bubble">${escHtml(text)}</div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function appendBotMessage(text, cite) {
  const el = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = `
    <div class="msg-bubble">${markdownToHtml(text)}</div>
    ${cite ? `<span class="msg-cite">${escHtml(cite)}</span>` : ''}
  `;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function appendTypingIndicator() {
  const el = document.getElementById('chat-messages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'msg bot'; div.id = id;
  div.innerHTML = `<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  document.getElementById(id)?.remove();
}

/* ═══════════════════════════════════════════════════════════
   PREP KIT MODULE
═══════════════════════════════════════════════════════════ */
function renderPrepKit(c) {
  const el = document.getElementById('prep-content');
  if (!c.prepKit) { el.innerHTML = '<div class="glass" style="padding:2rem;text-align:center;color:var(--text-muted)">No prep kit data available.</div>'; return; }
  const { summary, redFlags, questions } = c.prepKit;

  el.innerHTML = `
    <div class="glass prep-kit">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1rem">
        <div>
          <div style="font-family:var(--font-heading);font-size:1.1rem;font-weight:700">Lawyer Consultation Prep Kit</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.2rem">Ready to hand to your attorney — summarizes key issues</div>
        </div>
        <button class="export-btn" id="export-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export as Markdown
        </button>
      </div>

      <div class="prep-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Executive Summary
      </div>
      <div class="glass" style="padding:1rem 1.25rem;font-size:0.84rem;color:var(--text-secondary);line-height:1.75;border-color:rgba(229,181,79,0.15)">${escHtml(summary)}</div>

      <div class="prep-section-title" style="color:var(--red)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Top Red Flags (Negotiate These)
      </div>
      <ul class="prep-list">
        ${redFlags.map(f => `<li class="red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>${escHtml(f)}</li>`).join('')}
      </ul>

      <div class="prep-section-title" style="color:var(--cyan)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Questions to Ask Your Attorney
      </div>
      <ul class="prep-list">
        ${questions.map((q, i) => `<li class="cyan"><span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--cyan);flex-shrink:0">Q${i+1}</span>${escHtml(q)}</li>`).join('')}
      </ul>
    </div>
  `;

  document.getElementById('export-btn').addEventListener('click', () => exportPrepKit(c));
}

function exportPrepKit(c) {
  const { summary, redFlags, questions } = c.prepKit;
  const md = `# Judgeman — Lawyer Consultation Prep Kit\n## Document: ${c.name}\n\n### Executive Summary\n${summary}\n\n### Top Red Flags\n${redFlags.map(f => `- ${f}`).join('\n')}\n\n### Questions for Your Attorney\n${questions.map((q, i) => `${i+1}. ${q}`).join('\n')}\n\n---\n*Generated by Judgeman AI — For informational purposes only. Not legal advice.*`;
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'judgeman_prep_kit.md';
  a.click(); URL.revokeObjectURL(url);
  showToast('Prep Kit exported as Markdown!');
}

/* ═══════════════════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════════════════ */
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel).classList.add('active');
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   API KEY MODAL
═══════════════════════════════════════════════════════════ */
function bindModal() {
  const modal = document.getElementById('api-modal');
  document.getElementById('modal-cancel').addEventListener('click', () => modal.classList.remove('open'));
  document.getElementById('modal-save').addEventListener('click', () => {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) { setApiKey(key); showToast('Gemini API key saved — Live mode active!'); }
    modal.classList.remove('open');
  });
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
}

/* ═══════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════ */

/**
 * Escape HTML special characters to prevent XSS injection.
 * All user/AI-generated text MUST pass through this before innerHTML insertion.
 * @param {*} str - Value to escape
 * @returns {string} HTML-safe string
 */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert a limited subset of Markdown to safe HTML for chat bubbles.
 * Only bold (**), italic (*), and newlines are converted.
 * @param {string} text
 * @returns {string}
 */
function markdownToHtml(text) {
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

/**
 * Display a brief non-blocking toast notification.
 * @param {string} msg - Message to display
 * @param {'success'|'error'} [type='success']
 */
function showToast(msg, type = 'success') {
  const isError = type === 'error';
  const t = document.createElement('div');
  t.setAttribute('role', 'status');
  t.setAttribute('aria-live', 'polite');
  t.style.cssText = `
    position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
    background:rgba(13,18,37,0.95);
    border:1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'};
    color:${isError ? 'var(--red)' : 'var(--green)'};
    padding:0.75rem 1.25rem;border-radius:12px;
    font-size:0.82rem;font-weight:500;backdrop-filter:blur(12px);
    box-shadow:0 0 20px ${isError ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)'};
    animation:fadeUp 0.3s ease;
    max-width:340px;word-break:break-word;
  `;
  t.textContent = (isError ? '✗ ' : '✓ ') + msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/**
 * Announce a message to screen readers via an ARIA live region.
 * @param {string} message
 */
function announceToScreenReader(message) {
  let liveRegion = document.getElementById('sr-announcer');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'sr-announcer';
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(liveRegion);
  }
  // Brief delay ensures screen reader picks up the new content
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = message; }, 50);
}
