import { state, saveState, markDirty } from './state.js';
import { navigateTo } from './router.js';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getDateStr() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function getTodayWords() {
  const today = new Date().toISOString().slice(0, 10);
  return state.writing.lastWordSnapshot[today] || 0;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildHeatmap() {
  const cells = [];
  const today = new Date();
  const totalDays = 12 * 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const val = state.activity[key] || 0;
    let level = 0;
    if (val > 0) level = 1;
    if (val >= 3) level = 2;
    if (val >= 6) level = 3;
    if (val >= 10) level = 4;
    cells.push(`<div class="activity-cell" data-level="${level}"></div>`);
  }
  return cells.join('');
}

function buildWritingGraph() {
  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const seconds = state.writing.dailySeconds[key] || 0;
    days.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), value: Math.round(seconds / 60) });
  }
  const max = Math.max(...days.map(d => d.value), 1);
  return days.map(d => {
    const h = Math.round((d.value / max) * 60);
    return `<div class="graph-bar-wrap"><div class="graph-bar" style="height:${h}px;" title="${d.value} min"></div><span class="graph-bar-label">${d.label[0]}</span></div>`;
  }).join('');
}

function buildReadingGraph() {
  const books = state.epubLibrary || [];
  if (books.length === 0) return '<p class="dash-empty">No books in library</p>';
  return books.slice(0, 5).map(b => {
    const pct = b.progress || 0;
    return `<div class="reading-progress-row"><span class="reading-progress-title">${esc(b.title || 'Untitled')}</span><div class="reading-progress-track"><div class="reading-progress-fill" style="width:${pct}%"></div></div><span class="reading-progress-pct">${pct}%</span></div>`;
  }).join('');
}

function buildCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = now.getDate();
  const monthName = now.toLocaleDateString('en', { month: 'long', year: 'numeric' });

  let cells = '';
  ['S','M','T','W','T','F','S'].forEach(d => { cells += `<div class="cal-head">${d}</div>`; });
  for (let i = 0; i < firstDay; i++) cells += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasActivity = state.activity[key] || state.writing.dailySeconds[key];
    const isToday = d === todayDate;
    const hasTasks = state.tasks.some(t => t.dueDate === key);
    const hasEvents = (state.events || []).some(e => e.date === key);
    cells += `<div class="cal-cell ${isToday ? 'today' : ''} ${hasActivity ? 'has-activity' : ''} ${hasTasks ? 'has-task' : ''} ${hasEvents ? 'has-event' : ''}" data-date="${key}">${d}</div>`;
  }
  return `<div class="cal-header">${monthName}</div><div class="cal-grid">${cells}</div>`;
}

function buildStickyNotes() {
  if (!state.stickyNotes) state.stickyNotes = [];
  return `<button class="sticky-note-add" id="dash-add-sticky">+ Add note</button>`;
}

function buildTodoList() {
  const pending = state.tasks.filter(t => t.status !== 'Done' && t.status !== 'done').slice(0, 8);
  if (pending.length === 0) return '<p class="dash-empty">No pending tasks</p>';
  return pending.map(t => `
    <div class="dash-todo-item" data-id="${t.id}">
      <input type="checkbox" class="dash-todo-check" data-id="${t.id}" ${t.status === 'Done' || t.status === 'done' ? 'checked' : ''}/>
      <span class="dash-todo-text">${esc(t.title)}</span>
      ${t.priority ? `<span class="tag tag-${prioColor(t.priority)}" style="font-size:9px;">${t.priority}</span>` : ''}
    </div>
  `).join('');
}

