import { state, saveState, markDirty } from './state.js';
import { renderEngineButtons, getDefaultSearchEngine, openSearch } from './search-engines.js';

const BOOK_SOURCES = [
  { icon: '📖', title: 'Project Gutenberg', desc: '70,000+ free public domain books', url: 'https://www.gutenberg.org' },
  { icon: '📚', title: "Anna's Archive", desc: "World's largest shadow library", url: 'https://annas-archive.org' },
  { icon: '📕', title: 'Z-Library', desc: 'Millions of books and articles', url: 'https://z-lib.id' },
  { icon: '🎓', title: 'Library Genesis', desc: 'Academic books and papers', url: 'https://libgen.is' },
  { icon: '🌐', title: 'Open Library', desc: "Internet Archive's book catalog", url: 'https://openlibrary.org' },
  { icon: '✨', title: 'Standard Ebooks', desc: 'Polished public domain ebooks', url: 'https://standardebooks.org' },
  { icon: '📱', title: 'ManyBooks', desc: 'Free ebooks in many formats', url: 'https://manybooks.net' }
];

let activeTab = 'search';

export function renderBooks() {
  const container = document.getElementById('view-books');
  if (!container) return;

  container.innerHTML = `
    <div class="page-pad" style="max-width:1000px;margin:0 auto;">
      <h1 style="font-size:22px;font-weight:600;color:var(--text);">Books</h1>
      <p style="font-size:13px;color:var(--text3);margin-bottom:16px;">Free book search, epub library, and reader</p>

      <div class="view-toggle" style="margin-bottom:16px;">
        <button class="btn btn-sm ${activeTab === 'search' ? 'active' : ''}" data-tab="search">Search</button>
        <button class="btn btn-sm ${activeTab === 'library' ? 'active' : ''}" data-tab="library">My Library</button>
        <button class="btn btn-sm ${activeTab === 'reader' ? 'active' : ''}" data-tab="reader">Reader</button>
      </div>

      <div id="books-tab-content"></div>
    </div>
  `;

  container.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.getAttribute('data-tab');
      renderBooks();
    });
  });

  if (activeTab === 'search') renderSearchTab();
  else if (activeTab === 'library') renderLibraryTab();
  else if (activeTab === 'reader') renderReaderTab();
}

function renderSearchTab() {
  const content = document.getElementById('books-tab-content');
  if (!content) return;

  content.innerHTML = `
    <div class="search-bar-row" style="margin-bottom:16px;">
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <input class="modal-input" id="books-search-input" placeholder="Search for books..." style="flex:1;"/>
        <button class="btn btn-primary btn-sm" id="books-search-go">Search</button>
        <button class="btn btn-ghost btn-sm" id="books-clear">Clear</button>
      </div>
      <div id="books-engines" class="engine-row"></div>
    </div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:10px;">Free libraries & archives</p>
    <div class="phd-resource-grid">
      ${BOOK_SOURCES.map(r => `
        <div class="resource-card" data-url="${r.url}">
          <div class="resource-card-icon">${r.icon}</div>
          <div class="resource-card-title">${r.title}</div>
          <div class="resource-card-desc">${r.desc}</div>
          <span class="resource-card-open">Open →</span>
        </div>
      `).join('')}
    </div>
  `;

  renderEngineButtons('books-engines', 'books');

  const input = document.getElementById('books-search-input');
  const goBtn = document.getElementById('books-search-go');
  const clearBtn = document.getElementById('books-clear');

  const doSearch = () => {
    const q = input?.value.trim();
    if (!q) return;
    const eng = getDefaultSearchEngine('books');
    if (eng) openSearch(q, eng.id, 'books');
  };

  goBtn?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  clearBtn?.addEventListener('click', () => { if (input) input.value = ''; });

  document.getElementById('books-tab-content')?.querySelectorAll('.resource-card').forEach(card => {
    card.addEventListener('click', () => window.open(card.getAttribute('data-url'), '_blank'));
  });
}

