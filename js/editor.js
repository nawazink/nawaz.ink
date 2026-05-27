import { state, saveState, markDirty } from './state.js';

let currentPageObj = null;
let autosaveTimer = null;
let pulseInterval = null;
let undoStack = [];
let redoStack = [];
let focusMode = false;
let typewriterMode = false;
let outlineOpen = false;

const SLASH_COMMANDS = [
  { label: 'Heading 1', icon: 'H1', cmd: 'h1' },
  { label: 'Heading 2', icon: 'H2', cmd: 'h2' },
  { label: 'Heading 3', icon: 'H3', cmd: 'h3' },
  { label: 'Heading 4', icon: 'H4', cmd: 'h4' },
  { label: 'Quote', icon: '❝', cmd: 'blockquote' },
  { label: 'Code block', icon: '⟨⟩', cmd: 'code' },
  { label: 'Callout', icon: '💡', cmd: 'callout' },
  { label: 'To-do', icon: '☐', cmd: 'todo' },
  { label: 'Table', icon: '▦', cmd: 'table' },
  { label: 'Divider', icon: '—', cmd: 'hr' },
  { label: 'Highlight', icon: '🖍️', cmd: 'highlight' },
  { label: 'Footnote', icon: '¹', cmd: 'footnote' },
  { label: 'Comment', icon: '💬', cmd: 'comment' },
  { label: 'Page break', icon: '📄', cmd: 'pagebreak' },
  { label: 'Citation', icon: '📚', cmd: 'cite' }
];

let slashMenuOpen = false;
let slashSelectedIndex = 0;
let slashFilter = '';

