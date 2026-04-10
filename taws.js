/* === TAWS - Terrain Awareness & Warning System (v1) === */
/* Nutzt kostenlose Terrarium RGB Tiles (AWS Open Data)    */
/* Kein API-Key, keine Rate-Limits                         */

const TAWS_TILE_ZOOM = 10;
const TAWS_TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const TAWS_SAFETY_RED = 500;     // ft - TERRAIN WARNING
const TAWS_SAFETY_AMBER = 1000;  // ft - TERRAIN CAUTION
const TAWS_CACHE_MAX = 50;

// Tile-Cache: Map<"z/x/y", { imageData, ts }>
const _tawsTileCache = new Map();
// Offscreen-Canvas fuer Pixel-Sampling
const _tawsCanvas = document.createElement('canvas');
_tawsCanvas.width = 256;
_tawsCanvas.height = 256;
const _tawsCtx = _tawsCanvas.getContext('2d', { willReadFrequently: true });

// Voice-Alert Cooldown (verhindert Spam)
let _tawsLastVoiceAlert = 0;
const TAWS_VOICE_COOLDOWN = 15000; // 15 Sekunden

// ── Audio-System (iOS-sicher via AudioContext) ────────────────────────────────
// speechSynthesis funktioniert im iOS-PWA-Modus nicht zuverlässig.
// Primärer Alert: AudioContext-Synthesizer (identisch zum Mini-Spiel → funktioniert).
// Sekundär: speechSynthesis als Desktop-Fallback.

let _tawsAudioCtx = null;
let _tawsSpeechUnlocked = false;

// Master-Lautstärke (0–1), persistent via localStorage
let _awmVolume = Math.min(1, Math.max(0, parseFloat(localStorage.getItem('awm_volume') ?? '1')));
let _awmMasterGain = null;

// Von index.html Slider aufgerufen
window.awmSetVolume = function(val) {
    _awmVolume = Math.min(1, Math.max(0, val / 100));
    if (_awmMasterGain) _awmMasterGain.gain.value = _awmVolume;
    localStorage.setItem('awm_volume', _awmVolume);
    const lbl = document.getElementById('awmVolumeLabel');
    if (lbl) lbl.textContent = Math.round(val) + '%';
};

function _tawsInitAudio() {
    if (!_tawsAudioCtx) {
        try {
            _tawsAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { _tawsAudioCtx = null; }
    }
    // Master-GainNode für Lautstärkeregelung aller Audio-Ausgaben
    if (_tawsAudioCtx && !_awmMasterGain) {
        _awmMasterGain = _tawsAudioCtx.createGain();
        _awmMasterGain.gain.value = _awmVolume;
        _awmMasterGain.connect(_tawsAudioCtx.destination);
    }
    // Alle Clips laden sobald AudioContext bereit — inkl. taws-alert (kein HTMLAudioElement mehr)
    if (!_awLoaded && !_awLoading) _awLoadClips();
}

// Intern: AudioContext aufwecken und danach callback ausführen
function _tawsResumeThen(fn) {
    if (!_tawsAudioCtx) return;
    if (_tawsAudioCtx.state === 'suspended') {
        console.warn('[TAWS] AudioContext noch suspended beim Playback — resume() ohne User-Gesture!');
        _tawsAudioCtx.resume().then(fn).catch(() => {});
    } else {
        fn();
    }
}

// "Whoop Whoop" – klassischer GPWS-Warntton (zwei aufsteigende Sweeps)
function _tawsPlayWhoopWhoop() {
    if (!_tawsAudioCtx) return;
    _tawsResumeThen(() => {
        const now = _tawsAudioCtx.currentTime;
        for (let i = 0; i < 2; i++) {
            const osc  = _tawsAudioCtx.createOscillator();
            const gain = _tawsAudioCtx.createGain();
            osc.connect(gain);
            gain.connect(_awmMasterGain || _tawsAudioCtx.destination);
            osc.type = 'sine';
            const t = now + i * 0.65;
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.linearRampToValueAtTime(920, t + 0.45);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.85, t + 0.05);
            gain.gain.setValueAtTime(0.85, t + 0.40);
            gain.gain.linearRampToValueAtTime(0, t + 0.55);
            osc.start(t);
            osc.stop(t + 0.6);
        }
    });
}

