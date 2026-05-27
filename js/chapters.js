import { state, saveState, markDirty } from './state.js';
import { navigateTo } from './router.js';

let currentView = 'table';

export function renderChapters() {
  const container = document.getElementById('view-chapters');
  if (!container) return;

  currentView = state.dbViews.chapters || 'table';
  const chapters = state.pages.filter(p => p.type === 'chapter').sort((a, b) => (a.order || 0) - (b.order || 0));

  container.innerHTML = `
    <div class="page-pad" style="max-width:960px;margin:0 auto;">
      <div class="db-header">
        <h2>Chapters</h2>
        <div class="db-header-actions">
          <div class="view-toggle">
            <button class="btn btn-sm ${currentView === 'table' ? 'active' : ''}" data-v="table">Table</button>
            <button class="btn btn-sm ${currentView === 'board' ? 'active' : ''}" data-v="board">Board</button>
          </div>
          <button class="btn btn-primary btn-sm" id="chap-add-btn">+ New chapter</button>
        </div>
      </div>
      <div id="chap-container"></div>
    </div>
  `;

  renderChapterList(chapters);

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.getAttribute('data-v');
      state.dbViews.chapters = currentView;
      renderChapters();
    });
  });

  document.getElementById('chap-add-btn')?.addEventListener('click', () => openChapterModal());
}

function renderChapterList(chapters) {
  const container = document.getElementById('chap-container');
  if (!container) return;

  if (currentView === 'table') {
    container.innerHTML = `
      <table class="table-view">
        <thead><tr><th>#</th><th>Title</th><th>Status</th><th>Words</th><th>Updated</th><th>Tags</th></tr></thead>
        <tbody>${chapters.map(c => `
          <tr class="table-row" data-id="${c.id}">
            <td>${c.order || '-'}</td>
            <td>${esc(c.title || 'Untitled')}</td>
            <td><span class="tag tag-${statusColor(c.chapterStatus)}">${esc(c.chapterStatus || 'Draft')}</span></td>
            <td>${(c.wordCount || 0).toLocaleString()}</td>
            <td>${c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : ''}</td>
            <td>${(c.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;
  } else {
    const statuses = ['Draft', 'Revising', 'Done'];
    container.innerHTML = `<div class="board-grid">${statuses.map(s => `
      <div class="board-column">
        <div class="board-column-header">${s} <span class="board-count">${chapters.filter(c => (c.chapterStatus || 'Draft') === s).length}</span></div>
        <div class="board-column-body">
          ${chapters.filter(c => (c.chapterStatus || 'Draft') === s).map(c => `
            <div class="board-card" data-id="${c.id}">
              <div class="board-card-title">${esc(c.title || 'Untitled')}</div>
              <div class="board-card-meta">${(c.wordCount || 0)} words</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}</div>`;
  }

  container.querySelectorAll('.table-row, .board-card').forEach(el => {
    el.addEventListener('click', () => {
      state.currentPage = el.getAttribute('data-id');
      navigateTo('editor');
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showChapterMenu(e, el.getAttribute('data-id'));
    });
  });
}

function showChapterMenu(e, id) {
  const existing = document.getElementById('chap-ctx');
  if (existing) existing.remove();
  const menu = document.createElement('div');
  menu.id = 'chap-ctx';
  menu.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius);padding:4px;z-index:2000;min-width:120px;`;
  menu.innerHTML = `
    <div class="slash-item" data-action="edit">Edit metadata</div>
    <div class="slash-item" data-action="open">Open in editor</div>
    <div class="slash-item" data-action="delete" style="color:var(--red);">Delete</div>
  `;
  document.body.appendChild(menu);
  menu.querySelectorAll('.slash-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action');
      if (action === 'open') { state.currentPage = id; navigateTo('editor'); }
      else if (action === 'edit') openChapterEditModal(id);
      else if (action === 'delete') {
        if (confirm('Delete this chapter?')) {
          state.pages = state.pages.filter(p => p.id !== id);
          state.chapters = state.chapters.filter(c => c.id !== id && c.pageId !== id);
          saveState(); markDirty(); renderChapters();
        }
      }
      menu.remove();
    });
  });
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
}

function openChapterEditModal(id) {
  const page = state.pages.find(p => p.id === id);
  if (!page) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Edit Chapter</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Title</label>
        <input class="modal-input" id="che-title" value="${esc(page.title || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Order #</label>
        <input class="modal-input" id="che-order" type="number" value="${page.order || 1}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Status</label>
        <select class="modal-input" id="che-status">
          <option ${page.chapterStatus === 'Draft' ? 'selected' : ''}>Draft</option>
          <option ${page.chapterStatus === 'Revising' ? 'selected' : ''}>Revising</option>
          <option ${page.chapterStatus === 'Done' ? 'selected' : ''}>Done</option>
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Tags</label>
        <input class="modal-input" id="che-tags" value="${(page.tags || []).join(', ')}"/>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="che-save">Save</button>
          <button class="btn btn-ghost" id="che-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#che-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#che-save').addEventListener('click', () => {
    page.title = document.getElementById('che-title').value.trim() || page.title;
    page.order = parseInt(document.getElementById('che-order').value) || 1;
    page.chapterStatus = document.getElementById('che-status').value;
    page.tags = document.getElementById('che-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    page.updatedAt = Date.now();
    saveState(); markDirty(); overlay.remove(); renderChapters();
  });
}

function openChapterModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">New Chapter</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Title</label>
        <input class="modal-input" id="chm-title"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Order #</label>
        <input class="modal-input" id="chm-order" type="number" value="${state.pages.filter(p=>p.type==='chapter').length + 1}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Status</label>
        <select class="modal-input" id="chm-status">
          <option>Draft</option><option>Revising</option><option>Done</option>
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Tags (comma separated)</label>
        <input class="modal-input" id="chm-tags"/>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="chm-save">Create & Edit</button>
          <button class="btn btn-ghost" id="chm-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#chm-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#chm-save').addEventListener('click', () => {
    const title = document.getElementById('chm-title').value.trim() || 'Untitled Chapter';
    const page = {
      id: crypto.randomUUID(),
      title,
      content: '<p><br></p>',
      type: 'chapter',
      order: parseInt(document.getElementById('chm-order').value) || 1,
      chapterStatus: document.getElementById('chm-status').value,
      tags: document.getElementById('chm-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    state.pages.push(page);
    state.chapters.push({ id: page.id, pageId: page.id });
    saveState();
    markDirty();
    overlay.remove();
    state.currentPage = page.id;
    navigateTo('editor');
  });
}

function statusColor(s) {
  if (s === 'Done') return 'green';
  if (s === 'Revising') return 'orange';
  return 'blue';
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