export function initEditor(containerId, pageObj) {
  currentPageObj = pageObj;
  const container = document.getElementById(containerId);
  if (!container) return;

  undoStack = [];
  redoStack = [];

  container.innerHTML = `
    <div class="editor-wrap ${focusMode ? 'focus-mode' : ''} ${typewriterMode ? 'typewriter-mode' : ''}">
      <div class="editor-top-bar">
        <input class="page-title-input" id="editor-title" placeholder="Untitled" value="${escapeHtml(pageObj.title || '')}"/>
        <div class="editor-meta-row">
          <span class="editor-meta" id="editor-word-count">0 words</span>
          <span class="editor-meta" id="editor-char-count">0 chars</span>
          <span class="editor-meta" id="editor-read-time">0 min read</span>
          <span class="editor-meta" id="editor-autosave-status">Saved</span>
        </div>
      </div>

      <div class="editor-toolbar" id="editor-toolbar">
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
          <button class="toolbar-btn" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
          <button class="toolbar-btn" data-cmd="underline" title="Underline (Ctrl+U)"><u>U</u></button>
          <button class="toolbar-btn" data-cmd="strikethrough" title="Strikethrough"><s>S</s></button>
          <button class="toolbar-btn" data-cmd="highlight" title="Highlight">🖍️</button>
        </div>
        <span class="toolbar-sep"></span>
        <div class="toolbar-group">
          <select class="toolbar-select" id="tb-heading" title="Headings">
            <option value="">¶</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="h4">H4</option>
            <option value="h5">H5</option>
            <option value="h6">H6</option>
          </select>
        </div>
        <span class="toolbar-sep"></span>
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="ul" title="Bullet list">•</button>
          <button class="toolbar-btn" data-cmd="ol" title="Numbered list">1.</button>
          <button class="toolbar-btn" data-cmd="todo" title="Checklist">☐</button>
        </div>
        <span class="toolbar-sep"></span>
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="blockquote" title="Quote">❝</button>
          <button class="toolbar-btn" data-cmd="code" title="Code block">⟨⟩</button>
          <button class="toolbar-btn" data-cmd="callout" title="Callout">💡</button>
          <button class="toolbar-btn" data-cmd="table" title="Table">▦</button>
          <button class="toolbar-btn" data-cmd="hr" title="Divider">—</button>
        </div>
        <span class="toolbar-sep"></span>
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="alignLeft" title="Align left">⫷</button>
          <button class="toolbar-btn" data-cmd="alignCenter" title="Center">⫸</button>
          <button class="toolbar-btn" data-cmd="alignRight" title="Align right">⫸</button>
          <button class="toolbar-btn" data-cmd="alignJustify" title="Justify">☰</button>
        </div>
        <span class="toolbar-sep"></span>
        <div class="toolbar-group">
          <button class="toolbar-btn" data-cmd="link" title="Insert link">🔗</button>
          <button class="toolbar-btn" data-cmd="footnote" title="Footnote">¹</button>
          <button class="toolbar-btn" data-cmd="cite" title="Insert citation">📚</button>
        </div>
        <span class="toolbar-sep"></span>
        <div class="toolbar-group toolbar-right">
          <button class="toolbar-btn" id="tb-undo" title="Undo (Ctrl+Z)">↩</button>
          <button class="toolbar-btn" id="tb-redo" title="Redo (Ctrl+Y)">↪</button>
          <button class="toolbar-btn ${outlineOpen ? 'active' : ''}" id="tb-outline" title="Outline panel">☰</button>
          <button class="toolbar-btn ${focusMode ? 'active' : ''}" id="tb-focus" title="Focus mode">◎</button>
          <button class="toolbar-btn ${typewriterMode ? 'active' : ''}" id="tb-typewriter" title="Typewriter mode">⌨</button>
          <button class="toolbar-btn" id="tb-snapshot" title="Save snapshot">📸</button>
          <button class="toolbar-btn" id="tb-print" title="Print">🖨️</button>
          <button class="toolbar-btn" id="tb-export" title="Export">↓</button>
        </div>
      </div>

      <div class="editor-body-wrap">
        <div class="editor-outline-panel ${outlineOpen ? 'open' : ''}" id="editor-outline">
          <div class="outline-header">Outline</div>
          <div id="outline-list"></div>
        </div>
        <div class="editor-main-area">
          <div class="editor-area" id="editor-area" contenteditable="true" spellcheck="true">${pageObj.content || '<p><br></p>'}</div>
        </div>
      </div>

      <div class="editor-footer">
        <div class="editor-footer-left">
          <span class="editor-meta" id="editor-cursor-pos">Ln 1, Col 1</span>
        </div>
        <div class="editor-footer-right">
          <button class="editor-footer-btn" id="ef-snapshots" title="View snapshots">Snapshots (${(pageObj.snapshots || []).length})</button>
        </div>
      </div>
    </div>
  `;

  const editorArea = document.getElementById('editor-area');
  const titleInput = document.getElementById('editor-title');

  // Toolbar buttons
  container.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      execToolbarCommand(btn.getAttribute('data-cmd'));
      editorArea.focus();
    });
  });

  // Heading select
  document.getElementById('tb-heading')?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) { document.execCommand('formatBlock', false, val); }
    else { document.execCommand('formatBlock', false, 'p'); }
    e.target.value = '';
    editorArea.focus();
  });

  // Undo/redo buttons
  document.getElementById('tb-undo')?.addEventListener('click', () => undo());
  document.getElementById('tb-redo')?.addEventListener('click', () => redo());

  // Outline toggle
  document.getElementById('tb-outline')?.addEventListener('click', () => {
    outlineOpen = !outlineOpen;
    document.getElementById('editor-outline')?.classList.toggle('open', outlineOpen);
    document.getElementById('tb-outline')?.classList.toggle('active', outlineOpen);
    updateOutline();
  });

  // Focus mode
  document.getElementById('tb-focus')?.addEventListener('click', () => {
    focusMode = !focusMode;
    container.querySelector('.editor-wrap')?.classList.toggle('focus-mode', focusMode);
    document.getElementById('tb-focus')?.classList.toggle('active', focusMode);
  });

  // Typewriter mode
  document.getElementById('tb-typewriter')?.addEventListener('click', () => {
    typewriterMode = !typewriterMode;
    container.querySelector('.editor-wrap')?.classList.toggle('typewriter-mode', typewriterMode);
    document.getElementById('tb-typewriter')?.classList.toggle('active', typewriterMode);
  });

  // Snapshot
  document.getElementById('tb-snapshot')?.addEventListener('click', () => saveSnapshot());
  document.getElementById('ef-snapshots')?.addEventListener('click', () => showSnapshots());

  // Print
  document.getElementById('tb-print')?.addEventListener('click', () => printDocument());

  // Export
  document.getElementById('tb-export')?.addEventListener('click', () => showExportMenu());

  // Input events
  editorArea.addEventListener('input', () => {
    pushUndo();
    updateStats();
    updateOutline();
    debounceSave();
    if (typewriterMode) scrollToCursor();
  });

  titleInput.addEventListener('input', () => {
    if (currentPageObj) currentPageObj.title = titleInput.value;
    debounceSave();
  });

  // Keyboard shortcuts
  editorArea.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
      if (e.key === 'z') { e.preventDefault(); undo(); }
      if (e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 's') { e.preventDefault(); saveCurrentPage(); showAutosaveStatus('Saved ✓'); }
    }

    if (slashMenuOpen) { handleSlashKeydown(e); return; }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setTimeout(() => openSlashMenu(), 10);
    }

    // Tab for indent
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) document.execCommand('outdent');
      else document.execCommand('indent');
    }
  });

  editorArea.addEventListener('keyup', (e) => {
    updateCursorPos();
    if (slashMenuOpen && !['ArrowUp','ArrowDown','Enter','Escape'].includes(e.key)) {
      updateSlashFilter();
    }
  });

  editorArea.addEventListener('click', () => updateCursorPos());

  // Writing pulse
  editorArea.addEventListener('focus', startWritingPulse);
  editorArea.addEventListener('blur', stopWritingPulse);

  // Initial
  pushUndo();
  updateStats();
  updateOutline();

  // Session recovery
  const recovered = sessionStorage.getItem(`editor_recovery_${pageObj.id}`);
  if (recovered && recovered !== pageObj.content) {
    const useRecovered = confirm('A recovered session was found. Restore it?');
    if (useRecovered) {
      editorArea.innerHTML = recovered;
      debounceSave();
    }
  }

  // Periodic session save
  setInterval(() => {
    if (editorArea) {
      sessionStorage.setItem(`editor_recovery_${pageObj.id}`, editorArea.innerHTML);
    }
  }, 10000);
}