function _tawsUnlockAll() {
    _tawsInitAudio();
    // iOS PFLICHT: AudioContext.resume() MUSS aus einem User-Gesture-Handler heraus
    // aufgerufen werden. Danach bleibt der Context 'running' und kann jederzeit
    // per _tawsResumeThen() verwendet werden.
    if (_tawsAudioCtx && _tawsAudioCtx.state === 'suspended') {
        _tawsAudioCtx.resume().catch(() => {});
    }
    if (!_tawsSpeechUnlocked && typeof speechSynthesis !== 'undefined') {
        _tawsSpeechUnlocked = true;
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
    }
}
document.addEventListener('touchstart', _tawsUnlockAll, { once: true, passive: true });
document.addEventListener('click',      _tawsUnlockAll, { once: true });

// ── Airspace Warning Module (AWM) ─────────────────────────────────────────────
// Spielt dynamisch zusammengesetzte Ansagen via AudioContext ab (iOS-sicher).
// Clips: audio-warnings/aw-*.m4a — erzeugt mit Anna Premium de_DE.

const _AWM_CLIPS = [
    'aw-achtung','aw-in',
    'aw-ctr','aw-charlie','aw-delta','aw-rmz','aw-tmz','aw-edr','aw-para',
    'aw-1min','aw-2min','aw-3min','aw-4min','aw-5min',
    'aw-6min','aw-7min','aw-8min','aw-9min','aw-10min',
    // Frequenz-/Squawk-Ansage
    'aw-freq','aw-sqwk','aw-komma',
    'aw-d0','aw-d1','aw-d2','aw-d3','aw-d4',
    'aw-d5','aw-d6','aw-d7','aw-d8','aw-d9',
    'taws-alert'
];

// Frequenz-Ansage an/aus (default: an), persistent
let _awmReadFreq = (localStorage.getItem('awm_read_freq') !== '0');
window.awmSetReadFreq = function(on) {
    _awmReadFreq = !!on;
    localStorage.setItem('awm_read_freq', on ? '1' : '0');
};

// Frequenz-/Squawk-String → Clip-Keys (mit "Zwo" für 2)
function _awFreqToClips(valueStr, isSquawk) {
    const digitKey = ['aw-d0','aw-d1','aw-d2','aw-d3','aw-d4',
                      'aw-d5','aw-d6','aw-d7','aw-d8','aw-d9'];
    const prefix = isSquawk ? 'aw-sqwk' : 'aw-freq';
    const clips = [prefix];
    // Trailing-Nullen nach dem Komma entfernen (130.000 → 130)
    let s = valueStr.toString().trim().replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    for (const ch of s) {
        if (ch >= '0' && ch <= '9') clips.push(digitKey[parseInt(ch)]);
        else if (ch === '.' || ch === ',') clips.push('aw-komma');
        // Sonstige Zeichen (Leerzeichen, Bindestrich) überspringen
    }
    return clips;
}

// Primäre Frequenz/Squawk eines Luftraums als Clip-Sequenz
function _awGetFreqClips(as) {
    if (!_awmReadFreq || !as.frequencies || !as.frequencies.length) return [];
    const primary = as.frequencies.find(f => f.primary) || as.frequencies[0];
    if (!primary || !primary.value) return [];
    const nm = (primary.name || '').toUpperCase();
    const isSquawk = /XPDR|SQK|SQUAWK|TRANSP/.test(nm);
    return _awFreqToClips(primary.value, isSquawk);
}
const _awBuffers   = {};           // key → AudioBuffer
let   _awLoaded    = false;
let   _awLoading   = false;

