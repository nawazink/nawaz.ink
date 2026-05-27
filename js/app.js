import { state, loadState, saveState, markDirty } from './state.js';
import { navigateTo, onNavigate } from './router.js';
import { unlockApp, lockApp, checkPassword, getStoredHash, hashPassword, setStoredHash } from './auth.js';
import { initSidebar, buildPageTree } from './sidebar.js';
import { initTopbar } from './topbar.js';
import { renderDashboard } from './dashboard.js';
import { renderJournal } from './journal.js';
import { initEditor } from './editor.js';
import { renderStoryStudio } from './story.js';
import { renderCharacters } from './characters.js';
import { renderChapters } from './chapters.js';
import { renderWorld } from './world.js';
import { renderPlotBeats } from './plotbeats.js';
import { renderProjects } from './projects.js';
import { renderTasks } from './tasks.js';
import { renderContacts } from './contacts.js';
import { renderBibliography } from './bibliography.js';
import { renderCourses } from './courses.js';
import { renderWiki } from './wiki.js';
import { renderPhd } from './phd.js';
import { renderBooks } from './books.js';
import { renderMovies } from './movies.js';
import { renderGameCenter } from './games.js';
import { renderFinance } from './finance.js';
import { initTimer, timerPanelToggle } from './timer.js';
import { renderSettings, applyAppearanceOptions, applyInterfaceOptions, exportData } from './settings.js';
import { openSearchOverlay, closeSearchOverlay, initSearch } from './search.js';
import { startAutoSync, autoSignIn } from './sync.js';
import { SUPABASE_EMAIL } from './sync.js';

function setupAuth() {
  const pwInput = document.getElementById('pw-input');
  const lockBtn = document.getElementById('lock-btn');
  const pwError = document.getElementById('pw-error');

  const handleUnlock = async () => {
    const raw = pwInput.value;
    if (!raw) return;
    lockBtn.textContent = 'Signing in...';
    lockBtn.disabled = true;

    // Try Supabase auth first
    const cloudOk = await autoSignIn(raw);
    if (cloudOk === true) {
      pwError.classList.remove('show');
      // Also set local hash as fallback
      const hash = await hashPassword(raw);
      setStoredHash(hash);
      unlockApp();
      return;
    }

    // Fallback: check local password if Supabase fails (e.g. no internet, lib not loaded)
    const storedHash = getStoredHash();
    if (storedHash) {
      const localOk = await checkPassword(raw);
      if (localOk) {
        pwError.classList.remove('show');
        unlockApp();
        return;
      }
    }

    // First boot with no Supabase — set password locally
    if (!storedHash && !cloudOk) {
      const hash = await hashPassword(raw);
      setStoredHash(hash);
      unlockApp();
      return;
    }

    pwError.textContent = 'Incorrect password';
    pwError.classList.add('show');
    lockBtn.textContent = 'Unlock →';
    lockBtn.disabled = false;
  };

  lockBtn.addEventListener('click', handleUnlock);
  pwInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUnlock(); });
  document.getElementById('nav-lock')?.addEventListener('click', lockApp);

  // Logout: sign out of Supabase and lock
  document.getElementById('nav-logout')?.addEventListener('click', async () => {
    const { cloudSignOut } = await import('./sync.js');
    await cloudSignOut();
    lockApp();
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Global Ctrl+S save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      import('./editor.js').then(m => { m.saveCurrentPage(); });
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearchOverlay(); return; }
    if (e.key === 'Escape') { closeSearchOverlay(); const m = document.querySelector('.modal-overlay'); if (m) m.remove(); return; }
    if (e.altKey) {
      switch (e.key) {
        case '1': e.preventDefault(); navigateTo('dashboard'); break;
        case 'j': case 'J': e.preventDefault(); navigateTo('journal'); break;
        case '2': e.preventDefault(); navigateTo('story-studio'); break;
        case '9': e.preventDefault(); navigateTo('db-tasks'); break;
        case 'd': case 'D': e.preventDefault(); navigateTo('phd'); break;
        case '7': e.preventDefault(); navigateTo('wiki'); break;
        case 'g': case 'G': e.preventDefault(); navigateTo('game-center'); break;
      }
    }
  });
}