// --- COMMANDS ---

function execToolbarCommand(cmd) {
  switch (cmd) {
    case 'bold': document.execCommand('bold'); break;
    case 'italic': document.execCommand('italic'); break;
    case 'underline': document.execCommand('underline'); break;
    case 'strikethrough': document.execCommand('strikeThrough'); break;
    case 'highlight': wrapSelection('<mark>', '</mark>'); break;
    case 'h1': document.execCommand('formatBlock', false, 'h1'); break;
    case 'h2': document.execCommand('formatBlock', false, 'h2'); break;
    case 'h3': document.execCommand('formatBlock', false, 'h3'); break;
    case 'h4': document.execCommand('formatBlock', false, 'h4'); break;
    case 'blockquote': document.execCommand('formatBlock', false, 'blockquote'); break;
    case 'code': insertCodeBlock(); break;
    case 'hr': document.execCommand('insertHTML', false, '<hr><p><br></p>'); break;
    case 'ol': document.execCommand('insertOrderedList'); break;
    case 'ul': document.execCommand('insertUnorderedList'); break;
    case 'table': insertTable(); break;
    case 'callout': insertCallout(); break;
    case 'todo': insertTodo(); break;
    case 'link': insertLink(); break;
    case 'footnote': insertFootnote(); break;
    case 'comment': insertComment(); break;
    case 'cite': openCitationPicker(); break;
    case 'alignLeft': document.execCommand('justifyLeft'); break;
    case 'alignCenter': document.execCommand('justifyCenter'); break;
    case 'alignRight': document.execCommand('justifyRight'); break;
    case 'alignJustify': document.execCommand('justifyFull'); break;
    case 'pagebreak': document.execCommand('insertHTML', false, '<div class="page-break"></div><p><br></p>'); break;
  }
}

function wrapSelection(openTag, closeTag) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const html = `${openTag}${sel.toString()}${closeTag}`;
  document.execCommand('insertHTML', false, html);
}