function renderLibraryTab() {
  const content = document.getElementById('books-tab-content');
  if (!content) return;

  if (!state.epubLibrary) state.epubLibrary = [];

  content.innerHTML = `
    <div class="db-header" style="margin-bottom:16px;">
      <span style="font-size:13px;color:var(--text2);">${state.epubLibrary.length} book${state.epubLibrary.length !== 1 ? 's' : ''} in library</span>
      <button class="btn btn-primary btn-sm" id="epub-upload-btn">📂 Upload EPUB</button>
    </div>
    <div class="gallery-grid" id="epub-library-grid">
      ${state.epubLibrary.length === 0 ? '<p style="color:var(--text3);font-size:12px;">No books yet. Upload an EPUB to start reading.</p>' :
        state.epubLibrary.map(book => `
          <div class="epub-book-card" data-id="${book.id}">
            <div class="epub-book-icon">📕</div>
            <div class="epub-book-title">${esc(book.title || 'Untitled')}</div>
            <div class="epub-book-author">${esc(book.author || 'Unknown author')}</div>
            ${book.progress ? `<div class="epub-book-progress"><div class="epub-book-progress-fill" style="width:${book.progress}%"></div></div>` : ''}
            <div class="epub-book-actions">
              <button class="btn btn-sm epub-read" data-id="${book.id}">Read</button>
              <button class="btn btn-sm btn-danger epub-remove" data-id="${book.id}">×</button>
            </div>
          </div>
        `).join('')}
    </div>
  `;

  document.getElementById('epub-upload-btn')?.addEventListener('click', uploadEpub);

  content.querySelectorAll('.epub-read').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      openEpubReader(id);
    });
  });

  content.querySelectorAll('.epub-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (confirm('Remove this book from library?')) {
        state.epubLibrary = state.epubLibrary.filter(b => b.id !== id);
        // Remove stored data
        localStorage.removeItem(`epub_data_${id}`);
        saveState(); markDirty();
        renderLibraryTab();
      }
    });
  });
}

function uploadEpub() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.epub';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    // Read as base64 for storage
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target.result;
      const id = crypto.randomUUID();

      // Store the epub data in localStorage (separate from state to keep state small)
      try {
        localStorage.setItem(`epub_data_${id}`, data);
      } catch (err) {
        alert('File too large for browser storage. Try a smaller EPUB.');
        return;
      }

      // Try to extract title from filename
      const title = file.name.replace(/\.epub$/i, '').replace(/[_-]/g, ' ');

      if (!state.epubLibrary) state.epubLibrary = [];
      state.epubLibrary.push({
        id,
        title,
        author: '',
        filename: file.name,
        addedAt: Date.now(),
        progress: 0,
        currentCfi: ''
      });

      saveState(); markDirty();
      renderLibraryTab();
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

function openEpubReader(id) {
  activeTab = 'reader';
  state._currentEpubId = id;
  renderBooks();
}