// State pro Luftraum: { t5, t2, t5in, t2in, firstSeen5, firstSeen2 }
const _awState = new Map();
// Gleiche-Klasse Ketten-Unterdrückung: typeKey → { lastActiveMs, warnedAt }
// Wenn der Pilot durch mehrere aufeinanderfolgende D-Sektoren fliegt ohne Unterbrechung,
// wird nur der erste angesagt.
const _awTypeChain = new Map(); // typeKey → { lastActiveMs, warnedAt }
const _AW_CHAIN_GAP = 45000;   // 45 s offener Luftraum → Kette zurückgesetzt
// Serielle Abspielqueue: verhindert gleichzeitige Ansagen
let _awQueueBusy = false;
const _awQueue = [];

function _awEnqueue(keys) {
    _awQueue.push(keys);
    if (!_awQueueBusy) _awDrainQueue();
}

function _awDrainQueue() {
    if (!_awQueue.length) { _awQueueBusy = false; return; }
    _awQueueBusy = true;
    const keys = _awQueue.shift();
    if (!_tawsAudioCtx || !_awLoaded) { _awDrainQueue(); return; }

    // Null-Keys (kein Luftraumtyp) herausfiltern; fehlende Buffer warnen
    const valid = keys.filter(k => {
        if (!k) return false;
        if (!_awBuffers[k]) { console.warn('[AWM] Buffer fehlt:', k); return false; }
        return true;
    });
    if (!valid.length) { setTimeout(_awDrainQueue, 0); return; }

    // Clips via onended ketten statt mit fixen Timestamps vorausplanen.
    // Das verhindert dass Chrome/Quest-3 Clips verwirft wenn der AudioContext
    // kurz suspended war und der geplante Startzeitpunkt bereits vergangen ist.
    _tawsResumeThen(() => {
        let i = 0;
        function next() {
            if (i >= valid.length) { _awDrainQueue(); return; }
            const buf = _awBuffers[valid[i++]];
            const src = _tawsAudioCtx.createBufferSource();
            src.buffer = buf;
            src.connect(_awmMasterGain || _tawsAudioCtx.destination);
            src.onended = () => setTimeout(next, 80);
            src.start(_tawsAudioCtx.currentTime + 0.05);
        }
        next();
    });
}

async function _awLoadClips() {
    if (_awLoaded || _awLoading || !_tawsAudioCtx) return;
    _awLoading = true;
    await Promise.all(_AWM_CLIPS.map(async key => {
        // taws-alert liegt im Root, alle anderen in audio-warnings/
        const url = key === 'taws-alert'
            ? './taws-alert.m4a'
            : './audio-warnings/' + key + '.m4a';
        try {
            const r  = await fetch(url);
            const ab = await r.arrayBuffer();
            _awBuffers[key] = await _tawsAudioCtx.decodeAudioData(ab);
        } catch(e) { console.warn('[AWM] Clip laden fehlgeschlagen:', key, e); }
    }));
    _awLoaded  = true;
    _awLoading = false;
    console.log('[AWM] Alle Clips geladen:', Object.keys(_awBuffers).join(', '));
}

// Ansage in serielle Queue einreihen
function _awPlaySequence(keys) {
    if (!_tawsAudioCtx || !_awLoaded) return;
    _awEnqueue(keys);
}

// Luftraum-Typ → Audio-Key (null = kein Alert für diesen Typ)
function _awTypeKey(as) {
    const t = as.type, cls = as.icaoClass;
    if (t === 4)                return 'aw-ctr';      // CTR (Kontrollzone)
    if (cls === 2)              return 'aw-charlie';  // Class C
    if (cls === 3 || t === 0)   return 'aw-delta';    // Class D
    if (t === 7 || t === 26)    return 'aw-ctr';      // TMA / CTA → wie CTR ansagen
    if (t === 5 || t === 27)    return 'aw-tmz';      // TMZ
    if ((t === 6 || t === 28) && /\bPARA\b/i.test(as.name || '')) return 'aw-para'; // Fallschirmgebiet
    if (t === 6 || t === 28)    return 'aw-rmz';      // RMZ
    if (t === 1)                return 'aw-edr';      // ED-R Restricted (Buchstaben E-D-R)
    return null;   // Danger/Prohibited/FIS → kein Sprach-Alert
}

