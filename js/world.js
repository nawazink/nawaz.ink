import { state, saveState, markDirty } from './state.js';

const CATEGORIES = ['All', 'Characters', 'Places', 'Objects', 'Lore', 'Factions'];
let activeFilter = 'All';

export function renderWorld() {
  const container = document.getElementById('view-world');
  if (!container) return;

  container.innerHTML = `
    <div class="page-pad" style="max-width:960px;margin:0 auto;">
      <div class="db-header">
        <h2>World Building</h2>
        <div class="db-header-actions">
          <button class="btn btn-primary btn-sm" id="world-add-btn">+ New entry</button>
        </div>
      </div>
      <div class="db-filter-bar">
        ${CATEGORIES.map(c => `<button class="btn btn-sm ${c === activeFilter ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
      </div>
      <div id="world-grid" class="gallery-grid"></div>
    </div>
  `;

  renderGrid();

  container.querySelectorAll('.db-filter-bar .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.getAttribute('data-cat');
      renderWorld();
    });
  });

  document.getElementById('world-add-btn')?.addEventListener('click', () => openWorldModal(null));
}

function renderGrid() {
  const grid = document.getElementById('world-grid');
  if (!grid) return;

  const items = activeFilter === 'All' ? state.world : state.world.filter(w => w.category === activeFilter);

  grid.innerHTML = items.map(w => `
    <div class="world-card" data-id="${w.id}">
      <div class="world-card-emoji">${w.emoji || '🌐'}</div>
      <div class="world-card-title">${esc(w.title)}</div>
      <span class="world-card-cat tag">${esc(w.category || '')}</span>
      <div class="world-card-desc">${esc((w.description || '').slice(0, 80))}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.world-card').forEach(el => {
    el.addEventListener('click', () => openWorldModal(el.getAttribute('data-id')));
  });
}

function openWorldModal(id) {
  const existing = id ? state.world.find(w => w.id === id) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit' : 'New'} World Entry</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Title</label>
        <input class="modal-input" id="wm-title" value="${esc(existing?.title || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Category</label>
        <select class="modal-input" id="wm-cat">
          ${CATEGORIES.slice(1).map(c => `<option ${existing?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Emoji</label>
        <input class="modal-input" id="wm-emoji" value="${esc(existing?.emoji || '')}" style="max-width:60px;"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Description</label>
        <textarea class="modal-input" id="wm-desc" rows="4" style="resize:vertical;">${esc(existing?.description || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="wm-save">Save</button>
          ${existing ? '<button class="btn btn-danger" id="wm-delete">Delete</button>' : ''}
          <button class="btn btn-ghost" id="wm-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#wm-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#wm-save').addEventListener('click', () => {
    const title = document.getElementById('wm-title').value.trim();
    if (!title) return;
    const data = {
      title,
      category: document.getElementById('wm-cat').value,
      emoji: document.getElementById('wm-emoji').value.trim(),
      description: document.getElementById('wm-desc').value,
      updatedAt: Date.now()
    };
    if (existing) {
      Object.assign(existing, data);
    } else {
      state.world.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() });
    }
    saveState(); markDirty();
    overlay.remove();
    renderWorld();
  });

  if (existing) {
    overlay.querySelector('#wm-delete').addEventListener('click', () => {
      state.world = state.world.filter(w => w.id !== id);
      saveState(); markDirty();
      overlay.remove();
      renderWorld();
    });
  }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