export function renderDashboard() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const greeting = getGreeting();
  const dateStr = getDateStr();
  const pagesCount = state.pages.length;
  const tasksDone = state.tasks.filter(t => t.status === 'done' || t.status === 'Done').length;
  const charsCount = state.characters.length;
  const chapsCount = state.chapters.length;
  const wikiCount = state.wiki.length;
  const bibCount = state.bibliography.length;

  const wordsToday = getTodayWords();
  const wordGoal = state.settings.wordgoal;
  const progressPct = Math.min(100, Math.round((wordsToday / wordGoal) * 100));

  const recentPages = [...state.pages]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 5);

  container.innerHTML = `
    <div class="dash-wrap page-pad">
      <div class="dash-header">
        <h1 class="dash-greeting">${greeting}, Nawaz ✦</h1>
        <p class="dash-date">${dateStr}</p>
      </div>

      <!-- Sticky Notes -->
      <div class="dash-card">
        <div class="dash-card-header">Sticky Notes <span style="font-size:10px;color:var(--text3);">(${(state.stickyNotes||[]).length})</span></div>
        <div class="sticky-notes-grid" id="dash-sticky-notes">
          ${(state.stickyNotes||[]).map((note, i) => `<div class="sticky-chip" data-idx="${i}" style="border-left:3px solid ${note.color};">${esc(note.text.slice(0, 40))}${note.text.length > 40 ? '...' : ''}</div>`).join('')}
          <button class="sticky-note-add" id="dash-add-sticky">+</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="dash-stats">
        <div class="stat-card"><span class="stat-card-num">${pagesCount}</span><span class="stat-card-label">Pages</span></div>
        <div class="stat-card"><span class="stat-card-num">${tasksDone}</span><span class="stat-card-label">Tasks done</span></div>
        <div class="stat-card"><span class="stat-card-num">${charsCount}</span><span class="stat-card-label">Characters</span></div>
        <div class="stat-card"><span class="stat-card-num">${chapsCount}</span><span class="stat-card-label">Chapters</span></div>
        <div class="stat-card"><span class="stat-card-num">${wikiCount}</span><span class="stat-card-label">Wiki entries</span></div>
        <div class="stat-card"><span class="stat-card-num">${bibCount}</span><span class="stat-card-label">Bibliography</span></div>
      </div>

      <!-- Writing Goal -->
      <div class="dash-card">
        <div class="dash-card-header">Today's writing goal</div>
        <div class="dash-progress-bar-track">
          <div class="dash-progress-bar-fill" style="width: ${progressPct}%"></div>
        </div>
        <div class="dash-progress-text">${wordsToday} / ${wordGoal} words (${progressPct}%)</div>
      </div>

      <!-- Two-column: Calendar + To-Do -->
      <div class="dash-row">
        <div class="dash-card">
          <div class="dash-card-header">Calendar</div>
          ${buildCalendar()}
        </div>
        <div class="dash-card">
          <div class="dash-card-header">To-Do</div>
          <div id="dash-todo-list">${buildTodoList()}</div>
        </div>
      </div>

      <!-- Writing & Reading Progress Graphs -->
      <div class="dash-row">
        <div class="dash-card">
          <div class="dash-card-header">Writing time (past 2 weeks)</div>
          <div class="graph-row">${buildWritingGraph()}</div>
          <div class="graph-footer">Minutes per day</div>
        </div>
        <div class="dash-card">
          <div class="dash-card-header">Reading progress</div>
          ${buildReadingGraph()}
        </div>
      </div>

      <!-- Activity Heatmap -->
      <div class="dash-card">
        <div class="dash-card-header">Activity heatmap</div>
        <div class="activity-grid">${buildHeatmap()}</div>
      </div>

      <!-- Recent Pages + Pending Tasks -->
      <div class="dash-row">
        <div class="dash-card">
          <div class="dash-card-header">Recent pages</div>
          <div class="dash-list" id="dash-recent-pages">
            ${recentPages.length === 0 ? '<p class="dash-empty">No pages yet</p>' :
              recentPages.map(p => `<div class="dash-list-item" data-page-id="${p.id}">${p.title || 'Untitled'}</div>`).join('')}
          </div>
        </div>
        <div class="dash-card">
          <div class="dash-card-header">Pending tasks</div>
          <div class="dash-list" id="dash-pending-tasks">
            ${state.tasks.filter(t => t.status !== 'done' && t.status !== 'Done').length === 0 ? '<p class="dash-empty">All clear</p>' :
              state.tasks.filter(t => t.status !== 'done' && t.status !== 'Done').slice(0, 5).map(t => `<div class="dash-list-item">${t.title || 'Untitled task'}</div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="dash-actions">
        <button class="btn btn-primary" id="dash-new-page">+ New page</button>
        <button class="btn" id="dash-new-journal">+ New journal entry</button>
        <button class="btn" id="dash-add-task">+ Add task</button>
        <button class="btn" id="dash-open-wiki">Open wiki</button>
      </div>
    </div>
  `;

  wireEvents(container);
}

function wireEvents(container) {
  document.getElementById('dash-new-page')?.addEventListener('click', () => navigateTo('new-page'));
  document.getElementById('dash-new-journal')?.addEventListener('click', () => navigateTo('journal'));
  document.getElementById('dash-add-task')?.addEventListener('click', () => navigateTo('db-tasks'));
  document.getElementById('dash-open-wiki')?.addEventListener('click', () => navigateTo('wiki'));

  // Recent pages
  container.querySelectorAll('#dash-recent-pages .dash-list-item').forEach(item => {
    item.addEventListener('click', () => {
      state.currentPage = item.getAttribute('data-page-id');
      navigateTo('editor');
    });
  });

  // Pending tasks
  container.querySelectorAll('#dash-pending-tasks .dash-list-item').forEach(item => {
    item.addEventListener('click', () => navigateTo('db-tasks'));
  });

  // Sticky notes — click to open popup
  container.querySelectorAll('.sticky-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = parseInt(chip.getAttribute('data-idx'));
      openStickyPopup(idx);
    });
  });

  document.getElementById('dash-add-sticky')?.addEventListener('click', () => addStickyNote());

  // Calendar — click date to manage
  container.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const date = cell.getAttribute('data-date');
      openCalendarDayPopup(date);
    });
  });

  // To-Do checkboxes
  container.querySelectorAll('.dash-todo-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.getAttribute('data-id');
      const task = state.tasks.find(t => t.id === id);
      if (task) {
        task.status = cb.checked ? 'Done' : 'Backlog';
        task.updatedAt = Date.now();
        saveState(); markDirty();
        renderDashboard();
      }
    });
  });
}

// ─── STICKY NOTE POPUP ───

function openStickyPopup(idx) {
  if (!state.stickyNotes) state.stickyNotes = [];
  const note = state.stickyNotes[idx];
  if (!note) return;
  const colors = ['#c9a96e', '#e06c75', '#98c379', '#61afef', '#c678dd', '#d19a66'];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:340px;">
      <div class="modal-header" style="background:${note.color};"><span class="modal-title" style="color:#1a1a1a;">Sticky Note</span><button class="modal-close" style="color:#1a1a1a;">&times;</button></div>
      <div class="modal-body">
        <textarea class="modal-input" id="sp-text" rows="4" style="resize:vertical;">${esc(note.text)}</textarea>
        <label style="font-size:10px;color:var(--text3);margin-top:10px;display:block;">Color</label>
        <div class="swatch-row" style="margin-top:4px;">
          ${colors.map(c => `<div class="swatch ${note.color === c ? 'active' : ''}" data-color="${c}" style="background:${c};width:22px;height:22px;"></div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="btn btn-primary btn-sm" id="sp-save">Save</button>
          <button class="btn btn-danger btn-sm" id="sp-delete">Delete</button>
          <button class="btn btn-ghost btn-sm" id="sp-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#sp-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  let selectedColor = note.color;
  overlay.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      selectedColor = sw.getAttribute('data-color');
      overlay.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });

  overlay.querySelector('#sp-save').addEventListener('click', () => {
    note.text = document.getElementById('sp-text').value;
    note.color = selectedColor;
    saveState(); markDirty(); overlay.remove(); renderDashboard();
  });

  overlay.querySelector('#sp-delete').addEventListener('click', () => {
    state.stickyNotes.splice(idx, 1);
    saveState(); markDirty(); overlay.remove(); renderDashboard();
  });
}

