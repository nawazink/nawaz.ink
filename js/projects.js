import { state, saveState, markDirty } from './state.js';

const STATUS_OPTIONS = ['Active', 'Paused', 'Complete', 'Archived'];

export function renderProjects() {
  const container = document.getElementById('view-projects');
  if (!container) return;

  container.innerHTML = `
    <div class="page-pad" style="max-width:960px;margin:0 auto;">
      <div class="db-header">
        <h2>Projects</h2>
        <div class="db-header-actions">
          <button class="btn btn-primary btn-sm" id="proj-add-btn">+ New project</button>
        </div>
      </div>
      <div id="proj-grid" class="gallery-grid"></div>
    </div>
  `;

  renderGrid();
  document.getElementById('proj-add-btn')?.addEventListener('click', () => openProjectModal(null));
}

function renderGrid() {
  const grid = document.getElementById('proj-grid');
  if (!grid) return;

  grid.innerHTML = state.projects.map(p => `
    <div class="project-card" data-id="${p.id}">
      <span class="project-card-badge tag tag-${badgeColor(p.status)}">${esc(p.status || 'Active')}</span>
      <div class="project-card-emoji">${p.emoji || '📁'}</div>
      <div class="project-card-title">${esc(p.title)}</div>
      ${p.category ? `<span class="project-card-cat tag">${esc(p.category)}</span>` : ''}
      <div class="project-card-desc">${esc((p.description || '').slice(0, 80))}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.project-card').forEach(el => {
    el.addEventListener('click', () => openProjectModal(el.getAttribute('data-id')));
  });
}

function openProjectModal(id) {
  const existing = id ? state.projects.find(p => p.id === id) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit' : 'New'} Project</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Title</label>
        <input class="modal-input" id="pm-title" value="${esc(existing?.title || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Emoji</label>
        <input class="modal-input" id="pm-emoji" value="${esc(existing?.emoji || '')}" style="max-width:60px;"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Category</label>
        <input class="modal-input" id="pm-cat" value="${esc(existing?.category || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Description</label>
        <textarea class="modal-input" id="pm-desc" rows="3" style="resize:vertical;">${esc(existing?.description || '')}</textarea>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Status</label>
        <select class="modal-input" id="pm-status">
          ${STATUS_OPTIONS.map(s => `<option ${existing?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="pm-save">Save</button>
          ${existing ? '<button class="btn btn-danger" id="pm-delete">Delete</button>' : ''}
          <button class="btn btn-ghost" id="pm-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#pm-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#pm-save').addEventListener('click', () => {
    const title = document.getElementById('pm-title').value.trim();
    if (!title) return;
    const data = {
      title,
      emoji: document.getElementById('pm-emoji').value.trim(),
      category: document.getElementById('pm-cat').value.trim(),
      description: document.getElementById('pm-desc').value,
      status: document.getElementById('pm-status').value,
      updatedAt: Date.now()
    };
    if (existing) {
      Object.assign(existing, data);
    } else {
      state.projects.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() });
    }
    saveState(); markDirty();
    overlay.remove();
    renderProjects();
  });

  if (existing) {
    overlay.querySelector('#pm-delete').addEventListener('click', () => {
      state.projects = state.projects.filter(p => p.id !== id);
      saveState(); markDirty();
      overlay.remove();
      renderProjects();
    });
  }
}

function badgeColor(s) {
  if (s === 'Active') return 'green';
  if (s === 'Paused') return 'orange';
  if (s === 'Complete') return 'blue';
  return 'purple';
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
