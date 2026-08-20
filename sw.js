// Service worker "brise-cache" de l'app-coquille (shell) de Terrain.
//
// IMPORTANT — déviation volontaire par rapport au modèle brise-cache habituel :
// les données de circuits téléchargées pour un usage hors-ligne vivent dans des
// caches séparés, nommés "terrain-circuit-<slug>" (un par circuit, voir index.html).
// Ces caches ne doivent JAMAIS être purgés lors d'une mise à jour de l'app, sous
// peine d'effacer des circuits déjà téléchargés (et donc la préparation d'une
// sortie terrain). Seuls les anciens caches "terrain-cache-*" (le shell applicatif)
// sont purgés ci-dessous.

const CACHE_NAME = 'terrain-cache-v2';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/sql-wasm.js',
  './vendor/sql-wasm.wasm',
  './vendor/jszip.min.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('terrain-cache-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
          // les caches "terrain-circuit-*" ne sont jamais listés ici : ils survivent
          // à toutes les mises à jour de l'app.
        )
      )
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }

  // Ne jamais intercepter les requêtes vers un paquet de circuit (autre origine,
  // ou chemin de données) : elles sont gérées explicitement par l'app via
  // caches.open('terrain-circuit-<slug>') / cache.put(), pas par ce SW.
  if (url.origin !== self.location.origin) return;

  const isShellAsset = PRECACHE_ASSETS.some((p) => new URL(p, self.location.href).pathname === url.pathname);

  if (request.mode === 'navigate' || isShellAsset && /\.(html|js|css|json)$/.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  if (isShellAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
  // toute autre requête (fetch de paquet de circuit, géolocation, etc.) : laissée
  // passer normalement, non interceptée.
});