function addStickyNote() {
  const colors = ['#c9a96e', '#e06c75', '#98c379', '#61afef', '#c678dd', '#d19a66'];
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:340px;">
      <div class="modal-header"><span class="modal-title">New Sticky Note</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <textarea class="modal-input" id="sn-text" rows="3" placeholder="Write your note..."></textarea>
        <label style="font-size:10px;color:var(--text3);margin-top:10px;display:block;">Color</label>
        <div class="swatch-row" style="margin-top:4px;">
          ${colors.map((c, i) => `<div class="swatch ${i === 0 ? 'active' : ''}" data-color="${c}" style="background:${c};width:22px;height:22px;"></div>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" id="sn-save" style="margin-top:14px;">Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  let selectedColor = colors[0];
  overlay.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      selectedColor = sw.getAttribute('data-color');
      overlay.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
    });
  });

  overlay.querySelector('#sn-save').addEventListener('click', () => {
    const text = document.getElementById('sn-text').value.trim();
    if (!text) return;
    if (!state.stickyNotes) state.stickyNotes = [];
    state.stickyNotes.push({ text, color: selectedColor });
    saveState(); markDirty(); overlay.remove(); renderDashboard();
  });
}

// ─── CALENDAR DAY POPUP ───

function openCalendarDayPopup(date) {
  const dayTasks = state.tasks.filter(t => t.dueDate === date);
  const dayEvents = (state.events || []).filter(e => e.date === date);
  const dateLabel = new Date(date + 'T00:00').toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-header"><span class="modal-title">${dateLabel}</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;margin-bottom:6px;">Tasks due</div>
          ${dayTasks.length === 0 ? '<p style="font-size:11px;color:var(--text3);">No tasks due</p>' :
            dayTasks.map(t => `
              <div class="dash-todo-item" style="padding:4px 0;">
                <span style="font-size:12px;color:var(--text);">${esc(t.title)}</span>
                <div style="display:flex;gap:4px;">
                  <button class="btn btn-sm cal-task-done" data-id="${t.id}">✓</button>
                  <button class="btn btn-sm btn-danger cal-task-del" data-id="${t.id}">×</button>
                </div>
              </div>
            `).join('')}
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;margin-bottom:6px;">Events</div>
          ${dayEvents.length === 0 ? '<p style="font-size:11px;color:var(--text3);">No events</p>' :
            dayEvents.map((ev, i) => `
              <div class="dash-todo-item" style="padding:4px 0;">
                <span style="font-size:12px;color:var(--text);">${esc(ev.title)}</span>
                <button class="btn btn-sm btn-danger cal-event-del" data-idx="${i}" data-date="${date}">×</button>
              </div>
            `).join('')}
        </div>
        <div style="border-top:1px solid var(--border);padding-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm" id="cal-add-task">+ Task</button>
          <button class="btn btn-sm" id="cal-add-event">+ Event</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Mark task done
  overlay.querySelectorAll('.cal-task-done').forEach(btn => {
    btn.addEventListener('click', () => {
      const task = state.tasks.find(t => t.id === btn.getAttribute('data-id'));
      if (task) { task.status = 'Done'; task.updatedAt = Date.now(); saveState(); markDirty(); overlay.remove(); renderDashboard(); }
    });
  });

  // Delete task
  overlay.querySelectorAll('.cal-task-del').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tasks = state.tasks.filter(t => t.id !== btn.getAttribute('data-id'));
      saveState(); markDirty(); overlay.remove(); renderDashboard();
    });
  });

  // Delete event
  overlay.querySelectorAll('.cal-event-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'));
      const d = btn.getAttribute('data-date');
      const eventsOnDay = state.events.filter(e => e.date === d);
      if (eventsOnDay[idx]) {
        state.events = state.events.filter(e => e !== eventsOnDay[idx]);
        saveState(); markDirty(); overlay.remove(); renderDashboard();
      }
    });
  });

  // Add task for this date
  overlay.querySelector('#cal-add-task')?.addEventListener('click', () => {
    const title = prompt('Task title:');
    if (!title) return;
    state.tasks.push({ id: crypto.randomUUID(), title, status: 'Backlog', priority: 'Medium', dueDate: date, tags: [], createdAt: Date.now(), updatedAt: Date.now() });
    saveState(); markDirty(); overlay.remove(); renderDashboard();
  });

  // Add event for this date
  overlay.querySelector('#cal-add-event')?.addEventListener('click', () => {
    const title = prompt('Event title:');
    if (!title) return;
    if (!state.events) state.events = [];
    state.events.push({ id: crypto.randomUUID(), title, date, createdAt: Date.now() });
    saveState(); markDirty(); overlay.remove(); renderDashboard();
  });
}

function prioColor(p) {
  if (p === 'Critical') return 'red';
  if (p === 'High') return 'orange';
  if (p === 'Medium') return 'blue';
  return 'teal';
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
