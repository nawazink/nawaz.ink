import { state, saveState, markDirty } from './state.js';

let currentView = 'board';

const STATUSES = ['Backlog', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export function renderTasks() {
  const container = document.getElementById('view-db-tasks');
  if (!container) return;

  currentView = state.dbViews.tasks || 'board';

  container.innerHTML = `
    <div class="page-pad" style="max-width:1100px;margin:0 auto;">
      <div class="db-header">
        <h2>Tasks</h2>
        <div class="db-header-actions">
          <div class="view-toggle">
            <button class="btn btn-sm ${currentView === 'board' ? 'active' : ''}" data-v="board">Board</button>
            <button class="btn btn-sm ${currentView === 'list' ? 'active' : ''}" data-v="list">List</button>
          </div>
          <button class="btn btn-primary btn-sm" id="task-add-btn">+ New task</button>
        </div>
      </div>
      <div class="db-filter-bar">
        <input class="modal-input" id="task-search" placeholder="Search tasks..." style="max-width:200px;font-size:12px;padding:5px 10px;"/>
      </div>
      <div id="task-container"></div>
    </div>
  `;

  renderTaskView();

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentView = btn.getAttribute('data-v');
      state.dbViews.tasks = currentView;
      renderTasks();
    });
  });

  document.getElementById('task-add-btn')?.addEventListener('click', () => openTaskModal(null));
  document.getElementById('task-search')?.addEventListener('input', () => renderTaskView());
}

function getFiltered() {
  const q = (document.getElementById('task-search')?.value || '').toLowerCase();
  return state.tasks.filter(t => t.title.toLowerCase().includes(q));
}

function renderTaskView() {
  const container = document.getElementById('task-container');
  if (!container) return;
  const tasks = getFiltered();

  if (currentView === 'board') {
    container.innerHTML = `<div class="board-columns">${STATUSES.map(s => `
      <div class="board-col" data-status="${s}">
        <div class="board-col-header">${s} <span class="board-count">${tasks.filter(t => t.status === s).length}</span></div>
        <div class="board-col-body" data-status="${s}">
          ${tasks.filter(t => t.status === s).map(t => taskCard(t)).join('')}
        </div>
      </div>
    `).join('')}</div>`;

    // Drag and drop
    container.querySelectorAll('.board-card[draggable]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('click', () => openTaskModal(card.getAttribute('data-id')));
    });

    container.querySelectorAll('.board-col-body').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.parentElement.classList.add('drag-over');
      });
      col.addEventListener('dragleave', () => col.parentElement.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.parentElement.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const task = state.tasks.find(t => t.id === id);
        if (task) {
          task.status = col.getAttribute('data-status');
          task.updatedAt = Date.now();
          saveState(); markDirty();
          renderTaskView();
        }
      });
    });

    // Context menu
    container.querySelectorAll('.board-card[draggable]').forEach(card => {
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, card.getAttribute('data-id'));
      });
    });
  } else {
    container.innerHTML = `
      <table class="table-view">
        <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due date</th><th>Tags</th></tr></thead>
        <tbody>${tasks.map(t => `
          <tr class="table-row" data-id="${t.id}">
            <td>${esc(t.title)}</td>
            <td><span class="tag tag-${statusColor(t.status)}">${esc(t.status)}</span></td>
            <td><span class="tag tag-${prioColor(t.priority)}">${esc(t.priority || '')}</span></td>
            <td>${t.dueDate || ''}</td>
            <td>${(t.tags||[]).map(tg=>`<span class="tag">${esc(tg)}</span>`).join(' ')}</td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;
    container.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', () => openTaskModal(row.getAttribute('data-id')));
    });
  }
}

function taskCard(t) {
  return `
    <div class="board-card" draggable="true" data-id="${t.id}">
      <div class="board-card-title">${esc(t.title)}</div>
      <div class="board-card-meta">
        ${t.priority ? `<span class="tag tag-${prioColor(t.priority)}">${esc(t.priority)}</span>` : ''}
        ${t.dueDate ? `<span style="font-size:10px;color:var(--text3);">📅 ${t.dueDate}</span>` : ''}
      </div>
      ${(t.tags||[]).length ? `<div style="margin-top:4px;">${t.tags.map(tg=>`<span class="tag">${esc(tg)}</span>`).join(' ')}</div>` : ''}
    </div>
  `;
}

