import { toggleSidebar } from './sidebar.js';

export function startClock() {
  const tick = () => {
    const clock = document.getElementById('dash-clock');
    const ampm = document.getElementById('dash-ampm');
    if (!clock) return;

    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    clock.textContent = `${String(h).padStart(2, '0')}:${m}:${s}`;
    if (ampm) ampm.textContent = period;
  };
  tick();
  setInterval(tick, 1000);
}

export function updateBreadcrumb(viewName) {
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = `nawaz.ink / ${viewName}`;
  }
}

export function initTopbar() {
  const toggleBtn = document.getElementById('topbar-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebar);
  }
  startClock();
}