function renderReaderTab() {
  const content = document.getElementById('books-tab-content');
  if (!content) return;

  const bookId = state._currentEpubId;
  const book = bookId ? (state.epubLibrary || []).find(b => b.id === bookId) : null;

  if (!book) {
    content.innerHTML = `
      <div style="text-align:center;padding:40px 0;">
        <p style="font-size:48px;margin-bottom:12px;">📖</p>
        <p style="color:var(--text2);font-size:14px;">No book selected</p>
        <p style="color:var(--text3);font-size:12px;margin-top:6px;">Go to "My Library" and click "Read" on a book</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="epub-reader-wrap">
      <div class="epub-reader-header">
        <button class="btn btn-ghost btn-sm" id="epub-back-lib">← Library</button>
        <span class="epub-reader-title">${esc(book.title)}</span>
        <div class="epub-reader-controls">
          <button class="btn btn-sm" id="epub-prev">← Prev</button>
          <button class="btn btn-sm" id="epub-next">Next →</button>
          <button class="btn btn-sm" id="epub-toc">☰ TOC</button>
          <select class="modal-input" id="epub-font-size" style="max-width:80px;font-size:11px;padding:3px 6px;">
            <option value="14">14px</option>
            <option value="16" selected>16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="22">22px</option>
          </select>
        </div>
      </div>
      <div id="epub-viewer" class="epub-viewer"></div>
      <div id="epub-toc-panel" class="epub-toc-panel" style="display:none;"></div>
    </div>
  `;

  document.getElementById('epub-back-lib')?.addEventListener('click', () => {
    activeTab = 'library';
    renderBooks();
  });

  // Load epub using epub.js
  loadEpubViewer(book);
}

async function loadEpubViewer(book) {
  const dataUrl = localStorage.getItem(`epub_data_${book.id}`);
  if (!dataUrl) {
    document.getElementById('epub-viewer').innerHTML = '<p style="color:var(--red);padding:20px;">Book data not found. It may have been cleared from storage.</p>';
    return;
  }

  // Check if ePub.js is loaded
  if (!window.ePub) {
    document.getElementById('epub-viewer').innerHTML = '<p style="color:var(--text2);padding:20px;">Loading epub reader...</p>';
    // Load epub.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js';
    script.onload = () => initEpubReader(book, dataUrl);
    script.onerror = () => {
      document.getElementById('epub-viewer').innerHTML = '<p style="color:var(--red);padding:20px;">Failed to load epub reader library. Check your internet connection.</p>';
    };
    document.head.appendChild(script);
  } else {
    initEpubReader(book, dataUrl);
  }
}

function initEpubReader(book, dataUrl) {
  const viewer = document.getElementById('epub-viewer');
  if (!viewer || !window.ePub) return;

  // Convert data URL to array buffer
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const epubBook = ePub(bytes.buffer);
  const rendition = epubBook.renderTo(viewer, {
    width: '100%',
    height: '100%',
    flow: 'paginated',
    spread: 'none'
  });

  // Apply theme
  rendition.themes.default({
    body: { color: getComputedStyle(document.body).getPropertyValue('--text').trim() || '#e8e8e8', background: 'transparent', 'font-family': "'IBM Plex Mono', monospace", 'line-height': '1.8' },
    a: { color: getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#98c379' }
  });

  // Display from saved position or start
  if (book.currentCfi) {
    rendition.display(book.currentCfi);
  } else {
    rendition.display();
  }

  // Navigation
  document.getElementById('epub-prev')?.addEventListener('click', () => rendition.prev());
  document.getElementById('epub-next')?.addEventListener('click', () => rendition.next());

  // Keyboard
  rendition.on('keydown', (e) => {
    if (e.key === 'ArrowLeft') rendition.prev();
    if (e.key === 'ArrowRight') rendition.next();
  });
  document.addEventListener('keydown', function epubNav(e) {
    if (activeTab !== 'reader') { document.removeEventListener('keydown', epubNav); return; }
    if (e.key === 'ArrowLeft') rendition.prev();
    if (e.key === 'ArrowRight') rendition.next();
  });

  // Save position on page change
  rendition.on('relocated', (location) => {
    book.currentCfi = location.start.cfi;
    if (epubBook.locations && epubBook.locations.length()) {
      book.progress = Math.round(epubBook.locations.percentageFromCfi(location.start.cfi) * 100);
    }
    saveState();
  });

  // Generate locations for progress
  epubBook.ready.then(() => {
    return epubBook.locations.generate(1600);
  });

  // Extract metadata
  epubBook.loaded.metadata.then(meta => {
    if (meta.title && !book.author) {
      book.title = meta.title || book.title;
      book.author = meta.creator || '';
      saveState();
      const titleEl = document.querySelector('.epub-reader-title');
      if (titleEl) titleEl.textContent = book.title;
    }
  });

  // Font size control
  document.getElementById('epub-font-size')?.addEventListener('change', (e) => {
    rendition.themes.fontSize(e.target.value + 'px');
  });

  // TOC
  document.getElementById('epub-toc')?.addEventListener('click', () => {
    const panel = document.getElementById('epub-toc-panel');
    if (!panel) return;
    if (panel.style.display === 'none') {
      epubBook.loaded.navigation.then(nav => {
        panel.innerHTML = `<div class="epub-toc-header">Table of Contents</div>` +
          nav.toc.map(ch => `<div class="epub-toc-item" data-href="${ch.href}">${esc(ch.label.trim())}</div>`).join('');
        panel.querySelectorAll('.epub-toc-item').forEach(item => {
          item.addEventListener('click', () => {
            rendition.display(item.getAttribute('data-href'));
            panel.style.display = 'none';
          });
        });
      });
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
  });
}

function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