// Minuten-Zahl → Audio-Key
function _awMinKey(min) {
    const n = Math.round(min);
    const k = ['','aw-1min','aw-2min','aw-3min','aw-4min','aw-5min',
                  'aw-6min','aw-7min','aw-8min','aw-9min','aw-10min'];
    return (n >= 1 && n <= 10) ? k[n] : null;
}

// Luftraum 3× auf Karte aufblinken lassen
function _awPulseOnMap(as, color) {
    if (!as.geometry || typeof L === 'undefined' || typeof map === 'undefined') return;
    const polys = [];
    if (as.geometry.type === 'Polygon')
        polys.push(as.geometry.coordinates[0]);
    else if (as.geometry.type === 'MultiPolygon')
        as.geometry.coordinates.forEach(mc => polys.push(mc[0]));

    polys.forEach(poly => {
        const latlngs = poly.map(c => [c[1], c[0]]);  // GeoJSON [lon,lat] → Leaflet [lat,lon]
        const flash = L.polygon(latlngs, {
            color, weight: 4, opacity: 0,
            fillColor: color, fillOpacity: 0,
            interactive: false
        }).addTo(map);
        let tick = 0;
        const id = setInterval(() => {
            tick++;
            const on = (tick % 2 === 1);
            flash.setStyle({ opacity: on ? 1 : 0, fillOpacity: on ? 0.3 : 0 });
            if (tick >= 6) { clearInterval(id); if (map.hasLayer(flash)) map.removeLayer(flash); }
        }, 450);
    });
}

/**
 * Frequenz/Squawk-Banner am unteren Kartenrand anzeigen.
 * Bleibt stehen bis der Pilot tippt/klickt — kein Auto-Dismiss.
 */
function _awShowFreqBanner(as, col) {
    if (!as.frequencies || as.frequencies.length === 0) return;
    const banner = document.getElementById('awmFreqBanner');
    if (!banner) return;

    // Gleichen Luftraum nicht doppelt anzeigen
    const asKey = `${as.type}_${as.name || as._id || 'x'}`;
    const escaped = asKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (banner.querySelector(`[data-askey="${escaped}"]`)) return;

    // Alle Frequenzen/Squawks aufbereiten
    const t = as.type;
    const freqParts = [];
    for (const f of (as.frequencies || [])) {
        if (!f.value) continue;
        const nm = (f.name || '').toUpperCase();
        const isSquawk = /XPDR|SQK|SQUAWK|TRANSP/.test(nm);
        const icon  = isSquawk ? '🔲' : '📻';
        const label = isSquawk ? (nm || 'XPDR')
                    : (t === 5 || t === 27) ? (nm || 'FREQ')
                    : (t === 6 || t === 28 || t === 33) ? (nm || 'INFO')
                    : (nm || 'TWR');
        freqParts.push(`${icon}\u202F${label}: <b>${f.value}</b>`);
    }
    if (!freqParts.length) return;

    const displayName = (typeof getAirspaceDisplayName === 'function')
        ? getAirspaceDisplayName(as) : (as.name || '?');

    // Farbe für Frequenz-Label
    let freqColor = col || '#ffffff';
    if (t === 5 || t === 27)          freqColor = '#9966ff'; // TMZ
    else if (t === 6 || t === 28 || t === 33) freqColor = '#66cccc'; // RMZ/FIS

    const entry = document.createElement('div');
    entry.dataset.askey = escaped;
    entry.className = 'awm-freq-entry';
    entry.style.borderTopColor = col || '#888';

    const valsHtml = freqParts
        .map(p => `<span class="awm-freq-val" style="color:${freqColor};">${p}</span>`)
        .join('<span style="color:#444;margin:0 4px;">·</span>');

    entry.innerHTML =
        `<span style="flex:1;min-width:0;display:flex;align-items:baseline;flex-wrap:wrap;gap:6px;">` +
        `<span class="awm-freq-name" style="color:${col};">${displayName}</span>` +
        `<span style="color:#555;font-size:10px;">·</span>` +
        `<span class="awm-freq-vals">${valsHtml}</span>` +
        `</span>` +
        `<button class="awm-freq-dismiss" onclick="event.stopPropagation();">✕</button>`;

    // Antippen / Klick → Eintrag entfernen, Banner verstecken wenn leer
    const dismiss = () => {
        entry.remove();
        if (!banner.children.length) banner.style.display = 'none';
    };
    entry.addEventListener('click', dismiss);
    entry.addEventListener('touchend', dismiss, { passive: true });

    banner.appendChild(entry);
    banner.style.display = 'block';
}

