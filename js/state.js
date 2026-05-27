const DB_NAME = 'nawaz-ink-db';
const DB_STORE = 'appState';
const DB_KEY = 'main';

export const state = {
  pages: [],
  characters: [],
  chapters: [],
  world: [],
  tasks: [],
  contacts: [],
  events: [],
  bibliography: [],
  plotBeats: [],
  projects: [],
  wiki: [],
  courses: {
    semesters: [],
    courses: [],
    ui: { semesterId: null, courseId: null }
  },
  trash: [],
  movies: [],
  epubLibrary: [],
  stickyNotes: [],
  finance: { transactions: [], budgets: [], accounts: [], currency: '৳', goals: [] },
  userTags: [],
  searchEngines: [],
  rssFeeds: {},
  cloud: {
    status: 'Local only',
    lastSyncedAt: 0,
    lastError: ''
  },
  writing: {
    dailySeconds: {},
    lastPulseAt: 0,
    lastWordSnapshot: {},
    lastWordSnapshotDay: ''
  },
  activity: {},
  arcade: { points: 0, bests: {} },
  currentPage: null,
  currentView: 'dashboard',
  dbViews: {
    characters: 'gallery',
    chapters: 'table',
    world: 'gallery',
    tasks: 'board',
    contacts: 'table',
    wiki: 'gallery'
  },
  chapFilter: 'all',
  worldFilter: 'all',
  wikiFilter: 'all',
  settings: {
    wsname: 'nawaz.ink',
    fontsize: '16',
    wordgoal: 500,
    mode: 'dark',
    accent: 'green',
    editorfont: 'IBM Plex Mono,monospace',
    autosave: '1',
    cloudEnabled: '1',
    contentw: '720',
    density: 'normal',
    sidebarw: '240',
    editorfontsize: '16',
    showwordcount: '1',
    showclock: '1',
    showdiscover: '1',
    showarcade: '1',
    showscrolltop: '1',
    sidebarcollapsed: '0',
    uibasefont: '13.5',
    radius: '6',
    gamecenterview: 'cards',
    citationFormat: 'mla'
  }
};

let dirty = false;
let saveTimer = null;

let cloudSyncTimer = null;

export function markDirty() {
  dirty = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveState();
  }, 800);
  // Debounced cloud sync (5s after last change)
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    import('./sync.js').then(m => {
      if (state.settings.cloudEnabled === '1') m.syncNow();
    });
  }, 5000);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveState() {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.put(JSON.parse(JSON.stringify(state)), DB_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    dirty = false;
  } catch (err) {
    console.error('[state] saveState failed:', err);
  }
}

export async function loadState() {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.get(DB_KEY);
    const saved = await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (saved) {
      Object.assign(state, saved);
    }
  } catch (err) {
    console.error('[state] loadState failed:', err);
  }
}