function showContextMenu(e, id) {
  const existing = document.getElementById('task-ctx-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'task-ctx-menu';
  menu.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius);padding:4px;z-index:2000;min-width:120px;`;
  menu.innerHTML = `
    <div class="slash-item" data-action="edit">Edit</div>
    <div class="slash-item" data-action="done">Move to Done</div>
    <div class="slash-item" data-action="delete" style="color:var(--red);">Delete</div>
  `;
  document.body.appendChild(menu);

  menu.querySelectorAll('.slash-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action');
      if (action === 'edit') openTaskModal(id);
      else if (action === 'done') {
        const task = state.tasks.find(t => t.id === id);
        if (task) { task.status = 'Done'; task.updatedAt = Date.now(); saveState(); markDirty(); renderTaskView(); }
      } else if (action === 'delete') {
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveState(); markDirty(); renderTaskView();
      }
      menu.remove();
    });
  });

  const close = () => { menu.remove(); document.removeEventListener('click', close); };
  setTimeout(() => document.addEventListener('click', close), 10);
}

function openTaskModal(id) {
  const existing = id ? state.tasks.find(t => t.id === id) : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit' : 'New'} Task</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Title *</label>
        <input class="modal-input" id="tm-title" value="${esc(existing?.title || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Status</label>
        <select class="modal-input" id="tm-status">
          ${STATUSES.map(s=>`<option ${existing?.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Priority</label>
        <select class="modal-input" id="tm-priority">
          ${PRIORITIES.map(p=>`<option ${existing?.priority===p?'selected':''}>${p}</option>`).join('')}
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Due date</label>
        <input class="modal-input" id="tm-due" type="date" value="${existing?.dueDate || ''}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Tags (comma separated)</label>
        <input class="modal-input" id="tm-tags" value="${(existing?.tags||[]).join(', ')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Linked page</label>
        <select class="modal-input" id="tm-page">
          <option value="">None</option>
          ${state.pages.map(p=>`<option value="${p.id}" ${existing?.linkedPage===p.id?'selected':''}>${esc(p.title||'Untitled')}</option>`).join('')}
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Notes</label>
        <textarea class="modal-input" id="tm-notes" rows="3" style="resize:vertical;">${esc(existing?.notes || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="tm-save">Save</button>
          ${existing ? '<button class="btn btn-danger" id="tm-delete">Delete</button>' : ''}
          <button class="btn btn-ghost" id="tm-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#tm-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#tm-save').addEventListener('click', () => {
    const title = document.getElementById('tm-title').value.trim();
    if (!title) return;
    const data = {
      title,
      status: document.getElementById('tm-status').value,
      priority: document.getElementById('tm-priority').value,
      dueDate: document.getElementById('tm-due').value || null,
      tags: document.getElementById('tm-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
      linkedPage: document.getElementById('tm-page').value || null,
      notes: document.getElementById('tm-notes').value,
      updatedAt: Date.now()
    };
    if (existing) Object.assign(existing, data);
    else state.tasks.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() });
    saveState(); markDirty();
    overlay.remove();
    renderTasks();
  });

  if (existing) {
    overlay.querySelector('#tm-delete').addEventListener('click', () => {
      state.tasks = state.tasks.filter(t => t.id !== id);
      saveState(); markDirty();
      overlay.remove();
      renderTasks();
    });
  }
}

function statusColor(s) {
  if (s === 'Done') return 'green';
  if (s === 'In Progress') return 'blue';
  if (s === 'Review') return 'orange';
  return 'purple';
}

function prioColor(p) {
  if (p === 'Critical') return 'red';
  if (p === 'High') return 'orange';
  if (p === 'Medium') return 'blue';
  return 'teal';
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