/**
 * Vorhersage-Punkte gegen aktive Lufträume prüfen und ggf. Ansage abspielen.
 * Nearest-first: nur der nächste noch nicht eingetretene Luftraum wird angesagt.
 */
function checkAirspaceWarnings(predPoints) {
    if (!_awLoaded) { _awLoadClips(); return; }
    if (!_tawsAudioCtx) return;
    if (typeof activeAirspaces === 'undefined' || !activeAirspaces.length) return;
    if (typeof vpPointInPoly === 'undefined' || typeof airspaceLimitToFt === 'undefined') return;

    const now = Date.now();
    const PERSIST = 5000;
    const STICKY  = 3000;

    // ── Pass 1: Schnittstellen für alle Lufträume berechnen ───────────────────
    const crossings = [];
    for (const as of activeAirspaces) {
        if (!as.geometry) continue;
        if (as.type === 33) continue;

        const typeKey = _awTypeKey(as) || 'aw-ctr';
        let effLower = 0, effUpper = 99999;
        if (as.lowerLimit && as.upperLimit) {
            const lo = airspaceLimitToFt(as.lowerLimit);
            const hi = airspaceLimitToFt(as.upperLimit);
            if (lo !== null) effLower = (as.lowerLimit.referenceDatum === 0) ? 0 : lo;
            if (hi !== null) effUpper = hi;
        }

        const polys = [];
        if (as.geometry.type === 'Polygon')
            polys.push(as.geometry.coordinates[0]);
        else if (as.geometry.type === 'MultiPolygon')
            as.geometry.coordinates.forEach(mc => polys.push(mc[0]));
        if (!polys.length) continue;

        let earliest5 = null, earliest2 = null, insideNow = false;

        // insideNow: Flugzeug befindet sich JETZT in diesem Luftraum (GPS-Position, nicht Prediction)
        // Nur so wird sichergestellt, dass der zweite Luftraum erst angesagt wird wenn der erste
        // tatsächlich durchflogen wird — nicht schon 1 Minute vorher.
        const _gps = window.lastLiveGpsPos;
        if (_gps && _gps.alt !== undefined && _gps.lat !== undefined) {
            const _gAlt = _gps.alt; // bereits in Feet (sync.js)
            if (_gAlt >= effLower - 200 && _gAlt <= effUpper + 200) {
                for (const poly of polys) {
                    if (vpPointInPoly({ lat: _gps.lat, lon: _gps.lon }, poly)) {
                        insideNow = true; break;
                    }
                }
            }
        }

        for (const pt of predPoints) {
            if (pt.alt < effLower - 500 || pt.alt > effUpper + 300) continue;
            let inside = false;
            for (const poly of polys) {
                if (vpPointInPoly({ lat: pt.lat, lon: pt.lon }, poly)) { inside = true; break; }
            }
            if (!inside) continue;
            if (pt.min <= 5 && (earliest5 === null || pt.min < earliest5)) earliest5 = pt.min;
            if (pt.min <= 2 && (earliest2 === null || pt.min < earliest2)) earliest2 = pt.min;
        }

        if (earliest5 === null && earliest2 === null && !insideNow) continue;

        const asKey = `${as.type}_${as.name || 'x'}_${Math.round(effLower)}`;
        crossings.push({ as, typeKey, effLower, effUpper, earliest5, earliest2, insideNow, asKey });
    }

    // ── Pass 2: Nächsten noch nicht eingetretenen Luftraum bestimmen ──────────
    // Lufträume in denen man schon drin ist dürfen weiterhin passieren.
    // Von den noch nicht eingetretenen: nur den nächsten warnen (blockiert weiter entfernte).
    const unentered = crossings
        .filter(c => !c.insideNow)
        .sort((a, b) => Math.min(a.earliest5 ?? 99, a.earliest2 ?? 99)
                      - Math.min(b.earliest5 ?? 99, b.earliest2 ?? 99));
    const nearestKey = unentered.length > 0 ? unentered[0].asKey : null;

    // Gleiche-Klasse Ketten-Update:
    // • Alle aktuell sichtbaren typeKeys als aktiv markieren
    // • Falls das Flugzeug gerade in einer ANDEREN Klasse ist → Kette der restlichen Klassen brechen
    const insideTypeKeys = new Set(crossings.filter(c => c.insideNow && c.typeKey).map(c => c.typeKey));
    for (const c of crossings) {
        if (!c.typeKey) continue;
        if (!_awTypeChain.has(c.typeKey)) _awTypeChain.set(c.typeKey, { lastActiveMs: 0, warnedAt: 0 });
        _awTypeChain.get(c.typeKey).lastActiveMs = now;
    }
    // Wenn drin in einer Klasse, breche Ketten aller anderen (bereits-gewarnte) Klassen
    if (insideTypeKeys.size > 0) {
        for (const [tk, ch] of _awTypeChain) {
            if (!insideTypeKeys.has(tk) && ch.warnedAt > 0) {
                ch.warnedAt = 0; // Kette unterbrochen durch andere Klasse
            }
        }
    }

    // ── Pass 3: Warnungen ausspielen ──────────────────────────────────────────
    for (const c of crossings) {
        const { as, typeKey, effLower, effUpper, earliest5, earliest2, insideNow, asKey } = c;
        const in5 = earliest5 !== null;
        const in2 = earliest2 !== null;

        // Gleiche-Klasse Ketten-Unterdrückung:
        // Wenn wir bereits für diesen typeKey gewarnt haben UND die Kette noch aktiv ist
        // (kein langer Gap ohne Luftraum dieser Klasse), die Warnung unterdrücken.
        let chainSuppressed = false;
        if (!insideNow && typeKey) {
            const ch = _awTypeChain.get(typeKey);
            if (ch && ch.warnedAt > 0 && (now - ch.lastActiveMs) < _AW_CHAIN_GAP) {
                chainSuppressed = true;
            }
        }

        // Nur warnen wenn: bereits drin ODER nächster uneingetretener Luftraum UND nicht Ketten-unterdrückt
        const allowed = (insideNow || asKey === nearestKey) && !chainSuppressed;

        if (!_awState.has(asKey))
            _awState.set(asKey, { t5: false, t2: false, firstSeen5: 0, firstSeen2: 0, lastSeen5: 0, lastSeen2: 0 });
        const st = _awState.get(asKey);

        if (!allowed) {
            // Timer zurücksetzen damit Warnung feuert sobald Luftraum als nächstes drankommt
            if (st.lastSeen5 && (now - st.lastSeen5) > STICKY) { st.t5 = false; st.firstSeen5 = 0; st.lastSeen5 = 0; }
            if (st.lastSeen2 && (now - st.lastSeen2) > STICKY) { st.t2 = false; st.firstSeen2 = 0; st.lastSeen2 = 0; }
            continue;
        }

        // 2-min Warnung
        if (in2) {
            st.lastSeen2 = now;
            if (!st.firstSeen2) st.firstSeen2 = now;
            if (!st.t2 && (now - st.firstSeen2) >= PERSIST) {
                st.t2 = true;
                const col = (typeof getAirspaceStyle === 'function') ? getAirspaceStyle(as).color : '#ffffff';
                _awPulseOnMap(as, col);
                window._awmPulse = { color: col, lowerFt: effLower, upperFt: effUpper, startMs: now, as };
                window.vpBgNeedsUpdate = true;
                console.log(`[AWM] ✈ ${as.name} (${typeKey}) in ${Math.round(earliest2)} min`);
                _awPlaySequence(['aw-achtung', typeKey, 'aw-in', _awMinKey(Math.round(earliest2)) || 'aw-2min', ..._awGetFreqClips(as)]);
                _awShowFreqBanner(as, col);
                // Kette starten: gleiche Klasse dahinter nicht nochmals ansagen
                if (typeKey && _awTypeChain.has(typeKey)) _awTypeChain.get(typeKey).warnedAt = now;
            }
        } else if (st.lastSeen2 && (now - st.lastSeen2) > STICKY) {
            st.t2 = false; st.firstSeen2 = 0; st.lastSeen2 = 0;
        }

        // 5-min Warnung (nur wenn kein 2-min Schnitt aktiv)
        if (in5 && !in2) {
            st.lastSeen5 = now;
            if (!st.firstSeen5) st.firstSeen5 = now;
            if (!st.t5 && (now - st.firstSeen5) >= PERSIST) {
                st.t5 = true;
                const col = (typeof getAirspaceStyle === 'function') ? getAirspaceStyle(as).color : '#ffffff';
                _awPulseOnMap(as, col);
                window._awmPulse = { color: col, lowerFt: effLower, upperFt: effUpper, startMs: now, as };
                window.vpBgNeedsUpdate = true;
                console.log(`[AWM] ✈ ${as.name} (${typeKey}) in ${Math.round(earliest5)} min`);
                _awPlaySequence(['aw-achtung', typeKey, 'aw-in', _awMinKey(Math.round(earliest5)) || 'aw-5min', ..._awGetFreqClips(as)]);
                _awShowFreqBanner(as, col);
                // Kette starten: gleiche Klasse dahinter nicht nochmals ansagen
                if (typeKey && _awTypeChain.has(typeKey)) _awTypeChain.get(typeKey).warnedAt = now;
            }
        } else if (!in2 && st.lastSeen5 && (now - st.lastSeen5) > STICKY) {
            st.t5 = false; st.firstSeen5 = 0; st.lastSeen5 = 0;
        }
    }
}

