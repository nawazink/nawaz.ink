import { state, saveState, markDirty } from './state.js';
import { initEditor, getEditorContent } from './editor.js';

const CATEGORIES = ['All', 'Concept', 'Person', 'Place', 'Term', 'Source', 'Note'];
let activeFilter = 'All';
let currentView = 'gallery';
let viewingArticleId = null;
let editingArticleId = null;

export function renderWiki() {
  const container = document.getElementById('view-wiki');
  if (!container) return;

  currentView = state.dbViews.wiki || 'gallery';

  if (editingArticleId !== null) {
    renderEditor(container);
    return;
  }

  if (viewingArticleId) {
    renderArticle(container);
    return;
  }

  container.innerHTML = `
    <div class="page-pad" style="max-width:960px;margin:0 auto;">
      <div class="db-header">
        <h2>Knowledge Base</h2>
        <div class="db-header-actions">
          <div class="view-toggle">
            <button class="btn btn-sm ${currentView === 'gallery' ? 'active' : ''}" data-v="gallery">Gallery</button>
            <button class="btn btn-sm ${currentView === 'table' ? 'active' : ''}" data-v="table">Table</button>
          </div>
          <button class="btn btn-primary btn-sm" id="wiki-new-btn">+ New article</button>
        </div>
      </div>
      <div class="db-filter-bar">
        ${CATEGORIES.map(c => `<button class="btn btn-sm ${c === activeFilter ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
        <input class="modal-input" id="wiki-search" placeholder="Search..." style="max-width:200px;font-size:12px;padding:5px 10px;margin-left:auto;"/>
      </div>
      <div id="wiki-container"></div>
    </div>
  `;

  renderList();

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.getAttribute('data-v');
      state.dbViews.wiki = currentView;
      renderWiki();
    });
  });

  container.querySelectorAll('.db-filter-bar .btn[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.getAttribute('data-cat');
      renderWiki();
    });
  });

  document.getElementById('wiki-new-btn')?.addEventListener('click', () => {
    editingArticleId = 'new';
    renderWiki();
  });

  document.getElementById('wiki-search')?.addEventListener('input', () => renderList());
}

function getFiltered() {
  const q = (document.getElementById('wiki-search')?.value || '').toLowerCase();
  let items = activeFilter === 'All' ? state.wiki : state.wiki.filter(w => w.category === activeFilter);
  if (q) {
    items = items.filter(w => {
      const text = `${w.title} ${stripHtml(w.body || '')}`.toLowerCase();
      return text.includes(q);
    });
  }
  return items;
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || '';
}

function renderList() {
  const container = document.getElementById('wiki-container');
  if (!container) return;
  const items = getFiltered();

  if (currentView === 'gallery') {
    container.innerHTML = `<div class="gallery-grid">${items.map(w => `
      <div class="wiki-card" data-id="${w.id}">
        <div class="wiki-card-emoji">${w.emoji || categoryIcon(w.category)}</div>
        <div class="wiki-card-title">${esc(w.title)}</div>
        <span class="wiki-card-cat wiki-category-badge wiki-cat-${(w.category||'note').toLowerCase()}">${esc(w.category || 'Note')}</span>
        <div class="wiki-card-body">${esc(stripHtml(w.body || '').slice(0, 100))}</div>
      </div>
    `).join('')}</div>`;
  } else {
    container.innerHTML = `
      <table class="table-view">
        <thead><tr><th>Title</th><th>Category</th><th>Last updated</th><th>Words</th></tr></thead>
        <tbody>${items.map(w => `
          <tr class="table-row" data-id="${w.id}">
            <td>${w.emoji || ''} ${esc(w.title)}</td>
            <td><span class="wiki-category-badge wiki-cat-${(w.category||'note').toLowerCase()}">${esc(w.category || 'Note')}</span></td>
            <td>${w.updatedAt ? new Date(w.updatedAt).toLocaleDateString() : ''}</td>
            <td>${countWords(w.body || '')}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;
  }

  container.querySelectorAll('.wiki-card, .table-row').forEach(el => {
    el.addEventListener('click', () => {
      viewingArticleId = el.getAttribute('data-id');
      renderWiki();
    });
  });
}

function renderArticle(container) {
  const article = state.wiki.find(w => w.id === viewingArticleId);
  if (!article) { viewingArticleId = null; renderWiki(); return; }

  const wordCount = countWords(article.body || '');

  container.innerHTML = `
    <div class="page-pad wiki-article-view" style="max-width:760px;margin:0 auto;">
      <button class="btn btn-ghost btn-sm" id="wiki-back">← Back</button>
      <div class="wiki-article-header">
        <div class="wiki-article-emoji">${article.emoji || categoryIcon(article.category)}</div>
        <h1 class="wiki-article-title">${esc(article.title)}</h1>
        <div class="wiki-article-meta">
          <span class="wiki-category-badge wiki-cat-${(article.category||'note').toLowerCase()}">${esc(article.category || 'Note')}</span>
          <span style="font-size:11px;color:var(--text3);">Updated ${article.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : 'never'}</span>
          <span style="font-size:11px;color:var(--text3);">${wordCount} words</span>
        </div>
      </div>
      <div class="wiki-body prose-content">${article.body || '<p>No content yet.</p>'}</div>
      <div style="margin-top:24px;display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" id="wiki-edit-btn">Edit</button>
        <button class="btn btn-danger btn-sm" id="wiki-delete-btn">Delete</button>
      </div>
    </div>
  `;

  document.getElementById('wiki-back')?.addEventListener('click', () => {
    viewingArticleId = null;
    renderWiki();
  });

  document.getElementById('wiki-edit-btn')?.addEventListener('click', () => {
    editingArticleId = viewingArticleId;
    viewingArticleId = null;
    renderWiki();
  });

  document.getElementById('wiki-delete-btn')?.addEventListener('click', () => {
    if (confirm('Delete this article?')) {
      state.wiki = state.wiki.filter(w => w.id !== article.id);
      saveState(); markDirty();
      viewingArticleId = null;
      renderWiki();
    }
  });

  // Wire wiki links
  container.querySelectorAll('.wiki-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-wiki-id');
      if (targetId) {
        viewingArticleId = targetId;
        renderWiki();
      }
    });
  });
}

function renderEditor(container) {
  const isNew = editingArticleId === 'new';
  const existing = isNew ? null : state.wiki.find(w => w.id === editingArticleId);

  container.innerHTML = `
    <div class="page-pad wiki-editor" style="max-width:760px;margin:0 auto;">
      <button class="btn btn-ghost btn-sm" id="wiki-editor-cancel">← Cancel</button>
      <div style="margin-top:12px;">
        <div style="display:grid;grid-template-columns:60px 1fr;gap:10px;margin-bottom:12px;">
          <div>
            <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px;">Emoji</label>
            <input class="modal-input" id="wiki-ed-emoji" value="${esc(existing?.emoji || '')}" style="text-align:center;"/>
          </div>
          <div>
            <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px;">Title</label>
            <input class="modal-input" id="wiki-ed-title" value="${esc(existing?.title || '')}" placeholder="Article title"/>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px;">Category</label>
          <select class="modal-input" id="wiki-ed-cat" style="max-width:200px;">
            ${CATEGORIES.slice(1).map(c => `<option ${existing?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div id="wiki-editor-area"></div>
        <div style="margin-top:16px;display:flex;gap:8px;">
          <button class="btn btn-primary" id="wiki-ed-save">Save</button>
          <button class="btn btn-ghost" id="wiki-ed-cancel2">Cancel</button>
        </div>
      </div>
    </div>
  `;

  const editorPage = { id: 'wiki-temp', title: '', content: existing?.body || '<p><br></p>' };
  initEditor('wiki-editor-area', editorPage);

  // Wire [[ link autocomplete
  setTimeout(() => {
    const editorArea = document.querySelector('#wiki-editor-area .editor-area');
    if (editorArea) {
      editorArea.addEventListener('input', handleWikiLinkInput);
    }
  }, 100);

  document.getElementById('wiki-editor-cancel')?.addEventListener('click', cancelEdit);
  document.getElementById('wiki-ed-cancel2')?.addEventListener('click', cancelEdit);
  document.getElementById('wiki-ed-save')?.addEventListener('click', () => {
    const title = document.getElementById('wiki-ed-title').value.trim();
    if (!title) return;
    const body = getEditorContent();
    const data = {
      title,
      emoji: document.getElementById('wiki-ed-emoji').value.trim(),
      category: document.getElementById('wiki-ed-cat').value,
      body,
      updatedAt: Date.now()
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      state.wiki.push({ id: crypto.randomUUID(), ...data, tags: [], createdAt: Date.now() });
    }
    saveState(); markDirty();
    editingArticleId = null;
    renderWiki();
  });
}

function cancelEdit() {
  editingArticleId = null;
  renderWiki();
}

let wikiLinkDropdown = null;

function handleWikiLinkInput() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== 3) { closeWikiDropdown(); return; }

  const text = node.textContent;
  const offset = sel.anchorOffset;
  const before = text.slice(0, offset);
  const match = before.match(/\[\[([^\]]*)$/);

  if (!match) { closeWikiDropdown(); return; }

  const query = match[1].toLowerCase();
  const results = state.wiki.filter(w => w.title.toLowerCase().includes(query)).slice(0, 6);

  if (results.length === 0) { closeWikiDropdown(); return; }

  showWikiDropdown(results, node, offset, match.index);
}

function showWikiDropdown(results, textNode, offset, startIdx) {
  closeWikiDropdown();

  const sel = window.getSelection();
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  wikiLinkDropdown = document.createElement('div');
  wikiLinkDropdown.id = 'wiki-link-dropdown';
  wikiLinkDropdown.style.cssText = `position:fixed;top:${rect.bottom+4}px;left:${rect.left}px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius);padding:4px;z-index:200;width:200px;box-shadow:0 4px 12px rgba(0,0,0,.3);`;

  wikiLinkDropdown.innerHTML = results.map(w =>
    `<div class="slash-item" data-id="${w.id}" data-title="${esc(w.title)}">${w.emoji || '📝'} ${esc(w.title)}</div>`
  ).join('');

  document.body.appendChild(wikiLinkDropdown);

  wikiLinkDropdown.querySelectorAll('.slash-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      const title = item.getAttribute('data-title');
      insertWikiLink(textNode, offset, startIdx, id, title);
      closeWikiDropdown();
    });
  });
}

function closeWikiDropdown() {
  if (wikiLinkDropdown) { wikiLinkDropdown.remove(); wikiLinkDropdown = null; }
}

function insertWikiLink(textNode, offset, startIdx, id, title) {
  const text = textNode.textContent;
  // Remove [[ and partial text
  const before = text.slice(0, startIdx);
  const after = text.slice(offset);
  textNode.textContent = before + after;

  // Insert the link
  const sel = window.getSelection();
  const range = document.createRange();
  range.setStart(textNode, startIdx);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);

  const linkHtml = `<a class="wiki-link" href="#" data-wiki-id="${id}">${esc(title)}</a>&nbsp;`;
  document.execCommand('insertHTML', false, linkHtml);
}

function categoryIcon(cat) {
  const map = { Concept: '💡', Person: '👤', Place: '📍', Term: '📖', Source: '📚', Note: '📝' };
  return map[cat] || '📝';
}

function countWords(html) {
  const text = stripHtml(html);
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
