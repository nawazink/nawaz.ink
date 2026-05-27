import { state, saveState, markDirty } from './state.js';

export const ENGINE_CATALOG = {
  books: [
    { id: 'gutenberg', label: 'Gutenberg', url: 'https://www.gutenberg.org/ebooks/search/?query={q}' },
    { id: 'annas', label: "Anna's Archive", url: 'https://annas-archive.org/search?q={q}' },
    { id: 'zlibrary', label: 'Z-Library', url: 'https://z-lib.id/s/{q}' },
    { id: 'libgen', label: 'LibGen', url: 'https://libgen.is/search.php?req={q}' },
    { id: 'openlibrary', label: 'Open Library', url: 'https://openlibrary.org/search?q={q}' }
  ],
  movies: [
    { id: 'letterboxd', label: 'Letterboxd', url: 'https://letterboxd.com/search/{q}/' },
    { id: 'imdb', label: 'IMDb', url: 'https://www.imdb.com/find?q={q}' },
    { id: 'justwatch', label: 'JustWatch', url: 'https://www.justwatch.com/us/search?q={q}' },
    { id: 'rottentomatoes', label: 'Rotten Tomatoes', url: 'https://www.rottentomatoes.com/search?search={q}' }
  ],
  movieReviews: [
    { id: 'rogerebert', label: 'RogerEbert', url: 'https://www.rogerebert.com/search/#stq={q}' },
    { id: 'nytimes', label: 'NYT', url: 'https://www.nytimes.com/search?query={q}+movie+review' }
  ],
  phdScholarships: [
    { id: 'scholarshipportal', label: 'ScholarshipPortal', url: 'https://www.scholarshipportal.com/scholarships/search#{q}' },
    { id: 'opportunitydesk', label: 'OpportunityDesk', url: 'https://opportunitydesk.org/?s={q}' },
    { id: 'google', label: 'Google', url: 'https://www.google.com/search?q={q}+phd+scholarship' }
  ],
  phdLiterature: [
    { id: 'googlescholar', label: 'Scholar', url: 'https://scholar.google.com/scholar?q={q}' },
    { id: 'semanticscholar', label: 'Semantic', url: 'https://www.semanticscholar.org/search?q={q}' },
    { id: 'jstor', label: 'JSTOR', url: 'https://www.jstor.org/action/doBasicSearch?Query={q}' },
    { id: 'arxiv', label: 'arXiv', url: 'https://arxiv.org/search/?query={q}' }
  ],
  phdPrograms: [
    { id: 'phdportal', label: 'PhDportal', url: 'https://www.phdportal.eu/search/?q={q}' },
    { id: 'google-phd', label: 'Google', url: 'https://www.google.com/search?q={q}+phd+program' }
  ]
};

export function getDefaultSearchEngine(category) {
  const engines = ENGINE_CATALOG[category];
  if (!engines || engines.length === 0) return null;
  const pref = state.searchEngines.find(se => se.category === category);
  if (pref) {
    const found = engines.find(e => e.id === pref.engineId);
    if (found) return found;
  }
  return engines[0];
}

export function setDefaultEngine(category, engineId) {
  const idx = state.searchEngines.findIndex(se => se.category === category);
  if (idx >= 0) {
    state.searchEngines[idx].engineId = engineId;
  } else {
    state.searchEngines.push({ category, engineId });
  }
  saveState();
  markDirty();
}

export function openSearch(query, engineId, category) {
  const engines = ENGINE_CATALOG[category];
  if (!engines) return;
  const engine = engines.find(e => e.id === engineId) || engines[0];
  const url = engine.url.replace('{q}', encodeURIComponent(query));
  window.open(url, '_blank');
}

export function renderEngineButtons(containerId, category) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const engines = ENGINE_CATALOG[category] || [];
  const defaultEng = getDefaultSearchEngine(category);

  container.innerHTML = engines.map(e =>
    `<button class="engine-btn ${e.id === defaultEng?.id ? 'active' : ''}" data-id="${e.id}" data-cat="${category}">${e.label}</button>`
  ).join('');

  container.querySelectorAll('.engine-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setDefaultEngine(category, btn.getAttribute('data-id'));
      container.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
