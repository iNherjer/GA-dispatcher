// VFR Multitool – Service Worker
const CACHE = 'ga-dispatcher-v276';

const STATIC = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './sync.js',
    './profile.js',
    './map.js',
    './board.js',
    './datenbank.js',
    './missions.js',
    './airports.json',
    './manifest.json',
    './Icon.PNG',
    './IconDRK.PNG',
    './icon-192.png',
    './icon-512.png',
    './bg.jpg',
    './board.jpg',
    './map.jpg',
    './pinicon.png',
    './taws-alert.m4a',
    './audio-warnings/aw-achtung.m4a',
    './audio-warnings/aw-in.m4a',
    './audio-warnings/aw-ctr.m4a',
    './audio-warnings/aw-charlie.m4a',
    './audio-warnings/aw-delta.m4a',
    './audio-warnings/aw-rmz.m4a',
    './audio-warnings/aw-tmz.m4a',
    './audio-warnings/aw-edr.m4a',
    './audio-warnings/aw-para.m4a',
    './audio-warnings/aw-freq.m4a',
    './audio-warnings/aw-sqwk.m4a',
    './audio-warnings/aw-komma.m4a',
    './audio-warnings/aw-d0.m4a',
    './audio-warnings/aw-d1.m4a',
    './audio-warnings/aw-d2.m4a',
    './audio-warnings/aw-d3.m4a',
    './audio-warnings/aw-d4.m4a',
    './audio-warnings/aw-d5.m4a',
    './audio-warnings/aw-d6.m4a',
    './audio-warnings/aw-d7.m4a',
    './audio-warnings/aw-d8.m4a',
    './audio-warnings/aw-d9.m4a',
    './audio-warnings/aw-1min.m4a',
    './audio-warnings/aw-2min.m4a',
    './audio-warnings/aw-3min.m4a',
    './audio-warnings/aw-4min.m4a',
    './audio-warnings/aw-5min.m4a',
    './audio-warnings/aw-6min.m4a',
    './audio-warnings/aw-7min.m4a',
    './audio-warnings/aw-8min.m4a',
    './audio-warnings/aw-9min.m4a',
    './audio-warnings/aw-10min.m4a',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    // CDN – html2canvas & jsPDF
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// API-Domains – immer vom Netz holen, nie cachen
const NETWORK_ONLY = [
    'ga-proxy.einherjer.workers.dev',
    'aviationweather.gov',
    'api.codetabs.com',
    'corsproxy.io',
    'api.allorigins.win',
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
