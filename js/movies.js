import { state, saveState, markDirty } from './state.js';
import { renderEngineButtons, getDefaultSearchEngine, openSearch } from './search-engines.js';

const STATUSES = ['Want to Watch', 'Watching', 'Watched'];
const STREAMING = [
  { icon: '🔴', title: 'Netflix', url: 'https://www.netflix.com' },
  { icon: '▶️', title: 'YouTube', url: 'https://www.youtube.com' },
  { icon: '🏰', title: 'Disney+', url: 'https://www.disneyplus.com' },
  { icon: '📦', title: 'Amazon Prime', url: 'https://www.amazon.com/gp/video/storefront' },
  { icon: '🟣', title: 'HBO Max', url: 'https://www.max.com' },
  { icon: '🍎', title: 'Apple TV+', url: 'https://tv.apple.com' },
  { icon: '🎬', title: 'Mubi', url: 'https://mubi.com' },
  { icon: '🎞️', title: 'Criterion Channel', url: 'https://www.criterionchannel.com' }
];

let activeTab = 'My List';
let filterStatus = 'All';

export function renderMovies() {
  const container = document.getElementById('view-movies');
  if (!container) return;

  container.innerHTML = `
    <div class="page-pad" style="max-width:1000px;margin:0 auto;">
      <h1 style="font-size:22px;font-weight:600;color:var(--text);">Movies</h1>
      <div class="view-toggle" style="margin:16px 0;">
        <button class="btn btn-sm ${activeTab === 'My List' ? 'active' : ''}" data-tab="My List">My List</button>
        <button class="btn btn-sm ${activeTab === 'Search' ? 'active' : ''}" data-tab="Search">Search</button>
        <button class="btn btn-sm ${activeTab === 'Now Playing' ? 'active' : ''}" data-tab="Now Playing">Now Playing</button>
      </div>
      <div id="movies-tab-content"></div>
    </div>
  `;

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      renderMovies();
    });
  });

  renderMovieTab();
}

function renderMovieTab() {
  const content = document.getElementById('movies-tab-content');
  if (!content) return;

  if (activeTab === 'My List') renderMyList(content);
  else if (activeTab === 'Search') renderSearchTab(content);
  else renderNowPlaying(content);
}

