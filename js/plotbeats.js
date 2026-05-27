import { state, saveState, markDirty } from './state.js';

const BEAT_TYPES = ['Opening', 'Inciting Incident', 'Rising Action', 'Midpoint', 'Dark Night', 'Climax', 'Falling Action', 'Resolution', 'Other'];

export function renderPlotBeats() {
  const container = document.getElementById('view-plot-beats');
  if (!container) return;

  const acts = ['Act 1', 'Act 2', 'Act 3'];

  container.innerHTML = `
    <div class="page-pad" style="max-width:1100px;margin:0 auto;">
      <div class="db-header">
        <h2>Plot Beats</h2>
      </div>
      <div class="board-grid">
        ${acts.map(act => {
          const beats = state.plotBeats.filter(b => b.act === act);
          return `
            <div class="board-column">
              <div class="board-column-header">${act} <span class="board-count">${beats.length}</span></div>
              <div class="board-column-body">
                ${beats.map(b => `
                  <div class="plot-beat" data-id="${b.id}">
                    <span class="plot-beat-type tag tag-purple">${esc(b.type || '')}</span>
                    <div class="plot-beat-title">${esc(b.title)}</div>
                    <div class="plot-beat-desc">${esc((b.description || '').slice(0, 100))}</div>
                    ${b.tags?.length ? `<div class="plot-beat-meta">${b.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
                  </div>
                `).join('')}
                <button class="plot-add-btn" data-act="${act}">+ Add beat</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.plot-add-btn').forEach(btn => {
    btn.addEventListener('click', () => openBeatModal(null, btn.getAttribute('data-act')));
  });

  container.querySelectorAll('.plot-beat').forEach(el => {
    el.addEventListener('click', () => openBeatModal(el.getAttribute('data-id'), null));
  });
}

function openBeatModal(id, defaultAct) {
  const existing = id ? state.plotBeats.find(b => b.id === id) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit' : 'New'} Plot Beat</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Act</label>
        <select class="modal-input" id="pb-act">
          <option ${(existing?.act || defaultAct) === 'Act 1' ? 'selected' : ''}>Act 1</option>
          <option ${(existing?.act || defaultAct) === 'Act 2' ? 'selected' : ''}>Act 2</option>
          <option ${(existing?.act || defaultAct) === 'Act 3' ? 'selected' : ''}>Act 3</option>
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Type</label>
        <select class="modal-input" id="pb-type">
          ${BEAT_TYPES.map(t => `<option ${existing?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Title</label>
        <input class="modal-input" id="pb-title" value="${esc(existing?.title || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Description</label>
        <textarea class="modal-input" id="pb-desc" rows="3" style="resize:vertical;">${esc(existing?.description || '')}</textarea>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Tags (comma separated)</label>
        <input class="modal-input" id="pb-tags" value="${(existing?.tags || []).join(', ')}"/>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="pb-save">Save</button>
          ${existing ? '<button class="btn btn-danger" id="pb-delete">Delete</button>' : ''}
          <button class="btn btn-ghost" id="pb-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#pb-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#pb-save').addEventListener('click', () => {
    const title = document.getElementById('pb-title').value.trim();
    if (!title) return;
    const data = {
      act: document.getElementById('pb-act').value,
      type: document.getElementById('pb-type').value,
      title,
      description: document.getElementById('pb-desc').value,
      tags: document.getElementById('pb-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: Date.now()
    };
    if (existing) {
      Object.assign(existing, data);
    } else {
      state.plotBeats.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() });
    }
    saveState(); markDirty();
    overlay.remove();
    renderPlotBeats();
  });

  if (existing) {
    overlay.querySelector('#pb-delete').addEventListener('click', () => {
      state.plotBeats = state.plotBeats.filter(b => b.id !== id);
      saveState(); markDirty();
      overlay.remove();
      renderPlotBeats();
    });
  }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