function insertCodeBlock() {
  document.execCommand('insertHTML', false, '<pre><code>code</code></pre><p><br></p>');
}

function insertTable() {
  document.execCommand('insertHTML', false, `<table><thead><tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>`);
}

function insertCallout() {
  document.execCommand('insertHTML', false, `<div class="callout"><span class="callout-icon">💡</span><div class="callout-content">Note: </div></div><p><br></p>`);
}

function insertTodo() {
  document.execCommand('insertHTML', false, `<div class="todo-item"><input type="checkbox"/><span class="todo-text">Task</span></div>`);
}

function insertLink() {
  const url = prompt('Enter URL:');
  if (url) document.execCommand('createLink', false, url);
}

function insertFootnote() {
  const num = (document.querySelectorAll('.footnote-ref').length || 0) + 1;
  document.execCommand('insertHTML', false, `<sup class="footnote-ref" data-fn="${num}">[${num}]</sup>`);
}

function insertComment() {
  const text = prompt('Comment:');
  if (text) {
    document.execCommand('insertHTML', false, `<span class="editor-comment" data-comment="${escapeHtml(text)}" title="${escapeHtml(text)}">💬</span>`);
  }
}

function openCitationPicker() {
  if (state.bibliography.length === 0) {
    alert('No sources in your bibliography. Add references first.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px;max-height:70vh;">
      <div class="modal-header"><span class="modal-title">Insert Citation</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <input class="modal-input" id="cite-search" placeholder="Search sources..." style="margin-bottom:10px;"/>
        <div class="cite-format-row" style="margin-bottom:10px;display:flex;gap:6px;">
          <button class="btn btn-sm cite-fmt ${(state.settings.citationFormat || 'mla') === 'mla' ? 'active' : ''}" data-fmt="mla">MLA</button>
          <button class="btn btn-sm cite-fmt ${(state.settings.citationFormat || 'mla') === 'apa' ? 'active' : ''}" data-fmt="apa">APA</button>
        </div>
        <div id="cite-list" style="max-height:300px;overflow-y:auto;"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  let citeFmt = state.settings.citationFormat || 'mla';

  overlay.querySelectorAll('.cite-fmt').forEach(btn => {
    btn.addEventListener('click', () => {
      citeFmt = btn.getAttribute('data-fmt');
      overlay.querySelectorAll('.cite-fmt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCiteList();
    });
  });

  const searchInput = overlay.querySelector('#cite-search');
  searchInput?.addEventListener('input', () => renderCiteList());
  searchInput?.focus();

  function renderCiteList() {
    const q = (searchInput?.value || '').toLowerCase();
    const items = state.bibliography.filter(b => {
      const text = `${b.authors} ${b.title} ${b.year}`.toLowerCase();
      return text.includes(q);
    });

    const list = overlay.querySelector('#cite-list');
    if (!list) return;

    list.innerHTML = items.map(b => {
      const inText = formatInTextCitation(b, citeFmt);
      return `
        <div class="cite-picker-item" data-id="${b.id}" style="padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;">
          <div style="font-size:12px;color:var(--text);">${escapeHtml(b.authors || 'Unknown')} — <em>${escapeHtml(b.title)}</em> (${b.year || 'n.d.'})</div>
          <div style="font-size:11px;color:var(--accent);margin-top:2px;">→ ${escapeHtml(inText)}</div>
        </div>
      `;
    }).join('') || '<p style="color:var(--text3);font-size:12px;padding:10px;">No matching sources</p>';

    list.querySelectorAll('.cite-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const b = state.bibliography.find(x => x.id === item.getAttribute('data-id'));
        if (b) {
          const citation = formatInTextCitation(b, citeFmt);
          document.getElementById('editor-area')?.focus();
          setTimeout(() => {
            document.execCommand('insertHTML', false, `<span class="citation-ref" data-bib-id="${b.id}">${escapeHtml(citation)}</span>`);
            overlay.remove();
          }, 50);
        }
      });
      item.addEventListener('mouseenter', () => { item.style.background = 'var(--bg4)'; });
      item.addEventListener('mouseleave', () => { item.style.background = ''; });
    });
  }

  renderCiteList();
}