function renderMyList(content) {
  const movies = state.movies || [];
  const filtered = filterStatus === 'All' ? movies : movies.filter(m => m.status === filterStatus);

  content.innerHTML = `
    <div class="db-filter-bar" style="margin-bottom:12px;">
      ${['All', ...STATUSES].map(s => `<button class="btn btn-sm ${s === filterStatus ? 'active' : ''}" data-filter="${s}">${s}</button>`).join('')}
      <button class="btn btn-primary btn-sm" id="movie-add-btn" style="margin-left:auto;">+ Add movie</button>
    </div>
    <div class="gallery-grid">
      ${filtered.map(m => `
        <div class="movie-card" data-id="${m.id}">
          <div class="movie-card-header">
            <span class="movie-card-title">${esc(m.title)}</span>
            <span class="movie-status-badge tag tag-${movieStatusColor(m.status)}">${esc(m.status)}</span>
          </div>
          <div class="movie-card-year">${m.year || ''} ${m.director ? '· ' + esc(m.director) : ''}</div>
          ${m.rating ? `<div class="movie-rating">${'★'.repeat(m.rating)}${'☆'.repeat(5 - m.rating)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  content.querySelectorAll('.db-filter-bar .btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      filterStatus = btn.getAttribute('data-filter');
      renderMovies();
    });
  });

  document.getElementById('movie-add-btn')?.addEventListener('click', () => openMovieModal(null));
  content.querySelectorAll('.movie-card').forEach(el => {
    el.addEventListener('click', () => openMovieModal(el.getAttribute('data-id')));
  });
}

function renderSearchTab(content) {
  content.innerHTML = `
    <div style="margin-bottom:20px;">
      <p style="font-size:12px;color:var(--text3);margin-bottom:8px;">Movie Search</p>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input class="modal-input" id="movie-search-input" placeholder="Search movies..." style="flex:1;"/>
        <button class="btn btn-primary btn-sm" id="movie-search-go">Search</button>
      </div>
      <div id="movie-engines" class="engine-row"></div>
    </div>
    <div style="margin-bottom:20px;">
      <p style="font-size:12px;color:var(--text3);margin-bottom:8px;">Review Search</p>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input class="modal-input" id="movie-review-input" placeholder="Search reviews..." style="flex:1;"/>
        <button class="btn btn-primary btn-sm" id="movie-review-go">Search</button>
      </div>
      <div id="movie-review-engines" class="engine-row"></div>
    </div>
  `;

  renderEngineButtons('movie-engines', 'movies');
  renderEngineButtons('movie-review-engines', 'movieReviews');

  wireSearch('movie-search-input', 'movie-search-go', 'movies');
  wireSearch('movie-review-input', 'movie-review-go', 'movieReviews');
}

function wireSearch(inputId, btnId, category) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  const doSearch = () => {
    const q = input?.value.trim();
    if (!q) return;
    const eng = getDefaultSearchEngine(category);
    if (eng) openSearch(q, eng.id, category);
  };
  btn?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
}

function renderNowPlaying(content) {
  content.innerHTML = `
    <p style="font-size:12px;color:var(--text3);margin-bottom:12px;">Streaming platforms</p>
    <div class="phd-resource-grid">
      ${STREAMING.map(s => `
        <div class="resource-card" data-url="${s.url}">
          <div class="resource-card-icon">${s.icon}</div>
          <div class="resource-card-title">${s.title}</div>
          <span class="resource-card-open">Open →</span>
        </div>
      `).join('')}
    </div>
  `;

  content.querySelectorAll('.resource-card').forEach(card => {
    card.addEventListener('click', () => window.open(card.getAttribute('data-url'), '_blank'));
  });
}

function openMovieModal(id) {
  if (!state.movies) state.movies = [];
  const existing = id ? state.movies.find(m => m.id === id) : null;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit' : 'Add'} Movie</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Title</label>
        <input class="modal-input" id="mv-title" value="${esc(existing?.title || '')}"/>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
          <div>
            <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Year</label>
            <input class="modal-input" id="mv-year" value="${esc(existing?.year || '')}"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Director</label>
            <input class="modal-input" id="mv-director" value="${esc(existing?.director || '')}"/>
          </div>
        </div>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Genre</label>
        <input class="modal-input" id="mv-genre" value="${esc(existing?.genre || '')}"/>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Status</label>
        <select class="modal-input" id="mv-status">
          ${STATUSES.map(s => `<option ${existing?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Rating (1-5)</label>
        <div class="star-input" id="mv-rating-input">
          ${[1,2,3,4,5].map(n => `<span class="star-btn ${(existing?.rating || 0) >= n ? 'active' : ''}" data-val="${n}">★</span>`).join('')}
        </div>
        <label style="font-size:12px;color:var(--text2);display:block;margin:12px 0 4px;">Notes</label>
        <textarea class="modal-input" id="mv-notes" rows="3" style="resize:vertical;">${esc(existing?.notes || '')}</textarea>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" id="mv-save">Save</button>
          ${existing ? '<button class="btn btn-danger" id="mv-delete">Delete</button>' : ''}
          <button class="btn btn-ghost" id="mv-cancel">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#mv-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  let selectedRating = existing?.rating || 0;
  overlay.querySelectorAll('.star-btn').forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.getAttribute('data-val'));
      overlay.querySelectorAll('.star-btn').forEach((s, i) => {
        s.classList.toggle('active', i < selectedRating);
      });
    });
  });

  overlay.querySelector('#mv-save').addEventListener('click', () => {
    const title = document.getElementById('mv-title').value.trim();
    if (!title) return;
    const data = {
      title,
      year: document.getElementById('mv-year').value.trim(),
      director: document.getElementById('mv-director').value.trim(),
      genre: document.getElementById('mv-genre').value.trim(),
      status: document.getElementById('mv-status').value,
      rating: selectedRating,
      notes: document.getElementById('mv-notes').value
    };
    if (existing) {
      Object.assign(existing, data);
    } else {
      state.movies.push({ id: crypto.randomUUID(), ...data, addedAt: Date.now() });
    }
    saveState(); markDirty();
    overlay.remove();
    renderMovies();
  });

  if (existing) {
    overlay.querySelector('#mv-delete').addEventListener('click', () => {
      state.movies = state.movies.filter(m => m.id !== id);
      saveState(); markDirty();
      overlay.remove();
      renderMovies();
    });
  }
}

function movieStatusColor(s) {
  if (s === 'Watched') return 'green';
  if (s === 'Watching') return 'blue';
  return 'orange';
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
