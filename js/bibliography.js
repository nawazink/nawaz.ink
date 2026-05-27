import { state, saveState, markDirty } from './state.js';

const TYPES = ['Book', 'Journal', 'Website', 'News', 'Video', 'Image', 'Report', 'Conference', 'Podcast', 'Social Media', 'Interview', 'Film', 'Other'];

export function renderBibliography() {
  const container = document.getElementById('view-bibliography');
  if (!container) return;

  container.innerHTML = `
    <div class="page-pad bib-page">
      <div class="bib-header">
        <div>
          <h1 class="bib-title">Bibliography</h1>
          <p class="bib-subtitle">Generate citations · Manage references · Export works cited</p>
        </div>
      </div>

      <div class="bib-layout">
        <!-- LEFT: Generator -->
        <div class="bib-generator">
          <div class="bib-gen-section">
            <div class="bib-gen-section-title">Generate Citation</div>

            <div class="bib-gen-row">
              <label>Style</label>
              <div class="bib-style-toggle">
                <button class="bib-style-btn active" data-style="mla">MLA</button>
                <button class="bib-style-btn" data-style="apa">APA</button>
              </div>
            </div>

            <div class="bib-gen-row">
              <label>Type</label>
              <select class="bib-select" id="bg-type">${TYPES.map(t => `<option>${t}</option>`).join('')}</select>
            </div>

            <div id="bg-fields"></div>

            <div class="bib-gen-row">
              <label>Project</label>
              <select class="bib-select" id="bg-project">
                <option value="">Standalone</option>
                ${state.pages.map(p => `<option value="${p.id}">${esc(p.title || 'Untitled')}</option>`).join('')}
              </select>
            </div>

            <div class="bib-gen-actions">
              <button class="btn btn-primary btn-sm" id="bg-generate">Generate</button>
              <button class="btn btn-sm" id="bg-generate-intext">In-text only</button>
              <button class="btn btn-ghost btn-sm" id="bg-clear-form">Clear</button>
            </div>
          </div>

          <!-- Output -->
          <div class="bib-output" id="bg-output" style="display:none;">
            <div class="bib-output-label">Full reference:</div>
            <div class="bib-output-text" id="bg-out-full"></div>
            <div class="bib-output-label" style="margin-top:8px;">In-text:</div>
            <div class="bib-output-text" id="bg-out-intext"></div>
            <div class="bib-output-actions">
              <button class="btn btn-sm" id="bg-copy-full">Copy full</button>
              <button class="btn btn-sm" id="bg-copy-intext">Copy in-text</button>
              <button class="btn btn-primary btn-sm" id="bg-add-list">+ Add to list</button>
            </div>
          </div>
        </div>

        <!-- RIGHT: References List -->
        <div class="bib-list-panel">
          <div class="bib-list-top">
            <span class="bib-list-count">${state.bibliography.length} references</span>
            <div class="bib-list-controls">
              <select class="bib-select bib-select-sm" id="bl-filter-type">
                <option value="">All types</option>
                ${TYPES.map(t => `<option>${t}</option>`).join('')}
              </select>
              <select class="bib-select bib-select-sm" id="bl-filter-project">
                <option value="">All projects</option>
                <option value="_standalone">Standalone</option>
                ${state.pages.map(p => `<option value="${p.id}">${esc(p.title || 'Untitled')}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="bib-list-actions-row">
            <button class="btn btn-sm" id="bl-copy-all">Copy all</button>
            <button class="btn btn-sm" id="bl-export">Export .txt</button>
            <button class="btn btn-sm btn-danger" id="bl-clear">Clear all</button>
          </div>
          <div id="bl-entries"></div>
        </div>
      </div>
    </div>
  `;

  wireAll(container);
  renderFields();
  renderEntries();
}

// ─── WIRING ───

let activeStyle = 'mla';
let lastEntry = null;

function wireAll(container) {
  // Style toggle
  container.querySelectorAll('.bib-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeStyle = btn.getAttribute('data-style');
      container.querySelectorAll('.bib-style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEntries();
    });
  });

  // Type change → update fields
  document.getElementById('bg-type')?.addEventListener('change', renderFields);

  // Generate
  document.getElementById('bg-generate')?.addEventListener('click', () => generate('full'));
  document.getElementById('bg-generate-intext')?.addEventListener('click', () => generate('intext'));
  document.getElementById('bg-clear-form')?.addEventListener('click', () => { renderFields(); hideOutput(); });

  // Output actions
  document.getElementById('bg-copy-full')?.addEventListener('click', () => copyText(document.getElementById('bg-out-full')?.textContent));
  document.getElementById('bg-copy-intext')?.addEventListener('click', () => copyText(document.getElementById('bg-out-intext')?.textContent));
  document.getElementById('bg-add-list')?.addEventListener('click', addToList);

  // List filters
  document.getElementById('bl-filter-type')?.addEventListener('change', renderEntries);
  document.getElementById('bl-filter-project')?.addEventListener('change', renderEntries);

  // List actions
  document.getElementById('bl-copy-all')?.addEventListener('click', copyAllEntries);
  document.getElementById('bl-export')?.addEventListener('click', exportTxt);
  document.getElementById('bl-clear')?.addEventListener('click', () => {
    if (confirm('Delete all bibliography entries?')) { state.bibliography = []; saveState(); markDirty(); renderEntries(); }
  });
}

// ─── DYNAMIC FIELDS ───

const FIELD_MAP = {
  Book: ['authors', 'title', 'year', 'publisher', 'doi', 'url'],
  Journal: ['authors', 'title', 'year', 'journal', 'volume', 'issue', 'pages', 'doi', 'url'],
  Website: ['authors', 'title', 'year', 'publisher', 'url', 'accessDate'],
  News: ['authors', 'title', 'year', 'publisher', 'url', 'accessDate'],
  Video: ['title', 'year', 'channel', 'url', 'accessDate'],
  Image: ['authors', 'title', 'year', 'publisher', 'url'],
  Report: ['authors', 'title', 'year', 'publisher', 'url'],
  Conference: ['authors', 'title', 'year', 'journal', 'publisher', 'doi', 'url'],
  Podcast: ['title', 'year', 'journal', 'host', 'episode', 'url'],
  'Social Media': ['authors', 'title', 'year', 'username', 'publisher', 'url'],
  Interview: ['authors', 'title', 'year', 'host', 'publisher'],
  Film: ['title', 'year', 'director', 'performers', 'publisher'],
  Other: ['authors', 'title', 'year', 'publisher', 'url']
};

const LABELS = {
  authors: 'Author(s)', title: 'Title', year: 'Year', publisher: 'Publisher / Site',
  journal: 'Journal / Publication', volume: 'Volume', issue: 'Issue', pages: 'Pages',
  doi: 'DOI', url: 'URL', accessDate: 'Access date', director: 'Director',
  performers: 'Performers', channel: 'Channel', host: 'Host / Interviewer',
  episode: 'Episode', username: 'Username (@)'
};

function renderFields() {
  const type = document.getElementById('bg-type')?.value || 'Book';
  const fields = FIELD_MAP[type] || FIELD_MAP.Other;
  const container = document.getElementById('bg-fields');
  if (!container) return;

  container.innerHTML = fields.map(f => `
    <div class="bib-gen-row">
      <label>${LABELS[f] || f}</label>
      <input class="bib-input" id="bf-${f}" type="${f === 'accessDate' ? 'date' : 'text'}" placeholder="${f === 'authors' ? 'Last, First' : ''}"/>
    </div>
  `).join('');
}

function readForm() {
  const type = document.getElementById('bg-type')?.value || 'Book';
  const fields = FIELD_MAP[type] || FIELD_MAP.Other;
  const data = { type };
  fields.forEach(f => { data[f] = (document.getElementById(`bf-${f}`)?.value || '').trim(); });
  data.projectId = document.getElementById('bg-project')?.value || '';
  return data;
}

// ─── GENERATE ───

function generate(mode) {
  const data = readForm();
  if (!data.title && !data.authors) return;
  lastEntry = data;

  const full = formatFull(data, activeStyle);
  const intext = formatInText(data, activeStyle);

  const output = document.getElementById('bg-output');
  if (output) output.style.display = 'block';
  const fullEl = document.getElementById('bg-out-full');
  const intextEl = document.getElementById('bg-out-intext');
  if (fullEl) fullEl.innerHTML = full;
  if (intextEl) intextEl.textContent = intext;
}

function hideOutput() {
  const output = document.getElementById('bg-output');
  if (output) output.style.display = 'none';
}

function addToList() {
  if (!lastEntry) return;
  state.bibliography.push({ id: crypto.randomUUID(), ...lastEntry, createdAt: Date.now() });
  saveState(); markDirty();
  renderEntries();
  toast('Added to references');
}

// ─── ENTRIES LIST ───

function renderEntries() {
  const container = document.getElementById('bl-entries');
  if (!container) return;

  let items = [...state.bibliography];
  const typeF = document.getElementById('bl-filter-type')?.value || '';
  const projF = document.getElementById('bl-filter-project')?.value || '';

  if (typeF) items = items.filter(b => b.type === typeF);
  if (projF === '_standalone') items = items.filter(b => !b.projectId);
  else if (projF) items = items.filter(b => b.projectId === projF);

  const count = document.querySelector('.bib-list-count');
  if (count) count.textContent = `${items.length} references`;

  if (items.length === 0) {
    container.innerHTML = '<p class="bib-empty">No references yet</p>';
    return;
  }

  container.innerHTML = items.map(b => {
    const proj = b.projectId ? state.pages.find(p => p.id === b.projectId) : null;
    return `
      <div class="bib-entry">
        <div class="bib-entry-text">${formatFull(b, activeStyle)}</div>
        <div class="bib-entry-meta">
          <span class="bib-entry-type">${b.type}</span>
          ${proj ? `<span class="bib-entry-proj">📂 ${esc(proj.title || 'Untitled')}</span>` : ''}
          <button class="btn btn-sm be-copy" data-id="${b.id}">Copy</button>
          <button class="btn btn-sm be-intext" data-id="${b.id}">In-text</button>
          <button class="btn btn-sm btn-danger be-del" data-id="${b.id}">×</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.be-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = state.bibliography.find(x => x.id === btn.getAttribute('data-id'));
      if (b) copyText(stripHtml(formatFull(b, activeStyle)));
    });
  });

  container.querySelectorAll('.be-intext').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = state.bibliography.find(x => x.id === btn.getAttribute('data-id'));
      if (b) copyText(formatInText(b, activeStyle));
    });
  });

  container.querySelectorAll('.be-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.bibliography = state.bibliography.filter(x => x.id !== btn.getAttribute('data-id'));
      saveState(); markDirty(); renderEntries();
    });
  });
}

