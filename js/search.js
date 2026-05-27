import { state } from './state.js';
import { navigateTo } from './router.js';

let searchOpen = false;
let selectedIdx = 0;
let results = [];
let debounceTimer = null;

export function openSearchOverlay() {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  searchOpen = true;
  selectedIdx = 0;
  results = [];
  const input = overlay.querySelector('#search-input');
  if (input) { input.value = ''; input.focus(); }
  renderResults([]);
}

export function closeSearchOverlay() {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  searchOpen = false;
}

export function initSearch() {
  const overlay = document.getElementById('search-overlay');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearchOverlay();
  });

  const input = overlay.querySelector('#search-input');
  if (input) {
    input.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => doSearch(input.value), 150);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, results.length - 1);
        highlightResult();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        highlightResult();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIdx]) openResult(results[selectedIdx]);
      } else if (e.key === 'Escape') {
        closeSearchOverlay();
      }
    });
  }
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.textContent || '';
}

function doSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) { results = []; renderResults([]); return; }

  const found = [];

  // Pages
  state.pages.forEach(p => {
    const titleMatch = (p.title || '').toLowerCase().includes(q);
    const contentMatch = stripHtml(p.content || '').toLowerCase().includes(q);
    if (titleMatch || contentMatch) {
      found.push({ id: p.id, title: p.title || 'Untitled', type: p.type || 'page', icon: p.type === 'journal' ? '📓' : '📄', preview: stripHtml(p.content || '').slice(0, 80), priority: titleMatch ? 1 : 2, view: p.type === 'journal' ? 'journal' : 'editor', pageId: p.id });
    }
  });

  // Characters
  state.characters.forEach(c => {
    const match = (c.name || '').toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q);
    if (match) found.push({ id: c.id, title: c.name, type: 'character', icon: c.emoji || '🧑', preview: c.role || '', priority: 1, view: 'characters' });
  });

  // Wiki
  state.wiki.forEach(w => {
    const titleMatch = (w.title || '').toLowerCase().includes(q);
    const bodyMatch = stripHtml(w.body || '').toLowerCase().includes(q);
    if (titleMatch || bodyMatch) found.push({ id: w.id, title: w.title, type: 'wiki', icon: w.emoji || '🧠', preview: stripHtml(w.body || '').slice(0, 80), priority: titleMatch ? 1 : 2, view: 'wiki' });
  });

  // Bibliography
  state.bibliography.forEach(b => {
    const match = `${b.authors} ${b.title}`.toLowerCase().includes(q);
    if (match) found.push({ id: b.id, title: b.title, type: 'reference', icon: '📚', preview: b.authors || '', priority: 1, view: 'bibliography' });
  });

  // Contacts
  state.contacts.forEach(c => {
    const match = `${c.firstName} ${c.lastName} ${c.email || ''}`.toLowerCase().includes(q);
    if (match) found.push({ id: c.id, title: `${c.firstName} ${c.lastName}`, type: 'contact', icon: '📇', preview: c.email || '', priority: 1, view: 'contacts' });
  });

  // Tasks
  state.tasks.forEach(t => {
    const match = (t.title || '').toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q);
    if (match) found.push({ id: t.id, title: t.title, type: 'task', icon: '✅', preview: t.status || '', priority: 1, view: 'db-tasks' });
  });

  found.sort((a, b) => a.priority - b.priority);
  results = found.slice(0, 12);
  selectedIdx = 0;
  renderResults(results);
}

function renderResults(items) {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text3);">Type to search across all content</div>';
    return;
  }

  container.innerHTML = items.map((item, i) => `
    <div class="search-result-item ${i === selectedIdx ? 'selected' : ''}" data-idx="${i}">
      <span class="search-result-icon">${item.icon}</span>
      <div class="search-result-body">
        <div class="search-result-title">${esc(item.title)}</div>
        <div class="search-result-preview">${esc(item.preview)}</div>
      </div>
      <span class="search-result-type tag">${item.type}</span>
    </div>
  `).join('');

  container.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.getAttribute('data-idx'));
      if (results[idx]) openResult(results[idx]);
    });
  });
}

function highlightResult() {
  const items = document.querySelectorAll('.search-result-item');
  items.forEach((el, i) => {
    el.classList.toggle('selected', i === selectedIdx);
  });
}

function openResult(item) {
  closeSearchOverlay();
  if (item.view === 'editor' && item.pageId) {
    state.currentPage = item.pageId;
  }
  navigateTo(item.view);
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