/**
 * Tile-Koordinaten aus lat/lon berechnen (Slippy Map)
 */
function _tawsLatLonToTile(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const xTile = Math.floor((lon + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const yTile = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x: xTile, y: yTile };
}

/**
 * Pixel-Position innerhalb eines 256x256 Tiles
 */
function _tawsLatLonToPixel(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const xFloat = (lon + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const yFloat = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

    const tile = { x: Math.floor(xFloat), y: Math.floor(yFloat) };
    const px = Math.floor((xFloat - tile.x) * 256);
    const py = Math.floor((yFloat - tile.y) * 256);

    return { tile, px: Math.min(px, 255), py: Math.min(py, 255) };
}

/**
 * Einzelnes Tile laden und als ImageData cachen
 */
function _tawsLoadTile(tileX, tileY, zoom) {
    const key = `${zoom}/${tileX}/${tileY}`;
    if (_tawsTileCache.has(key)) return Promise.resolve(_tawsTileCache.get(key));

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            _tawsCtx.clearRect(0, 0, 256, 256);
            _tawsCtx.drawImage(img, 0, 0, 256, 256);
            const imageData = _tawsCtx.getImageData(0, 0, 256, 256);

            // Cache-Eviction: aelteste Eintraege entfernen
            if (_tawsTileCache.size >= TAWS_CACHE_MAX) {
                const oldest = _tawsTileCache.keys().next().value;
                _tawsTileCache.delete(oldest);
            }
            _tawsTileCache.set(key, imageData);
            resolve(imageData);
        };
        img.onerror = () => reject(new Error(`TAWS tile load failed: ${key}`));
        img.src = TAWS_TILE_URL.replace('{z}', zoom).replace('{x}', tileX).replace('{y}', tileY);
    });
}

