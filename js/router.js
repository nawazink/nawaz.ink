import { state } from './state.js';

let onNavigateCallback = null;

export function onNavigate(cb) {
  onNavigateCallback = cb;
}

export function navigateTo(viewName) {
  // Special cases that don't need view switching
  if (viewName === 'search') {
    if (onNavigateCallback) onNavigateCallback(viewName);
    return;
  }
  if (viewName === 'new-page') {
    if (onNavigateCallback) onNavigateCallback(viewName);
    return;
  }

  const pages = document.querySelectorAll('.page-view');
  pages.forEach(page => {
    page.style.display = 'none';
  });

  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.style.display = '';
  }

  state.currentView = viewName;
  document.title = `nawaz.ink — ${viewName}`;

  // Update breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = `nawaz.ink / ${viewName}`;
  }

  // Update sidebar active state
  const navItems = document.querySelectorAll('#sidebar .nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  const activeNav = document.getElementById(`nav-${viewName}`);
  if (activeNav) {
    activeNav.classList.add('active');
  }

  if (onNavigateCallback) onNavigateCallback(viewName);
}

export function getCurrentView() {
  return state.currentView;
}
