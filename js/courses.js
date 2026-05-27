import { state, saveState, markDirty } from './state.js';
import { initEditor, getEditorContent } from './editor.js';

export function renderCourses() {
  const container = document.getElementById('view-courses');
  if (!container) return;

  const semesters = state.courses.semesters;
  const ui = state.courses.ui;

  if (!ui.semesterId && semesters.length > 0) {
    ui.semesterId = semesters[0].id;
  }

  container.innerHTML = `
    <div class="courses-layout">
      <div class="courses-sidebar">
        <div class="courses-sidebar-header">
          <span style="font-size:13px;font-weight:600;color:var(--text);">Semesters</span>
        </div>
        <div class="courses-semester-list" id="semester-list">
          ${semesters.map(s => `
            <div class="courses-semester-item ${s.id === ui.semesterId ? 'active' : ''}" data-id="${s.id}">
              <span>${esc(s.name)}</span>
              <div style="display:flex;gap:4px;align-items:center;">
                <span style="font-size:10px;color:var(--text3);">${esc(s.year || '')}</span>
                <button class="btn btn-sm sem-edit" data-id="${s.id}" style="font-size:9px;padding:0 4px;">✎</button>
                <button class="btn btn-sm btn-danger sem-del" data-id="${s.id}" style="font-size:9px;padding:0 4px;">×</button>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-sm" id="add-semester-btn" style="margin:10px;">+ New semester</button>
      </div>
      <div class="courses-main" id="courses-main"></div>
    </div>
  `;

  // Wire semester clicks
  container.querySelectorAll('.courses-semester-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('sem-del') || e.target.classList.contains('sem-edit')) return;
      ui.semesterId = el.getAttribute('data-id');
      ui.courseId = null;
      renderCourses();
    });
  });

  document.getElementById('add-semester-btn')?.addEventListener('click', openSemesterModal);

  // Edit semester
  container.querySelectorAll('.sem-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSemesterEditModal(btn.getAttribute('data-id'));
    });
  });

  // Delete semester
  container.querySelectorAll('.sem-del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (!confirm('Delete this semester and all its courses?')) return;
      state.courses.courses = state.courses.courses.filter(c => c.semesterId !== id);
      state.courses.semesters = state.courses.semesters.filter(s => s.id !== id);
      if (state.courses.ui.semesterId === id) state.courses.ui.semesterId = null;
      saveState(); markDirty(); renderCourses();
    });
  });

  renderMainPanel();
}

function renderMainPanel() {
  const main = document.getElementById('courses-main');
  if (!main) return;
  const ui = state.courses.ui;

  if (ui.courseId) {
    renderCourseDetail(main);
  } else if (ui.semesterId) {
    renderSemesterView(main);
  } else {
    main.innerHTML = '<div class="page-pad"><p style="color:var(--text3);">Select or create a semester to begin.</p></div>';
  }
}

function renderSemesterView(main) {
  const ui = state.courses.ui;
  const semester = state.courses.semesters.find(s => s.id === ui.semesterId);
  if (!semester) return;

  const courses = state.courses.courses.filter(c => c.semesterId === ui.semesterId);

  main.innerHTML = `
    <div class="page-pad">
      <div class="db-header">
        <div>
          <h2>${esc(semester.name)}</h2>
          <span style="font-size:12px;color:var(--text3);">${esc(semester.year || '')} · ${esc(semester.semesterType || '')}</span>
        </div>
        <div class="db-header-actions">
          <button class="btn btn-primary btn-sm" id="add-course-btn">+ Add course</button>
        </div>
      </div>
      <div class="gallery-grid course-student-grid">
        ${courses.map(c => {
          const avg = calcAverage(c.grades || []);
          return `
            <div class="course-student-card" data-id="${c.id}">
              <div style="font-size:14px;font-weight:600;color:var(--accent);">${esc(c.code || '')}</div>
              <div style="font-size:13px;color:var(--text);margin-top:4px;">${esc(c.name)}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:6px;">${c.credits || 0} credits · ${avg}%</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('add-course-btn')?.addEventListener('click', openCourseModal);
  main.querySelectorAll('.course-student-card').forEach(el => {
    el.addEventListener('click', () => {
      state.courses.ui.courseId = el.getAttribute('data-id');
      renderCourses();
    });
  });
}

function renderCourseDetail(main) {
  const ui = state.courses.ui;
  const course = state.courses.courses.find(c => c.id === ui.courseId);
  if (!course) { ui.courseId = null; renderMainPanel(); return; }

  const avg = calcAverage(course.grades || []);
  const attendanceCount = (course.attendance || []).length;
  const presentCount = (course.attendance || []).filter(a => a.status === 'Present').length;
  const attendancePct = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : 0;

  main.innerHTML = `
    <div class="page-pad">
      <button class="btn btn-ghost btn-sm" id="course-back">← Back</button>
      <div style="margin-top:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h2>${esc(course.code)} — ${esc(course.name)}</h2>
          <div style="font-size:12px;color:var(--text3);margin-top:4px;">
            ${course.instructor ? `Instructor: ${esc(course.instructor)} · ` : ''}${course.credits || 0} credits
          </div>
        </div>
        <button class="btn btn-danger btn-sm" id="course-delete">Delete course</button>
      </div>
      <div class="view-toggle" style="margin-bottom:16px;">
        <button class="btn btn-sm active" data-tab="grades">Grades</button>
        <button class="btn btn-sm" data-tab="attendance">Attendance</button>
        <button class="btn btn-sm" data-tab="notes">Notes</button>
      </div>
      <div id="course-tab-content"></div>
    </div>
  `;

  document.getElementById('course-back')?.addEventListener('click', () => {
    ui.courseId = null;
    renderCourses();
  });

  document.getElementById('course-delete')?.addEventListener('click', () => {
    if (!confirm('Delete this course?')) return;
    state.courses.courses = state.courses.courses.filter(c => c.id !== ui.courseId);
    ui.courseId = null;
    saveState(); markDirty(); renderCourses();
  });

  const tabs = main.querySelectorAll('.view-toggle .btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.getAttribute('data-tab'), course);
    });
  });

  renderTab('grades', course);
}

function renderTab(tab, course) {
  const content = document.getElementById('course-tab-content');
  if (!content) return;

  if (tab === 'grades') {
    const grades = course.grades || [];
    const avg = calcAverage(grades);
    content.innerHTML = `
      <table class="table-view">
        <thead><tr><th>Component</th><th>Weight (%)</th><th>Score (%)</th><th>Weighted</th><th></th></tr></thead>
        <tbody>
          ${grades.map((g, i) => `
            <tr>
              <td>${esc(g.component)}</td>
              <td>${g.weight}</td>
              <td>${g.score}</td>
              <td>${((g.weight / 100) * g.score).toFixed(1)}</td>
              <td><button class="btn btn-sm btn-danger grade-del" data-idx="${i}" style="padding:0 4px;font-size:9px;">×</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top:12px;font-size:13px;color:var(--text2);">Running average: <strong style="color:var(--accent);">${avg}%</strong></div>
      <button class="btn btn-sm" id="add-grade-btn" style="margin-top:10px;">+ Add component</button>
    `;

    document.getElementById('add-grade-btn')?.addEventListener('click', () => openGradeModal(course));
    content.querySelectorAll('.grade-del').forEach(btn => {
      btn.addEventListener('click', () => {
        course.grades.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveState(); markDirty(); state.courses.ui.courseId = course.id; renderCourses();
      });
    });
  } else if (tab === 'attendance') {
    const attendance = course.attendance || [];
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;

    content.innerHTML = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--text2);">
        Attendance: <strong style="color:var(--accent);">${pct}%</strong> (${present}/${total} sessions)
      </div>
      <div class="attendance-list">
        ${attendance.map((a, i) => `
          <div class="bib-row" style="padding:6px 0;">
            <span style="font-size:12px;color:var(--text);">${a.date}</span>
            <div style="display:flex;gap:4px;align-items:center;">
              <span class="tag tag-${a.status === 'Present' ? 'green' : a.status === 'Late' ? 'orange' : 'red'}">${a.status}</span>
              <button class="btn btn-sm btn-danger att-del" data-idx="${i}" style="padding:0 4px;font-size:9px;">×</button>
            </div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-sm" id="add-attendance-btn" style="margin-top:10px;">+ Mark attendance</button>
    `;

    document.getElementById('add-attendance-btn')?.addEventListener('click', () => openAttendanceModal(course));
    content.querySelectorAll('.att-del').forEach(btn => {
      btn.addEventListener('click', () => {
        course.attendance.splice(parseInt(btn.getAttribute('data-idx')), 1);
        saveState(); markDirty(); state.courses.ui.courseId = course.id; renderCourses();
      });
    });
  } else if (tab === 'notes') {
    content.innerHTML = `<div id="course-notes-editor"></div>`;
    const notesPage = { id: course.id + '-notes', title: 'Course Notes', content: course.notes || '<p><br></p>' };
    initEditor('course-notes-editor', notesPage);

    // Save notes on blur
    const observer = setInterval(() => {
      const area = document.querySelector('#course-notes-editor .editor-area');
      if (area) {
        clearInterval(observer);
        area.addEventListener('blur', () => {
          course.notes = area.innerHTML;
          saveState(); markDirty();
        });
      }
    }, 200);
  }
}

function calcAverage(grades) {
  if (!grades.length) return 0;
  const totalWeight = grades.reduce((s, g) => s + (g.weight || 0), 0);
  if (totalWeight === 0) return 0;
  const weighted = grades.reduce((s, g) => s + ((g.weight / 100) * g.score), 0);
  return weighted.toFixed(1);
}

function openSemesterModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">New Semester</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Name</label>
        <input class="modal-input" id="sm-name" placeholder="e.g. Fall 2025"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Year</label>
        <input class="modal-input" id="sm-year"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Type</label>
        <select class="modal-input" id="sm-type">
          <option>Fall</option><option>Spring</option><option>Summer</option>
        </select>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="sm-save">Create</button>
          <button class="btn btn-ghost" id="sm-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#sm-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#sm-save').addEventListener('click', () => {
    const name = document.getElementById('sm-name').value.trim();
    if (!name) return;
    state.courses.semesters.push({
      id: crypto.randomUUID(),
      name,
      year: document.getElementById('sm-year').value.trim(),
      semesterType: document.getElementById('sm-type').value
    });
    saveState(); markDirty();
    overlay.remove();
    renderCourses();
  });
}

function openSemesterEditModal(id) {
  const semester = state.courses.semesters.find(s => s.id === id);
  if (!semester) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Edit Semester</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Name</label>
        <input class="modal-input" id="sme-name" value="${esc(semester.name)}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Year</label>
        <input class="modal-input" id="sme-year" value="${esc(semester.year || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Type</label>
        <select class="modal-input" id="sme-type">
          <option ${semester.semesterType === 'Fall' ? 'selected' : ''}>Fall</option>
          <option ${semester.semesterType === 'Spring' ? 'selected' : ''}>Spring</option>
          <option ${semester.semesterType === 'Summer' ? 'selected' : ''}>Summer</option>
        </select>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="sme-save">Save</button>
          <button class="btn btn-ghost" id="sme-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#sme-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#sme-save').addEventListener('click', () => {
    semester.name = document.getElementById('sme-name').value.trim() || semester.name;
    semester.year = document.getElementById('sme-year').value.trim();
    semester.semesterType = document.getElementById('sme-type').value;
    saveState(); markDirty(); overlay.remove(); renderCourses();
  });
}

function openCourseModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">New Course</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Course code</label>
        <input class="modal-input" id="cm-code" placeholder="e.g. CS301"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Name</label>
        <input class="modal-input" id="cm-name"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Instructor</label>
        <input class="modal-input" id="cm-inst"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Credits</label>
        <input class="modal-input" id="cm-credits" type="number" value="3"/>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="cm-save">Create</button>
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
    const code = document.getElementById('cm-code').value.trim();
    const name = document.getElementById('cm-name').value.trim();
    if (!name) return;
    state.courses.courses.push({
      id: crypto.randomUUID(),
      semesterId: state.courses.ui.semesterId,
      code,
      name,
      instructor: document.getElementById('cm-inst').value.trim(),
      credits: parseInt(document.getElementById('cm-credits').value) || 3,
      grades: [],
      attendance: [],
      notes: ''
    });
    saveState(); markDirty();
    overlay.remove();
    renderCourses();
  });
}

function openGradeModal(course) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Add Grade Component</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Component name</label>
        <input class="modal-input" id="gm-comp" placeholder="e.g. Midterm"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Weight (%)</label>
        <input class="modal-input" id="gm-weight" type="number" value="20"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Score (%)</label>
        <input class="modal-input" id="gm-score" type="number" value="0"/>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="gm-save">Add</button>
          <button class="btn btn-ghost" id="gm-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#gm-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#gm-save').addEventListener('click', () => {
    const component = document.getElementById('gm-comp').value.trim();
    if (!component) return;
    if (!course.grades) course.grades = [];
    course.grades.push({
      component,
      weight: parseFloat(document.getElementById('gm-weight').value) || 0,
      score: parseFloat(document.getElementById('gm-score').value) || 0
    });
    saveState(); markDirty();
    overlay.remove();
    renderCourses();
    // Re-select course
    state.courses.ui.courseId = course.id;
    renderCourses();
  });
}

function openAttendanceModal(course) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Mark Attendance</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Date</label>
        <input class="modal-input" id="am-date" type="date" value="${new Date().toISOString().slice(0,10)}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Status</label>
        <select class="modal-input" id="am-status">
          <option>Present</option><option>Late</option><option>Absent</option>
        </select>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="am-save">Save</button>
          <button class="btn btn-ghost" id="am-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#am-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#am-save').addEventListener('click', () => {
    if (!course.attendance) course.attendance = [];
    course.attendance.push({
      date: document.getElementById('am-date').value,
      status: document.getElementById('am-status').value
    });
    saveState(); markDirty();
    overlay.remove();
    state.courses.ui.courseId = course.id;
    renderCourses();
  });
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
