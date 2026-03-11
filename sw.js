// GA Dispatcher – Service Worker
const CACHE = 'ga-dispatcher-v26';

const STATIC = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './datenbank.js',
    './missions.js',
    './manifest.json',
    './Icon.PNG',
    './IconDRK.PNG',
    './icon-192.png',
    './icon-512.png',
    './bg.jpg',
    './board.jpg',
    './map.jpg',
    './pinicon.png',
    // CDN – Leaflet
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    // CDN – html2canvas & jsPDF
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// API-Domains – immer vom Netz holen, nie cachen
const NETWORK_ONLY = [
    'ga-proxy.einherjer.workers.dev',
    'api.open-meteo.com',
    'nominatim.openstreetmap.org',
    'opensky-network.org',
    'tile.openstreetmap.org'
];

// ── Install: statische Dateien vorab cachen ──────────────────────────────────
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting())
    );
});

// ── Activate: alte Caches löschen ────────────────────────────────────────────
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: Cache-First für Statisches, Network-Only für APIs ─────────────────
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Network-Only für API-Calls
    if (NETWORK_ONLY.some(d => url.hostname.includes(d))) return;

    // Leaflet-Kacheln immer live holen
    if (url.hostname.includes('tile.') || url.pathname.includes('/tiles/')) return;

    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(response => {
                // Nur gültige GET-Responses cachen
                if (!response || response.status !== 200 || e.request.method !== 'GET') return response;
                const clone = response.clone();
                caches.open(CACHE).then(cache => cache.put(e.request, clone));
                return response;
            }).catch(() => cached); // Offline-Fallback: gecachte Version
        })
    );
});