function formatInTextCitation(b, style) {
  const authors = b.authors || 'Unknown';
  const year = b.year || 'n.d.';
  const lastName = authors.split(',')[0].trim().split(' ').pop();

  if (style === 'apa') {
    return `(${lastName}, ${year})`;
  }
  // MLA
  return `(${lastName}${b.pages ? ' ' + b.pages.split('-')[0] : ''})`;
}

// --- UNDO/REDO ---

function pushUndo() {
  const area = document.getElementById('editor-area');
  if (!area) return;
  const html = area.innerHTML;
  if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== html) {
    undoStack.push(html);
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
  }
}

function undo() {
  const area = document.getElementById('editor-area');
  if (!area || undoStack.length <= 1) return;
  redoStack.push(undoStack.pop());
  area.innerHTML = undoStack[undoStack.length - 1];
  updateStats();
}

function redo() {
  const area = document.getElementById('editor-area');
  if (!area || redoStack.length === 0) return;
  const html = redoStack.pop();
  undoStack.push(html);
  area.innerHTML = html;
  updateStats();
}

// --- STATS ---

function updateStats() {
  const area = document.getElementById('editor-area');
  if (!area) return;
  const text = area.innerText || '';
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const chars = text.length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  const wc = document.getElementById('editor-word-count');
  const cc = document.getElementById('editor-char-count');
  const rt = document.getElementById('editor-read-time');
  if (wc) wc.textContent = `${words} words`;
  if (cc) cc.textContent = `${chars} chars`;
  if (rt) rt.textContent = `${readTime} min read`;
}

function updateCursorPos() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const area = document.getElementById('editor-area');
  if (!area) return;

  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(area);
  preRange.setEnd(range.startContainer, range.startOffset);
  const text = preRange.toString();
  const lines = text.split('\n');
  const ln = lines.length;
  const col = (lines[lines.length - 1] || '').length + 1;

  const el = document.getElementById('editor-cursor-pos');
  if (el) el.textContent = `Ln ${ln}, Col ${col}`;
}

// --- OUTLINE ---

function updateOutline() {
  const list = document.getElementById('outline-list');
  const area = document.getElementById('editor-area');
  if (!list || !area) return;

  const headings = area.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length === 0) {
    list.innerHTML = '<p class="outline-empty">No headings yet</p>';
    return;
  }

  list.innerHTML = Array.from(headings).map((h, i) => {
    const level = parseInt(h.tagName[1]);
    const indent = (level - 1) * 12;
    return `<div class="outline-item" data-idx="${i}" style="padding-left:${indent}px;">${escapeHtml(h.textContent)}</div>`;
  }).join('');

  list.querySelectorAll('.outline-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-idx'));
      const headings = area.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings[idx]) headings[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

// --- TYPEWRITER ---

function scrollToCursor() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const area = document.getElementById('editor-area');
  if (!area) return;
  const areaRect = area.getBoundingClientRect();
  const center = areaRect.height / 2;
  const offset = rect.top - areaRect.top - center;
  area.scrollTop += offset;
}

// --- SLASH MENU ---

function openSlashMenu() {
  const menu = document.getElementById('slash-menu');
  if (!menu) return;
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const content = document.getElementById('content');
  const contentRect = content ? content.getBoundingClientRect() : { top: 0, left: 0 };

  menu.style.position = 'fixed';
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = rect.left + 'px';
  menu.style.display = 'block';

  slashMenuOpen = true;
  slashSelectedIndex = 0;
  slashFilter = '';
  renderSlashMenu();
}

function closeSlashMenu() {
  const menu = document.getElementById('slash-menu');
  if (menu) menu.style.display = 'none';
  slashMenuOpen = false;
  slashFilter = '';
}

