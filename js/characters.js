import { state, saveState, markDirty } from './state.js';

let currentView = 'gallery';

export function renderCharacters() {
  const container = document.getElementById('view-characters');
  if (!container) return;

  currentView = state.dbViews.characters || 'gallery';

  container.innerHTML = `
    <div class="page-pad" style="max-width:960px;margin:0 auto;">
      <div class="db-header">
        <h2>Characters</h2>
        <div class="db-header-actions">
          <div class="view-toggle">
            <button class="btn btn-sm ${currentView === 'gallery' ? 'active' : ''}" data-v="gallery">Gallery</button>
            <button class="btn btn-sm ${currentView === 'table' ? 'active' : ''}" data-v="table">Table</button>
          </div>
          <button class="btn btn-primary btn-sm" id="char-add-btn">+ New character</button>
        </div>
      </div>
      <div class="db-filter-bar">
        <input class="modal-input" id="char-search" placeholder="Search characters..." style="max-width:240px;font-size:12px;padding:5px 10px;"/>
      </div>
      <div id="char-container"></div>
    </div>
  `;

  renderList();
  wireEvents(container);
}

function renderList() {
  const container = document.getElementById('char-container');
  if (!container) return;

  const search = (document.getElementById('char-search')?.value || '').toLowerCase();
  const filtered = state.characters.filter(c =>
    c.name.toLowerCase().includes(search)
  );

  if (currentView === 'gallery') {
    container.innerHTML = `<div class="gallery-grid">${filtered.map(c => `
      <div class="character-card" data-id="${c.id}">
        <div class="character-card-avatar">${c.emoji || c.name.charAt(0).toUpperCase()}</div>
        <div class="character-card-name">${esc(c.name)}</div>
        ${c.role ? `<span class="tag">${esc(c.role)}</span>` : ''}
        ${c.status ? `<span class="tag tag-green">${esc(c.status)}</span>` : ''}
      </div>
    `).join('')}</div>`;
  } else {
    container.innerHTML = `
      <table class="table-view">
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Tags</th><th>Created</th></tr></thead>
        <tbody>${filtered.map(c => `
          <tr class="table-row" data-id="${c.id}">
            <td>${c.emoji || ''} ${esc(c.name)}</td>
            <td>${esc(c.role || '')}</td>
            <td>${esc(c.status || '')}</td>
            <td>${(c.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</td>
            <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;
  }

  // Click to edit
  container.querySelectorAll('.character-card, .table-row').forEach(el => {
    el.addEventListener('click', () => openCharModal(el.getAttribute('data-id')));
  });
}

function wireEvents(container) {
  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.getAttribute('data-v');
      state.dbViews.characters = currentView;
      renderCharacters();
    });
  });

  document.getElementById('char-add-btn')?.addEventListener('click', () => openCharModal(null));
  document.getElementById('char-search')?.addEventListener('input', () => renderList());
}

function openCharModal(id) {
  const existing = id ? state.characters.find(c => c.id === id) : null;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit' : 'New'} Character</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Name</label>
        <input class="modal-input" id="cm-name" value="${esc(existing?.name || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Role</label>
        <input class="modal-input" id="cm-role" value="${esc(existing?.role || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Status</label>
        <input class="modal-input" id="cm-status" value="${esc(existing?.status || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Emoji</label>
        <input class="modal-input" id="cm-emoji" value="${esc(existing?.emoji || '')}" style="max-width:60px;"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Tags (comma separated)</label>
        <input class="modal-input" id="cm-tags" value="${(existing?.tags || []).join(', ')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Notes</label>
        <textarea class="modal-input" id="cm-notes" rows="4" style="resize:vertical;">${esc(existing?.notes || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="cm-save">Save</button>
          ${existing ? '<button class="btn btn-danger" id="cm-delete">Delete</button>' : ''}
          <button class="btn btn-ghost" id="cm-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#cm-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#cm-save').addEventListener('click', () => {
    const name = document.getElementById('cm-name').value.trim();
    if (!name) return;

    const data = {
      name,
      role: document.getElementById('cm-role').value.trim(),
      status: document.getElementById('cm-status').value.trim(),
      emoji: document.getElementById('cm-emoji').value.trim(),
      tags: document.getElementById('cm-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      notes: document.getElementById('cm-notes').value,
      updatedAt: Date.now()
    };

    if (existing) {
      Object.assign(existing, data);
    } else {
      state.characters.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() });
    }

    saveState();
    markDirty();
    overlay.remove();
    renderCharacters();
  });

  if (existing) {
    overlay.querySelector('#cm-delete').addEventListener('click', () => {
      state.characters = state.characters.filter(c => c.id !== id);
      saveState();
      markDirty();
      overlay.remove();
      renderCharacters();
    });
  }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