function setupScrollTop() {
  const btn = document.getElementById('scroll-top-btn');
  const content = document.getElementById('content');
  if (!btn || !content) return;

  content.addEventListener('scroll', () => {
    btn.classList.toggle('visible', content.scrollTop > 300);
  });

  btn.addEventListener('click', () => {
    content.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function renderTrash() {
  const container = document.getElementById('view-trash');
  if (!container) return;

  container.innerHTML = `
    <div class="page-pad" style="max-width:700px;margin:0 auto;">
      <div class="db-header">
        <h2>Trash Bin</h2>
        <div class="db-header-actions">
          <button class="btn btn-danger btn-sm" id="trash-empty">Empty Trash</button>
        </div>
      </div>
      <div id="trash-list">
        ${state.trash.length === 0 ? '<p style="color:var(--text3);font-size:13px;">Trash is empty</p>' :
          state.trash.map(item => `
            <div class="bib-row">
              <div class="bib-row-main">
                <span class="tag">${item.type || 'item'}</span>
                <span style="color:var(--text);">${esc(item.title || 'Untitled')}</span>
                <span style="font-size:10px;color:var(--text3);">${item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ''}</span>
              </div>
              <div class="bib-row-actions">
                <button class="btn btn-sm trash-restore" data-id="${item.id}">Restore</button>
                <button class="btn btn-sm btn-danger trash-perm-del" data-id="${item.id}">Delete</button>
              </div>
            </div>
          `).join('')}
      </div>
    </div>
  `;

  document.getElementById('trash-empty')?.addEventListener('click', () => {
    if (!confirm('Permanently delete all items in trash?')) return;
    state.trash = [];
    saveState(); markDirty();
    renderTrash();
  });

  container.querySelectorAll('.trash-restore').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = state.trash.find(t => t.id === id);
      if (!item) return;
      state.trash = state.trash.filter(t => t.id !== id);
      // Restore to origin
      if (item.type === 'page' || item.type === 'journal' || item.type === 'chapter') state.pages.push(item.data || item);
      else if (item.type === 'character') state.characters.push(item.data || item);
      else if (item.type === 'wiki') state.wiki.push(item.data || item);
      else if (item.type === 'task') state.tasks.push(item.data || item);
      saveState(); markDirty();
      renderTrash();
    });
  });

  container.querySelectorAll('.trash-perm-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete permanently?')) return;
      const id = btn.getAttribute('data-id');
      state.trash = state.trash.filter(t => t.id !== id);
      saveState(); markDirty();
      renderTrash();
    });
  });
}

function handleNewPage() {
  const page = {
    id: crypto.randomUUID(),
    title: '',
    content: '<p><br></p>',
    type: 'page',
    wordCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.pages.push(page);
  saveState(); markDirty();
  buildPageTree();
  state.currentPage = page.id;
  navigateTo('editor');
}

async function init() {
  await loadState();
  applyAppearanceOptions();
  applyInterfaceOptions();
  setupAuth();
  initSidebar();
  initTopbar();
  initTimer();
  initSearch();
  setupKeyboardShortcuts();
  setupScrollTop();

  // Timer button
  document.getElementById('topbar-timer')?.addEventListener('click', timerPanelToggle);

  // Topbar search
  document.getElementById('topbar-search')?.addEventListener('click', openSearchOverlay);

  // Topbar settings
  document.getElementById('topbar-settings')?.addEventListener('click', () => navigateTo('settings'));

  // Export sidebar button
  document.getElementById('nav-export')?.addEventListener('click', exportData);

  // Route rendering
  onNavigate((view) => {
    if (view === 'dashboard') renderDashboard();
    if (view === 'journal') renderJournal();
    if (view === 'story-studio') renderStoryStudio();
    if (view === 'characters') renderCharacters();
    if (view === 'chapters') renderChapters();
    if (view === 'world') renderWorld();
    if (view === 'plot-beats') renderPlotBeats();
    if (view === 'projects') renderProjects();
    if (view === 'db-tasks') renderTasks();
    if (view === 'contacts') renderContacts();
    if (view === 'bibliography') renderBibliography();
    if (view === 'courses') renderCourses();
    if (view === 'wiki') renderWiki();
    if (view === 'phd') renderPhd();
    if (view === 'books') renderBooks();
    if (view === 'movies') renderMovies();
    if (view === 'game-center') renderGameCenter();
    if (view === 'finance') renderFinance();
    if (view === 'settings') renderSettings();
    if (view === 'trash') renderTrash();
    if (view === 'new-page') handleNewPage();
    if (view === 'search') openSearchOverlay();
    if (view === 'editor') {
      const page = state.pages.find(p => p.id === state.currentPage);
      if (page) initEditor('view-editor', page);
    }
  });

  navigateTo('dashboard');

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Auto sync
  startAutoSync();
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

document.addEventListener('DOMContentLoaded', init);
