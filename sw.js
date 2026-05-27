const CACHE_NAME = 'nawaz-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/base.css',
  '/css/themes.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/editor.css',
  '/css/arcade.css',
  '/css/density.css',
  '/js/state.js',
  '/js/router.js',
  '/js/auth.js',
  '/js/sidebar.js',
  '/js/topbar.js',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/editor.js',
  '/js/journal.js',
  '/js/story.js',
  '/js/characters.js',
  '/js/chapters.js',
  '/js/world.js',
  '/js/plotbeats.js',
  '/js/projects.js',
  '/js/tasks.js',
  '/js/contacts.js',
  '/js/bibliography.js',
  '/js/courses.js',
  '/js/wiki.js',
  '/js/search-engines.js',
  '/js/phd.js',
  '/js/books.js',
  '/js/movies.js',
  '/js/games.js',
  '/js/timer.js',
  '/js/search.js',
  '/js/settings.js',
  '/js/sync.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for CDN resources
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
