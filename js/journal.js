import { state, saveState, markDirty } from './state.js';
import { initEditor } from './editor.js';

let activeEntryId = null;

function getTodayStr() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getJournalEntries() {
  return state.pages
    .filter(p => p.type === 'journal')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function getOrCreateTodayEntry() {
  const todayKey = getTodayKey();
  let entry = state.pages.find(p => p.type === 'journal' && p.dateKey === todayKey);
  if (!entry) {
    entry = {
      id: crypto.randomUUID(),
      title: getTodayStr(),
      content: '<p><br></p>',
      type: 'journal',
      dateKey: todayKey,
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    state.pages.push(entry);
    saveState();
    markDirty();
  }
  return entry;
}

function getPreview(content) {
  const div = document.createElement('div');
  div.innerHTML = content || '';
  const text = div.textContent || '';
  return text.slice(0, 60) || 'Empty entry';
}

export function renderJournal() {
  const container = document.getElementById('view-journal');
  if (!container) return;

  const todayEntry = getOrCreateTodayEntry();
  const entries = getJournalEntries();
  activeEntryId = todayEntry.id;

  container.innerHTML = `
    <div class="journal-wrap">
      <div class="journal-sidebar">
        <div class="journal-sidebar-header">
          <span class="journal-sidebar-title">Journal</span>
          <button class="btn btn-sm" id="journal-new-entry">+ New</button>
        </div>
        <div id="journal-entries-list">
          ${entries.map(e => `
            <div class="journal-entry-item ${e.id === activeEntryId ? 'active' : ''}" data-id="${e.id}">
              <div class="journal-entry-date">${e.title}</div>
              <div class="journal-entry-preview">${getPreview(e.content)}</div>
              <button class="btn btn-sm btn-danger journal-del" data-id="${e.id}" style="margin-top:4px;font-size:9px;padding:1px 6px;">×</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="journal-editor-pane" id="journal-editor-pane"></div>
    </div>
  `;

  // Load today's entry in editor
  initEditor('journal-editor-pane', todayEntry);

  // Wire entry clicks
  const entryItems = container.querySelectorAll('.journal-entry-item');
  entryItems.forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      loadJournalEntry(id);
      // Update active state
      entryItems.forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Wire new entry button
  const newBtn = document.getElementById('journal-new-entry');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      const entry = {
        id: crypto.randomUUID(),
        title: getTodayStr(),
        content: '<p><br></p>',
        type: 'journal',
        dateKey: getTodayKey(),
        wordCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      state.pages.push(entry);
      saveState();
      markDirty();
      renderJournal();
    });
  }

  // Wire delete buttons
  container.querySelectorAll('.journal-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (!confirm('Delete this journal entry?')) return;
      state.pages = state.pages.filter(p => p.id !== id);
      saveState(); markDirty();
      renderJournal();
    });
  });
}

function loadJournalEntry(id) {
  const entry = state.pages.find(p => p.id === id);
  if (!entry) return;
  activeEntryId = id;
  initEditor('journal-editor-pane', entry);
}