function renderSlashMenu() {
  const menu = document.getElementById('slash-menu');
  if (!menu) return;
  const filtered = SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashFilter.toLowerCase()));
  if (filtered.length === 0) { closeSlashMenu(); return; }
  if (slashSelectedIndex >= filtered.length) slashSelectedIndex = 0;

  menu.innerHTML = filtered.map((item, i) => `
    <div class="slash-item ${i === slashSelectedIndex ? 'selected' : ''}" data-cmd="${item.cmd}">
      <div class="slash-item-icon">${item.icon}</div>
      <span>${item.label}</span>
    </div>
  `).join('');

  menu.querySelectorAll('.slash-item').forEach(el => {
    el.addEventListener('click', () => executeSlashCommand(el.getAttribute('data-cmd')));
  });
}

function updateSlashFilter() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== 3) { closeSlashMenu(); return; }
  const text = node.textContent;
  const offset = sel.anchorOffset;
  const slashIdx = text.lastIndexOf('/', offset);
  if (slashIdx === -1) { closeSlashMenu(); return; }
  slashFilter = text.slice(slashIdx + 1, offset);
  renderSlashMenu();
}

function handleSlashKeydown(e) {
  const filtered = SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashFilter.toLowerCase()));
  if (e.key === 'ArrowDown') { e.preventDefault(); slashSelectedIndex = (slashSelectedIndex + 1) % filtered.length; renderSlashMenu(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); slashSelectedIndex = (slashSelectedIndex - 1 + filtered.length) % filtered.length; renderSlashMenu(); }
  else if (e.key === 'Enter') { e.preventDefault(); if (filtered[slashSelectedIndex]) executeSlashCommand(filtered[slashSelectedIndex].cmd); }
  else if (e.key === 'Escape') { e.preventDefault(); closeSlashMenu(); }
}

