import { state, saveState, markDirty } from './state.js';
import { navigateTo } from './router.js';

export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isMobile = window.innerWidth <= 700;

  if (isMobile) {
    const isOpen = sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('show', isOpen);
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

export function closeSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.remove('mobile-open');
  if (overlay) overlay.classList.remove('show');
}

export function toggleSidebarSection(key) {
  const section = document.querySelector(`.sidebar-section[data-sidebar-section="${key}"]`);
  if (!section) return;
  section.classList.toggle('collapsed');
  const isCollapsed = section.classList.contains('collapsed');
  localStorage.setItem(`sidebar_sec_${key}`, isCollapsed ? '1' : '0');
}

export function restoreSidebarSections() {
  const sections = document.querySelectorAll('.sidebar-section[data-sidebar-section]');
  sections.forEach(section => {
    const key = section.getAttribute('data-sidebar-section');
    const saved = localStorage.getItem(`sidebar_sec_${key}`);
    if (saved === '1') {
      section.classList.add('collapsed');
    } else if (saved === '0') {
      section.classList.remove('collapsed');
    }
  });
}

export function buildPageTree() {
  const container = document.getElementById('page-tree');
  if (!container) return;
  container.innerHTML = '';

  state.pages.filter(p => p.type !== 'journal' && p.type !== 'chapter').forEach(page => {
    const item = document.createElement('div');
    item.className = 'nav-item page-tree-item';
    item.innerHTML = `<span class="nav-icon">📄</span><span class="nav-label">${page.title || 'Untitled'}</span><button class="page-tree-del" data-id="${page.id}">×</button>`;
    item.querySelector('.nav-label').addEventListener('click', () => {
      state.currentPage = page.id;
      navigateTo('editor');
    });
    item.querySelector('.page-tree-del').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${page.title || 'Untitled'}"?`)) return;
      // Move to trash
      if (!state.trash) state.trash = [];
      state.trash.push({ id: page.id, title: page.title, type: page.type || 'page', data: page, deletedAt: Date.now() });
      state.pages = state.pages.filter(p => p.id !== page.id);
      saveState(); markDirty();
      buildPageTree();
    });
    container.appendChild(item);
  });
}

export function initSidebar() {
  restoreSidebarSections();
  buildPageTree();

  // Wire section toggles
  const sectionLabels = document.querySelectorAll('.sidebar-section-label');
  sectionLabels.forEach(label => {
    label.addEventListener('click', () => {
      const section = label.closest('.sidebar-section');
      if (section) {
        const key = section.getAttribute('data-sidebar-section');
        toggleSidebarSection(key);
      }
    });
  });

  // Wire nav items
  const navItems = document.querySelectorAll('#sidebar .nav-item[data-view]');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      navigateTo(view);
      closeSidebarMobile();
    });
  });

  // Mobile overlay close
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeSidebarMobile);
  }
}