/**
 * Terrain-Hoehe an einem Punkt abtasten (in Fuss)
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<number>} Elevation in feet MSL
 */
async function sampleTerrainElevation(lat, lon) {
    const { tile, px, py } = _tawsLatLonToPixel(lat, lon, TAWS_TILE_ZOOM);
    const imageData = await _tawsLoadTile(tile.x, tile.y, TAWS_TILE_ZOOM);

    const idx = (py * 256 + px) * 4;
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];

    // Terrarium encoding: elevation_m = (R * 256 + G + B / 256) - 32768
    const elevM = (r * 256 + g + b / 256) - 32768;
    return Math.round(elevM * 3.28084); // -> feet
}

/**
 * Terrain entlang eines Pfades pruefen (Prediction-Punkte)
 * @param {Array<{lat, lon, alt, min}>} points - Prediction-Punkte mit projizierter Hoehe
 * @returns {Promise<Array<{lat, lon, terrainFt, aircraftFt, threat}>>}
 */
async function checkTerrainAlongPath(points) {
    if (!points || points.length === 0) return [];

    // Alle benoetigten Tiles vorladen (oft nur 1-2 verschiedene)
    const tileKeys = new Set();
    const tilePromises = [];
    for (const p of points) {
        const { tile } = _tawsLatLonToPixel(p.lat, p.lon, TAWS_TILE_ZOOM);
        const key = `${TAWS_TILE_ZOOM}/${tile.x}/${tile.y}`;
        if (!tileKeys.has(key)) {
            tileKeys.add(key);
            tilePromises.push(_tawsLoadTile(tile.x, tile.y, TAWS_TILE_ZOOM).catch(() => null));
        }
    }
    await Promise.all(tilePromises);

    // Jetzt synchron sampeln (alles im Cache)
    const results = [];
    let hasImmediateThreat = false;  // Nur Punkte ≤ 1 Minute → Voice-Alert

    for (const p of points) {
        try {
            const terrainFt = await sampleTerrainElevation(p.lat, p.lon);
            const aircraftFt = p.alt;
            const clearance = aircraftFt - terrainFt;

            let threat = 'green';
            if (clearance < TAWS_SAFETY_RED) {
                threat = 'red';
                // Voice nur wenn Kollision in ≤ 60 Sekunden
                if ((p.min ?? 99) <= 1) hasImmediateThreat = true;
            } else if (clearance < TAWS_SAFETY_AMBER) {
                threat = 'amber';
            }

            results.push({ lat: p.lat, lon: p.lon, terrainFt, aircraftFt, threat });
        } catch (e) {
            results.push({ lat: p.lat, lon: p.lon, terrainFt: 0, aircraftFt: p.alt, threat: 'green' });
        }
    }

    // Voice-Alert: nur bei unmittelbarer Gefahr, nicht beim Landen
    if (hasImmediateThreat) {
        // Landing-Suppression: GS < 65 kts → Landephase, kein Alert
        const gs = (window.lastLiveGpsPos && window.lastLiveGpsPos.gs) || 0;
        const isLanding = gs > 5 && gs < 75;

        const now = Date.now();
        if (!isLanding && now - _tawsLastVoiceAlert > TAWS_VOICE_COOLDOWN) {
            _tawsLastVoiceAlert = now;
            // Whoop-Whoop + Sprachsample via AudioContext (kein HTMLAudioElement mehr)
            _tawsPlayWhoopWhoop();
            _awPlaySequence(['taws-alert']);
        }
    }

    return results;
}
