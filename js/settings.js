import { state, saveState, markDirty } from './state.js';
import { changePassword } from './auth.js';
import { renderEngineButtons } from './search-engines.js';
import { cloudSignIn, cloudSignOut, syncNow, restoreFromCloud, updateSyncStatus } from './sync.js';

const ACCENT_COLORS = {
  amber: '#d4a843', rose: '#e05090', blue: '#61afef', teal: '#56b6c2',
  green: '#98c379', purple: '#c678dd', lavender: '#a88ce0', mint: '#6dc9a8',
  crimson: '#e05070', pink: '#e06080', orange: '#d19a66', gold: '#c9a96e'
};
const ACCENTS = Object.keys(ACCENT_COLORS);
const MODES = [
  { id: 'dark', label: '🌙 Dark' },
  { id: 'light', label: '✦ Light' },
  { id: 'paper', label: '📄 Paper' },
  { id: 'newspaper', label: '📰 Newspaper' },
  { id: 'warm', label: '🕯️ Warm' },
  { id: 'sepia', label: '📜 Sepia' },
  { id: 'green', label: '🌿 Green' }
];

export function renderSettings() {
  const container = document.getElementById('view-settings');
  if (!container) return;
  const s = state.settings;

  container.innerHTML = `
    <div class="settings-wrap page-pad">
      <h1 style="font-size:20px;font-weight:600;margin-bottom:20px;">Settings</h1>

      <div class="settings-section">
        <div class="settings-section-title">Appearance</div>
        <div class="settings-row">
          <div><span class="settings-row-label">Mode</span><div class="settings-row-desc">Dark, light, sepia, midnight, or green</div></div>
          <div class="view-toggle" id="set-mode" style="flex-wrap:wrap;">${MODES.map(m=>`<button class="btn btn-sm ${s.mode===m.id?'active':''}" data-val="${m.id}">${m.label}</button>`).join('')}</div>
        </div>
        <div class="settings-row">
          <span class="settings-row-label">Accent color</span>
          <div class="swatch-row" id="set-accent">${ACCENTS.map(a=>`<div class="swatch accent-swatch ${s.accent===a?'active':''}" data-val="${a}" style="background:${ACCENT_COLORS[a]};"></div>`).join('')}</div>
        </div>
        <div class="settings-row"><span class="settings-row-label">Layout width</span>
          <select class="modal-input" id="set-contentw" style="max-width:140px;">
            <option value="600" ${s.contentw==='600'?'selected':''}>Narrow</option>
            <option value="720" ${s.contentw==='720'?'selected':''}>Balanced</option>
            <option value="900" ${s.contentw==='900'?'selected':''}>Wide</option>
            <option value="1100" ${s.contentw==='1100'?'selected':''}>XWide</option>
          </select>
        </div>
        <div class="settings-row"><span class="settings-row-label">Editor font size</span>
          <select class="modal-input" id="set-editorfontsize" style="max-width:100px;">
            ${['14','16','18','20'].map(v=>`<option ${s.editorfontsize===v?'selected':''}>${v}px</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Site Control</div>
        <div class="settings-row"><span class="settings-row-label">Density</span>
          <select class="modal-input" id="set-density" style="max-width:130px;">
            <option value="normal" ${s.density==='normal'?'selected':''}>Normal</option>
            <option value="compact" ${s.density==='compact'?'selected':''}>Compact</option>
            <option value="relaxed" ${s.density==='relaxed'?'selected':''}>Relaxed</option>
          </select>
        </div>
        <div class="settings-row"><span class="settings-row-label">UI font size</span>
          <select class="modal-input" id="set-uibasefont" style="max-width:100px;">
            ${['12','13','13.5','14','15'].map(v=>`<option value="${v}" ${s.uibasefont===v?'selected':''}>${v}px</option>`).join('')}
          </select>
        </div>
        <div class="settings-row"><span class="settings-row-label">Corner style</span>
          <select class="modal-input" id="set-radius" style="max-width:120px;">
            <option value="0" ${s.radius==='0'?'selected':''}>Sharp</option>
            <option value="6" ${s.radius==='6'?'selected':''}>Normal</option>
            <option value="12" ${s.radius==='12'?'selected':''}>Round</option>
          </select>
        </div>
        <div class="settings-row"><span class="settings-row-label">Show Discover section</span><input type="checkbox" id="set-showdiscover" ${s.showdiscover==='1'?'checked':''}/></div>
        <div class="settings-row"><span class="settings-row-label">Show Arcade section</span><input type="checkbox" id="set-showarcade" ${s.showarcade==='1'?'checked':''}/></div>
        <div class="settings-row"><span class="settings-row-label">Show scroll-to-top</span><input type="checkbox" id="set-showscrolltop" ${s.showscrolltop==='1'?'checked':''}/></div>
        <div class="settings-row"><span class="settings-row-label">Sidebar starts collapsed</span><input type="checkbox" id="set-sidebarcollapsed" ${s.sidebarcollapsed==='1'?'checked':''}/></div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Interface</div>
        <div class="settings-row"><span class="settings-row-label">Workspace name</span><input class="modal-input" id="set-wsname" value="${esc(s.wsname)}" style="max-width:180px;"/></div>
        <div class="settings-row"><span class="settings-row-label">Daily word goal</span><input class="modal-input" id="set-wordgoal" type="number" value="${s.wordgoal}" style="max-width:100px;"/></div>
        <div class="settings-row"><span class="settings-row-label">Show word count</span><input type="checkbox" id="set-showwordcount" ${s.showwordcount==='1'?'checked':''}/></div>
        <div class="settings-row"><span class="settings-row-label">Show clock</span><input type="checkbox" id="set-showclock" ${s.showclock==='1'?'checked':''}/></div>
        <div class="settings-row"><span class="settings-row-label">Citation format</span>
          <select class="modal-input" id="set-citationformat" style="max-width:130px;">
            <option value="mla" ${s.citationFormat==='mla'?'selected':''}>MLA</option>
            <option value="apa" ${s.citationFormat==='apa'?'selected':''}>APA</option>
            <option value="chicago" ${s.citationFormat==='chicago'?'selected':''}>Chicago</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Search Engines</div>
        <div class="settings-row"><span class="settings-row-label">Books</span><div id="se-books" class="engine-row"></div></div>
        <div class="settings-row"><span class="settings-row-label">Movies</span><div id="se-movies" class="engine-row"></div></div>
        <div class="settings-row"><span class="settings-row-label">PhD Scholarships</span><div id="se-phdScholarships" class="engine-row"></div></div>
        <div class="settings-row"><span class="settings-row-label">PhD Literature</span><div id="se-phdLiterature" class="engine-row"></div></div>
        <div class="settings-row"><span class="settings-row-label">PhD Programs</span><div id="se-phdPrograms" class="engine-row"></div></div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Cloud Sync</div>
        <div class="settings-row"><span class="settings-row-label">Status</span><span id="set-sync-status">${state.cloud.status}</span></div>
        <div class="settings-row">
          <button class="btn btn-sm" id="set-cloud-sync">Sync Now</button>
          <button class="btn btn-sm" id="set-cloud-restore">Restore from Cloud</button>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Security</div>
        <div class="settings-row"><button class="btn btn-sm" id="set-changepw">Change Password</button></div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Data</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm" id="set-export">↓ Export all data</button>
          <button class="btn btn-sm" id="set-import">↑ Import backup</button>
          <button class="btn btn-danger btn-sm" id="set-clear">Clear all data</button>
        </div>
      </div>
    </div>
  `;

  wireSettings(container);
}

function wireSettings(container) {
  // Mode buttons
  container.querySelectorAll('#set-mode .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveSetting('mode', btn.getAttribute('data-val'));
      applyAppearanceOptions();
      renderSettings();
    });
  });

  // Accent swatches
  container.querySelectorAll('.accent-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      saveSetting('accent', sw.getAttribute('data-val'));
      applyAppearanceOptions();
      renderSettings();
    });
  });

  // Selects
  wireSelect('set-contentw', 'contentw', applyAppearanceOptions);
  wireSelect('set-editorfontsize', 'editorfontsize');
  wireSelect('set-density', 'density', applyAppearanceOptions);
  wireSelect('set-uibasefont', 'uibasefont', applyAppearanceOptions);
  wireSelect('set-radius', 'radius', applyAppearanceOptions);
  wireSelect('set-citationformat', 'citationFormat');

  // Checkboxes
  wireCheckbox('set-showdiscover', 'showdiscover', applyInterfaceOptions);
  wireCheckbox('set-showarcade', 'showarcade', applyInterfaceOptions);
  wireCheckbox('set-showscrolltop', 'showscrolltop', applyInterfaceOptions);
  wireCheckbox('set-sidebarcollapsed', 'sidebarcollapsed', applyInterfaceOptions);
  wireCheckbox('set-showwordcount', 'showwordcount', applyInterfaceOptions);
  wireCheckbox('set-showclock', 'showclock', applyInterfaceOptions);
  wireCheckbox('set-cloudenabled', 'cloudEnabled');

  // Text inputs
  const wsname = document.getElementById('set-wsname');
  wsname?.addEventListener('change', () => { saveSetting('wsname', wsname.value); applyInterfaceOptions(); });

  const wordgoal = document.getElementById('set-wordgoal');
  wordgoal?.addEventListener('change', () => { saveSetting('wordgoal', parseInt(wordgoal.value) || 500); });

  // Search engines
  setTimeout(() => {
    renderEngineButtons('se-books', 'books');
    renderEngineButtons('se-movies', 'movies');
    renderEngineButtons('se-phdScholarships', 'phdScholarships');
    renderEngineButtons('se-phdLiterature', 'phdLiterature');
    renderEngineButtons('se-phdPrograms', 'phdPrograms');
  }, 0);

  // Cloud
  document.getElementById('set-cloud-sync')?.addEventListener('click', () => syncNow());
  document.getElementById('set-cloud-restore')?.addEventListener('click', () => restoreFromCloud());

  // Security
  document.getElementById('set-changepw')?.addEventListener('click', openChangePasswordModal);

  // Data
  document.getElementById('set-export')?.addEventListener('click', exportData);
  document.getElementById('set-import')?.addEventListener('click', importData);
  document.getElementById('set-clear')?.addEventListener('click', clearAll);
}

function wireSelect(id, key, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', () => {
    let val = el.value.replace('px', '');
    saveSetting(key, val);
    if (cb) cb();
  });
}

function wireCheckbox(id, key, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', () => {
    saveSetting(key, el.checked ? '1' : '0');
    if (cb) cb();
  });
}

function saveSetting(key, value) {
  state.settings[key] = value;
  saveState();
  markDirty();
}

export function applyAppearanceOptions() {
  const s = state.settings;
  const body = document.body;

  // Mode
  body.classList.remove('light-mode', 'mode-sepia', 'mode-green', 'mode-paper', 'mode-warm', 'mode-newspaper');
  if (s.mode === 'light') body.classList.add('light-mode');
  else if (s.mode === 'paper') body.classList.add('mode-paper');
  else if (s.mode === 'newspaper') body.classList.add('mode-newspaper');
  else if (s.mode === 'warm') body.classList.add('mode-warm');
  else if (s.mode === 'sepia') body.classList.add('mode-sepia');
  else if (s.mode === 'green') body.classList.add('mode-green');

  // Accent
  body.className = body.className.replace(/accent-\w+/g, '').trim();
  if (s.accent) body.classList.add(`accent-${s.accent}`);

  // Density
  body.classList.remove('density-compact', 'density-relaxed');
  if (s.density === 'compact') body.classList.add('density-compact');
  else if (s.density === 'relaxed') body.classList.add('density-relaxed');

  // CSS vars
  document.documentElement.style.setProperty('--content-max', s.contentw + 'px');
  document.documentElement.style.setProperty('--radius', s.radius + 'px');
  document.documentElement.style.setProperty('font-size', s.uibasefont + 'px');
}

export function applyInterfaceOptions() {
  const s = state.settings;

  // Sidebar sections visibility
  const discover = document.querySelector('[data-sidebar-section="discover"]');
  if (discover) discover.style.display = s.showdiscover === '0' ? 'none' : '';

  const arcade = document.querySelector('[data-sidebar-section="arcade"]');
  if (arcade) arcade.style.display = s.showarcade === '0' ? 'none' : '';

  // Scroll-to-top
  const scrollBtn = document.getElementById('scroll-top-btn');
  if (scrollBtn) scrollBtn.style.display = s.showscrolltop === '0' ? 'none' : '';

  // Clock
  const clock = document.querySelector('.topbar-clock');
  if (clock) clock.style.display = s.showclock === '0' ? 'none' : '';

  // Sidebar collapsed
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    if (s.sidebarcollapsed === '1') sidebar.classList.add('collapsed');
    else sidebar.classList.remove('collapsed');
  }

  // Workspace name
  const wsLabel = document.getElementById('ws-name-label');
  if (wsLabel) wsLabel.textContent = s.wsname || 'nawaz.ink';
}

function openChangePasswordModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><span class="modal-title">Change Password</span><button class="modal-close">&times;</button></div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Current password</label>
        <input class="modal-input" id="cpw-old" type="password"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">New password</label>
        <input class="modal-input" id="cpw-new" type="password"/>
        <div id="cpw-error" style="font-size:12px;color:var(--red);margin-top:8px;display:none;">Incorrect current password</div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="cpw-save">Change</button>
          <button class="btn btn-ghost" id="cpw-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#cpw-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#cpw-save').addEventListener('click', async () => {
    const oldPw = document.getElementById('cpw-old').value;
    const newPw = document.getElementById('cpw-new').value;
    if (!oldPw || !newPw) return;
    const ok = await changePassword(oldPw, newPw);
    if (ok) { overlay.remove(); showToast('Password changed'); }
    else { document.getElementById('cpw-error').style.display = 'block'; }
  });
}

export function exportData() {
  const date = new Date().toISOString().slice(0, 10);
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `nawaz-backup-${date}.json`; a.click();
  URL.revokeObjectURL(url);
}

export function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      Object.assign(state, parsed);
      saveState();
      showToast('Data imported successfully');
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      showToast('Import failed: invalid JSON');
    }
  });
  input.click();
}

export function clearAll() {
  if (!confirm('This will delete ALL your data. Are you sure?')) return;
  if (!confirm('Really? This cannot be undone.')) return;
  indexedDB.deleteDatabase('nawaz-ink-db');
  localStorage.clear();
  window.location.reload();
}

function showToast(msg) {
  const existing = document.querySelector('.app-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'app-toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