function copyAllEntries() {
  let items = [...state.bibliography];
  const typeF = document.getElementById('bl-filter-type')?.value || '';
  const projF = document.getElementById('bl-filter-project')?.value || '';
  if (typeF) items = items.filter(b => b.type === typeF);
  if (projF === '_standalone') items = items.filter(b => !b.projectId);
  else if (projF) items = items.filter(b => b.projectId === projF);

  const text = items.map(b => stripHtml(formatFull(b, activeStyle))).join('\n\n');
  copyText(text);
}

function exportTxt() {
  const text = state.bibliography.map(b => stripHtml(formatFull(b, activeStyle))).join('\n\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'bibliography.txt'; a.click();
  URL.revokeObjectURL(url);
}

// ─── FORMATTING ───

function formatInText(b, style) {
  const authors = b.authors || 'Unknown';
  const year = b.year || 'n.d.';
  const last = authors.split(',')[0].trim().split(' ').pop();
  if (style === 'apa') return `(${last}, ${year})`;
  return `(${last}${b.pages ? ' ' + b.pages.split('-')[0] : ''})`;
}

function formatFull(b, style) {
  if (style === 'apa') return fmtAPA(b);
  return fmtMLA(b);
}

function fmtMLA(b) {
  const { authors, title, year, publisher, journal, volume, issue, pages, url, doi, accessDate, type, channel, host, episode, username, director, performers } = fill(b);
  switch (type) {
    case 'Book': return `${authors}. <i>${title}</i>. ${publisher}${publisher && year ? ', ' : ''}${year}.`;
    case 'Journal': { let c = `${authors}. "${title}." <i>${journal}</i>`; if (volume) c += `, vol. ${volume}`; if (issue) c += `, no. ${issue}`; c += `, ${year}`; if (pages) c += `, pp. ${pages}`; c += '.'; if (doi) c += ` ${doi}.`; else if (url) c += ` ${url}.`; return c; }
    case 'Website': return `${authors ? authors + '. ' : ''}"${title}." <i>${publisher || 'Website'}</i>, ${accessDate || year}${url ? ', ' + url : ''}.`;
    case 'News': return `${authors}. "${title}." <i>${publisher}</i>, ${accessDate || year}${url ? ', ' + url : ''}.`;
    case 'Video': return `"${title}." <i>YouTube</i>, uploaded by ${channel || 'Unknown'}, ${accessDate || year}${url ? ', ' + url : ''}.`;
    case 'Image': return `${authors}. <i>${title}</i>. ${year}${publisher ? ', ' + publisher : ''}${url ? ', ' + url : ''}.`;
    case 'Report': return `${authors || publisher}. <i>${title}</i>. ${year}${url ? ', ' + url : ''}.`;
    case 'Conference': return `${authors}. "${title}." <i>${journal || publisher}</i>, ${accessDate || year}${url ? ', ' + url : ''}.`;
    case 'Podcast': { let c = `"${title}." <i>${journal || publisher}</i>`; if (host) c += `, hosted by ${host}`; if (episode) c += `, Episode ${episode}`; c += `, ${year}`; if (url) c += `, ${url}`; return c + '.'; }
    case 'Social Media': return `${authors}${username ? ' [@' + username + ']' : ''}. "${title}." <i>${publisher || 'Twitter'}</i>, ${accessDate || year}${url ? ', ' + url : ''}.`;
    case 'Interview': return `${authors}. Interview by ${host || 'Unknown'}. <i>${publisher || 'Publication'}</i>, ${accessDate || year}.`;
    case 'Film': return `<i>${title}</i>. Directed by ${director || 'Unknown'}${performers ? ', performances by ' + performers : ''}, ${publisher || 'Studio'}, ${year}.`;
    default: return `${authors}. "${title}." ${publisher}${publisher && year ? ', ' : ''}${year}.`;
  }
}

function fmtAPA(b) {
  const { authors, title, year, publisher, journal, volume, issue, pages, url, doi, type, channel, host, episode, username, director, performers } = fill(b);
  switch (type) {
    case 'Book': return `${authors} (${year}). <i>${title}</i>. ${publisher}.${doi ? ' https://doi.org/' + doi : url ? ' ' + url : ''}`;
    case 'Journal': { let c = `${authors} (${year}). ${title}. <i>${journal}`; if (volume) c += `, ${volume}`; c += '</i>'; if (issue) c += `(${issue})`; if (pages) c += `, ${pages}`; c += '.'; if (doi) c += ` https://doi.org/${doi}`; else if (url) c += ` ${url}`; return c; }
    case 'Website': return `${authors ? authors + ' ' : ''}(${year}). ${title}. <i>${publisher || 'Website'}</i>. ${url || ''}`;
    case 'News': return `${authors} (${year}). ${title}. <i>${publisher}</i>. ${url || ''}`;
    case 'Video': return `${channel || 'Unknown'} (${year}). <i>${title}</i> [Video]. YouTube. ${url || ''}`;
    case 'Image': return `${authors} (${year}). <i>${title}</i> [Photograph]. ${publisher || ''}. ${url || ''}`;
    case 'Report': return `${authors || publisher} (${year}). <i>${title}</i>. ${url || ''}`;
    case 'Conference': return `${authors} (${year}). ${title}. In <i>${journal || 'Proceedings'}</i>. ${doi ? 'https://doi.org/' + doi : url || ''}`;
    case 'Podcast': return `${host || authors} (Host). (${year}). ${title} (No. ${episode || '?'}) [Podcast]. <i>${journal || publisher}</i>. ${url || ''}`;
    case 'Social Media': return `${authors}${username ? ' [@' + username + ']' : ''} (${year}). ${title} [Post]. ${publisher || 'Twitter'}. ${url || ''}`;
    case 'Interview': return `(${authors}, personal communication, ${year})`;
    case 'Film': return `${director || authors} (Director). (${year}). <i>${title}</i> [Film]. ${publisher || 'Studio'}.`;
    default: return `${authors} (${year}). ${title}. ${publisher}.`;
  }
}

function fill(b) {
  return {
    authors: b.authors || '', title: b.title || 'Untitled', year: b.year || 'n.d.',
    publisher: b.publisher || '', journal: b.journal || '', volume: b.volume || '',
    issue: b.issue || '', pages: b.pages || '', url: b.url || '', doi: b.doi || '',
    accessDate: b.accessDate || '', type: b.type || 'Other', channel: b.channel || '',
    host: b.host || '', episode: b.episode || '', username: b.username || '',
    director: b.director || '', performers: b.performers || ''
  };
}

// ─── HELPERS ───

function stripHtml(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; }
function copyText(text) { navigator.clipboard.writeText(text).then(() => toast('Copied')); }
function toast(msg) { const t = document.querySelector('.app-toast'); if (t) t.remove(); const el = document.createElement('div'); el.className = 'app-toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2500); }
function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
