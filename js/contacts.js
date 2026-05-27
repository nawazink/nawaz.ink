import { state, saveState, markDirty } from './state.js';

let currentView = 'table';

export function renderContacts() {
  const container = document.getElementById('view-contacts');
  if (!container) return;

  currentView = state.dbViews.contacts || 'table';

  container.innerHTML = `
    <div class="page-pad" style="max-width:960px;margin:0 auto;">
      <div class="db-header">
        <h2>Contacts</h2>
        <div class="db-header-actions">
          <div class="view-toggle">
            <button class="btn btn-sm ${currentView === 'table' ? 'active' : ''}" data-v="table">Table</button>
            <button class="btn btn-sm ${currentView === 'gallery' ? 'active' : ''}" data-v="gallery">Gallery</button>
          </div>
          <button class="btn btn-sm" id="contacts-export">↓ Export CSV</button>
          <button class="btn btn-primary btn-sm" id="contacts-add-btn">+ New contact</button>
        </div>
      </div>
      <div class="db-filter-bar">
        <input class="modal-input" id="contacts-search" placeholder="Search contacts..." style="max-width:240px;font-size:12px;padding:5px 10px;"/>
      </div>
      <div id="contacts-container"></div>
    </div>
  `;

  renderContactList();

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.getAttribute('data-v');
      state.dbViews.contacts = currentView;
      renderContacts();
    });
  });

  document.getElementById('contacts-add-btn')?.addEventListener('click', () => openContactModal(null));
  document.getElementById('contacts-search')?.addEventListener('input', () => renderContactList());
  document.getElementById('contacts-export')?.addEventListener('click', exportCSV);
}

function getFiltered() {
  const q = (document.getElementById('contacts-search')?.value || '').toLowerCase();
  return state.contacts.filter(c => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    const email = (c.email || '').toLowerCase();
    const tags = (c.tags || []).join(' ').toLowerCase();
    return name.includes(q) || email.includes(q) || tags.includes(q);
  });
}

function renderContactList() {
  const container = document.getElementById('contacts-container');
  if (!container) return;
  const contacts = getFiltered();

  if (currentView === 'table') {
    container.innerHTML = `
      <table class="table-view">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Tags</th><th>Notes</th></tr></thead>
        <tbody>${contacts.map(c => `
          <tr class="table-row" data-id="${c.id}">
            <td>${esc(c.firstName)} ${esc(c.lastName)}</td>
            <td>${esc(c.email || '')}</td>
            <td>${esc(c.phone || '')}</td>
            <td>${(c.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join(' ')}</td>
            <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc((c.notes||'').slice(0,50))}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;
  } else {
    container.innerHTML = `<div class="gallery-grid">${contacts.map(c => `
      <div class="contact-card" data-id="${c.id}">
        <div class="contact-avatar">${(c.firstName||'?')[0]}${(c.lastName||'')[0] || ''}</div>
        <div class="contact-card-name">${esc(c.firstName)} ${esc(c.lastName)}</div>
        ${(c.tags||[]).length ? `<span class="tag">${esc(c.tags[0])}</span>` : ''}
      </div>
    `).join('')}</div>`;
  }

  container.querySelectorAll('.table-row, .contact-card').forEach(el => {
    el.addEventListener('click', () => openContactModal(el.getAttribute('data-id')));
  });
}

function openContactModal(id) {
  const existing = id ? state.contacts.find(c => c.id === id) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit' : 'New'} Contact</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">First name</label>
            <input class="modal-input" id="ct-fn" value="${esc(existing?.firstName || '')}"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Last name</label>
            <input class="modal-input" id="ct-ln" value="${esc(existing?.lastName || '')}"/>
          </div>
        </div>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Email</label>
        <input class="modal-input" id="ct-email" type="email" value="${esc(existing?.email || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Phone</label>
        <input class="modal-input" id="ct-phone" value="${esc(existing?.phone || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Organization</label>
        <input class="modal-input" id="ct-org" value="${esc(existing?.organization || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Role</label>
        <input class="modal-input" id="ct-role" value="${esc(existing?.role || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Tags (comma separated)</label>
        <input class="modal-input" id="ct-tags" value="${(existing?.tags||[]).join(', ')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Notes</label>
        <textarea class="modal-input" id="ct-notes" rows="3" style="resize:vertical;">${esc(existing?.notes || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="ct-save">Save</button>
          ${existing ? '<button class="btn btn-danger" id="ct-delete">Delete</button>' : ''}
          <button class="btn btn-ghost" id="ct-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#ct-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#ct-save').addEventListener('click', () => {
    const firstName = document.getElementById('ct-fn').value.trim();
    if (!firstName) return;
    const data = {
      firstName,
      lastName: document.getElementById('ct-ln').value.trim(),
      email: document.getElementById('ct-email').value.trim(),
      phone: document.getElementById('ct-phone').value.trim(),
      organization: document.getElementById('ct-org').value.trim(),
      role: document.getElementById('ct-role').value.trim(),
      tags: document.getElementById('ct-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
      notes: document.getElementById('ct-notes').value,
      updatedAt: Date.now()
    };
    if (existing) Object.assign(existing, data);
    else state.contacts.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() });
    saveState(); markDirty();
    overlay.remove();
    renderContacts();
  });

  if (existing) {
    overlay.querySelector('#ct-delete').addEventListener('click', () => {
      state.contacts = state.contacts.filter(c => c.id !== id);
      saveState(); markDirty();
      overlay.remove();
      renderContacts();
    });
  }
}

function exportCSV() {
  const header = 'Name,Email,Phone,Organization,Role,Tags';
  const rows = state.contacts.map(c => {
    return [
      `"${c.firstName} ${c.lastName}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.organization || ''}"`,
      `"${c.role || ''}"`,
      `"${(c.tags||[]).join(';')}"`
    ].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contacts.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