function executeSlashCommand(cmd) {
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const node = sel.anchorNode;
    if (node && node.nodeType === 3) {
      const text = node.textContent;
      const offset = sel.anchorOffset;
      const slashIdx = text.lastIndexOf('/', offset);
      if (slashIdx !== -1) {
        node.textContent = text.slice(0, slashIdx) + text.slice(offset);
        const range = document.createRange();
        range.setStart(node, slashIdx);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }
  execToolbarCommand(cmd);
  closeSlashMenu();
}

// --- SNAPSHOTS ---

function saveSnapshot() {
  if (!currentPageObj) return;
  if (!currentPageObj.snapshots) currentPageObj.snapshots = [];
  currentPageObj.snapshots.push({
    id: crypto.randomUUID(),
    content: getEditorContent(),
    title: currentPageObj.title,
    wordCount: getWordCount(),
    date: Date.now()
  });
  if (currentPageObj.snapshots.length > 20) currentPageObj.snapshots.shift();
  saveState(); markDirty();
  showAutosaveStatus('Snapshot saved');
  const btn = document.getElementById('ef-snapshots');
  if (btn) btn.textContent = `Snapshots (${currentPageObj.snapshots.length})`;
}

function showSnapshots() {
  if (!currentPageObj || !currentPageObj.snapshots || currentPageObj.snapshots.length === 0) {
    alert('No snapshots saved yet. Click 📸 to save one.');
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:500px;max-height:80vh;overflow-y:auto;">
      <div class="modal-header"><span class="modal-title">Snapshots</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        ${currentPageObj.snapshots.slice().reverse().map(s => `
          <div class="snapshot-item" data-id="${s.id}">
            <div><strong>${new Date(s.date).toLocaleString()}</strong></div>
            <div style="font-size:11px;color:var(--text3);">${s.wordCount} words · ${s.title || 'Untitled'}</div>
            <button class="btn btn-sm snapshot-restore" data-id="${s.id}" style="margin-top:4px;">Restore</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelectorAll('.snapshot-restore').forEach(btn => {
    btn.addEventListener('click', () => {
      const snap = currentPageObj.snapshots.find(s => s.id === btn.getAttribute('data-id'));
      if (snap && confirm('Restore this snapshot? Current content will be replaced.')) {
        setEditorContent(snap.content);
        debounceSave();
        overlay.remove();
      }
    });
  });
}

// --- EXPORT ---

function printDocument() {
  const title = currentPageObj?.title || 'Untitled';
  const content = getEditorContent();
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>
    body { font-family: 'IBM Plex Mono', monospace; font-size: 12pt; line-height: 1.8; color: #000; max-width: 700px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 22pt; margin: 24px 0 12px; } h2 { font-size: 18pt; margin: 20px 0 10px; } h3 { font-size: 14pt; margin: 16px 0 8px; }
    blockquote { border-left: 3px solid #333; padding-left: 14px; color: #444; font-style: italic; }
    code { background: #eee; padding: 2px 4px; font-size: 10pt; } pre { background: #f4f4f4; padding: 14px; font-size: 10pt; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ccc; padding: 6px 10px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
    @page { margin: 2cm; }
  </style></head><body><h1>${title}</h1>${content}</body></html>`);
  win.document.close();
  win.print();
}

function showExportMenu() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:360px;">
      <div class="modal-header"><span class="modal-title">Export</span><button class="modal-close">&times;</button></div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn" id="exp-html">HTML</button>
        <button class="btn" id="exp-md">Markdown</button>
        <button class="btn" id="exp-txt">Plain text</button>
        <button class="btn" id="exp-json">JSON</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#exp-html')?.addEventListener('click', () => { exportAs('html'); overlay.remove(); });
  overlay.querySelector('#exp-md')?.addEventListener('click', () => { exportAs('md'); overlay.remove(); });
  overlay.querySelector('#exp-txt')?.addEventListener('click', () => { exportAs('txt'); overlay.remove(); });
  overlay.querySelector('#exp-json')?.addEventListener('click', () => { exportAs('json'); overlay.remove(); });
}

function exportAs(format) {
  const title = currentPageObj?.title || 'Untitled';
  const html = getEditorContent();
  let content, ext, mime;

  switch (format) {
    case 'html':
      content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head><body>${html}</body></html>`;
      ext = 'html'; mime = 'text/html';
      break;
    case 'md':
      content = htmlToMarkdown(html);
      ext = 'md'; mime = 'text/markdown';
      break;
    case 'txt':
      const div = document.createElement('div');
      div.innerHTML = html;
      content = div.textContent;
      ext = 'txt'; mime = 'text/plain';
      break;
    case 'json':
      content = JSON.stringify({ title, content: html, wordCount: getWordCount(), exported: new Date().toISOString() }, null, 2);
      ext = 'json'; mime = 'application/json';
      break;
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title}.${ext}`; a.click();
  URL.revokeObjectURL(url);
}

function htmlToMarkdown(html) {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');
  md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<hr[^>]*>/gi, '---\n\n');
  md = md.replace(/<br[^>]*>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

// --- AUTOSAVE ---

function debounceSave() {
  showAutosaveStatus('Saving...');
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveCurrentPage();
    markDirty();
    showAutosaveStatus('Saved ✓');
  }, 1200);
}

function showAutosaveStatus(text) {
  const el = document.getElementById('editor-autosave-status');
  if (el) el.textContent = text;
}

export function saveCurrentPage() {
  if (!currentPageObj) return;
  const page = state.pages.find(p => p.id === currentPageObj.id);
  if (!page) return;
  page.content = getEditorContent();
  page.wordCount = getWordCount();
  page.updatedAt = Date.now();
  page.title = currentPageObj.title;
  page.snapshots = currentPageObj.snapshots;
  saveState();
  // Update sidebar page tree
  import('./sidebar.js').then(m => m.buildPageTree());
}

// --- WRITING PULSE ---

function startWritingPulse() {
  stopWritingPulse();
  pulseInterval = setInterval(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!state.writing.dailySeconds[today]) state.writing.dailySeconds[today] = 0;
    state.writing.dailySeconds[today] += 5;
    state.writing.lastPulseAt = Date.now();
  }, 5000);
}

function stopWritingPulse() {
  if (pulseInterval) { clearInterval(pulseInterval); pulseInterval = null; }
}

// --- PUBLIC API ---

export function getEditorContent() {
  const area = document.getElementById('editor-area');
  return area ? area.innerHTML : '';
}

export function setEditorContent(html) {
  const area = document.getElementById('editor-area');
  if (area) area.innerHTML = html;
  updateStats();
  updateOutline();
}

export function getWordCount() {
  const area = document.getElementById('editor-area');
  if (!area) return 0;
  const text = area.innerText || '';
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
