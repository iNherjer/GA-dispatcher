/* === VERTICAL PROFILE & CANVAS ENGINE (v220) === */
if (!document.getElementById('vp-err-dot-style')) {
    const style = document.createElement('style');
    style.id = 'vp-err-dot-style';
    style.innerHTML = `.vp-error-dot { position:absolute; top:-4px; right:-4px; width:10px; height:10px; background-color:#ff4444; border-radius:50%; border:1.5px solid #222; z-index:10; box-shadow: 0 0 4px #ff0000; } .vp-btn-relative { position:relative; overflow:visible !important; }`;
    document.head.appendChild(style);
}

window.vpFailedOverpassChunks = [];
window.updateOverpassErrorUI = function() {
    const hasError = window.vpFailedOverpassChunks && window.vpFailedOverpassChunks.length > 0;

    // Error-Dot auf Einzel-Buttons (im Untermenü)
    const btnOb = document.getElementById('btnToggleObstacles');
    const btnLin = document.getElementById('btnToggleLinear');
    [btnOb, btnLin].forEach(btn => {
        if (!btn) return;
        btn.classList.add('vp-btn-relative');
        let dot = btn.querySelector('.vp-error-dot');
        if (hasError) {
            if (!dot) { dot = document.createElement('div'); dot.className = 'vp-error-dot'; btn.appendChild(dot); }
        } else {
            if (dot) dot.remove();
        }
    });

    // Error-Dot auch am Zahnrad-Button sichtbar machen
    const gearDot = document.getElementById('vpSettingsErrorDot');
    if (gearDot) gearDot.style.display = hasError ? 'block' : 'none';
};
window.vpBgNeedsUpdate = true;
window.vpAnimFrameId = null;
window._vpLastScrollLeft = 0;
/* =========================================================
   VERTICAL PROFILE (Höhenprofil) ENGINE
   ========================================================= */
let vpElevationData = null;
let vpWeatherData = null;
let vpProfileFastTimeout = null;
let vpProfileSlowTimeout = null;
let globalCities = null;

async function loadGlobalCities() {
    if (globalCities) return;
    if (typeof window.GLOBAL_CITIES_DATA !== 'undefined') {
        globalCities = window.GLOBAL_CITIES_DATA;
        return;
    }
    try {
        const res = await fetch('./cities.json');
        if (res.ok) globalCities = await res.json();
        else globalCities = []; 
    } catch (e) { globalCities = []; }
}

let vpZoomLevel = 100; // 100 = full route, 10 = 10% view
let vpHighResData = null; // Higher resolution elevation data for zoom
let vpElevationCache = {}; // Cache to prevent API rate limits (HTTP 429)
let vpClimbRate = 500; // ft/min climb rate (configurable)
let vpDescentRate = 500; // ft/min descent rate (configurable)
let vpLandmarks = [];
let vpObstacles = [];
let vpLinearFeatures = [];

// Traffic im Profil
window.vpTrafficProfileVisible = true;

async function fetchProfileLandmarks(elevData) {
    if (!elevData || elevData.length < 2) return [];
    let minL = 90, maxL = -90, minLo = 180, maxLo = -180;
    elevData.forEach(p => {
        if(p.lat < minL) minL = p.lat; if(p.lat > maxL) maxL = p.lat;
        if(p.lon < minLo) minLo = p.lon; if(p.lon > maxLo) maxLo = p.lon;
    });
    minL -= 0.1; maxL += 0.1; minLo -= 0.15; maxLo += 0.15;
    let landmarks = [];
    
    await loadGlobalAirports();
    for(let k in globalAirports) {
        let a = globalAirports[k];
        if (a.lat > minL && a.lat < maxL && a.lon > minLo && a.lon < maxLo) {
            let bestD = Infinity, bestDistNM = 0;
            elevData.forEach(ep => {
                let d = calcNav(a.lat, a.lon, ep.lat, ep.lon).dist;
                if(d < bestD) { bestD = d; bestDistNM = ep.distNM; }
            });
            if (bestD < 3.5) landmarks.push({ name: a.icao, type: 'apt', pop: 100000000, distNM: bestDistNM });
        }
    }
    
    await loadGlobalCities();
    if (globalCities && globalCities.length > 0) {
        globalCities.forEach(c => {
            if (c.lat > minL && c.lat < maxL && c.lon > minLo && c.lon < maxLo) {
                let bestD = Infinity, bestDistNM = 0;
                elevData.forEach(ep => {
                    let d = calcNav(c.lat, c.lon, ep.lat, ep.lon).dist;
                    if(d < bestD) { bestD = d; bestDistNM = ep.distNM; }
                });
                if (bestD < 3.5) {
                    let cType = c.pop >= 15000 ? 'city' : 'town';
                    landmarks.push({ name: c.name, type: cType, pop: c.pop || 5000, distNM: bestDistNM });
                }
            }
        });
    }
    return landmarks.sort((a,b) => b.pop - a.pop);
}

// GPS-zentrierte Städte/Airports laden (ohne Flugplan, aus RAM)
async function updateGpsCities(lat, lon) {
    await loadGlobalCities();
    await loadGlobalAirports();
    let landmarks = [];

    if (globalCities && globalCities.length > 0) {
        globalCities.forEach(c => {
            if (Math.abs(c.lat - lat) > 0.22 || Math.abs(c.lon - lon) > 0.33) return;
            const nav = calcNav(lat, lon, c.lat, c.lon);
            if (nav.dist > 15) return;
            landmarks.push({ name: c.name, type: c.pop >= 15000 ? 'city' : 'town', pop: c.pop || 5000, distNM: nav.dist });
        });
    }
    if (typeof globalAirports !== 'undefined' && globalAirports) {
        for (let k in globalAirports) {
            const a = globalAirports[k];
            const nav = calcNav(lat, lon, a.lat, a.lon);
            if (nav.dist <= 10) landmarks.push({ name: a.icao, type: 'apt', pop: 100000000, distNM: nav.dist });
        }
    }

    vpLandmarks = landmarks.sort((a, b) => b.pop - a.pop);
    window.vpBgNeedsUpdate = true;
    if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
}
window.updateGpsCities = updateGpsCities;


// Helfer zum Entdoppeln von Hindernissen (nimmt das höchste in einem 0.5 NM Fenster)
function deduplicateFeatures(features) {
    let buckets = {};
    features.forEach(f => {
        let bIdx = Math.floor(f.distNM / 0.5);
        if (!buckets[bIdx]) buckets[bIdx] = [];
        buckets[bIdx].push(f);
    });
    let final = [];
    for (let k in buckets) {
        buckets[k].sort((a,b) => b.hFt - a.hFt);
        let rep = buckets[k][0];
        rep.count = buckets[k].length;
        final.push(rep);
    }
    return final;
}

async function fetchProfileObstacles(elevData, signal) {
    if (!elevData || elevData.length < 2) return null;

    // 1. Riesige 250-NM-Segmente (Normale Flüge sind somit nur 1 Abfrage = keine 429er!)
    const CHUNK_NM = 250; 
    let chunks = [];
    let currentChunk = [];
    let chunkStartDist = elevData[0].distNM;

    for (let i = 0; i < elevData.length; i++) {
        currentChunk.push(elevData[i]);
        if (elevData[i].distNM - chunkStartDist >= CHUNK_NM || i === elevData.length - 1) {
            if (currentChunk.length > 1) chunks.push(currentChunk);
            if (i < elevData.length - 1) {
                currentChunk = [elevData[i]];
                chunkStartDist = elevData[i].distNM;
            }
        }
    }

    const overpassServers = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter'
    ];

    console.log(`[Overpass] Teile Flug in ${chunks.length} Segment(e) (je max 250 NM). Starte SEQUENZIELLEN Fetch...`);

    let cumulativeRawObs = [];
    let cumulativeRawLin = [];

    window.vpServerOffset = (window.vpServerOffset || 0) + 1; // Rotiert die Server auch beim Ziehen der Route weiter

    // 2. SEQUENZIELLE SCHLEIFE (Kein Promise.all mehr!)
    for (let idx = 0; idx < chunks.length; idx++) {
        if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
        
        const chunkData = chunks[idx];
        let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
        chunkData.forEach(p => {
            if (p.lat < minLat) minLat = p.lat; if (p.lat > maxLat) maxLat = p.lat;
            if (p.lon < minLon) minLon = p.lon; if (p.lon > maxLon) maxLon = p.lon;
        });
        const bbox = `${(minLat - 0.05).toFixed(4)},${(minLon - 0.08).toFixed(4)},${(maxLat + 0.05).toFixed(4)},${(maxLon + 0.08).toFixed(4)}`;

        let pathCoords = [];
        const step = Math.max(1, Math.ceil(chunkData.length / 30));
        for (let i = 0; i < chunkData.length; i += step) {
            pathCoords.push(`${chunkData[i].lat.toFixed(4)},${chunkData[i].lon.toFixed(4)}`);
        }
        const lastPt = `${chunkData[chunkData.length-1].lat.toFixed(4)},${chunkData[chunkData.length-1].lon.toFixed(4)}`;
        if (pathCoords[pathCoords.length-1] !== lastPt) pathCoords.push(lastPt);
        const polylineStr = pathCoords.join(',');

        const radius = 4000; 
        // Autobahnen, Masten UND Flüsse
        const queryBody = `node["generator:source"="wind"](around:${radius},${polylineStr});node["man_made"~"mast|tower"]["height"](around:${radius},${polylineStr});way["highway"="motorway"](around:${radius},${polylineStr});way["waterway"="river"](around:${radius},${polylineStr});`;
        const query = `[out:json][timeout:45][bbox:${bbox}];(${queryBody});out geom qt;`;

        let retries = 3; // 3 Versuche pro Segment reichen bei sequenzieller Abfrage
        let attempt = 0;
        let success = false;
        
        while (retries > 0 && !success) {
            if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
            const serverUrl = overpassServers[(idx + attempt + window.vpServerOffset) % overpassServers.length];
            attempt++;
            
            try {
                console.log(`[Overpass] Frage Segment ${idx+1}/${chunks.length} bei ${serverUrl} an...`);
                const res = await fetch(serverUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `data=${encodeURIComponent(query)}`,
                    signal
                });

                if (res.status === 429) {
                    console.warn(`[Overpass] Segment ${idx+1}: 429. Warte 15s...`);
                    await new Promise(r => setTimeout(r, 15000));
                    retries--; continue; 
                }
                if (res.status === 504) {
                    console.warn(`[Overpass] Segment ${idx+1}: 504. Warte 5s...`);
                    await new Promise(r => setTimeout(r, 5000));
                    retries--; continue; 
                }
                if (!res.ok) {
                    await new Promise(r => setTimeout(r, 3000));
                    retries--; continue;
                }

                const json = await res.json();
                console.log(`[Overpass] Segment ${idx+1} erfolgreich! (${json.elements ? json.elements.length : 0} Elemente)`);
                
                let localObs = [];
                let localLin = [];

                if (json.elements) {
                    json.elements.forEach(e => {
                        if (e.type === 'node' && e.lat && e.lon) {
                            let isWind = e.tags && e.tags["generator:source"] === "wind";
                            let hMeter = (e.tags && e.tags.height) ? parseFloat(e.tags.height.replace(',', '.')) : (isWind ? 120 : 50);
                            if (isNaN(hMeter) || hMeter < 30) return;
                            
                            let hFt = Math.round(hMeter * 3.28084);
                            let bestD = Infinity, bestDistNM = 0, baseElevFt = 0;
                            chunkData.forEach(ep => {
                                let d = calcNav(e.lat, e.lon, ep.lat, ep.lon).dist;
                                if (d < bestD) { bestD = d; bestDistNM = ep.distNM; baseElevFt = ep.elevFt; }
                            });
                            localObs.push({ type: isWind ? 'wind' : 'mast', hFt: hFt, distNM: bestDistNM, elevFt: baseElevFt, lat: e.lat, lon: e.lon });
                        } else if (e.type === 'way' && e.geometry && e.tags) {
                            let featType = e.tags.highway ? 'highway' : 'river';
                            let name = e.tags.name || e.tags.ref || '';
                            if (!name && featType === 'highway') return;

                            if (typeof routeWaypoints !== 'undefined' && routeWaypoints.length >= 2) {
                                for (let i = 0; i < routeWaypoints.length - 1; i++) {
                                    let rp0 = {lat: routeWaypoints[i].lat, lon: routeWaypoints[i].lng||routeWaypoints[i].lon};
                                    let rp1 = {lat: routeWaypoints[i+1].lat, lon: routeWaypoints[i+1].lng||routeWaypoints[i+1].lon};
                                    
                                    for(let j = 0; j < e.geometry.length - 1; j++) {
                                        let wp0 = e.geometry[j], wp1 = e.geometry[j+1];
                                        let s1_x = wp1.lon - wp0.lon, s1_y = wp1.lat - wp0.lat;
                                        let s2_x = rp1.lon - rp0.lon; let s2_y = rp1.lat - rp0.lat;
                                        let denom = (-s2_x * s1_y + s1_x * s2_y);
                                        if (Math.abs(denom) > 1e-10) {
                                            let s = (-s1_y * (wp0.lon - rp0.lon) + s1_x * (wp0.lat - rp0.lat)) / denom;
                                            let t = ( s2_x * (wp0.lat - rp0.lat) - s2_y * (wp0.lon - rp0.lon)) / denom;
                                            if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
                                                let ix = { lat: wp0.lat + (t * s1_y), lon: wp0.lon + (t * s1_x) };
                                                let distBefore = 0;
                                                for(let k=0; k<i; k++) distBefore += calcNav(routeWaypoints[k].lat, routeWaypoints[k].lng||routeWaypoints[k].lon, routeWaypoints[k+1].lat, routeWaypoints[k+1].lng||routeWaypoints[k+1].lon).dist;
                                                localLin.push({ type: featType, name: name, distNM: distBefore + calcNav(rp0.lat, rp0.lon, ix.lat, ix.lon).dist, lat: ix.lat, lon: ix.lon });
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                }

                if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
                cumulativeRawObs.push(...localObs);
                cumulativeRawLin.push(...localLin);

                let buckets = {};
                cumulativeRawObs.forEach(obs => {
                    let bIdx = Math.floor(obs.distNM / 0.5);
                    if (!buckets[bIdx]) buckets[bIdx] = [];
                    buckets[bIdx].push(obs);
                });
                let tempFinalObs = [];
                for (let k in buckets) {
                    let group = buckets[k];
                    group.sort((a,b) => b.hFt - a.hFt);
                    let rep = group[0];
                    rep.count = group.length;
                    const elevNode = elevData.reduce((prev, curr) => Math.abs(curr.distNM - rep.distNM) < Math.abs(prev.distNM - rep.distNM) ? curr : prev);
                    rep.groundElevFt = elevNode.elevFt;
                    tempFinalObs.push(rep);
                }
                
                let tempFinalLin = cumulativeRawLin.sort((a,b) => a.distNM - b.distNM).filter((f, idx, arr) => idx === 0 || arr[idx-1].name !== f.name || Math.abs(arr[idx-1].distNM - f.distNM) > 1.0);

                // Inkrementelles Rendering: Sofort zeichnen!
                requestAnimationFrame(() => {
                    if (signal && !signal.aborted) {
                        vpObstacles = tempFinalObs;
                        vpLinearFeatures = tempFinalLin;
                        window.vpBgNeedsUpdate = true;
                        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
                    }
                });

                success = true;
            } catch(e) {
                if (e.name === 'AbortError') throw e;
                await new Promise(r => setTimeout(r, 2000));
                retries--;
            }
        }
        
        if (!success) {
            console.error(`[Overpass] Segment ${idx+1} endgültig gescheitert!`);
            window.vpFailedOverpassChunks.push(chunkData);
        }
        
        // Atempause zwischen den sequenziellen Segmenten, um Rate-Limits zu schonen
        if (idx < chunks.length - 1 && success) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (typeof window.updateOverpassErrorUI === 'function') window.updateOverpassErrorUI();
    console.log(`[Overpass] Alle Segmente verarbeitet.`);
    return { obs: vpObstacles, lin: vpLinearFeatures };
}

// GPS-zentrierte Hindernisse laden (ohne Flugplan, 30×30 km Box, max. alle 2 Minuten)
async function fetchGpsObstacles(lat, lon) {
    const cacheKey = `ga_gps_obs_${lat.toFixed(1)}_${lon.toFixed(1)}`;
    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached && (Date.now() - cached.ts) < 30 * 60 * 1000) {
            vpObstacles = cached.obs;
            window.vpBgNeedsUpdate = true;
            if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
            return;
        }
    } catch(e) {}

    const minLat = (lat - 0.135).toFixed(4), maxLat = (lat + 0.135).toFixed(4);
    const minLon = (lon - 0.20).toFixed(4),  maxLon = (lon + 0.20).toFixed(4);
    const bbox = `${minLat},${minLon},${maxLat},${maxLon}`;
    const query = `[out:json][timeout:30][bbox:${bbox}];(node["generator:source"="wind"];node["man_made"~"mast|tower"]["height"];);out body qt;`;

    const overpassServers = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter'
    ];
    window.vpServerOffset = (window.vpServerOffset || 0) + 1;
    const serverUrl = overpassServers[window.vpServerOffset % overpassServers.length];

    try {
        const res = await fetch(serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!json.elements) return;

        let rawObs = [];
        json.elements.forEach(e => {
            if (e.type !== 'node' || !e.lat || !e.lon) return;
            const hFt = parseFloat(e.tags?.height || 0) * 3.28084;
            if (hFt < 50) return;
            const nav = calcNav(lat, lon, e.lat, e.lon);
            const isWind = e.tags?.['generator:source'] === 'wind';
            rawObs.push({ type: isWind ? 'windrad' : 'mast', hFt, distNM: nav.dist, elevFt: 0, groundElevFt: 0, lat: e.lat, lon: e.lon });
        });

        let buckets = {};
        rawObs.forEach(obs => {
            let bIdx = Math.floor(obs.distNM / 0.5);
            if (!buckets[bIdx]) buckets[bIdx] = [];
            buckets[bIdx].push(obs);
        });
        let finalObs = [];
        for (let k in buckets) {
            let group = buckets[k].sort((a,b) => b.hFt - a.hFt);
            let rep = group[0]; rep.count = group.length;
            finalObs.push(rep);
        }

        vpObstacles = finalObs;
        window.vpBgNeedsUpdate = true;
        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();

        try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), obs: finalObs })); } catch(e) {}
        console.log(`[GPS-Obs] ${finalObs.length} Hindernisse im 30km-Umkreis geladen.`);
    } catch(e) {
        console.warn('[GPS-Obs] Overpass-Fehler:', e);
    }
}
window.fetchGpsObstacles = fetchGpsObstacles;

function triggerVerticalProfileUpdate() {
    if (vpProfileFastTimeout) clearTimeout(vpProfileFastTimeout);
    if (window.vpFetchController) window.vpFetchController.abort();
    window.vpFetchController = new AbortController();
    const currentSignal = window.vpFetchController.signal;

    vpProfileFastTimeout = setTimeout(async () => {
        if (!routeWaypoints || routeWaypoints.length < 2) return;
        const cacheKey = routeWaypoints.map(p => `${(p.lat || 0).toFixed(4)},${((p.lng || p.lon) || 0).toFixed(4)}`).join('|');
        
        if (window._lastVpRouteKey !== cacheKey) {
            vpAltWaypoints = []; vpSegmentAlts = []; vpHighResData = null; vpZoomLevel = 100;
            vpWeatherData = null;
            vpObstacles = []; // NEU: Alte Hindernisse sofort löschen
            vpLinearFeatures = []; // NEU: Alte Straßen/Flüsse sofort löschen
            if (typeof renderWeatherMarkers === 'function') renderWeatherMarkers();
            const zd = document.getElementById('vpZoomDisplay'); if (zd) zd.textContent = '0%';
            window._lastVpRouteKey = cacheKey;
        }

        const status = document.getElementById('verticalProfileStatus');
        if (status) status.textContent = 'Lade Terrain...';

        try {
            // 1. Höhendaten (Blockierend, da alles andere darauf aufbaut)
            vpElevationData = await fetchRouteElevation(routeWaypoints, currentSignal);
            
            window.vpElevationData = vpElevationData;
            
            // 2. Städte / Landmarks (Lokale JSON, blitzschnell)
            if (window._lastLmRouteKey !== cacheKey) {
                const btnLm = document.getElementById('btnToggleLandmarks');
                if (btnLm) btnLm.classList.add('vp-loading-pulse');
                const lmStr = localStorage.getItem('ga_lms_' + cacheKey);
                if (lmStr) {
                    try { vpLandmarks = JSON.parse(lmStr); window._lastLmRouteKey = cacheKey; } catch(e) { vpLandmarks = []; }
                } else {
                    vpLandmarks = await fetchProfileLandmarks(vpElevationData);
                    if (vpLandmarks !== null) {
                        try { localStorage.setItem('ga_lms_' + cacheKey, JSON.stringify(vpLandmarks)); window._lastLmRouteKey = cacheKey; } catch(e) {}
                    }
                }
                if (btnLm) btnLm.classList.remove('vp-loading-pulse');
            }
            
            if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();

            if (status) status.textContent = 'Lade Wetter & Umgebung...';
            
            // 3. PARALLELER FETCH: Wetter & Overpass
            const fetchWetter = async () => {
                if (!vpShowClouds && !(typeof window.vpShowMapMetar !== 'undefined' && window.vpShowMapMetar)) return;
                
                // FIX: Wetter nicht aus dem Netz neu laden, wenn wir es für diese Route schon have!
                if (window._lastWetterRouteKey === cacheKey && vpWeatherData) {
                    window.vpBgNeedsUpdate = true; 
                    if (typeof renderWeatherMarkers === 'function') renderWeatherMarkers();
                    return;
                }

                const btnCl = document.getElementById('btnToggleClouds');
                if (btnCl) btnCl.classList.add('vp-loading-pulse');
                vpWeatherData = await fetchRouteWeather(routeWaypoints, vpElevationData, currentSignal);
                window._lastWetterRouteKey = cacheKey; // Cache-Key merken
                if (btnCl) btnCl.classList.remove('vp-loading-pulse');
                
                window.vpBgNeedsUpdate = true; 
                if (typeof renderWeatherMarkers === 'function') renderWeatherMarkers(); 
            };

            const fetchOverpass = async () => {
                if (!vpShowObstacles && !vpShowLinear) return;
                if (window._lastObsRouteKey !== cacheKey) {
                    const btnOb = document.getElementById('btnToggleObstacles');
                    const btnLin = document.getElementById('btnToggleLinear');
                    if (btnOb) btnOb.classList.add('vp-loading-pulse');
                    if (btnLin) btnLin.classList.add('vp-loading-pulse');

                    // FIX: Kombinierter Cache für Hindernisse UND Flüsse/Autobahnen
                    const obStr = localStorage.getItem('ga_obs_combo_' + cacheKey);
                    if (obStr) {
                        try { 
                            const cached = JSON.parse(obStr); 
                            vpObstacles = cached.obs || [];
                            vpLinearFeatures = cached.lin || [];
                            window._lastObsRouteKey = cacheKey; 
                            window.vpBgNeedsUpdate = true; // <--- FIX: Redraw nach Laden aus Cache erzwingen
                        } catch(e) { vpObstacles = []; vpLinearFeatures = []; }
                    } else {
                        const result = await fetchProfileObstacles(vpElevationData, currentSignal);
                        if (result !== null) { 
                            vpObstacles = result.obs || [];
                            vpLinearFeatures = result.lin || [];
                            window.vpBgNeedsUpdate = true; // FIX: Garantiert, dass der Hintergrund nach dem finalen Fetch aktualisiert wird
                            try { localStorage.setItem('ga_obs_combo_' + cacheKey, JSON.stringify(result)); window._lastObsRouteKey = cacheKey; } catch(e) {}
                        }
                    }
                    if (btnOb) btnOb.classList.remove('vp-loading-pulse');
                    if (btnLin) btnLin.classList.remove('vp-loading-pulse');
                }
            };

            // Führe beide schweren Netzwerk-Tasks parallel aus
            await Promise.all([fetchWetter(), fetchOverpass()]);
            if (status) status.textContent = vpElevationData.length + ' Punkte & API-Daten geladen';
            
        } catch(e) {
            if (e && e.name !== 'AbortError') console.error('Profile Fetch Error:', e);
            if (status) status.textContent = 'API Error / Abgebrochen';
        } finally {
            const bC = document.getElementById('btnToggleClouds'); if(bC) bC.classList.remove('vp-loading-pulse');
            const bO = document.getElementById('btnToggleObstacles'); if(bO) bO.classList.remove('vp-loading-pulse');
            const bL = document.getElementById('btnToggleLinear'); if(bL) bL.classList.remove('vp-loading-pulse');
            if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
        }
    }, 150); // Nur noch 150ms Debounce statt fast 3 Sekunden!
}

async function fetchRouteElevation(routePts, signal) {
    if (!routePts || routePts.length < 2) return [];

    // Generate a unique cache key based on route coordinates
    const cacheKey = routePts.map(p => `${(p.lat || 0).toFixed(4)},${((p.lng || p.lon) || 0).toFixed(4)}`).join('|');
    if (vpElevationCache[cacheKey]) {
        return vpElevationCache[cacheKey];
    }

    try {
        const stored = localStorage.getItem('ga_elev_cache_' + cacheKey);
        if (stored) {
            const data = JSON.parse(stored);
            vpElevationCache[cacheKey] = data;
            return data;
        }
    } catch (e) { }

    const interpolated = [];
    let cumulativeDist = 0;

    for (let i = 0; i < routePts.length - 1; i++) {
        const p1 = routePts[i], p2 = routePts[i + 1];
        const lat1 = p1.lat, lon1 = p1.lng || p1.lon;
        const lat2 = p2.lat, lon2 = p2.lng || p2.lon;
        const segDist = calcNav(lat1, lon1, lat2, lon2).dist;
        const steps = Math.max(1, Math.round(segDist));

        for (let j = 0; j <= steps; j++) {
            if (i > 0 && j === 0) continue;
            const f = j / steps;
            interpolated.push({
                lat: lat1 + (lat2 - lat1) * f,
                lon: lon1 + (lon2 - lon1) * f,
                distNM: cumulativeDist + segDist * f
            });
        }
        cumulativeDist += segDist;
    }

    let samplePts = interpolated;
    if (interpolated.length > 100) {
        samplePts = [];
        for (let i = 0; i < 100; i++) {
            const idx = Math.round(i * (interpolated.length - 1) / 99);
            samplePts.push(interpolated[idx]);
        }
    }

    const lats = samplePts.map(p => p.lat.toFixed(4)).join(',');
    const lons = samplePts.map(p => p.lon.toFixed(4)).join(',');

    try {
        const res = await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + lats + '&longitude=' + lons, { signal });
        if (!res.ok) throw new Error('Elevation API error: ' + res.status);
        const data = await res.json();

        if (!data.elevation || data.elevation.length !== samplePts.length) {
            throw new Error('Invalid elevation response');
        }

        const finalData = samplePts.map((p, i) => ({
            distNM: p.distNM,
            elevFt: Math.round(data.elevation[i] * 3.28084),
            lat: p.lat,
            lon: p.lon
        }));

        vpElevationCache[cacheKey] = finalData;
        try { localStorage.setItem('ga_elev_cache_' + cacheKey, JSON.stringify(finalData)); } catch (e) { }
        return finalData;
    } catch (e) {
        if (e && e.name === 'AbortError') return null;
        throw e;
    }
}

async function fetchRouteWeather(routePts, elevData, signal) {
    if (!routePts || routePts.length < 2 || !elevData || elevData.length < 2) return null;

    const totalDist = elevData[elevData.length - 1].distNM;
    let activeMetars = [];

    // METAR FIX: Route in parallele 60-NM-Blöcke schneiden, um AviationWeather API-Schnittlimits (Max Stations) zu umgehen!
    const CHUNK_NM = 60;
    const promises = [];

    for (let d = 0; d < totalDist; d += CHUNK_NM) {
        let cMinLat = 90, cMaxLat = -90, cMinLon = 180, cMaxLon = -180;
        elevData.forEach(p => {
            if (p.distNM >= d && p.distNM < d + CHUNK_NM) {
                if (p.lat < cMinLat) cMinLat = p.lat;
                if (p.lat > cMaxLat) cMaxLat = p.lat;
                if (p.lon < cMinLon) cMinLon = p.lon;
                if (p.lon > cMaxLon) cMaxLon = p.lon;
            }
        });
        if (cMinLat === 90) continue;
        
        // Puffer hinzufügen (ca. 45 NM)
        cMinLat -= 0.8; cMaxLat += 0.8; cMinLon -= 0.8; cMaxLon += 0.8;
        const url = `https://aviationweather.gov/api/data/metar?bbox=${cMinLat},${cMinLon},${cMaxLat},${cMaxLon}&format=json&t=${Date.now()}`;
        
        promises.push(
            fetch(url, { signal })
            .then(r => r.ok && r.status !== 204 ? r.json() : [])
            .catch(async () => {
                try {
                    const pr = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`, { signal });
                    return pr.ok && pr.status !== 204 ? pr.json() : [];
                } catch(e) { return []; }
            })
        );
    }

    const results = await Promise.all(promises);
    if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');

    let seen = new Set();
    let totalInChunks = 0;
    
    results.forEach((arr, idx) => {
        if (arr && arr.length) {
            console.log(`[Wetter] Chunk ${idx + 1}: ${arr.length} METAR-Stationen geliefert.`);
            totalInChunks += arr.length;
            
            // BULK CACHE: Füttert die Widgets sofort mit den heruntergeladenen Daten!
            const useBulk = (typeof gpsState !== 'undefined' && gpsState.metarCache);
            
            arr.forEach(m => {
                if (m && m.icaoId && !seen.has(m.icaoId)) {
                    seen.add(m.icaoId);
                    activeMetars.push(m);
                    
                    if (useBulk) {
                        gpsState.metarCache[m.icaoId] = { data: [m], isFallback: false, foundIcao: m.icaoId };
                    }
                }
            });
        } else {
            console.log(`[Wetter] Chunk ${idx + 1}: 0 Stationen (Leerer Bereich oder Fehler).`);
        }
    });
    console.log(`[Wetter] Gesamt nach Duplikat-Filterung: ${activeMetars.length} einzigartige Stationen für dieses Flugprofil.`);

    if (!activeMetars || activeMetars.length === 0) return null;
    const stepNM = 15;
    const zones = [];

    for (let targetDist = 0; targetDist <= totalDist; targetDist += stepNM) {
        let bestPt = elevData[0];
        let minDiff = Infinity;
        for (const pt of elevData) {
            const diff = Math.abs(pt.distNM - targetDist);
            if (diff < minDiff) { minDiff = diff; bestPt = pt; }
        }

        let closestMetar = null, minMetarDist = Infinity;
        activeMetars.forEach(m => {
            const d = calcNav(bestPt.lat, bestPt.lon, m.lat, m.lon).dist;
            if (d < minMetarDist) { minMetarDist = d; closestMetar = m; }
        });

        if (closestMetar && minMetarDist < 45) {
            const clouds = [];
            const raw = closestMetar.rawOb || "";
            const stnElevFt = closestMetar.elev ? closestMetar.elev * 3.28084 : 0;
            const cloudRegex = /(FEW|SCT|BKN|OVC|VV)(\d{3})/g;
            let match, lowestBase = Infinity;
            
            while((match = cloudRegex.exec(raw)) !== null) {
                const agl = parseInt(match[2], 10) * 100;
                const msl = Math.round(agl + stnElevFt);
                if (msl < lowestBase) lowestBase = msl;
                clouds.push({ type: match[1], baseAgl: agl, baseMsl: msl });
            }
            
            const hasRain = /\b(-|\+)?(RA|DZ|SH|SHRA)\b/i.test(raw);
            const hasSnow = /\b(-|\+)?(SN|SG|PL|SHSN)\b/i.test(raw);
            const hasTS = /\b(-|\+)?(TS|TSRA|CB)\b/i.test(raw);
            
            const visuals = { puffs: [], drops: [], flashes: [] };
            if (clouds.length > 0) {
                for(let c=0; c<25; c++) visuals.puffs.push({ x: Math.random(), y: Math.random(), r: Math.random(), op: Math.random() });
            }
            if (hasRain || hasSnow) {
                for(let d=0; d<120; d++) visuals.drops.push({ x: Math.random(), y: Math.random(), spd: Math.random() });
            }
            if (hasTS) {
                for(let f=0; f<2; f++) visuals.flashes.push({ x: Math.random(), pts: [Math.random(), Math.random(), Math.random(), Math.random()] });
            }
            
            // IMMER pushen, damit auch wolkenlose Stationen als Marker auf der Karte landen!
            zones.push({
                distNM: bestPt.distNM, icao: closestMetar.icaoId, stnDist: Math.round(minMetarDist), clouds: clouds,
                lowestBase: lowestBase !== Infinity ? lowestBase : 5000,
                weather: { hasRain, hasSnow, hasTS }, visuals: visuals,
                stnLat: closestMetar.lat, stnLon: closestMetar.lon,
                fltCat: closestMetar.fltcat || closestMetar.fltCat || "VFR",
                raw: raw,
                wdir: closestMetar.wdir, 
                wspd: closestMetar.wspd
            });
        }
    }

    return zones.length > 0 ? zones : null;
}
// Globale Debug-Funktion für die Entwicklerkonsole
window.debugCloudProfile = function() {
    console.log("=== MANUELLER CLOUD DEBUG START ===");
    if (!routeWaypoints || routeWaypoints.length < 2) {
        console.warn("Bitte erst einen Flugauftrag generieren (Route fehlt).");
        return;
    }
    triggerVerticalProfileUpdate();
    console.log("Update angetriggert. Bitte das Profil-Canvas öffnen und die Logs beobachten.");
};
function vpDrawTerrainCover(ctx, xOf, yOf, elevData, viewMinX, viewMaxX, zoomFactor, maxAlt) {
    if (!elevData || elevData.length < 2) return;
    ctx.save();
    const prng = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
    
    // 1. WÄLDER (Dunkelgrüne Tannenzacken)
    ctx.fillStyle = '#1c3614'; 
    ctx.beginPath();
    
    for (let i = 0; i < elevData.length - 1; i++) {
        const p1 = elevData[i];
        const p2 = elevData[i+1];
        const startX = xOf(p1.distNM);
        const endX = xOf(p2.distNM);
        
        if (endX < viewMinX || startX > viewMaxX) continue;
        
        const dist = p2.distNM - p1.distNM;
        if (dist === 0) continue;
        const slope = Math.abs(p2.elevFt - p1.elevFt) / dist;
        
        const isForest = (p1.elevFt > 200 && p1.elevFt < 4500) && (slope > 80 || prng(i) > 0.5);
        
        if (isForest) {
            // PERFORMANCE & OPTIK FIX: Verhindert den "Blob" beim Rauszoomen
            const pixelDist = endX - startX;
            const maxTrees = Math.max(1, Math.floor(pixelDist / 6)); // Max 1 Baum alle 6 Pixel
            const numTrees = Math.min(Math.max(1, Math.floor(dist * 15)), maxTrees); 
            
            for(let t = 0; t < numTrees; t++) {
                const seed = i * 100 + t;
                if (prng(seed + 0.1) > 0.7) continue;
                
                const f = t / numTrees;
                const tx = startX + f * (endX - startX);
                const altFt = p1.elevFt + f * (p2.elevFt - p1.elevFt);
                const ty = yOf(altFt);
                
                // Bäume skalieren sanft runter, bleiben aber knackig
                const scale = Math.min(1, zoomFactor / 2.5);
                const treeHeight = Math.max(3, (5 + prng(seed + 0.2) * 8) * scale);
                const treeWidth = Math.max(2, (4 + prng(seed + 0.3) * 4) * scale);
                
                ctx.moveTo(tx - treeWidth/2, ty + 2);
                ctx.lineTo(tx, ty - treeHeight);
                ctx.lineTo(tx + treeWidth/2, ty + 2);
            }
        }
    }
    ctx.fill();
    
    // 2. ECHTE FLÜSSE UND AUTOBAHNEN (Linear Features aus Overpass / HDG-Korridor)
    // Im HDG-Modus: vpHdgLinearFeatures (entlang Heading gefiltert), sonst Route-Daten
    const _linSrc = (vpMode === 'HDG' && typeof vpHdgLinearFeatures !== 'undefined' && vpHdgLinearFeatures.length > 0)
        ? vpHdgLinearFeatures
        : (typeof vpLinearFeatures !== 'undefined' ? vpLinearFeatures : []);
    if (typeof vpShowLinear !== 'undefined' && vpShowLinear && _linSrc.length > 0) {
        const getElevY = (dNM) => {
            for(let i=0; i<elevData.length-1; i++) {
                if (dNM >= elevData[i].distNM && dNM <= elevData[i+1].distNM) {
                    const f = (dNM - elevData[i].distNM) / (elevData[i+1].distNM - elevData[i].distNM);
                    return yOf(elevData[i].elevFt + f * (elevData[i+1].elevFt - elevData[i].elevFt));
                }
            }
            return yOf(elevData[elevData.length-1].elevFt);
        };

        // PERFORMANCE FIX: Layout nur 1x pro Zoom-Stufe, maxAlt UND aktueller Route berechnen!
        const routeKey = window._lastVpRouteKey || 'none';
        // Im HDG-Modus: Cache-Key enthält Heading → wird bei Kursänderung invalidiert
        const layoutKey = (vpMode === 'HDG')
            ? ('hdg_lin_' + (window.lastLiveGpsPos?.hdg || 0).toFixed(0) + '_' + zoomFactor.toFixed(2))
            : (routeKey + '_' + zoomFactor.toFixed(2) + '_' + (maxAlt || 0).toFixed(0));

        // Neu berechnen, wenn sich der Cache-Key ändert ODER die Features noch keine Render-Daten haben
        if (!window._vpLinearLayouts || window._vpLinearLayouts.key !== layoutKey || (_linSrc.length > 0 && !_linSrc[0]._render)) {
            let occupiedSigns = [];
            for (const feat of _linSrc) {
                const px = xOf(feat.distNM);
                const py = getElevY(feat.distNM);
                feat._render = { px, py, drawName: false, labelY: 0, tw: 0 };
                
                if (feat.name && zoomFactor >= 1.2) {
                    ctx.font = feat.type === 'river' ? 'bold 8px Arial' : 'bold 7px Arial';
                    const tw = ctx.measureText(feat.name).width;
                    feat._render.tw = tw;
                    let labelY = feat.type === 'river' ? py + 15 : py - 14;
                    let collision = true, attempts = 0;
                    while(collision && attempts < 4) {
                        collision = false;
                        for(let occ of occupiedSigns) {
                            if (px - tw/2 - 3 < occ.r && px + tw/2 + 3 > occ.l && labelY < occ.b && labelY + 10 > occ.t) { collision = true; break; }
                        }
                        if(collision) { labelY += (feat.type === 'river' ? 10 : -12); attempts++; }
                    }
                    if(!collision) {
                        occupiedSigns.push({l: px - tw/2 - 2, r: px + tw/2 + 2, t: labelY, b: labelY + 10});
                        feat._render.drawName = true;
                        // FIX: Wir merken uns nur den Pixel-Abstand zum Boden, nicht die absolute Höhe!
                        feat._render.labelYOffset = labelY - py;
                    }
                }
            }
            window._vpLinearLayouts = { key: layoutKey, occ: occupiedSigns };
            window.vpLinearOccupied = occupiedSigns; 
        }

        // NUR NOCH ZEICHNEN (mit weichem Culling)
        for (const feat of _linSrc) {
            if (!feat._render) continue;
            
            // FIX: X und Y live berechnen, damit Schilder mit der Bodenlinie wandern
            const px = xOf(feat.distNM);
            const py = getElevY(feat.distNM);
            if (px < viewMinX - 50 || px > viewMaxX + 50) continue;
            
            if (feat.type === 'river') {
                ctx.fillStyle = '#3498db'; ctx.beginPath();
                ctx.moveTo(px - 4, py - 1); ctx.lineTo(px - 2, py + 5); ctx.lineTo(px + 2, py + 5); ctx.lineTo(px + 4, py - 1); ctx.fill();
                if (feat._render.drawName) {
                    const labelY = py + feat._render.labelYOffset;
                    ctx.fillStyle = '#3498db'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText(feat.name, px, labelY + 8);
                }
            } else if (feat.type === 'highway') {
                ctx.fillStyle = '#555'; ctx.fillRect(px - 3, py - 2, 6, 4);
                ctx.fillStyle = '#f2c12e'; ctx.fillRect(px - 1, py - 1, 2, 2);
                if (feat._render.drawName) {
                    const labelY = py + feat._render.labelYOffset;
                    ctx.fillStyle = '#1a73e8'; ctx.fillRect(px - feat._render.tw/2 - 2, labelY, feat._render.tw + 4, 10);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.fillText(feat.name, px, labelY + 8);
                }
            }
        }
    }
    ctx.restore();
}
function vpDrawLandmarks(ctx, xOf, yOf, elevData, totalDist, isDarkTheme, zoomFactor, maxAlt, lmOverride = null) {
    const _landmarks = lmOverride !== null ? lmOverride : vpLandmarks;
    if (!_landmarks || _landmarks.length === 0) return;
    const getElevY = (dNM) => {
        if (!elevData || elevData.length < 2) return yOf(0);
        for(let i=0; i<elevData.length-1; i++) {
            if (dNM >= elevData[i].distNM && dNM <= elevData[i+1].distNM) {
                const f = (dNM - elevData[i].distNM) / (elevData[i+1].distNM - elevData[i].distNM);
                return yOf(elevData[i].elevFt + f * (elevData[i+1].elevFt - elevData[i].elevFt));
            }
        }
        return yOf(elevData[elevData.length-1].elevFt);
    };
    
    // PERFORMANCE FIX: Kollisionen nur 1x pro Zoom-Stufe, maxAlt UND aktueller Route berechnen
    const routeKey = window._lastVpRouteKey || 'none';
    const layoutKey = routeKey + '_' + zoomFactor.toFixed(2) + '_' + (maxAlt || 0).toFixed(0) + '_' + (window.vpShowLinear ? '1' : '0');
    
    // Im HDG-Modus: kein Layout-Cache, immer neu berechnen (distNM ändert sich mit Kurs)
    const isHdgLm = lmOverride !== null;
    const hdgLmKey = isHdgLm ? ('hdg_' + (window.lastLiveGpsPos?.hdg || 0).toFixed(0) + '_' + zoomFactor.toFixed(2)) : null;
    const effectiveLayoutKey = isHdgLm ? hdgLmKey : layoutKey;

    if (!window._vpLandmarkLayouts || window._vpLandmarkLayouts.key !== effectiveLayoutKey || (_landmarks.length > 0 && !_landmarks[0]._render)) {
        let globalOccupiedX = [];
        const nmPerPx = totalDist / (xOf(totalDist) - xOf(0));
        const edgePad = Math.min(2.5, totalDist * 0.05);
        ctx.font = `bold ${(zoomFactor >= 1.5 ? 10 : 8)}px Arial`; // Setup für measureText

        for (const lm of _landmarks) {
            lm._render = null;
            if (lm.distNM < edgePad || lm.distNM > totalDist - edgePad) continue;
            
            const px = xOf(lm.distNM);
            const icon = lm.type === 'apt' ? '🛫' : (lm.type === 'city' ? '🏢' : '🏘️');
            const fontSize = (zoomFactor >= 1.5) ? 10 : 8;

            let iconScale = 1.0;
            if (lm.type !== 'apt') {
                const p = Math.max(5000, Math.min(1000000, lm.pop || 5000));
                const logPop = Math.log10(p);
                let factor = (logPop - 3.7) / 2.3;
                iconScale = Math.min((zoomFactor >= 1.5 ? 2.5 : 1.5), 0.5 + Math.max(0, Math.min(1, factor)) * 2.0);
            } else iconScale = 1.2;
            
            const iconFontSize = Math.max(8, Math.round(11 * iconScale));
            const iconOffsetY = Math.round(iconFontSize * 0.55);
            
            const textWidth = ctx.measureText(lm.name).width;
            const reqWidth = Math.max(textWidth, iconFontSize + 4) + 6;
            
            let shiftAttempts = 0, currentDistNM = lm.distNM, currentPx = px, currentPy = getElevY(lm.distNM);
            let collision = true, finalMinX, finalMaxX;

            while (collision && shiftAttempts < 12) {
                collision = false;
                finalMinX = currentPx - reqWidth / 2;
                finalMaxX = currentPx + reqWidth / 2;
                const boxT = currentPy - iconOffsetY - iconFontSize;
                const boxB = currentPy + 20;

                for (const occ of globalOccupiedX) {
                    if (finalMinX < occ.maxX && finalMaxX > occ.minX) { collision = true; break; }
                }
                if (!collision && window.vpLinearOccupied) {
                    for (const occ of window.vpLinearOccupied) {
                        if (finalMinX < occ.r && finalMaxX > occ.l && boxT < occ.b && boxB > occ.t) { collision = true; break; }
                    }
                }
                if (collision) {
                    shiftAttempts++;
                    const shiftPx = (shiftAttempts % 2 !== 0 ? -1 : 1) * Math.ceil(shiftAttempts / 2) * 8;
                    currentDistNM = lm.distNM + (shiftPx * nmPerPx);
                    currentPx = xOf(currentDistNM);
                    currentPy = getElevY(currentDistNM); 
                }
            }

            if (!collision) {
                globalOccupiedX.push({ minX: finalMinX, maxX: finalMaxX, t: currentPy - iconOffsetY - iconFontSize, b: currentPy + 20 });
                // FIX: Wir cachen nur die Distanz (inkl. Ausweich-Shift), die Pixelhöhe wird im Render-Loop LIVE berechnet!
                lm._render = { distNM: currentDistNM, icon, iconFontSize, iconOffsetY, fontSize };
            }
        }
        window._vpLandmarkLayouts = { key: effectiveLayoutKey, occ: globalOccupiedX };
        window.vpLandmarkOccupiedX = globalOccupiedX;
    }
    
    // NUR NOCH ZEICHNEN (Schnell, ohne jegliche Kollisions-Logik)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    let viewMinX = -Infinity, viewMaxX = Infinity;
    if (ctx.canvas.id === 'mapProfileCanvasBg') {
        const sc = document.getElementById('mapProfileScroll');
        if (sc) { viewMinX = sc.scrollLeft - 100; viewMaxX = sc.scrollLeft + sc.clientWidth + 100; }
    }

    for (const lm of _landmarks) {
        if (!lm._render) continue;

        // FIX: X und Y Pixel in Echtzeit anhand der aktuellen Skalierung berechnen
        const px = xOf(lm._render.distNM);
        const py = getElevY(lm._render.distNM);
        
        if (px < viewMinX || px > viewMaxX) continue;
        
        ctx.font = lm._render.iconFontSize + 'px Arial';
        ctx.fillStyle = '#ffffff'; 
        ctx.fillText(lm._render.icon, px, py - lm._render.iconOffsetY);
        
        if (!window.vpIsFastRendering) {
            ctx.font = `bold ${lm._render.fontSize}px Arial`;
            ctx.fillStyle = isDarkTheme ? 'rgba(190, 180, 160, 0.7)' : 'rgba(70, 60, 40, 0.7)';
            ctx.fillText(lm.name, px, py + 10); 
        }
    }
    ctx.restore();
}
function vpDrawObstacles(ctx, xOf, yOf, totalDist, zoomFactor, elevData, timeMs = 0, obsOverride = null) {
    if (obsOverride !== null) { const _orig = vpObstacles; vpObstacles = obsOverride; const r = vpDrawObstacles(ctx, xOf, yOf, totalDist, zoomFactor, elevData, timeMs, null); vpObstacles = _orig; return r; }
    if (!vpObstacles || vpObstacles.length === 0) return;
    const edgePad = Math.min(1.0, totalDist * 0.02);
    
    const getElevY = (dNM) => {
        if (!elevData || elevData.length < 2) return yOf(0);
        let low = 0, high = elevData.length - 2;
        while (low <= high) {
            let mid = (low + high) >> 1;
            if (dNM < elevData[mid].distNM) high = mid - 1;
            else if (dNM > elevData[mid+1].distNM) low = mid + 1;
            else {
                const p1 = elevData[mid], p2 = elevData[mid+1];
                const f = (dNM - p1.distNM) / (p2.distNM - p1.distNM || 1);
                return yOf(p1.elevFt + f * (p2.elevFt - p1.elevFt));
            }
        }
        return yOf(elevData[elevData.length - 1].elevFt);
    };

    let viewMinX = -Infinity, viewMaxX = Infinity;
    if (ctx.canvas.id === 'mapProfileCanvas') {
        const sc = document.getElementById('mapProfileScroll');
        if (sc) { viewMinX = sc.scrollLeft - 200; viewMaxX = sc.scrollLeft + sc.clientWidth + 200; }
    }
    
    ctx.save();
    
    // 1. Alle Masten zeichnen und Label-Positionen sammeln
    let rawLabels = [];
    
    for (const obs of vpObstacles) {
        if (obs.distNM < edgePad || obs.distNM > totalDist - edgePad) continue;
        const px = xOf(obs.distNM);
        if (px < viewMinX || px > viewMaxX) continue; // CULLING
        const pyGround = getElevY(obs.distNM);
        const trueHeightPx = Math.abs(yOf(obs.hFt) - yOf(0));
        
        // Der Mast steckt 8 Pixel tief im Boden
        const pyRoot = pyGround + 8; 

        if (obs.type === 'wind') {
            // FIX: Die "echte" sichtbare Länge ist die Höhe über Grund PLUS die 8px im Boden!
            const visualTotalHeight = trueHeightPx + 8;
            
            // Blätter sind jetzt immer ca. 45% des ECHTEN sichtbaren Mastes (mindestens 4px)
            const r = Math.max(4, visualTotalHeight * 0.45);
            
            // Die Nabe sitzt so, dass das obere Blatt genau an der echten Spitze kratzt
            const pyTop = pyGround - trueHeightPx;
            const pyHub = pyTop + r;

            ctx.beginPath(); ctx.moveTo(px, pyRoot); ctx.lineTo(px, pyHub);
            ctx.strokeStyle = 'rgba(230, 230, 230, 0.9)'; ctx.lineWidth = 1.5; ctx.stroke();

            ctx.fillStyle = '#f5f5f5'; ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)'; ctx.lineWidth = 0.5;
            const rotSpeed = 0.0015;
            const rotOffset = ((obs.distNM * 137) + (timeMs * rotSpeed)) % (Math.PI * 2);
            for (let i = 0; i < 3; i++) {
                const a = rotOffset + (i * 120 - 90) * Math.PI / 180;
                ctx.beginPath();
                ctx.moveTo(px, pyHub);
                ctx.lineTo(px + Math.cos(a - 0.2) * r * 0.25, pyHub + Math.sin(a - 0.2) * r * 0.25);
                ctx.lineTo(px + Math.cos(a) * r,               pyHub + Math.sin(a) * r);
                ctx.lineTo(px + Math.cos(a + 0.2) * r * 0.25, pyHub + Math.sin(a + 0.2) * r * 0.25);
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            // Nabe wächst proportional mit
            ctx.beginPath(); ctx.arc(px, pyHub, Math.max(1.5, r * 0.15), 0, Math.PI * 2); ctx.fillStyle = '#ccc'; ctx.fill();
        } else {
            // Normale Masten (ohne Rotoren) - mindestens 2px über dem Boden sichtbar
            const pyTop = pyGround - Math.max(2, trueHeightPx);
            ctx.beginPath(); ctx.moveTo(px, pyRoot); ctx.lineTo(px, pyTop);
            ctx.strokeStyle = 'rgba(80, 80, 80, 0.9)'; ctx.lineWidth = 1.5; ctx.stroke();

            // ANIMATION: Blinkendes Licht
            const blink = 0.3 + 0.6 * (Math.sin(timeMs * 0.005 + obs.distNM * 50) * 0.5 + 0.5);
            ctx.beginPath(); ctx.arc(px, pyTop, 2, 0, Math.PI * 2); ctx.fillStyle = `rgba(217, 56, 41, ${blink})`; ctx.fill();
        }

        rawLabels.push({ x: px, yBase: pyRoot, count: obs.count || 1 });
    }
    
    if (window.vpIsFastRendering) { ctx.restore(); return; } // Performance-Culling
    
    // 2. Labels abhängig vom Zoom/Pixelabstand clustern
    rawLabels.sort((a, b) => a.x - b.x);
    let clusters = [];
    const MIN_LABEL_DIST = 22; 

    for (const lbl of rawLabels) {
        if (clusters.length === 0) {
            clusters.push({ sumX: lbl.x, sumY: lbl.yBase, count: lbl.count, items: 1 });
        } else {
            let last = clusters[clusters.length - 1];
            let avgX = last.sumX / last.items; 
            
            if (lbl.x - avgX < MIN_LABEL_DIST) {
                last.sumX += lbl.x;
                last.sumY += lbl.yBase;
                last.count += lbl.count;
                last.items += 1;
            } else {
                clusters.push({ sumX: lbl.x, sumY: lbl.yBase, count: lbl.count, items: 1 });
            }
        }
    }

    // 3. Cluster-Labels zeichnen (ohne Schatten, reine Schrift)
    ctx.fillStyle = '#d93829';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const cl of clusters) {
        if (cl.count <= 1) continue; 
        
        const px = cl.sumX / cl.items;
        const pyBase = cl.sumY / cl.items;
        
        let collision = false;
        const textWidth = 18; 
        const minX = px - textWidth / 2;
        const maxX = px + textWidth / 2;
        
        if (window.vpLandmarkOccupiedX) {
            for (const occ of window.vpLandmarkOccupiedX) {
                if (minX < occ.maxX + 4 && maxX > occ.minX - 4) {
                    collision = true; break;
                }
            }
        }
        
        if (!collision) {
            ctx.fillText('×' + cl.count, px, pyBase + 2);
        }
    }
    
    ctx.restore();
}

function vpDrawClouds(ctx, xOf, yOf, padTop, plotH, totalDist, isDarkTheme, elevData) {
    if (!vpWeatherData || vpWeatherData.length === 0) return;
    const getElevY = (dNM) => {
        if (!elevData || elevData.length < 2) return yOf(0);
        for(let i=0; i<elevData.length-1; i++) {
            if (dNM >= elevData[i].distNM && dNM <= elevData[i+1].distNM) {
                const f = (dNM - elevData[i].distNM) / (elevData[i+1].distNM - elevData[i].distNM);
                return yOf(elevData[i].elevFt + f * (elevData[i+1].elevFt - elevData[i].elevFt));
            }
        }
        return yOf(elevData[elevData.length-1].elevFt);
    };

    // KEIN Culling für Layer 1 (Wird nativ von der GPU gescrollt)
    let viewMinX = -Infinity, viewMaxX = Infinity;
    // Stabiler, deterministischer Pseudo-Zufallsgenerator gegen Flackern
    const prng = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
    ctx.save();
    for (let i = 0; i < vpWeatherData.length; i++) {
        const zone = vpWeatherData[i];
        const prevDist = (i > 0) ? (zone.distNM + vpWeatherData[i-1].distNM)/2 : Math.max(0, zone.distNM - totalDist*0.05);
        const nextDist = (i < vpWeatherData.length - 1) ? (zone.distNM + vpWeatherData[i+1].distNM)/2 : Math.min(totalDist, zone.distNM + totalDist*0.05);
        const startX = xOf(prevDist), endX = xOf(nextDist), width = endX - startX, midX = startX + width/2;
        
        if (endX < viewMinX || startX > viewMaxX) continue; // CULLING
        // 3. WOLKEN (PUFFS) – Zoom-adaptiv, isolierte Zellen für FEW/SCT
        if (zone.clouds && zone.clouds.length > 0) {
            zone.clouds.forEach((c, cIdx) => {
                const baseY = yOf(c.baseMsl);
                let thicknessFt = 600, baseColor = isDarkTheme ? 210 : 255;
                let coverage = 1.0, radiusMult = 1.0, numCells = 4;
                // Logik für isolierte Grüppchen (mehr Zellen = kleinere Wölkchen)
                if (c.type === 'FEW') { thicknessFt = 800; coverage = 0.22; radiusMult = 0.35; numCells = 16; }
                else if (c.type === 'SCT') { thicknessFt = 1500; baseColor -= 15; coverage = 0.45; radiusMult = 0.6; numCells = 10; }
                else if (c.type === 'BKN') { thicknessFt = 3000; baseColor -= 40; coverage = 0.80; radiusMult = 0.9; numCells = 6; }
                else if (c.type === 'OVC' || c.type === 'VV') { thicknessFt = 5000; baseColor -= 70; coverage = 1.0; }
                if (zone.weather && zone.weather.hasTS) { thicknessFt = Math.max(thicknessFt, 12000); baseColor -= 60; coverage = 1.0; radiusMult = 1.1; numCells = 4; }
                const topY = yOf(c.baseMsl + thicknessFt), layerHeight = baseY - topY;
                if (baseY < padTop - 20 || topY > padTop + plotH + 20) return;
                // Zoom-abhängige Skalierung: Beim Rauszoomen wird 'width' klein -> Wolken werden winzig!
                const maxRadiusY = Math.abs(yOf(1000) - yOf(0));
                const maxRadiusX = width * (2.5 / numCells);
                const maxR = Math.max(2, Math.min(maxRadiusY, maxRadiusX)) * radiusMult;

                const seedBase = i * 100 + cIdx * 10;

                ctx.save();
                ctx.beginPath();
                ctx.rect(startX - 2000, 0, width + 4000, baseY);
                ctx.clip();
                const numPuffs = c.type === 'FEW' ? 40 : 60;
                for (let p = 0; p < numPuffs; p++) {
                    const pxRand = prng(seedBase + p + 0.1);

                    const cellIndex = Math.floor(pxRand * numCells);
                    const cellActive = prng(seedBase + cellIndex * 77) < coverage;
                    if (!cellActive) continue;
                    let localPx = pxRand;
                    // Bei FEW/SCT zwingen wir die Puffs in die Mitte der Zelle (0.2 bis 0.8), um Gaps zu garantieren!
                    if (c.type === 'FEW' || c.type === 'SCT') {
                        const cellStart = cellIndex / numCells;
                        const puffInCell = prng(seedBase + p + 0.5);
                        localPx = cellStart + (0.2 + puffInCell * 0.6) / numCells;
                    }
                    const pyRand = prng(seedBase + p + 0.2);
                    const prRand = prng(seedBase + p + 0.3);
                    const opRand = prng(seedBase + p + 0.4);
                    // OVC überlappt stark, FEW/SCT bleiben strikt in ihrer Zone
                    const px = (c.type === 'FEW' || c.type === 'SCT')
                        ? startX + localPx * width
                        : startX + (localPx * 1.2 - 0.1) * width;
                    const py = baseY - pyRand * layerHeight;
                    const pr = 2 + prRand * maxR;

                    const cVal = Math.floor(baseColor - opRand * 30);
                    const alpha = (c.type === 'FEW') ? (0.15 + opRand * 0.2) : ((c.type === 'SCT') ? (0.3 + opRand * 0.3) : (0.5 + opRand * 0.4));

                    ctx.beginPath();
                    ctx.arc(px, py, pr, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${cVal},${cVal},${cVal},${alpha})`;

                    // Performance-Fix: Weiche Ränder deaktivieren, während UI-Interaktion ODER Fast-Render-Modus aktiv ist!
                    const isDragging = (typeof vpDraggingWP !== 'undefined' && vpDraggingWP >= 0) ||
                                       (typeof vpDraggingSegment !== 'undefined' && !!vpDraggingSegment) ||
                                       (typeof vpResizeActive !== 'undefined' && vpResizeActive) ||
                                       (window.vpUIInteractionActive === true) ||
                                       (window.vpIsFastRendering === true);
                    if (!isDragging) {
                        ctx.shadowColor = `rgba(${cVal},${cVal},${cVal},${alpha})`;
                        ctx.shadowBlur = 4 + prRand * 8;
                    } else {
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                    }

                    ctx.fill();
                }
                ctx.restore();

                ctx.fillStyle = isDarkTheme ? '#ccc' : '#222';
                ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
                ctx.fillText(c.type, midX, baseY + 12);
            });
        }
    }

    // METAR STATIONEN & GRENZEN BEI 16000 FT (Dezentes Debugging-Overlay)
    let lastIcao = null;
    let lastDist = 0;
    for (let i = 0; i < vpWeatherData.length; i++) {
        const zone = vpWeatherData[i];
        if (zone.icao !== lastIcao) {
            const bDist = (i === 0) ? 0 : (lastDist + zone.distNM) / 2;
            const bx = xOf(bDist);
            if (bx >= viewMinX - 100 && bx <= viewMaxX + 100) {
                ctx.beginPath();
                ctx.moveTo(bx, yOf(16500));
                ctx.lineTo(bx, yOf(15500));
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'left';
                const distText = zone.stnDist !== undefined ? ` (${zone.stnDist} NM)` : '';
                ctx.fillText('📡 ' + zone.icao + distText, bx + 4, yOf(16000));
            }
            lastIcao = zone.icao;
        }
        lastDist = zone.distNM;
    }
    ctx.restore();
}

function vpDrawAnimatedWeather(ctx, xOf, yOf, totalDist, elevData, timeMs, viewMinX, viewMaxX) {
    if (!vpWeatherData || vpWeatherData.length === 0) return;

    const getElevY = (dNM) => {
        if (!elevData || elevData.length < 2) return yOf(0);
        let low = 0, high = elevData.length - 2;
        while (low <= high) {
            let mid = (low + high) >> 1;
            if (dNM < elevData[mid].distNM) high = mid - 1;
            else if (dNM > elevData[mid+1].distNM) low = mid + 1;
            else {
                const p1 = elevData[mid], p2 = elevData[mid+1];
                const f = (dNM - p1.distNM) / (p2.distNM - p1.distNM || 1);
                return yOf(p1.elevFt + f * (p2.elevFt - p1.elevFt));
            }
        }
        return yOf(elevData[elevData.length - 1].elevFt);
    };

    ctx.save();
    for (let i = 0; i < vpWeatherData.length; i++) {
        const zone = vpWeatherData[i];
        if (!zone.weather || (!zone.weather.hasRain && !zone.weather.hasSnow && !zone.weather.hasTS)) continue;

        const prevDist = (i > 0) ? (zone.distNM + vpWeatherData[i-1].distNM)/2 : Math.max(0, zone.distNM - totalDist*0.05);
        const nextDist = (i < vpWeatherData.length - 1) ? (zone.distNM + vpWeatherData[i+1].distNM)/2 : Math.min(totalDist, zone.distNM + totalDist*0.05);
        const startX = xOf(prevDist);
        const endX = xOf(nextDist);
        const width = endX - startX;

        if (endX < viewMinX || startX > viewMaxX) continue; // CULLING

        const baseY = yOf(zone.lowestBase);

        // 1. REGEN & SCHNEE ANIMIERT
        if ((zone.weather.hasRain || zone.weather.hasSnow) && zone.visuals && zone.visuals.drops) {
            ctx.beginPath();
            
            // FIX: Virtuelles Fall-Band (von ganz oben nach ganz unten auf dem Bildschirm)
            const virtualTop = -100; 
            const virtualBottom = 500; 
            const virtualFallDist = virtualBottom - virtualTop;

            for(let d=0; d < zone.visuals.drops.length; d++) {
                const drop = zone.visuals.drops[d];
                const dropX = startX + drop.x * width;
                const dNM = prevDist + drop.x * (nextDist - prevDist);
                const groundY = getElevY(dNM);

                if (baseY >= groundY) continue; 

                // Unabhängige, konstante Fall-Animation
                const speed = zone.weather.hasSnow ? (0.01 + drop.spd * 0.01) : (0.05 + drop.spd * 0.03);
                const currentYOffset = ((drop.y * virtualFallDist) + (timeMs * speed)) % virtualFallDist;
                const sy = virtualTop + currentYOffset;

                // CULLING: Tropfen nur zeichnen, wenn er sich zwischen Wolke und Boden befindet!
                if (sy < baseY || sy > groundY) continue;

                if (zone.weather.hasSnow) {
                    const sway = Math.sin(timeMs * 0.002 + d) * 4 * drop.spd;
                    const snowDrift = currentYOffset * 0.15; 
                    let rawSx = dropX + sway - snowDrift;
                    // FIX: Zwingt den Schnee durch Modulo-Wrap immer in der exakten Stations-Breite (Zone) zu bleiben!
                    const sx = startX + ((rawSx - startX) % width + width) % width;
                    
                    ctx.moveTo(sx, sy);
                    ctx.arc(sx, sy, 0.8 + drop.spd, 0, Math.PI*2);
                } else {
                    const tailLength = 6 + drop.spd * 8;
                    const windSlant = 2 + drop.spd * 4; 
                    const driftRatio = windSlant / tailLength;
                    let rawX = dropX - (currentYOffset * driftRatio);
                    // FIX: Zwingt den Regen durch Modulo-Wrap immer in der exakten Stations-Breite (Zone) zu bleiben!
                    const currentX = startX + ((rawX - startX) % width + width) % width;

                    ctx.moveTo(currentX, sy);
                    ctx.lineTo(currentX - windSlant, sy + tailLength); 
                }
            }
            ctx.fillStyle = zone.weather.hasSnow ? 'rgba(255,255,255,0.8)' : 'rgba(120, 180, 255, 0.6)';
            ctx.strokeStyle = zone.weather.hasSnow ? 'rgba(255,255,255,0.8)' : 'rgba(100, 160, 255, 0.5)';
            ctx.lineWidth = zone.weather.hasSnow ? 1 : 1.5;
            if (zone.weather.hasSnow) ctx.fill(); else ctx.stroke();
        }

        // 2. BLITZE ANIMIERT
        if (zone.weather.hasTS && zone.visuals && zone.visuals.flashes) {
            const flashCycle = timeMs % 5000; // Ein Blitz-Zyklus dauert 5 Sekunden
            let hasActiveFlash = false;
            
            ctx.beginPath();
            for(let f=0; f < zone.visuals.flashes.length; f++) {
                const flash = zone.visuals.flashes[f];
                const flashTimeStart = flash.x * 4500; // Zufälliger Start im Zyklus
                
                // Blitz leuchtet für knackige 120ms
                if (flashCycle > flashTimeStart && flashCycle < flashTimeStart + 120) {
                    hasActiveFlash = true;
                    const fx = startX + width * 0.2 + flash.x * width * 0.6;
                    const groundY = getElevY(prevDist + flash.x * (nextDist - prevDist));
                    if (baseY < groundY) {
                        const stepY = (groundY - baseY) / 4;
                        ctx.moveTo(fx, baseY);
                        ctx.lineTo(fx + (flash.pts[0]-0.5)*20, baseY + stepY);
                        ctx.lineTo(fx + (flash.pts[1]-0.5)*20, baseY + stepY*2);
                        ctx.lineTo(fx + (flash.pts[2]-0.5)*20, baseY + stepY*3);
                        ctx.lineTo(fx + (flash.pts[3]-0.5)*20, groundY);
                    }
                }
            }
            if (hasActiveFlash) {
                ctx.strokeStyle = 'rgba(255, 230, 100, 0.9)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    }
    ctx.restore();
}

function computeFlightProfile(elevationData, cruiseAltFt, climbRateFpm, descentRateFpm, tasKts) {
    if (!elevationData || elevationData.length < 2) return null;

    const depElevFt = elevationData[0].elevFt;
    let destElevFt = elevationData[elevationData.length - 1].elevFt;
    const totalDistNM = elevationData[elevationData.length - 1].distNM;

    const climbFt = Math.max(0, cruiseAltFt - depElevFt);
    const climbTimeMin = climbFt / climbRateFpm;
    const climbDistNM = (climbTimeMin / 60) * tasKts * 0.85;

    const descentFt = Math.max(0, cruiseAltFt - destElevFt);
    const descentTimeMin = descentFt / descentRateFpm;
    const descentDistNM = (descentTimeMin / 60) * tasKts * 0.9;

    const tocDistNM = Math.min(climbDistNM, totalDistNM * 0.4);
    const todDistNM = Math.max(totalDistNM - descentDistNM, totalDistNM * 0.6);

    const profile = [];
    for (const pt of elevationData) {
        let altFt;
        if (pt.distNM <= tocDistNM) {
            const f = tocDistNM > 0 ? pt.distNM / tocDistNM : 1;
            altFt = depElevFt + (cruiseAltFt - depElevFt) * f;
        } else if (pt.distNM >= todDistNM) {
            const f = (totalDistNM - todDistNM) > 0 ? (pt.distNM - todDistNM) / (totalDistNM - todDistNM) : 1;
            altFt = cruiseAltFt - (cruiseAltFt - destElevFt) * f;
        } else {
            altFt = cruiseAltFt;
        }
        profile.push({ distNM: pt.distNM, altFt: Math.round(altFt) });
    }

    return { profile, tocDistNM, todDistNM };
}
function getCachedAirspaceIntersections(elevData, totalDist) {
    // Im HDG-Modus ändert sich elevData[0] mit jeder Position → Cache-Key muss mitlaufen
    const isHdg = (typeof vpMode !== 'undefined' && vpMode === 'HDG');
    const hdgPosKey = isHdg && elevData[0]
        ? `_${(elevData[0].lat || 0).toFixed(2)}_${(elevData[0].lon || 0).toFixed(2)}`
        : '';
    const asCacheKey = (window._lastVpRouteKey || 'none') + '_v' + (window._activeAirspacesVersion || 0) + hdgPosKey;
    if (window._vpAsCache && window._vpAsCache.key === asCacheKey && window._vpAsCache.elevLength === elevData.length) {
        return window._vpAsCache.items;
    }
    
    let items = [];
    for (let asIdx = 0; asIdx < activeAirspaces.length; asIdx++) {
        const as = activeAirspaces[asIdx];
        if (as.type === 33) continue;
        if (!as.lowerLimit || !as.upperLimit) continue;
        const lowerFt = airspaceLimitToFt(as.lowerLimit);
        const upperFt = airspaceLimitToFt(as.upperLimit);
        if (lowerFt === null || upperFt === null) continue;

        const isLowerAgl = as.lowerLimit.referenceDatum === 0;
        const isUpperAgl = as.upperLimit.referenceDatum === 0;

        let asMinDist = totalDist, asMaxDist = 0, found = false;
        const polys = [];
        if (as.geometry) {
            if (as.geometry.type === 'Polygon') polys.push(as.geometry.coordinates[0]);
            else if (as.geometry.type === 'MultiPolygon') as.geometry.coordinates.forEach(mc => polys.push(mc[0]));

            for (let pi = 0; pi < elevData.length; pi++) {
                const pt = elevData[pi];
                for (const poly of polys) {
                    if (vpPointInPoly(pt, poly)) {
                        if (pt.distNM < asMinDist) asMinDist = pt.distNM;
                        if (pt.distNM > asMaxDist) asMaxDist = pt.distNM;
                        found = true; break;
                    }
                }
                if (!found && pi < elevData.length - 1) {
                    const pt2 = elevData[pi + 1];
                    for (const poly of polys) {
                        for (let ei = 0, ej = poly.length - 1; ei < poly.length; ej = ei++) {
                            const ax = poly[ej][0], ay = poly[ej][1], bx = poly[ei][0], by = poly[ei][1];
                            const d1x = pt2.lon-pt.lon, d1y = pt2.lat-pt.lat;
                            const d2x = bx-ax, d2y = by-ay;
                            const cross = d1x*d2y - d1y*d2x;
                            if (Math.abs(cross) < 1e-12) continue;
                            const t = ((ax-pt.lon)*d2y - (ay-pt.lat)*d2x) / cross;
                            const u = ((ax-pt.lon)*d1y - (ay-pt.lat)*d1x) / cross;
                            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                                const crossDist = pt.distNM + t * (pt2.distNM - pt.distNM);
                                if (crossDist < asMinDist) asMinDist = crossDist;
                                if (crossDist > asMaxDist) asMaxDist = crossDist;
                                found = true; break;
                            }
                        }
                        if (found) break;
                    }
                }
            }
        }
        if (!found) continue;

        const eps = (elevData.length > 1) ? (elevData[1].distNM - elevData[0].distNM) * 0.5 : 0.5;
        const relevantPts = elevData.filter(p => p.distNM >= asMinDist - eps && p.distNM <= asMaxDist + eps);
        if (relevantPts.length < 1) continue;

        items.push({ asIdx, as, lowerFt, upperFt, isLowerAgl, isUpperAgl, asMinDist, asMaxDist, relevantPts });
    }
    window._vpAsCache = { key: asCacheKey, elevLength: elevData.length, items: items };
    return items;
}


function renderVerticalProfile(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !vpElevationData || vpElevationData.length < 2) return;

    const container = canvas.parentElement;
    const displayWidth = container.clientWidth || 400;
    const displayHeight = Math.round(displayWidth * 0.4);

    const dpr = window.devicePixelRatio || 1;
    const targetW = displayWidth * dpr;
    const targetH = displayHeight * dpr;

    const ctx = canvas.getContext('2d');
    
    // Performance Fix für das kleine Diagramm
    if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = '100%';
        canvas.style.maxWidth = displayWidth + 'px';
        canvas.style.height = 'auto';
        ctx.scale(dpr, dpr);
    } else {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
    }

    const padLeft = 45, padRight = 15, padTop = 20, padBottom = 30;
    const plotW = displayWidth - padLeft - padRight;
    const plotH = displayHeight - padTop - padBottom;

    const cruiseAlt = parseInt(document.getElementById('altMapInput')?.textContent || document.getElementById('altSlider')?.value || 4500);
    const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
    const totalDist = vpElevationData[vpElevationData.length - 1].distNM;
    const maxTerrain = Math.max(...vpElevationData.map(p => p.elevFt));
    let maxCloudAlt = 0;
    if (vpShowClouds && vpWeatherData) {
        vpWeatherData.forEach(zone => {
            if (zone.clouds) zone.clouds.forEach(c => {
                if (c.baseMsl > maxCloudAlt) maxCloudAlt = c.baseMsl;
            });
        });
    }
    let autoMaxAlt = Math.max(cruiseAlt + 2500, maxTerrain + 1000);
    const maxAlt = vpMaxAltOverride > 0 ? vpMaxAltOverride : autoMaxAlt;
    const minAlt = 0;

    const fpResult = computeFlightProfile(vpElevationData, cruiseAlt, vpClimbRate, vpDescentRate, tas);

    const xOf = (distNM) => padLeft + (distNM / totalDist) * plotW;
    const yOf = (altFt) => padTop + plotH - ((altFt - minAlt) / (maxAlt - minAlt)) * plotH;

    // Background
    ctx.fillStyle = '#eef6ff';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(0.5, '#c8e6f8');
    skyGrad.addColorStop(1, '#e8f4f8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    // Airspace blocks
    let occupiedASLabels = [];
    if (vpAirspaceMode !== 0 && typeof activeAirspaces !== 'undefined' && activeAirspaces.length > 0) {
        const cachedAirspaces = getCachedAirspaceIntersections(vpElevationData, totalDist);
        for (const item of cachedAirspaces) {
            const { asIdx, as, lowerFt, upperFt, isLowerAgl, isUpperAgl, asMinDist, asMaxDist, relevantPts } = item;
            
            const style = getAirspaceStyle(as);
            const x1 = xOf(asMinDist), x2 = xOf(asMaxDist);

            ctx.fillStyle = vpHexToRgba(style.color, 0.15);
            ctx.strokeStyle = vpHexToRgba(style.color, 0.4);
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);

            // Airspace-Form zeichnen: MSL → exaktes Rechteck (kein Sampling-Artefakt),
            // AGL → Gelände-folgendes Polygon
            ctx.beginPath();
            if (!isLowerAgl && !isUpperAgl) {
                // Reines MSL-Rechteck — exakt von asMinDist bis asMaxDist
                const ry1 = yOf(Math.min(upperFt, maxAlt));
                const ry2 = yOf(Math.max(lowerFt, minAlt));
                ctx.moveTo(xOf(asMinDist), ry1);
                ctx.lineTo(xOf(asMaxDist), ry1);
                ctx.lineTo(xOf(asMaxDist), ry2);
                ctx.lineTo(xOf(asMinDist), ry2);
            } else {
                // AGL-Polygon entlang Geländeprofil
                for (let i = 0; i < relevantPts.length; i++) {
                    const p = relevantPts[i];
                    const realUpper = isUpperAgl ? p.elevFt + upperFt : upperFt;
                    const y = yOf(Math.min(realUpper, maxAlt));
                    if (i === 0) ctx.moveTo(xOf(p.distNM), y); else ctx.lineTo(xOf(p.distNM), y);
                }
                for (let i = relevantPts.length - 1; i >= 0; i--) {
                    const p = relevantPts[i];
                    const realLower = isLowerAgl ? p.elevFt + lowerFt : lowerFt;
                    ctx.lineTo(xOf(p.distNM), yOf(Math.max(realLower, minAlt)));
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            let sumUpper = 0;
            relevantPts.forEach(p => sumUpper += (isUpperAgl ? p.elevFt + upperFt : upperFt));
            const avgUpper = relevantPts.length ? sumUpper / relevantPts.length : upperFt;

            let labelY = yOf(Math.min(avgUpper, maxAlt));
            labelY = Math.max(padTop + 15, labelY);
            const displayName = getAirspaceDisplayName(as);
            ctx.font = 'bold 8px Arial';
            const tw = ctx.measureText(displayName).width;
            const tLeft = ((x1 + x2) / 2) - tw/2, tRight = tLeft + tw;

            let collision = false;
            for(let occ of occupiedASLabels) {
                if (tLeft < occ.r && tRight > occ.l && labelY < occ.b && (labelY+20) > occ.t) { collision = true; break; }
            }
            if (!collision) {
                occupiedASLabels.push({l: tLeft-5, r: tRight+5, t: labelY-5, b: labelY+20});
                ctx.fillStyle = vpHexToRgba(style.color, 0.7);
                ctx.textAlign = 'center';
                ctx.fillText(displayName, (x1 + x2) / 2, labelY + 10);
                ctx.font = '7px Arial';
                ctx.fillText(formatAsLimit(as.lowerLimit) + ' – ' + formatAsLimit(as.upperLimit), (x1 + x2) / 2, labelY + 19);
            }
        }
    }
    ctx.textAlign = 'left';

    // Safety line (terrain + 1000ft)
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(200, 80, 0, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < vpElevationData.length; i++) {
        const x = xOf(vpElevationData[i].distNM), y = yOf(vpElevationData[i].elevFt + 1000);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Terrain polygon
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(0));
    for (let i = 0; i < vpElevationData.length; i++) ctx.lineTo(xOf(vpElevationData[i].distNM), yOf(vpElevationData[i].elevFt));
    ctx.lineTo(xOf(totalDist), yOf(0));
    ctx.closePath();

    const terrainGrad = ctx.createLinearGradient(0, yOf(maxTerrain), 0, yOf(0));
    terrainGrad.addColorStop(0, '#8B7355');
    terrainGrad.addColorStop(0.3, '#6B8E23');
    terrainGrad.addColorStop(0.7, '#228B22');
    terrainGrad.addColorStop(1, '#2E8B57');
    ctx.fillStyle = terrainGrad;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < vpElevationData.length; i++) {
        const x = xOf(vpElevationData[i].distNM), y = yOf(vpElevationData[i].elevFt);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#3a5a20';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (vpShowLandmarks) vpDrawLandmarks(ctx, xOf, yOf, typeof elevData !== 'undefined' ? elevData : vpElevationData, totalDist, typeof zoomFactor !== 'undefined', typeof zoomFactor !== 'undefined' ? zoomFactor : 1.0, maxAlt);
    if (vpShowClouds) vpDrawClouds(ctx, xOf, yOf, padTop, plotH, totalDist, typeof zoomFactor !== 'undefined', typeof elevData !== 'undefined' ? elevData : vpElevationData);
    if (vpShowObstacles) vpDrawObstacles(ctx, xOf, yOf, totalDist, typeof zoomFactor !== 'undefined' ? zoomFactor : 1.0, typeof elevData !== 'undefined' ? elevData : vpElevationData);

    // Flight profile
    if (fpResult && fpResult.profile) {
        ctx.beginPath();
        for (let i = 0; i < fpResult.profile.length; i++) {
            const x = xOf(fpResult.profile[i].distNM), y = yOf(fpResult.profile[i].altFt) + 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < fpResult.profile.length; i++) {
            const x = xOf(fpResult.profile[i].distNM), y = yOf(fpResult.profile[i].altFt);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#d93829';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // TOC
        ctx.beginPath();
        ctx.arc(xOf(fpResult.tocDistNM), yOf(cruiseAlt), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#d93829';
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TOC', xOf(fpResult.tocDistNM), yOf(cruiseAlt) - 7);

        // TOD
        ctx.beginPath();
        ctx.arc(xOf(fpResult.todDistNM), yOf(cruiseAlt), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#d93829';
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.fillText('TOD', xOf(fpResult.todDistNM), yOf(cruiseAlt) - 7);
        ctx.textAlign = 'left';
    }

    // Waypoint markers
    let wpCumDist = 0;
    for (let i = 0; i < routeWaypoints.length; i++) {
        if (i > 0) {
            const prev = routeWaypoints[i - 1], curr = routeWaypoints[i];
            wpCumDist += calcNav(prev.lat, prev.lng || prev.lon, curr.lat, curr.lng || curr.lon).dist;
        }
        const x = xOf(wpCumDist);

        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        let wpLabel;
        if (i === 0) wpLabel = currentStartICAO || 'DEP';
        else if (i === routeWaypoints.length - 1) wpLabel = currentDestICAO || 'DEST';
        else wpLabel = routeWaypoints[i].name ? routeWaypoints[i].name.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '').split(' ')[0] : 'WP' + i;
        if (wpLabel.length > 8) wpLabel = wpLabel.substring(0, 7) + '…';

        ctx.save();
        ctx.translate(x, padTop + plotH + 4);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(wpLabel, 0, 0);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(x, padTop + 3, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#44ff44' : (i === routeWaypoints.length - 1 ? '#ff4444' : '#fdfd86');
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Y axis
    ctx.fillStyle = '#555';
    ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    const altStep = maxAlt > 6000 ? 2000 : (maxAlt > 3000 ? 1000 : 500);
    for (let alt = 0; alt <= maxAlt; alt += altStep) {
        const y = yOf(alt);
        if (y < padTop - 5 || y > padTop + plotH + 5) continue;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 0.5;
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();
        ctx.fillStyle = '#555';
        ctx.fillText(alt >= 1000 ? (alt / 1000).toFixed(alt % 1000 === 0 ? 0 : 1) + 'k' : alt + '', padLeft - 4, y + 3);
    }

    ctx.save();
    ctx.translate(8, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#888';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('ALT (ft)', 0, 0);
    ctx.restore();

    // X axis
    ctx.textAlign = 'center';
    const distStep = totalDist > 100 ? 20 : (totalDist > 50 ? 10 : 5);
    for (let d = 0; d <= totalDist; d += distStep) {
        ctx.fillStyle = '#888';
        ctx.font = '8px Arial';
        ctx.fillText(d + '', xOf(d), padTop + plotH + 22);
    }
    ctx.fillStyle = '#888';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('NM', padLeft + plotW + 8, padTop + plotH + 22);

    // Border
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Cruise altitude label & line
    ctx.fillStyle = 'rgba(217, 56, 41, 0.8)';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('CRZ ' + cruiseAlt + ' ft', padLeft + 4, yOf(cruiseAlt) - 4);
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(217, 56, 41, 0.3)';
    ctx.lineWidth = 1;
    ctx.moveTo(padLeft, yOf(cruiseAlt));
    ctx.lineTo(padLeft + plotW, yOf(cruiseAlt));
    ctx.stroke();
    ctx.setLineDash([]);

    // Peak elevation marker
    const peakPt = vpElevationData.reduce((max, p) => p.elevFt > max.elevFt ? p : max);
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('▲', xOf(peakPt.distNM), yOf(peakPt.elevFt) - 3);
    ctx.font = 'bold 8px Arial';
    ctx.fillText(peakPt.elevFt + ' ft', xOf(peakPt.distNM), yOf(peakPt.elevFt) - 12);

    // Auto-update things that depend on the completed elevation data
    if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
    if (typeof vpMapProfileVisible !== 'undefined' && vpMapProfileVisible && vpElevationData) {
        const mainAlt = document.getElementById('altSlider');
        const mapAlt = document.getElementById('altSliderMap');
        const mapDisplay = document.getElementById('altMapDisplay');
        if (mainAlt && mapAlt) { mapAlt.value = mainAlt.value; }
        if (mainAlt && mapDisplay) { mapDisplay.textContent = mainAlt.value; }
        renderMapProfile();
    }
}

function vpPointInPoly(pt, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > pt.lat) !== (yj > pt.lat)) && (pt.lon < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function airspaceLimitToFt(lim) {
    if (!lim) return null;
    if (lim.referenceDatum === 0 && lim.value === 0) return 0;
    if (lim.unit === 6) return lim.value * 100;
    if (lim.unit === 1) return lim.value;
    if (lim.unit === 0) return Math.round(lim.value * 3.28084);
    return lim.value;
}

function vpHexToRgba(hex, alpha) {
    if (!hex || hex.charAt(0) !== '#') return 'rgba(0,0,0,' + alpha + ')';
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

/* =========================================================
   MAP TABLE PROFILE STRIP
   ========================================================= */
let vpMapProfileVisible = true;

function toggleMapProfile() {
    vpMapProfileVisible = !vpMapProfileVisible;
    const strip = document.getElementById('mapProfileStrip');
    const btn = document.getElementById('vpToggleBtn');
    if (strip) strip.style.display = vpMapProfileVisible ? '' : 'none';
    if (btn) {
        btn.textContent = vpMapProfileVisible ? '📊 Profil (An)' : '📊 Profil (Aus)';
        btn.style.background = vpMapProfileVisible ? '#2E8B57' : '#444';
    }
    if (vpMapProfileVisible) {
        renderMapProfile();
        // Marker wieder anzeigen, falls er existiert
        if (vpPositionLeafletMarker && map) vpPositionLeafletMarker.addTo(map);
    } else {
        // Marker von der Karte entfernen, wenn Profil ausgeblendet
        if (vpPositionLeafletMarker && map) map.removeLayer(vpPositionLeafletMarker);
    }
    // Invalidate map size since space changed
    if (typeof map !== 'undefined' && map) setTimeout(() => map.invalidateSize(), 100);
}

function syncAltFromMap(val) {
    const mainSlider = document.getElementById('altSlider');
    if (mainSlider) mainSlider.value = val;
    document.getElementById('altMapDisplay').textContent = val;
    handleSliderChange('alt', val);
    renderMapProfile();
    if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
}

// Globale Fast-Render Steuerung (Nun in app.js definiert)

let vpHighResFetchTimeout = null;
function vpZoom(delta) {
    window.activateFastRender();
    vpZoomLevel = Math.max(10, Math.min(100, vpZoomLevel + delta));
    const zd = document.getElementById('vpZoomDisplay');
    if (zd) zd.textContent = Math.round((100 - vpZoomLevel) / 90 * 100) + '%';

    // Ruckelfrei mit 60 FPS rendern statt bei jedem Event
    if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();

    // High-Res API Debounce
    if (vpHighResFetchTimeout) clearTimeout(vpHighResFetchTimeout);
    if (vpZoomLevel < 100 && routeWaypoints && routeWaypoints.length >= 2) {
        vpHighResFetchTimeout = setTimeout(() => {
            fetchHighResElevation().then(() => {
                if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
            });
        }, 400); 
    } else if (vpZoomLevel === 100) {
        vpHighResData = null;
        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
    }
}

async function fetchHighResElevation() {
    if (!routeWaypoints || routeWaypoints.length < 2) return;

    const interpolated = [];
    let cumulativeDist = 0;

    for (let i = 0; i < routeWaypoints.length - 1; i++) {
        const p1 = routeWaypoints[i], p2 = routeWaypoints[i + 1];
        const lat1 = p1.lat, lon1 = p1.lng || p1.lon;
        const lat2 = p2.lat, lon2 = p2.lng || p2.lon;
        const segDist = calcNav(lat1, lon1, lat2, lon2).dist;
        // Higher resolution: every 0.25 NM instead of 1 NM
        const steps = Math.max(1, Math.round(segDist * 4));

        for (let j = 0; j <= steps; j++) {
            if (i > 0 && j === 0) continue;
            const f = j / steps;
            interpolated.push({
                lat: lat1 + (lat2 - lat1) * f,
                lon: lon1 + (lon2 - lon1) * f,
                distNM: cumulativeDist + segDist * f
            });
        }
        cumulativeDist += segDist;
    }

    // Resample to max 100 points
    let samplePts = interpolated;
    if (interpolated.length > 100) {
        samplePts = [];
        for (let i = 0; i < 100; i++) {
            const idx = Math.round(i * (interpolated.length - 1) / 99);
            samplePts.push(interpolated[idx]);
        }
    }

    const lats = samplePts.map(p => p.lat.toFixed(5)).join(',');
    const lons = samplePts.map(p => p.lon.toFixed(5)).join(',');

    try {
        const res = await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + lats + '&longitude=' + lons);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.elevation || data.elevation.length !== samplePts.length) return;

        vpHighResData = samplePts.map((p, i) => ({
            distNM: p.distNM,
            elevFt: Math.round(data.elevation[i] * 3.28084),
            lat: p.lat,
            lon: p.lon
        }));
    } catch (e) {
        console.error('High-res elevation fetch error:', e);
    }
}

function renderMapProfile() {
    // FIX: window.vpBgNeedsUpdate = true; ENTFERNT! 
    // Der Background aktualisiert sich nur noch, wenn sich Panning oder die Y-Achse ändert!
    if (!window.vpAnimFrameId) {
        window.vpAnimFrameId = requestAnimationFrame(renderMapProfileFrames);
    }
}

// ─── TRAFFIC PROJEKTION AUF ROUTE ────────────────────────────────────────────
function vpProjectTrafficOnRoute(elevData) {
    if (!window.vpTrafficData?.length || !elevData?.length) return [];
    const MAX_LAT_NM = 5;
    const result = [];
    for (const ac of window.vpTrafficData) {
        let bestDist = Infinity, bestDistNM = 0;
        for (const ep of elevData) {
            if (ep.lat == null) continue;
            const d = calcNav(ac.lat, ac.lon, ep.lat, ep.lon).dist;
            if (d < bestDist) { bestDist = d; bestDistNM = ep.distNM; }
        }
        if (bestDist <= MAX_LAT_NM) {
            result.push({ id: ac.id, callsign: ac.callsign, projDistNM: bestDistNM, altFt: ac.alt, lateralNM: bestDist });
        }
    }
    return result;
}

// ─── TRAFFIC PROJEKTION AUF HEADING (HDG-MODUS) ──────────────────────────────
function vpProjectTrafficOnHeading() {
    if (!window.vpTrafficData?.length || !window.lastLiveGpsPos) return [];
    const { lat: oLat, lon: oLon, hdg: oHdg } = window.lastLiveGpsPos;
    const gs = (typeof smoothedGS !== 'undefined' && smoothedGS > 20) ? smoothedGS : 80;
    const hdgRad = oHdg * Math.PI / 180;
    const hdgSin = Math.sin(hdgRad), hdgCos = Math.cos(hdgRad);
    const MAX_LAT_NM = 5;
    const minAlongNM = -(VP_HDG_LOOKBACK_MIN * gs / 60);
    const maxAlongNM =  VP_HDG_LOOKAHEAD_MIN * gs / 60;
    const result = [];

    for (const ac of window.vpTrafficData) {
        const dLatNM = (ac.lat - oLat) * 60;
        const dLonNM = (ac.lon - oLon) * 60 * Math.cos(oLat * Math.PI / 180);
        const along = dLonNM * hdgSin + dLatNM * hdgCos;   // NM entlang Heading
        const cross = Math.abs(-dLonNM * hdgCos + dLatNM * hdgSin); // NM quer
        if (cross > MAX_LAT_NM || along < minAlongNM || along > maxAlongNM) continue;
        // Im HDG-Modus: distNM speichert Minuten (gleich wie vpHdgElevData)
        const timeMin = VP_HDG_LOOKBACK_MIN + (along / (gs / 60));
        result.push({ id: ac.id, callsign: ac.callsign, projDistNM: timeMin, altFt: ac.alt, lateralNM: cross });
    }
    return result;
}

// ─── TRAFFIC IM VERTIKALPROFIL ZEICHNEN ──────────────────────────────────────
function vpDrawTrafficInProfile(fgCtx, xOf, yOf, elevData, isHdgMode, viewMinX, viewMaxX) {
    if (!window.vpTrafficProfileVisible) return;
    const traffic = isHdgMode ? vpProjectTrafficOnHeading() : vpProjectTrafficOnRoute(elevData);
    if (!traffic.length) return;

    const ownAlt = (window.lastLiveGpsPos?.alt) ?? vpLiveAltFt ?? 0;

    for (const ac of traffic) {
        const tx = xOf(ac.projDistNM);
        const ty = yOf(ac.altFt);
        if (tx < viewMinX - 30 || tx > viewMaxX + 30) continue;

        const relAlt = Math.round((ac.altFt - ownAlt) / 100) * 100;
        const relAltStr = (relAlt >= 0 ? '+' : '') + relAlt;
        const relAltColor = Math.abs(relAlt) < 300 ? '#ff8800' : relAlt > 0 ? '#44ff44' : '#888888';

        fgCtx.save();
        fgCtx.translate(tx, ty);

        // Flugzeug-Silhouette (Seitenansicht, schaut nach rechts)
        fgCtx.fillStyle = '#00ccff';
        fgCtx.strokeStyle = 'rgba(0,0,0,0.6)';
        fgCtx.lineWidth = 0.5;

        // Rumpf
        fgCtx.beginPath();
        fgCtx.ellipse(0, 0, 7, 2, 0, 0, Math.PI * 2);
        fgCtx.fill(); fgCtx.stroke();

        // Tragfläche (oben)
        fgCtx.beginPath();
        fgCtx.moveTo(-7, -1); fgCtx.lineTo(5, -1); fgCtx.lineTo(4, 1.5); fgCtx.lineTo(-6, 1.5);
        fgCtx.closePath(); fgCtx.fill(); fgCtx.stroke();

        // Leitwerk (hinten oben)
        fgCtx.beginPath();
        fgCtx.moveTo(-7, -1); fgCtx.lineTo(-4, -4); fgCtx.lineTo(-2, -1);
        fgCtx.closePath(); fgCtx.fill(); fgCtx.stroke();

        // Relative Höhe
        fgCtx.fillStyle = relAltColor;
        fgCtx.font = 'bold 8px monospace';
        fgCtx.textAlign = 'center';
        fgCtx.fillText(relAltStr, 0, -11);

        // Callsign (wenn vorhanden)
        if (ac.callsign) {
            fgCtx.fillStyle = 'rgba(0, 200, 255, 0.75)';
            fgCtx.font = '7px monospace';
            fgCtx.fillText(ac.callsign, 0, 14);
        }

        fgCtx.restore();
    }
}

window.vpToggleTrafficProfile = function() {
    window.vpTrafficProfileVisible = !window.vpTrafficProfileVisible;
    const btn = document.getElementById('btnToggleTrafficProfile');
    if (btn) btn.classList.toggle('active', window.vpTrafficProfileVisible);
};

function renderMapProfileFrames(timeMs) {
    const mapTable = document.getElementById('mapTableOverlay');
    if (!mapTable || !mapTable.classList.contains('active') || (typeof vpMapProfileVisible !== 'undefined' && !vpMapProfileVisible)) {
        window.vpAnimFrameId = null; 
        return;
    }

    const fgCanvas = document.getElementById('mapProfileCanvas');
    const bgCanvas = document.getElementById('mapProfileCanvasBg');
    const scrollContainer = document.getElementById('mapProfileScroll');
    const wrapper = document.getElementById('vpCanvasWrapper');
    if (!fgCanvas || !bgCanvas || !scrollContainer || !wrapper) {
        window.vpAnimFrameId = requestAnimationFrame(renderMapProfileFrames);
        return;
    }

    const isHdgMode = (typeof vpMode !== 'undefined' && vpMode === 'HDG');
    const elevData = isHdgMode
        ? vpHdgElevData
        : (vpZoomLevel < 100 && vpHighResData) ? vpHighResData : vpElevationData;
    if (!elevData || elevData.length < 2) {
        window.vpAnimFrameId = requestAnimationFrame(renderMapProfileFrames);
        return;
    }

    const containerHeight = scrollContainer.clientHeight || 100;
    const baseWidth = scrollContainer.clientWidth || 600;
    const zoomFactor = 100 / vpZoomLevel;
    
    // Virtuelle Breite für die Scrollbar
    const virtualWidth = Math.round(baseWidth * zoomFactor);
    if (wrapper.style.width !== virtualWidth + 'px') wrapper.style.width = virtualWidth + 'px';

    // Canvas bleibt immer exakt so groß wie der sichtbare Bildschirm! (Kein iOS Absturz mehr)
    const dpr = window.devicePixelRatio || 1;
    const targetW = baseWidth * dpr;
    const targetH = containerHeight * dpr;

    const padLeft = 33, padRight = 16, padTop = 12, padBottom = 22;
    const plotW = virtualWidth - padLeft - padRight;
    const plotH = containerHeight - padTop - padBottom;

    const cruiseAlt = parseInt(document.getElementById('altMapInput')?.textContent || document.getElementById('altSlider')?.value || 4500);
    const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
    const totalDist = elevData[elevData.length - 1].distNM;
    const maxTerrain = Math.max(...elevData.map(p => p.elevFt));
    let autoMaxAlt = Math.max(cruiseAlt + 2500, maxTerrain + 1000);
    let currentMaxAlt = vpMaxAltOverride > 0 ? vpMaxAltOverride : autoMaxAlt;

    // PERFORMANCE & UX FIX: Y-Achse während des Ziehens einfrieren!
    const isDragging = (typeof vpDraggingWP !== 'undefined' && vpDraggingWP >= 0) || 
                       (typeof vpDraggingSegment !== 'undefined' && !!vpDraggingSegment) ||
                       (window.vpDraggingPosMarker === true);
    
    if (isDragging) {
        if (!window._vpFrozenMaxAlt) window._vpFrozenMaxAlt = currentMaxAlt;
        currentMaxAlt = window._vpFrozenMaxAlt;
    } else {
        window._vpFrozenMaxAlt = null;
    }
    const maxAlt = currentMaxAlt;
    const minAlt = 0;

    const fpResult = typeof computeFlightProfile === 'function' ? computeFlightProfile(elevData, cruiseAlt, vpClimbRate, vpDescentRate, tas) : null;
    const xOf = (distNM) => padLeft + (distNM / totalDist) * plotW;
    const yOf = (altFt) => padTop + plotH - ((altFt - minAlt) / (maxAlt - minAlt)) * plotH;
    
    const maxScroll = Math.max(0, virtualWidth - baseWidth);
    const viewXRaw = scrollContainer.scrollLeft;
    const viewX = Math.min(viewXRaw, maxScroll);
    
    // Zwinge die Scrollbar sofort zurück, falls wir durch Auszoomen im Nichts gelandet sind
    if (viewXRaw > maxScroll) {
        scrollContainer.scrollLeft = maxScroll;
    }

    if (viewX !== window._vpLastScrollLeft) {
        window.vpBgNeedsUpdate = true;
        window._vpLastScrollLeft = viewX;
    }
    
    // Hardwarebeschleunigtes Mitführen der Leinwände (GPU Magic)
    bgCanvas.style.transform = `translateX(${viewX}px)`;
    fgCanvas.style.transform = `translateX(${viewX}px)`;

    const viewMinX = viewX - 50;
    const viewMaxX = viewX + baseWidth + 50;

    // NEU: Luftraum-Render-Logik als wiederverwendbare Funktion (für BG und FG)
    const drawAirspaces = (targetCtx, isFg) => {
        let occupiedASLabels = [];
        if (typeof activeAirspaces !== 'undefined' && activeAirspaces.length > 0) {
            const cachedAirspaces = getCachedAirspaceIntersections(elevData, totalDist);
            for (const item of cachedAirspaces) {
                const { asIdx, as, lowerFt, upperFt, isLowerAgl, isUpperAgl, asMinDist, asMaxDist, relevantPts } = item;
                const style = getAirspaceStyle(as);
                const x1 = xOf(asMinDist), x2 = xOf(asMaxDist);

                const isHighlighted = (typeof vpHighlightPulseIdx !== 'undefined' && vpHighlightPulseIdx >= 0 && asIdx === vpHighlightPulseIdx);
                const phase = typeof vpPulsePhase !== 'undefined' ? vpPulsePhase : 0;
                const pulseOpacity = isHighlighted ? 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)) : (isFg ? 0.22 : 0.15);
                const strokeOpacity = isHighlighted ? 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)) : 0.5;
                const lineW = isHighlighted ? 2 + 2 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2)) : 2;

                targetCtx.fillStyle = vpHexToRgba(style.color, pulseOpacity);
                targetCtx.strokeStyle = vpHexToRgba(style.color, strokeOpacity);
                targetCtx.lineWidth = lineW; 
                targetCtx.setLineDash(isHighlighted ? [] : [3, 3]);

                // Airspace-Form zeichnen: MSL → exaktes Rechteck, AGL → Gelände-Polygon
                targetCtx.beginPath();
                if (!isLowerAgl && !isUpperAgl) {
                    const ry1 = yOf(Math.min(upperFt, maxAlt));
                    const ry2 = yOf(Math.max(lowerFt, minAlt));
                    targetCtx.moveTo(xOf(asMinDist), ry1);
                    targetCtx.lineTo(xOf(asMaxDist), ry1);
                    targetCtx.lineTo(xOf(asMaxDist), ry2);
                    targetCtx.lineTo(xOf(asMinDist), ry2);
                } else {
                    for (let i = 0; i < relevantPts.length; i++) {
                        const p = relevantPts[i];
                        const realUpper = isUpperAgl ? p.elevFt + upperFt : upperFt;
                        const y = yOf(Math.min(realUpper, maxAlt));
                        if (i === 0) targetCtx.moveTo(xOf(p.distNM), y); else targetCtx.lineTo(xOf(p.distNM), y);
                    }
                    for (let i = relevantPts.length - 1; i >= 0; i--) {
                        const p = relevantPts[i];
                        const realLower = isLowerAgl ? p.elevFt + lowerFt : lowerFt;
                        targetCtx.lineTo(xOf(p.distNM), yOf(Math.max(realLower, minAlt)));
                    }
                }
                targetCtx.closePath(); targetCtx.fill(); targetCtx.stroke(); targetCtx.setLineDash([]);

                let sumUpper = 0; relevantPts.forEach(p => sumUpper += (isUpperAgl ? p.elevFt + upperFt : upperFt));
                const avgUpper = sumUpper / relevantPts.length;
                let labelY = yOf(Math.min(avgUpper, maxAlt)); labelY = Math.max(padTop + 15, labelY); 

                if (!window.vpIsFastRendering && (zoomFactor >= 1.5 || (x2 - x1) > 40 || isHighlighted)) {
                    const displayName = getAirspaceDisplayName(as);
                    targetCtx.font = isHighlighted ? 'bold 11px Arial' : 'bold 10px Arial';
                    const tw = targetCtx.measureText(displayName).width;
                    const tLeft = ((x1 + x2) / 2) - tw/2, tRight = tLeft + tw;
                    let collision = false;
                    if (!isHighlighted) {
                        for (let occ of occupiedASLabels) {
                            if (tLeft < occ.r && tRight > occ.l && labelY < occ.b && (labelY+25) > occ.t) { collision = true; break; }
                        }
                    }
                    if (!collision) {
                        if (!isHighlighted) occupiedASLabels.push({l: tLeft-5, r: tRight+5, t: labelY-5, b: labelY+25});
                        targetCtx.fillStyle = vpHexToRgba(style.color, isHighlighted ? 0.9 : 0.6); targetCtx.textAlign = 'center';
                        targetCtx.fillText(displayName, (x1 + x2) / 2, labelY + 12);
                        if (zoomFactor >= 2 || isHighlighted) {
                            targetCtx.font = '9px Arial'; targetCtx.fillText(formatAsLimit(as.lowerLimit) + ' – ' + formatAsLimit(as.upperLimit), (x1 + x2) / 2, labelY + 23);
                        }
                    }
                }
            }
        }
        targetCtx.textAlign = 'left';
    };

    // =======================================================
    // LAYER 1: STATISCHER HINTERGRUND
    // =======================================================
    if (window.vpBgNeedsUpdate || bgCanvas.width !== targetW || bgCanvas.height !== targetH) {
        if (bgCanvas.width !== targetW || bgCanvas.height !== targetH) {
            bgCanvas.width = targetW; 
            bgCanvas.height = targetH;
            bgCanvas.style.width = baseWidth + 'px'; 
            bgCanvas.style.height = containerHeight + 'px';
        }
        const bgCtx = bgCanvas.getContext('2d');
        bgCtx.save();
        bgCtx.scale(dpr, dpr);
        bgCtx.translate(-viewX, 0); // Vektor-Koordinatensystem anpassen

        bgCtx.clearRect(viewX, 0, baseWidth, containerHeight);

        bgCtx.fillStyle = '#1a1a1a'; 
        bgCtx.fillRect(viewX, 0, baseWidth, containerHeight);
        
        const skyGrad = bgCtx.createLinearGradient(0, padTop, 0, padTop + plotH);
        skyGrad.addColorStop(0, '#1a2a3a'); 
        skyGrad.addColorStop(0.5, '#1a2030'); 
        skyGrad.addColorStop(1, '#151a20');
        bgCtx.fillStyle = skyGrad; 
        bgCtx.fillRect(viewX, padTop, baseWidth, plotH);

        // Aufruf für Layer 1 (Statischer Hintergrund)
        if (vpAirspaceMode === 1) {
            drawAirspaces(bgCtx, false);
        }

        bgCtx.beginPath(); bgCtx.setLineDash([4, 4]); bgCtx.strokeStyle = 'rgba(200, 120, 40, 0.4)'; bgCtx.lineWidth = 1;
        for (let i = 0; i < elevData.length; i++) {
            const x = xOf(elevData[i].distNM), y = yOf(elevData[i].elevFt + 1000);
            if (i === 0) bgCtx.moveTo(x, y); else bgCtx.lineTo(x, y);
        }
        bgCtx.stroke(); bgCtx.setLineDash([]);

        bgCtx.beginPath(); bgCtx.moveTo(xOf(0), yOf(0));
        for (let i = 0; i < elevData.length; i++) bgCtx.lineTo(xOf(elevData[i].distNM), yOf(elevData[i].elevFt));
        bgCtx.lineTo(xOf(totalDist), yOf(0)); bgCtx.closePath();
        const terrainGrad = bgCtx.createLinearGradient(0, yOf(maxTerrain), 0, yOf(0));
        terrainGrad.addColorStop(0, '#6B5B3C'); terrainGrad.addColorStop(0.3, '#3B5B23'); terrainGrad.addColorStop(0.7, '#1B5B22'); terrainGrad.addColorStop(1, '#1E5B37');
        bgCtx.fillStyle = terrainGrad; bgCtx.fill();
        
        bgCtx.beginPath();
        for (let i = 0; i < elevData.length; i++) {
            const x = xOf(elevData[i].distNM), y = yOf(elevData[i].elevFt);
            if (i === 0) bgCtx.moveTo(x, y); else bgCtx.lineTo(x, y);
        }
        bgCtx.strokeStyle = '#4a7a30'; bgCtx.lineWidth = 1.5; bgCtx.stroke();

        // WÄLDER UND FLÜSSE GENERIEREN
        vpDrawTerrainCover(bgCtx, xOf, yOf, elevData, viewMinX, viewMaxX, zoomFactor, maxAlt);

        if (vpShowLandmarks) {
            const lmOverride = isHdgMode ? vpHdgLandmarks : null;
            vpDrawLandmarks(bgCtx, xOf, yOf, elevData, totalDist, true, zoomFactor, maxAlt, lmOverride);
        }
        if (vpShowClouds && !isHdgMode) vpDrawClouds(bgCtx, xOf, yOf, padTop, plotH, totalDist, true, elevData);

        bgCtx.textAlign = 'right';
        const altStep = maxAlt > 6000 ? 2000 : (maxAlt > 3000 ? 1000 : 500);
        for (let alt = 0; alt <= maxAlt; alt += altStep) {
            const y = yOf(alt);
            if (y < padTop - 3 || y > padTop + plotH + 3) continue;
            bgCtx.beginPath(); bgCtx.strokeStyle = 'rgba(255,255,255,0.05)'; bgCtx.lineWidth = 0.5;
            bgCtx.moveTo(viewX + padLeft, y); bgCtx.lineTo(viewX + baseWidth, y); bgCtx.stroke();
            bgCtx.fillStyle = '#777'; bgCtx.font = '9px Arial';
            bgCtx.fillText(alt >= 1000 ? (alt / 1000).toFixed(0) + 'k' : alt + '', viewX + padLeft - 3, y + 3);
        }

        bgCtx.textAlign = 'center';
        if (isHdgMode) {
            // X-Achse in Minuten (HDG-Modus)
            const hdgHdgVal = window.lastLiveGpsPos ? Math.round(window.lastLiveGpsPos.hdg) : 0;
            const acX = xOf(VP_HDG_LOOKBACK_MIN);
            // Flugzeug-Trennlinie (senkrecht, gestrichelt)
            bgCtx.beginPath(); bgCtx.setLineDash([3, 4]);
            bgCtx.strokeStyle = 'rgba(100,200,255,0.3)'; bgCtx.lineWidth = 1;
            bgCtx.moveTo(acX, padTop); bgCtx.lineTo(acX, padTop + plotH); bgCtx.stroke(); bgCtx.setLineDash([]);
            // Minuten-Ticks
            const tickStep = totalDist > 12 ? 5 : 2;
            for (let m = 0; m <= Math.ceil(totalDist); m += tickStep) {
                const x = xOf(m);
                const label = m < VP_HDG_LOOKBACK_MIN ? `-${Math.round(VP_HDG_LOOKBACK_MIN - m)}m`
                    : m === VP_HDG_LOOKBACK_MIN ? 'NOW'
                    : `+${Math.round(m - VP_HDG_LOOKBACK_MIN)}m`;
                bgCtx.fillStyle = m === VP_HDG_LOOKBACK_MIN ? '#64c8ff' : '#666';
                bgCtx.font = m === VP_HDG_LOOKBACK_MIN ? 'bold 8px Arial' : '8px Arial';
                bgCtx.fillText(label, x, containerHeight - 1);
            }
            // Mode-Label oben links
            bgCtx.fillStyle = '#64c8ff'; bgCtx.font = 'bold 9px Arial'; bgCtx.textAlign = 'left';
            bgCtx.fillText(`HDG ${hdgHdgVal}°`, viewX + padLeft + 4, padTop + 10);
        } else {
            const distStep = totalDist > 150 ? 25 : (totalDist > 80 ? 10 : 5);
            for (let d = distStep; d < totalDist; d += distStep) {
                bgCtx.fillStyle = '#666'; bgCtx.font = '8px Arial'; bgCtx.fillText(d + '', xOf(d), containerHeight - 1);
            }
        }

        const peakPt = elevData.reduce((max, p) => p.elevFt > max.elevFt ? p : max);
        bgCtx.fillStyle = '#aaa'; bgCtx.font = '11px Arial'; bgCtx.textAlign = 'center';
        bgCtx.fillText('▲', xOf(peakPt.distNM), yOf(peakPt.elevFt) - 3);
        bgCtx.font = 'bold 9px Arial'; bgCtx.fillText(peakPt.elevFt + ' ft', xOf(peakPt.distNM), yOf(peakPt.elevFt) - 13);

        bgCtx.strokeStyle = '#333'; bgCtx.lineWidth = 1; 
        bgCtx.strokeRect(padLeft, padTop, plotW, plotH);
        bgCtx.restore();
        window.vpBgNeedsUpdate = false;
    }

    // =======================================================
    // LAYER 2: DYNAMISCHER VORDERGRUND 
    // =======================================================
    if (fgCanvas.width !== targetW || fgCanvas.height !== targetH) {
        fgCanvas.width = targetW; 
        fgCanvas.height = targetH;
        fgCanvas.style.width = baseWidth + 'px'; 
        fgCanvas.style.height = containerHeight + 'px';
    }
    const fgCtx = fgCanvas.getContext('2d');
    fgCtx.save();
    fgCtx.scale(dpr, dpr);
    fgCtx.translate(-viewX, 0); 

    fgCtx.clearRect(viewX, 0, baseWidth, containerHeight);

    // Aufruf für Layer 2 (Dynamischer Vordergrund)
    if (vpAirspaceMode === 2) {
        drawAirspaces(fgCtx, true);
    }

    if (vpShowObstacles) {
        const obsSrc = isHdgMode ? vpHdgObstacles : vpObstacles;
        if (obsSrc && obsSrc.length > 0) vpDrawObstacles(fgCtx, xOf, yOf, totalDist, zoomFactor, elevData, timeMs, obsSrc);
    }
    if (vpShowClouds && !isHdgMode) vpDrawAnimatedWeather(fgCtx, xOf, yOf, totalDist, elevData, timeMs, viewMinX, viewMaxX);

    // Im HDG-Modus: Fluglinie einblenden wenn Flugzeug ≤2 NM von der geplanten Route entfernt
    // X-Achse: NM-Offset vom aktuellen Standort → Minuten umrechnen (offsetNM / gs * 60)
    if (isHdgMode
        && typeof vpLiveGpsFraction === 'number' && vpLiveGpsFraction >= 0
        && (window.vpLiveRouteDistNM ?? 999) <= 2.0
        && typeof vpElevationData !== 'undefined' && vpElevationData && vpElevationData.length >= 2
        && typeof computeFlightProfile === 'function') {

        const routeElevData = vpElevationData;
        const routeTotalDist = routeElevData[routeElevData.length - 1].distNM;
        const tasHdg = parseInt(document.getElementById('tasSlider')?.value || 115);
        const fpRoute = computeFlightProfile(routeElevData, cruiseAlt, vpClimbRate, vpDescentRate, tasHdg);
        if (fpRoute && fpRoute.profile) {
            const liveDistNM = vpLiveGpsFraction * routeTotalDist;
            const gs = (window.lastLiveGpsPos?.gs > 20 ? window.lastLiveGpsPos.gs : null) || tasHdg;
            const hdgTotalMin = VP_HDG_LOOKBACK_MIN + VP_HDG_LOOKAHEAD_MIN;

            const _drawHdgFpLine = (offsetY, style, width) => {
                fgCtx.beginPath();
                let started = false;
                for (const pt of fpRoute.profile) {
                    const offsetNM = pt.distNM - liveDistNM;
                    const minAxis = VP_HDG_LOOKBACK_MIN + (offsetNM / gs * 60);
                    if (minAxis < -0.5 || minAxis > hdgTotalMin + 0.5) { started = false; continue; }
                    const x = xOf(minAxis);
                    if (x < viewMinX - 60 || x > viewMaxX + 60) { started = false; continue; }
                    const y = yOf(pt.altFt) + offsetY;
                    if (!started) { fgCtx.moveTo(x, y); started = true; } else { fgCtx.lineTo(x, y); }
                }
                fgCtx.strokeStyle = style; fgCtx.lineWidth = width; fgCtx.stroke();
            };
            _drawHdgFpLine(1, 'rgba(0,0,0,0.3)', 3);
            _drawHdgFpLine(0, '#ff4444', 2);
        }
    }

    // Fluglinie (Climb/Cruise/Descend) und Route-Waypoint-Marker nur im RTE-Modus
    // Im HDG-Modus wären distNM-Werte (NM) falsch durch xOf() das Minuten erwartet
    if (!isHdgMode) {
        if (fpResult && fpResult.profile) {
            fgCtx.beginPath();
            let shStarted = false;
            for (let i = 0; i < fpResult.profile.length; i++) {
                const x = xOf(fpResult.profile[i].distNM);
                if (x < viewMinX - 100 && i < fpResult.profile.length - 1 && xOf(fpResult.profile[i+1].distNM) < viewMinX) continue;
                if (x > viewMaxX + 100 && i > 0 && xOf(fpResult.profile[i-1].distNM) > viewMaxX) continue;
                const y = yOf(fpResult.profile[i].altFt) + 1;
                if (!shStarted) { fgCtx.moveTo(x, y); shStarted = true; } else { fgCtx.lineTo(x, y); }
            }
            fgCtx.strokeStyle = 'rgba(0,0,0,0.3)'; fgCtx.lineWidth = 3; fgCtx.stroke();

            fgCtx.beginPath();
            let rdStarted = false;
            for (let i = 0; i < fpResult.profile.length; i++) {
                const x = xOf(fpResult.profile[i].distNM);
                if (x < viewMinX - 100 && i < fpResult.profile.length - 1 && xOf(fpResult.profile[i+1].distNM) < viewMinX) continue;
                if (x > viewMaxX + 100 && i > 0 && xOf(fpResult.profile[i-1].distNM) > viewMaxX) continue;
                const y = yOf(fpResult.profile[i].altFt);
                if (!rdStarted) { fgCtx.moveTo(x, y); rdStarted = true; } else { fgCtx.lineTo(x, y); }
            }
            fgCtx.strokeStyle = '#ff4444'; fgCtx.lineWidth = 2; fgCtx.stroke();
        }
    }

    // CRZ-Höhenlinie (gestrichelt, horizontal) – in beiden Modi
    fgCtx.beginPath(); fgCtx.setLineDash([6, 4]); fgCtx.strokeStyle = 'rgba(255, 68, 68, 0.3)'; fgCtx.lineWidth = 1;
    fgCtx.moveTo(Math.max(padLeft, viewMinX), yOf(cruiseAlt));
    fgCtx.lineTo(Math.min(padLeft + plotW, viewMaxX), yOf(cruiseAlt));
    fgCtx.stroke(); fgCtx.setLineDash([]);
    fgCtx.fillStyle = 'rgba(255, 68, 68, 0.7)'; fgCtx.font = 'bold 10px Arial'; fgCtx.textAlign = 'left';
    fgCtx.fillText('CRZ ' + cruiseAlt + ' ft', Math.max(padLeft + 4, viewMinX + 4), yOf(cruiseAlt) - 4);

    // Im HDG-Modus: "JETZT"-Linie bei VP_HDG_LOOKBACK_MIN (Flugzeugposition)
    if (isHdgMode) {
        const nowX = xOf(VP_HDG_LOOKBACK_MIN);
        if (nowX >= viewMinX && nowX <= viewMaxX) {
            fgCtx.beginPath();
            fgCtx.setLineDash([3, 4]);
            fgCtx.strokeStyle = 'rgba(255,255,255,0.18)';
            fgCtx.lineWidth = 1;
            fgCtx.moveTo(nowX, padTop);
            fgCtx.lineTo(nowX, padTop + plotH);
            fgCtx.stroke();
            fgCtx.setLineDash([]);
            fgCtx.fillStyle = 'rgba(255,255,255,0.35)';
            fgCtx.font = '8px Arial'; fgCtx.textAlign = 'center';
            fgCtx.fillText('NOW', nowX, padTop + plotH + 12);
        }
    }

    // Route-Waypoint-Marker nur im RTE-Modus (Positionen in NM, im HDG unbrauchbar)
    if (!isHdgMode) {
        let wpCumDist = 0;
        for (let i = 0; i < routeWaypoints.length; i++) {
            if (i > 0) wpCumDist += calcNav(routeWaypoints[i - 1].lat, routeWaypoints[i - 1].lng || routeWaypoints[i - 1].lon, routeWaypoints[i].lat, routeWaypoints[i].lng || routeWaypoints[i].lon).dist;
            const x = xOf(wpCumDist);
            if (x < viewMinX - 40 || x > viewMaxX + 40) continue;

            fgCtx.beginPath(); fgCtx.setLineDash([2, 3]); fgCtx.strokeStyle = 'rgba(255,255,255,0.2)'; fgCtx.lineWidth = 1;
            fgCtx.moveTo(x, padTop); fgCtx.lineTo(x, padTop + plotH); fgCtx.stroke(); fgCtx.setLineDash([]);
            let wpLabel = (i === 0) ? (currentStartICAO || 'DEP') : ((i === routeWaypoints.length - 1) ? (currentDestICAO || 'DEST') : (routeWaypoints[i].name ? routeWaypoints[i].name.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '').split(' ')[0] : 'WP' + i));
            if (!zoomFactor || zoomFactor < 2) { if (wpLabel.length > 6) wpLabel = wpLabel.substring(0, 5) + '…'; } else { if (wpLabel.length > 12) wpLabel = wpLabel.substring(0, 11) + '…'; }
            fgCtx.beginPath(); fgCtx.arc(x, padTop + plotH + 3, 3, 0, Math.PI * 2); fgCtx.fillStyle = i === 0 ? '#44ff44' : (i === routeWaypoints.length - 1 ? '#ff4444' : '#ffcc00'); fgCtx.fill();
            fgCtx.fillStyle = '#bbb'; fgCtx.font = (zoomFactor >= 2) ? 'bold 11px Arial' : 'bold 9px Arial'; fgCtx.textAlign = 'center'; fgCtx.fillText(wpLabel, x, padTop + plotH + 16);
        }
    }

    // A: SCRUB-MARKER (Magenta Linie bei Hover)
    // Scrub-Marker nur im RTE-Modus (in HDG-Modus ist Position live-GPS-gesteuert)
    if (!isHdgMode && typeof vpPositionFraction === 'number' && vpPositionFraction >= 0) {
        const posX = xOf(vpPositionFraction * totalDist);
        if (posX >= viewMinX - 20 && posX <= viewMaxX + 20) {
            fgCtx.beginPath(); fgCtx.strokeStyle = '#ff00ff'; fgCtx.lineWidth = 1.5; fgCtx.moveTo(posX, padTop); fgCtx.lineTo(posX, padTop + plotH); fgCtx.stroke();
            fgCtx.beginPath(); fgCtx.moveTo(posX, padTop + plotH + 2); fgCtx.lineTo(posX - 5, padTop + plotH + 10); fgCtx.lineTo(posX + 5, padTop + plotH + 10); fgCtx.closePath(); fgCtx.fillStyle = '#ff00ff'; fgCtx.fill();
        }
    }

            // B: LIVE-GPS-MARKER (Das Flugzeug)
    const _showLiveMarker = isHdgMode
        ? (window.lastLiveGpsPos != null)
        : (typeof vpLiveGpsFraction === 'number' && vpLiveGpsFraction >= 0);
    if (_showLiveMarker) {
        const liveX = isHdgMode
            ? xOf(VP_HDG_LOOKBACK_MIN)   // Im HDG-Modus: leicht eingerückt vom linken Rand
            : xOf(vpLiveGpsFraction * totalDist);
        const _liveAlt = isHdgMode ? (window.lastLiveGpsPos?.alt ?? 0) : vpLiveAltFt;
        if (liveX >= viewMinX - 50 && liveX <= viewMaxX + 50) {
            const liveY = yOf(_liveAlt);
            
            // CSS Variablen auslesen
            const rootStyle = getComputedStyle(document.documentElement);
            const planeColor = rootStyle.getPropertyValue('--plane-color').trim() || '#E63946';
            const planeSizePx = parseInt(rootStyle.getPropertyValue('--plane-size')) || 40;

            fgCtx.save();
            fgCtx.translate(liveX, liveY);

            // Pitch-Rotation: Steig-/Sinkwinkel aus VS/GS berechnen
            // smoothedVS in ft/min → ft/s (/60), smoothedGS in kts → ft/s (*1.6878)
            const _vsPitch = (typeof smoothedVS !== 'undefined') ? smoothedVS : 0;
            const _gsPitch = (typeof smoothedGS !== 'undefined' && smoothedGS > 20) ? smoothedGS : 80;
            const _pitchRad = Math.atan2(_vsPitch / 60, _gsPitch * 1.6878);
            fgCtx.rotate(_pitchRad);

            // Berechnung der Skalierung (Basisbreite Path: 504.91)
            const baseScale = planeSizePx / 504.91;

            // Im Profil schaut das Flugzeug immer nach rechts (Richtung Zukunft).
            // sx=1: Nase bei x=504 → rechts, Heck bei x=0 → links (korrekte Ausrichtung).
            // Kein Flip basierend auf Heading — das Profil hat immer Vergangenheit links.
            fgCtx.scale(baseScale, baseScale);

            fgCtx.fillStyle = planeColor;
            
            // Side-View Path (ViewBox 504.91 x 184.69, Zentrum: 252.45, 92.35)
            const sideViewPath = new Path2D("M504.83,54.71l-.57-2.37a1.12,1.12,0,0,0-.84-.84,1.14,1.14,0,0,0-1.13.35,108.13,108.13,0,0,0-7.76,9.95,42.45,42.45,0,0,0-6.15,11.54,20.33,20.33,0,0,0-2.53-.45c-1.13-2.15-6.44-3.5-15.36-3.92-12.18-.81-42.61-3.25-51.64-4a13.91,13.91,0,0,1-3.4-.72l-.53-.2a15,15,0,0,1-1.62-.77c-5.49-3.07-19.3-10.65-29.11-14.65-7.6-3.09-12.88-5.24-18.9-6.51l-.8-.16a71.07,71.07,0,0,0-12.43-1.21,161,161,0,0,0-20.61,1.63v-.86a1.45,1.45,0,0,0-1.62-1.43c-2.38.28-6.23,1.11-7.08,3.5L320,44c-2.6-2-6.49-2.07-8.85-1.92a2,2,0,0,0-1.88,2.22l.15,1.42c-13.69,1.51-38.55,6-65.14,11.22l-.07-1.22A4.24,4.24,0,0,0,243,52.92l-17-16.46a.46.46,0,0,0-.65,0,.47.47,0,0,0,0,.65l17,16.46a3.36,3.36,0,0,1,1,2.22l.07,1.35c-19.92,3.91-40.74,8.21-58.51,11.94l-.22-4a4.17,4.17,0,0,0-1.29-2.83l-17-16.46a.46.46,0,0,0-.64.66l17,16.46a3.3,3.3,0,0,1,1,2.22l.23,4.2c-15.46,3.25-28.52,6.07-36.53,7.8a18.29,18.29,0,0,1-17.05-5.25L73.68,12.1a9.11,9.11,0,0,0-5-2.7V5.7A.68.68,0,0,0,68,5H67V1.89A1.89,1.89,0,0,0,65.08,0a1.89,1.89,0,0,0-1.89,1.89V5H62.13a.68.68,0,0,0-.67.68v4.55L38.14,15.42a4.46,4.46,0,0,0-1.16.41,4.74,4.74,0,0,0-1,.69,1.66,1.66,0,0,0-.45.69h0L24,18.84a.46.46,0,0,0,.06.92h.07l11.35-1.61a1.58,1.58,0,0,0,.82,1l.07,0a4.28,4.28,0,0,1,2.17,2.37l26.85,72a24.81,24.81,0,0,0-2.32,5.77L0,110.9l1.15.32c.18,0,18.4,5,48.57,5.2h0l17.32-4.16a1.51,1.51,0,0,1,1.34.31c1.35,1.13,5.76,3.21,20.08,4.44l.41,0-1.62,2.45a2.43,2.43,0,0,0,3.49,3.29l6.64-5c7.72.7,16.8,1.57,26.24,2.47,15.52,1.48,31.57,3,42.88,4,18.77,1.55,54.16,4.95,61,5.6l-19.28,7.63,39.35.54,3.63,6.59a1.32,1.32,0,0,0,1.52.63l1.57-.47a1.31,1.31,0,0,0,.8-1.84l-2.4-4.84,13.36.19.8,2.92,9.31-2.57,36.25,2v4.57l5.11,3.2c-3.29.8-18.46,4.51-24.31,6.06-6.22,1.65-9.95,2.88-9.29,6.17.41,2.05,2.4,3.68,4.29,5,3.29,2.3,6.84,3.11,10.19,3.73s6.52,1.17,9.34,1.65l5.46.93a13.62,13.62,0,0,0,27,1.79c.42-.06.87-.13,1.33-.22a41.71,41.71,0,0,0,10.61-3.56l.16-.07c2.56-1.25,6.42-3.13,5.92-6.53-.69-4.67-5.09-7.72-8.63-10.16-5.13-3.55-14.6-4.94-18.2-5.36v-7.41c3.37-.32,39.35-3.77,51.17-5.41,12.27-1.71,32.66-6.86,37-9.86.82.14,5.58.81,9.48-1.56v3.31l1.82,1.81a.78.78,0,0,0,1.34-.55v-5.27l7.93-1.18v.82l-7.77,7.73,7.05,3.51a11.14,11.14,0,0,1-3.52,1.38c-1.71.33-18.72-.25-26-.51a2.13,2.13,0,0,0-1.82,3.35l5.63,8.07a5.22,5.22,0,0,0,3.56,2.17,53.38,53.38,0,0,1,9.85,2.13L430,151.4a36.46,36.46,0,0,0,9.37,2.64,13.18,13.18,0,0,0,24.92-.47c.83-.36,1.67-.76,2.51-1.19l.49-.25c2.2-1.11,5.52-2.79,4.68-5.72a11.89,11.89,0,0,0-3.26-4.68l-.33-.34a45.54,45.54,0,0,0-7.27-6.28,29.74,29.74,0,0,0-7.87-3.61,56.48,56.48,0,0,0-5.57-1.47l-1.82-9.58,1.25-.19c4.59-.7,9.32-1.42,13.94-2.31,1.52-.3,3.07-.54,4.58-.78s3-.48,4.51-.77l.18,0c2.9-.56,5.89-1.13,8.24-3.11a21.78,21.78,0,0,0,7.26-11.85,64.85,64.85,0,0,0,1.29-8.49,37.13,37.13,0,0,0,15.63-8.15,2.93,2.93,0,0,0,1-2.35,3,3,0,0,0-1.22-2.31,43,43,0,0,0-6.18-3.8l8.32-19.79A2.86,2.86,0,0,0,504.83,54.71ZM321.27,80.13a3.12,3.12,0,0,1-2.14,1.07l-24,1.61a3.13,3.13,0,0,1-3-1.78l-6.32-13.25a3.11,3.11,0,0,1,2.16-4.4l29.13-6.25A3.13,3.13,0,0,1,320.84,60L322,77.86A3.09,3.09,0,0,1,321.27,80.13Zm67.42-6.44-21.6-30c5.14,1.29,10.06,3.29,16.65,6h0c9.75,4,23.52,11.53,29,14.59.34.19.68.36,1,.52-3.91,5.23-13.17,9.1-18.45,11a5.69,5.69,0,0,1-1.91.33A5.83,5.83,0,0,1,388.69,73.69Zm4.68,3h0Zm-.35,0-.33,0Zm-.4,0-.27,0Zm-.35,0-.31-.07Zm-.38-.09-.27-.07Zm-.34-.09-.31-.1Zm-.38-.13-.25-.1Zm-.33-.13-.29-.14Zm-.35-.17-.24-.13Zm-.31-.17-.28-.18Zm-.33-.21a1.88,1.88,0,0,1-.23-.16A1.88,1.88,0,0,0,389.85,75.56Zm-.3-.21-.26-.21Zm-14-.4a5.12,5.12,0,0,1-4.27,2.83l-36.16,2.38a5.21,5.21,0,0,1-3.89-1.38A5.16,5.16,0,0,1,329.57,75l-.26-15.32a5.33,5.33,0,0,1,4.77-5.4l23.15-2.51a9.58,9.58,0,0,1,9.11,4.31l9,13.75A5.11,5.11,0,0,1,375.58,75Zm12.87-.67a3.17,3.17,0,0,1-.21-.27A3.17,3.17,0,0,0,388.45,74.28Zm.27.32-.21-.25Zm0,0,.24.24Zm.53.51-.23-.21Zm4.19,1.53h0Zm1.81-.28.25-.08Zm-1.55.27h0Zm.26,0h0Zm.26,0,.14,0Zm.26,0,.15,0Zm.26,0,.15,0Zm.25-.07.17,0Zm44.66,54.37-3.46-1.25,5.23-4.35,1.93,2.46Z");
            
            // Zentrierung: immer -252.45 (unabhaengig von Spiegelung)
            // Beweis: path-Center (252.45, 92.35) → translate(-252.45,-92.35) → (0,0) → scale → (0,0) → an liveX,liveY ✓
            fgCtx.translate(-252.45, -92.35);
            fgCtx.fill(sideViewPath);
            
            fgCtx.restore();
        }
    }

    // C: PREDICTION VECTORS im Vertikalprofil
    const _predAvail = window.vpPredictionData && window.vpPredictionData.length > 0 &&
        (isHdgMode || (typeof vpLiveGpsFraction === 'number' && vpLiveGpsFraction >= 0));
    if (_predAvail) {
        const baseDist = isHdgMode ? VP_HDG_LOOKBACK_MIN : vpLiveGpsFraction * totalDist;
        const baseX = xOf(baseDist);
        // Im HDG-Modus: Live-GPS-Hoehe verwenden (vpLiveAltFt kommt vom Route-Marker)
        const _predBaseAlt = isHdgMode ? (window.lastLiveGpsPos?.alt ?? vpLiveAltFt) : vpLiveAltFt;
        const baseY = yOf(_predBaseAlt);

        // Punkte filtern die noch innerhalb der Route liegen
        // Im HDG-Modus: distNMAhead in Minuten umrechnen
        const _gs4pred = (typeof smoothedGS !== 'undefined' && smoothedGS > 20) ? smoothedGS : 80;
        const ptOffset = (pt) => isHdgMode ? pt.min : pt.distNMAhead;
        const visiblePts = window.vpPredictionData.filter(pt => baseDist + ptOffset(pt) <= totalDist + 1);

        if (visiblePts.length > 0) {
            // Gestrichelte Linie vom Flugzeug durch alle Prediction-Punkte
            fgCtx.save();
            fgCtx.setLineDash([5, 4]);
            fgCtx.lineWidth = 1.5;
            fgCtx.beginPath();
            fgCtx.moveTo(baseX, baseY);

            for (const pt of visiblePts) {
                const px = xOf(baseDist + ptOffset(pt));
                const py = yOf(pt.altFt);
                fgCtx.lineTo(px, py);
            }
            fgCtx.strokeStyle = 'rgba(255,255,255,0.55)';
            fgCtx.stroke();
            fgCtx.setLineDash([]);

            // Zeitmarker + Labels
            for (const pt of visiblePts) {
                const px = xOf(baseDist + ptOffset(pt));
                const py = yOf(pt.altFt);

                // Culling: nur sichtbaren Bereich rendern
                if (px < viewMinX - 30 || px > viewMaxX + 30) continue;

                const tc = pt.threat === 'red' ? '#ff2222' : pt.threat === 'amber' ? '#ffaa00' : (pt.asColor || '#ffffff');

                // Kreis
                fgCtx.beginPath();
                fgCtx.arc(px, py, 3.5, 0, Math.PI * 2);
                fgCtx.fillStyle = tc;
                fgCtx.fill();
                fgCtx.strokeStyle = 'rgba(0,0,0,0.6)';
                fgCtx.lineWidth = 1;
                fgCtx.stroke();

                // Zeitlabel oben
                fgCtx.fillStyle = tc;
                fgCtx.font = 'bold 9px Arial';
                fgCtx.textAlign = 'center';
                fgCtx.fillText(pt.min + 'm', px, py - 8);

                // Höhe unten (nur wenn genug Platz)
                if (zoomFactor >= 1.5 || window.vpPredictionData.length <= 3) {
                    fgCtx.fillStyle = 'rgba(255,255,255,0.6)';
                    fgCtx.font = '8px Arial';
                    fgCtx.fillText(Math.round(pt.altFt) + 'ft', px, py + 14);
                }
            }
            fgCtx.restore();
        }
    }

    // Altitude-Waypoint-Diamanten nur im RTE-Modus (distNM = Route-NM, im HDG unbrauchbar)
    if (!isHdgMode && vpAltWaypoints.length > 0) {
        for (let i = 0; i < vpAltWaypoints.length; i++) {
            const wp = vpAltWaypoints[i], wx = xOf(wp.distNM), wy = yOf(wp.altFt);
            if (wx < viewMinX - 20 || wx > viewMaxX + 20) continue;

            fgCtx.beginPath(); fgCtx.setLineDash([2, 3]); fgCtx.strokeStyle = 'rgba(255,0,255,0.3)'; fgCtx.lineWidth = 1;
            fgCtx.moveTo(wx, wy); fgCtx.lineTo(wx, padTop + plotH); fgCtx.stroke(); fgCtx.setLineDash([]);
            fgCtx.beginPath(); fgCtx.moveTo(wx, wy - 7); fgCtx.lineTo(wx + 6, wy); fgCtx.lineTo(wx, wy + 7); fgCtx.lineTo(wx - 6, wy); fgCtx.closePath();
            fgCtx.fillStyle = '#ff00ff'; fgCtx.fill(); fgCtx.strokeStyle = '#fff'; fgCtx.lineWidth = 1; fgCtx.stroke();
            fgCtx.fillStyle = '#ff00ff'; fgCtx.font = 'bold 9px Arial'; fgCtx.textAlign = 'center'; fgCtx.fillText(wp.altFt + ' ft', wx, wy - 11);
        }
    }

    // D: TRAFFIC IM PROFIL
    vpDrawTrafficInProfile(fgCtx, xOf, yOf, elevData, isHdgMode, viewMinX, viewMaxX);

    // E: AWM PULS — nur das Luftraum-Polygon aufblinken (nicht ganzer Bildschirm)
    if (window._awmPulse) {
        const _p = window._awmPulse;
        const _elapsed = Date.now() - _p.startMs;
        const _TOTAL = 2700;  // 3 Pulse × 900ms
        if (_elapsed > _TOTAL) {
            window._awmPulse = null;
        } else {
            const _phase = Math.floor(_elapsed / 450);  // 0-5
            if (_phase % 2 === 0) {
                // Horizontale Ausdehnung aus dem Airspace-Cache holen
                let _px1 = padLeft, _pw = plotW; // Fallback: volle Breite
                if (_p.as && window._vpAsCache && window._vpAsCache.items) {
                    const _match = window._vpAsCache.items.find(item => item.as === _p.as);
                    if (_match) {
                        _px1 = xOf(_match.asMinDist);
                        _pw  = Math.max(4, xOf(_match.asMaxDist) - _px1);
                    }
                }
                const _alpha = 0.75 * (1 - (_elapsed % 450) / 450 * 0.35);
                const _y1 = Math.min(yOf(Math.max(_p.lowerFt, 0)), yOf(Math.max(_p.upperFt, 0)));
                const _y2 = Math.max(yOf(Math.max(_p.lowerFt, 0)), yOf(Math.max(_p.upperFt, 0)));
                const _h  = Math.max(4, _y2 - _y1);
                fgCtx.save();
                fgCtx.globalAlpha = _alpha;
                fgCtx.strokeStyle = _p.color;
                fgCtx.lineWidth = 3;
                fgCtx.strokeRect(_px1, _y1, _pw, _h);
                fgCtx.globalAlpha = _alpha * 0.28;
                fgCtx.fillStyle = _p.color;
                fgCtx.fillRect(_px1, _y1, _pw, _h);
                fgCtx.restore();
            }
        }
    }

    fgCtx.restore();

    window.vpAnimFrameId = requestAnimationFrame(renderMapProfileFrames);
}

// Removed arbitrary setTimeout hook in favor of synchronous hooks within renderVerticalProfile

/* =========================================================
   RESIZE HANDLE (Map / Profile split)
   ========================================================= */
let vpResizeActive = false;

function initProfileResize() {
    const handle = document.getElementById('profileResizeHandle');
    const strip = document.getElementById('mapProfileStrip');
    const maptable = document.querySelector('.maptable-content');
    if (!handle || !strip || !maptable) return;

    let startY = 0, startH = 0;

    function onStart(e) {
        window.activateFastRender();
        vpResizeActive = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        startH = strip.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    }

    function onMove(e) {
        if (!vpResizeActive) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const delta = startY - clientY; // pulling up = bigger profile
        let newH = startH + delta;
        const totalH = maptable.offsetHeight;
        const maxFraction = document.body.classList.contains('map-is-fullscreen') ? 0.75 : 0.6;
        newH = Math.max(60, Math.min(totalH * maxFraction, newH));
        strip.style.height = newH + 'px';

        if (typeof map !== 'undefined' && map) map.invalidateSize();
        renderMapProfile();
    }

    function onEnd() {
        if (!vpResizeActive) return;
        vpResizeActive = false;
        document.body.style.cursor = '';
    }

    handle.addEventListener('mousedown', onStart);
    handle.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
}



/* =========================================================
   POSITION MARKER (Magenta triangle + Leaflet marker sync)
   ========================================================= */
let vpPositionFraction = -1; // -1 = hidden scrub marker
let vpLiveGpsFraction = -1;  // -1 = hidden live aircraft
let vpLiveAltFt = 0;
let vpLiveHdg = 0;
let vpPositionLeafletMarker = null;

function vpUpdatePosition(fraction) {
    vpPositionFraction = fraction;
    
    // Weckt nur die Foreground-Schleife, falls sie schläft.
    if (!window.vpAnimFrameId && typeof vpMapProfileVisible !== 'undefined' && vpMapProfileVisible) {
        window.vpAnimFrameId = requestAnimationFrame(renderMapProfileFrames);
    }

    // Update Leaflet marker on map
    if (!vpElevationData || vpElevationData.length < 2) return;
    const totalDist = vpElevationData[vpElevationData.length - 1].distNM;
    const targetDist = fraction * totalDist;

    // Find the interpolated lat/lon at this distance
    let lat, lon;
    for (let i = 0; i < vpElevationData.length - 1; i++) {
        if (vpElevationData[i + 1].distNM >= targetDist) {
            const segLen = vpElevationData[i + 1].distNM - vpElevationData[i].distNM;
            const f = segLen > 0 ? (targetDist - vpElevationData[i].distNM) / segLen : 0;
            lat = vpElevationData[i].lat + (vpElevationData[i + 1].lat - vpElevationData[i].lat) * f;
            lon = vpElevationData[i].lon + (vpElevationData[i + 1].lon - vpElevationData[i].lon) * f;
            break;
        }
    }
    if (!lat) { lat = vpElevationData[vpElevationData.length - 1].lat; lon = vpElevationData[vpElevationData.length - 1].lon; }

    if (typeof map !== 'undefined' && map && typeof L !== 'undefined') {
        if (!vpPositionLeafletMarker) {
            const magentaIcon = L.divIcon({
                className: 'vp-pos-marker',
                html: '<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid #ff00ff;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6));"></div>',
                iconSize: [16, 14],
                iconAnchor: [8, 14]
            });
            vpPositionLeafletMarker = L.marker([lat, lon], { icon: magentaIcon, interactive: false, zIndexOffset: 5000 });
            // Nur zur Map hinzufügen, wenn Profil sichtbar ist
            if (vpMapProfileVisible) vpPositionLeafletMarker.addTo(map);
        } else {
            vpPositionLeafletMarker.setLatLng([lat, lon]);
            // Sicherstellen, dass Sichtbarkeit synchron ist
            if (vpMapProfileVisible) {
                if (!map.hasLayer(vpPositionLeafletMarker)) vpPositionLeafletMarker.addTo(map);
            } else {
                if (map.hasLayer(vpPositionLeafletMarker)) map.removeLayer(vpPositionLeafletMarker);
            }
        }
    }
}

function vpUpdateLiveAircraft(fraction, altFt, hdg) {
    vpLiveGpsFraction = fraction;
    vpLiveAltFt = altFt;
    vpLiveHdg = hdg;

    if (!window.vpAnimFrameId && typeof vpMapProfileVisible !== 'undefined' && vpMapProfileVisible) {
        window.vpAnimFrameId = requestAnimationFrame(renderMapProfileFrames);
    }
}

/* =========================================================
   ALTITUDE WAYPOINTS (Click to set, drag to move)
   ========================================================= */
let vpAltWaypoints = []; // [{distNM, altFt}] - fixed anchor points
let vpSegmentAlts = [];  // vpSegmentAlts[i] = cruise altitude between vpAltWaypoints[i] and [i+1]
let vpDraggingWP = -1;
let vpDraggingSegment = null; // { segIndex, origAlt }
let vpCanvasClickHandler = null;

function getExactAltAtDist(distNM, profObj, fallbackAlt) {
    if (!profObj || !profObj.profile || profObj.profile.length === 0) return fallbackAlt;
    const prof = profObj.profile;
    if (distNM <= prof[0].distNM) return prof[0].altFt;
    if (distNM >= prof[prof.length - 1].distNM) return prof[prof.length - 1].altFt;
    for (let j = 0; j < prof.length - 1; j++) {
        if (distNM >= prof[j].distNM && distNM <= prof[j + 1].distNM) {
            const f = (distNM - prof[j].distNM) / (prof[j + 1].distNM - prof[j].distNM || 1);
            return prof[j].altFt + f * (prof[j + 1].altFt - prof[j].altFt);
        }
    }
    return fallbackAlt;
}

function initAltWaypoints() {
    const canvas = document.getElementById('mapProfileCanvas');
    if (!canvas || vpCanvasClickHandler) return;

    vpCanvasClickHandler = true;

    // === SHARED HELPERS for mouse & touch ===
    function vpGetCanvasMetrics() {
        const elevData = (vpZoomLevel < 100 && vpHighResData) ? vpHighResData : vpElevationData;
        if (!elevData || elevData.length < 2) return null;
        const rect = canvas.getBoundingClientRect();
        const scrollContainer = document.getElementById('mapProfileScroll');
        const viewX = scrollContainer ? scrollContainer.scrollLeft : 0;
        const containerHeight = scrollContainer?.clientHeight || 100;
        const baseWidth = scrollContainer?.clientWidth || 600;
        const zoomFactor = 100 / vpZoomLevel;
        const virtualWidth = Math.round(baseWidth * zoomFactor);
        const totalDist = elevData[elevData.length - 1].distNM;

        const cruiseAlt = parseInt(document.getElementById('altMapInput')?.textContent || document.getElementById('altSlider')?.value || 4500);
        const maxTerrain = Math.max(...elevData.map(p => p.elevFt));
        let autoMaxAlt = Math.max(cruiseAlt + 2500, maxTerrain + 1000);
        const maxAlt = vpMaxAltOverride > 0 ? vpMaxAltOverride : autoMaxAlt;
        const padLeft = 33, padRight = 16, padTop = 12, padBottom = 22;
        const plotW = virtualWidth - padLeft - padRight;
        const plotH = containerHeight - padTop - padBottom;
        
        return { elevData, rect, viewX, containerHeight, baseWidth, virtualWidth, zoomFactor, totalDist, cruiseAlt, maxTerrain, maxAlt, padLeft, padRight, padTop, padBottom, plotW, plotH };
    }

    function vpClientToCanvas(clientX, clientY, m) {
        // FIX: Koordinaten 1:1 in CSS-Pixeln berechnen
        const cssX = clientX - m.rect.left;
        const cssY = clientY - m.rect.top;
        return { mx: cssX + m.viewX, my: cssY };
    }

    function vpHitTestWaypoint(mx, my, m) {
        for (let i = 0; i < vpAltWaypoints.length; i++) {
            const wp = vpAltWaypoints[i];
            const wpx = m.padLeft + (wp.distNM / m.totalDist) * m.plotW;
            const wpy = m.padTop + m.plotH - (wp.altFt / m.maxAlt) * m.plotH;
            if (Math.abs(mx - wpx) < 26 && Math.abs(my - wpy) < 26) return i;
        }
        return -1;
    }

    function vpHitTestFlightLine(mx, my, m) {
        const mouseDistNM = ((mx - m.padLeft) / m.plotW) * m.totalDist;
        if (mouseDistNM < 0 || mouseDistNM > m.totalDist) return null;
        const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
        const profObj = typeof computeFlightProfile === 'function' ? computeFlightProfile(m.elevData, m.cruiseAlt, vpClimbRate, vpDescentRate, tas) : null;
        const altAtMouse = getExactAltAtDist(mouseDistNM, profObj, m.cruiseAlt);
        const lineY = m.padTop + m.plotH - (altAtMouse / m.maxAlt) * m.plotH;
        if (Math.abs(my - lineY) < 32) return mouseDistNM;
        return null;
    }

    function vpHitTestMagenta(mx, m) {
        if (typeof vpPositionFraction !== 'number' || vpPositionFraction < 0) return false;
        const posX = m.padLeft + (vpPositionFraction * m.totalDist / m.totalDist) * m.plotW;
        return Math.abs(mx - posX) < 18;
    }

    function vpFindSegmentIdx(mouseDistNM) {
        let segIdx = -1;
        if (vpAltWaypoints.length === 0) {
            segIdx = -1;
        } else if (vpAltWaypoints.length === 1) {
            segIdx = -2;
        } else {
            if (mouseDistNM <= vpAltWaypoints[0].distNM) {
                segIdx = -3;
            } else if (mouseDistNM >= vpAltWaypoints[vpAltWaypoints.length - 1].distNM) {
                segIdx = -4;
            } else {
                for (let k = 0; k < vpAltWaypoints.length - 1; k++) {
                    if (mouseDistNM >= vpAltWaypoints[k].distNM && mouseDistNM <= vpAltWaypoints[k + 1].distNM) {
                        segIdx = k; break;
                    }
                }
            }
        }
        return segIdx;
    }

    function vpRemoveWaypoint(clickDistNM, totalDist) {
        if (vpAltWaypoints.length === 0) return false;
        let nearestIdx = -1, nearestDist = Infinity;
        for (let i = 0; i < vpAltWaypoints.length; i++) {
            const d = Math.abs(vpAltWaypoints[i].distNM - clickDistNM);
            if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }
        if (nearestIdx >= 0 && nearestDist < totalDist * 0.05) {
            vpAltWaypoints.splice(nearestIdx, 1);
            if (vpSegmentAlts.length > 0) {
                if (nearestIdx > 0 && nearestIdx < vpSegmentAlts.length) {
                    const merged = Math.round((vpSegmentAlts[nearestIdx - 1] + vpSegmentAlts[nearestIdx]) / 2);
                    vpSegmentAlts.splice(nearestIdx - 1, 2, merged);
                } else if (nearestIdx < vpSegmentAlts.length) {
                    vpSegmentAlts.splice(nearestIdx, 1);
                } else if (vpSegmentAlts.length > 0) {
                    vpSegmentAlts.splice(vpSegmentAlts.length - 1, 1);
                }
            }
            if (vpAltWaypoints.length < 2) vpSegmentAlts = [];
            renderMapProfile(); // Zeichnet sofort!
            
            // FIX: Schwere DOM/Luftraum-Berechnungen asynchron ausführen, damit der Klick nicht einfriert!
            setTimeout(() => {
                if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
            }, 50);
            return true;
        }
        return false;
    }

    function vpAddWaypoint(clickDistNM, exactAlt, cruiseAlt, totalDist) {
        if (clickDistNM < 0 || clickDistNM > totalDist) return;
        for (const wp of vpAltWaypoints) {
            if (Math.abs(wp.distNM - clickDistNM) < totalDist * 0.03) return;
        }
        let insertIdx = vpAltWaypoints.length;
        for (let k = 0; k < vpAltWaypoints.length; k++) {
            if (clickDistNM < vpAltWaypoints[k].distNM) { insertIdx = k; break; }
        }
        vpAltWaypoints.splice(insertIdx, 0, { distNM: clickDistNM, altFt: exactAlt });
        if (vpSegmentAlts.length > 0 && insertIdx < vpSegmentAlts.length) {
            vpSegmentAlts.splice(insertIdx, 1, exactAlt, exactAlt);
        } else if (vpSegmentAlts.length > 0 && insertIdx >= vpSegmentAlts.length) {
            vpSegmentAlts.push(exactAlt);
        } else if (vpAltWaypoints.length >= 2 && vpSegmentAlts.length === 0) {
            vpSegmentAlts = [];
            for (let k = 0; k < vpAltWaypoints.length - 1; k++) {
                vpSegmentAlts.push(exactAlt);
            }
        }
        renderMapProfile(); // Zeichnet sofort!
        
        // FIX: Entkoppeln, um Ruckler zu vermeiden!
        setTimeout(() => {
            if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
        }, 50);
    }

    function vpHandleDoubleHit(mx, my, m) {
        // 1. Try removing existing waypoint
        const wpIdx = vpHitTestWaypoint(mx, my, m);
        if (wpIdx >= 0) {
            const wp = vpAltWaypoints[wpIdx];
            vpRemoveWaypoint(wp.distNM, m.totalDist);
            return true;
        }
        // 2. Try adding new waypoint on flight line
        const clickDistNM = vpHitTestFlightLine(mx, my, m);
        if (clickDistNM !== null) {
            const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
            const profObj = typeof computeFlightProfile === 'function' ? computeFlightProfile(m.elevData, m.cruiseAlt, vpClimbRate, vpDescentRate, tas) : null;
            let exactAlt = getExactAltAtDist(clickDistNM, profObj, m.cruiseAlt);
            exactAlt = Math.round(exactAlt / 100) * 100;
            vpAddWaypoint(clickDistNM, exactAlt, m.cruiseAlt, m.totalDist);
            return true;
        }
        return false;
    }

    function vpHandleDragMove(clientX, clientY, dragStartX, dragStartY, dragOrigWP) {
        const m = vpGetCanvasMetrics();
        if (!m) return;
        const deltaY = dragStartY - clientY;
        const altChange = (deltaY / m.plotH) * m.maxAlt;
        if (vpDraggingWP >= 0) {
            const deltaX = clientX - dragStartX;
            const distChange = (deltaX / m.plotW) * m.totalDist;
            let newDist = dragOrigWP.distNM + distChange;
            newDist = Math.max(0, Math.min(m.totalDist, newDist));
            let newAlt = Math.round((dragOrigWP.altFt + altChange) / 100) * 100;
            newAlt = Math.max(0, Math.min(m.maxAlt, newAlt));
            vpAltWaypoints[vpDraggingWP].distNM = newDist;
            vpAltWaypoints[vpDraggingWP].altFt = newAlt;
        } else if (vpDraggingSegment) {
            const seg = vpDraggingSegment;
            const newAlt = Math.max(0, Math.round((seg.origAlt + altChange) / 100) * 100);
            
            if (seg.segIdx >= 0 && seg.segIdx < vpSegmentAlts.length) {
                vpSegmentAlts[seg.segIdx] = newAlt;
            } else if (seg.segIdx === -1) {
                const newGlobalAlt = Math.max(1500, Math.min(13500, newAlt));
                const altMap = document.getElementById('altMapInput');
                if (altMap && altMap.textContent != newGlobalAlt) {
                    altMap.textContent = newGlobalAlt;
                }
            } else if (seg.segIdx === -2 || seg.segIdx === -3) {
                if (vpAltWaypoints.length > 0) vpAltWaypoints[0].altFt = newAlt;
            } else if (seg.segIdx === -4) {
                if (vpAltWaypoints.length > 0) vpAltWaypoints[vpAltWaypoints.length - 1].altFt = newAlt;
            }
        } else if (window.vpDraggingPosMarker) {
            const { mx } = vpClientToCanvas(clientX, clientY, m);
            let frac = (mx - m.padLeft) / m.plotW;
            frac = Math.max(0, Math.min(1, frac));
            vpUpdatePosition(frac);
        }
    }

    function vpHandleDragEnd() {
        if (vpDraggingWP >= 0 || vpDraggingSegment || window.vpDraggingPosMarker) {
            const needsSave = vpDraggingWP >= 0 || !!vpDraggingSegment;

            // Bei globaler Höhenänderung einmalig am Ende synchronisieren
            if (vpDraggingSegment && vpDraggingSegment.segIdx === -1) {
                const finalAlt = parseInt(document.getElementById('altMapInput').textContent) || 4500;
                syncAltFromInput(finalAlt);
            }
            if (vpDraggingWP >= 0) vpAltWaypoints.sort((a, b) => a.distNM - b.distNM);

            vpDraggingWP = -1;
            vpDraggingSegment = null;
            window.vpDraggingPosMarker = false;
            dragOrigWP = null;

            // 1. Priorität: Vordergrund (Rote Linie) sofort einrasten lassen
            renderMapProfile(); 
            
            // 2. Priorität: UI-Logik (Mini-Profil) und Background-Schatten sanft nachladen (150ms)
            setTimeout(() => {
                if (typeof renderVerticalProfile === 'function') renderVerticalProfile('verticalProfileCanvas');
                window.vpBgNeedsUpdate = true; // Stellt die Wolkenschatten nach dem Drag wieder her
            }, 150);

            // 3. Priorität: Schwere Daten-Logik (Lufträume & JSON-Speichern) ins Backend schieben (300ms)
            setTimeout(() => {
                if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList(); 
                if (needsSave) window.debouncedSaveMissionState();
            }, 300);
        }
    }

    // === STATE ===
    let vpWasDragging = false;
    window.vpDraggingPosMarker = false;
    let dragStartY = 0, dragStartX = 0, dragOrigWP = null;
    let lastTapTime = 0;
    let vpIsPanning = false;
    let vpPanStartScrollLeft = 0;
    let vpPanStartX = 0;
    let initialPinchDist = null;
    let initialTwoFingerY = null;

    // === DOUBLE CLICK: remove/add waypoint ===
    canvas.addEventListener('dblclick', (e) => {
        if (typeof vpMode !== 'undefined' && vpMode === 'HDG') return; // Nur im RTE-Modus
        const m = vpGetCanvasMetrics();
        if (!m) return;
        const { mx, my } = vpClientToCanvas(e.clientX, e.clientY, m);
        if (vpHandleDoubleHit(mx, my, m)) window.debouncedSaveMissionState();
    });

    // === CLICK: no more single-click creation ===
    canvas.addEventListener('click', (e) => {
        // Logic removed to prevent accidental creation on iPhone
    });

    // === HOVER CURSOR ===
    canvas.addEventListener('mousemove', (e) => {
        if (vpDraggingWP >= 0 || vpDraggingSegment || window.vpDraggingPosMarker) return;
        const m = vpGetCanvasMetrics();
        if (!m) return;
        const { mx, my } = vpClientToCanvas(e.clientX, e.clientY, m);
        let cursor = 'default';
        if (vpHitTestMagenta(mx, m)) cursor = 'ew-resize';
        else if (vpHitTestWaypoint(mx, my, m) >= 0) cursor = 'move';
        else if ((typeof vpMode === 'undefined' || vpMode !== 'HDG') && vpHitTestFlightLine(mx, my, m) !== null) cursor = 'ns-resize';
        canvas.style.cursor = cursor;
    });

    // === MOUSEDOWN: start drag ===
    canvas.addEventListener('mousedown', (e) => {
        vpWasDragging = false;
        const m = vpGetCanvasMetrics();
        if (!m) return;
        const { mx, my } = vpClientToCanvas(e.clientX, e.clientY, m);
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        // Priority 1: Magenta marker drag (nur im RTE-Modus)
        const _isHdgNow = (typeof vpMode !== 'undefined' && vpMode === 'HDG');
        if (!_isHdgNow && vpHitTestMagenta(mx, m)) {
            window.vpDraggingPosMarker = true;
            e.preventDefault(); e.stopPropagation();
            return;
        }
        // Priority 2: Waypoint drag
        const wpIdx = vpHitTestWaypoint(mx, my, m);
        if (wpIdx >= 0) {
            vpDraggingWP = wpIdx;
            dragOrigWP = { ...vpAltWaypoints[wpIdx] };
            e.preventDefault(); e.stopPropagation();
            return;
        }
        // Priority 3: Flight line segment drag (nur im ROUTE-Modus)
        if (typeof vpMode !== 'undefined' && vpMode === 'HDG') return; // Keine Höhenlinien-Interaktion im HDG-Modus
        const mouseDistNM = vpHitTestFlightLine(mx, my, m);
        if (mouseDistNM !== null) {
            e.preventDefault(); e.stopPropagation();
            const segIdx = vpFindSegmentIdx(mouseDistNM);
            
            // FIX: Exakte, physikalische Höhe an der angeklickten Stelle berechnen
            const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
            const profObj = typeof computeFlightProfile === 'function' ? computeFlightProfile(m.elevData, m.cruiseAlt, vpClimbRate, vpDescentRate, tas) : null;
            let exactAltAtClick = typeof getExactAltAtDist === 'function' ? getExactAltAtDist(mouseDistNM, profObj, m.cruiseAlt) : m.cruiseAlt;
            exactAltAtClick = Math.round(exactAltAtClick / 100) * 100;
            
            vpDraggingSegment = { segIdx, origAlt: exactAltAtClick, origCruiseAlt: m.cruiseAlt };
            return;
        }
    });

    // === MOUSEMOVE: drag ===
    document.addEventListener('mousemove', (e) => {
        if (vpDraggingWP < 0 && !vpDraggingSegment && !window.vpDraggingPosMarker) return;
        if (Math.abs(e.clientX - dragStartX) > 2 || Math.abs(e.clientY - dragStartY) > 2) vpWasDragging = true;
        vpHandleDragMove(e.clientX, e.clientY, dragStartX, dragStartY, dragOrigWP);
    });

    // === MOUSEUP: end drag ===
    document.addEventListener('mouseup', () => vpHandleDragEnd());

    // === TOUCH EVENTS ===
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            initialPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialTwoFingerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            return;
        }

        const touch = e.touches[0];
        vpWasDragging = false;
        vpIsPanning = false;
        const m = vpGetCanvasMetrics();
        if (!m) return;
        const { mx, my } = vpClientToCanvas(touch.clientX, touch.clientY, m);
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;

        const now = Date.now();
        if (now - lastTapTime < 300) {
            e.preventDefault();
            if (typeof vpMode === 'undefined' || vpMode !== 'HDG') { // Nur im RTE-Modus
                if (vpHandleDoubleHit(mx, my, m)) window.debouncedSaveMissionState();
            }
            lastTapTime = 0;
            return;
        }
        lastTapTime = now;

        const _isHdgNow2 = (typeof vpMode !== 'undefined' && vpMode === 'HDG');
        if (!_isHdgNow2 && vpHitTestMagenta(mx, m)) {
            e.preventDefault();
            window.vpDraggingPosMarker = true;
            return;
        }
        const wpIdx = vpHitTestWaypoint(mx, my, m);
        if (wpIdx >= 0) {
            e.preventDefault();
            vpDraggingWP = wpIdx;
            dragOrigWP = { ...vpAltWaypoints[wpIdx] };
            return;
        }
        if (typeof vpMode !== 'undefined' && vpMode === 'HDG') return; // Keine Höhenlinien-Interaktion im HDG-Modus
        const mouseDistNM = vpHitTestFlightLine(mx, my, m);
        if (mouseDistNM !== null) {
            e.preventDefault();
            const segIdx = vpFindSegmentIdx(mouseDistNM);
            const origSegAlt = (segIdx >= 0 && segIdx < vpSegmentAlts.length) ? vpSegmentAlts[segIdx] : m.cruiseAlt;
            vpDraggingSegment = { segIdx, origAlt: origSegAlt, origCruiseAlt: m.cruiseAlt };
            return;
        }
        if (vpZoomLevel < 100) {
            e.preventDefault();
            vpIsPanning = true;
            const scrollContainer = document.getElementById('mapProfileScroll');
            vpPanStartScrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
            vpPanStartX = touch.clientX;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialPinchDist !== null && initialTwoFingerY !== null) {
            e.preventDefault();
            
            // X-Achse: Pinch-to-Zoom
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const distDiff = currentDist - initialPinchDist;
            if (Math.abs(distDiff) > 10) {
                let zoomDelta = distDiff > 0 ? -3 : 3; 
                vpZoom(zoomDelta);
                initialPinchDist = currentDist;
            }

            // Y-Achse: Zwei-Finger vertikaler Wisch (Direct Manipulation des Bodens)
            const currentTwoFingerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const yDiff = currentTwoFingerY - initialTwoFingerY;
            if (Math.abs(yDiff) > 15) {
                // Wischen nach UNTEN (yDiff > 0): User drückt Boden weg -> Stauchen (MaxAlt wird GRÖSSER)
                // Wischen nach OBEN (yDiff < 0): User zieht Boden her -> Dehnen (MaxAlt wird KLEINER)
                let yDelta = yDiff > 0 ? 1000 : -1000; 
                vpChangeYAxis(yDelta);
                initialTwoFingerY = currentTwoFingerY;
            }
            return;
        }

        if (vpIsPanning) {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = vpPanStartX - touch.clientX;
            const scrollContainer = document.getElementById('mapProfileScroll');
            if (scrollContainer) scrollContainer.scrollLeft = vpPanStartScrollLeft + deltaX;
            return;
        }
        if (vpDraggingWP < 0 && !vpDraggingSegment && !window.vpDraggingPosMarker) return;
        e.preventDefault();
        const touch = e.touches[0];
        if (Math.abs(touch.clientX - dragStartX) > 3 || Math.abs(touch.clientY - dragStartY) > 3) vpWasDragging = true;
        vpHandleDragMove(touch.clientX, touch.clientY, dragStartX, dragStartY, dragOrigWP);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) { initialPinchDist = null; initialTwoFingerY = null; }
        if (vpIsPanning) { vpIsPanning = false; return; }
        if (vpDraggingWP >= 0 || vpDraggingSegment || window.vpDraggingPosMarker) vpHandleDragEnd();
    });

    canvas.addEventListener('touchcancel', (e) => {
        initialPinchDist = null; initialTwoFingerY = null;
        vpIsPanning = false; vpWasDragging = false;
        if (vpDraggingWP >= 0 || vpDraggingSegment || window.vpDraggingPosMarker) vpHandleDragEnd();
    });

    // === MOUSE WHEEL ZOOM & PAN (Multi-Achsen) ===
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); 
        if (e.ctrlKey) {
            let yDelta = e.deltaY > 0 ? 1000 : -1000;
            vpChangeYAxis(yDelta);
        } else if (e.shiftKey) {
            // FIX: OS wandelt Shift+Scroll oft in deltaX um!
            let wheelDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            let zoomDelta = wheelDelta > 0 ? 5 : -5;
            vpZoom(zoomDelta);
        } else {
            const scrollContainer = document.getElementById('mapProfileScroll');
            if (scrollContainer) {
                const panDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                scrollContainer.scrollLeft += panDelta;
            }
        }
    }, { passive: false });
}

// Override computeFlightProfile to use altitude waypoints + segment altitudes
const _origComputeProfile = computeFlightProfile;
computeFlightProfile = function (elevationData, cruiseAltFt, climbRateFpm, descentRateFpm, tasKts) {
    if (!elevationData || elevationData.length < 2) return null;
    if (vpAltWaypoints.length === 0) return _origComputeProfile(elevationData, cruiseAltFt, climbRateFpm, descentRateFpm, tasKts);

    tasKts = tasKts || parseInt(document.getElementById('tasSlider')?.value || 115);
    climbRateFpm = climbRateFpm || 500;
    descentRateFpm = descentRateFpm || 500;

    const totalDistNM = elevationData[elevationData.length - 1].distNM;
    const depElevFt = elevationData[0].elevFt;
    let destElevFt = elevationData[elevationData.length - 1].elevFt;
    const wps = vpAltWaypoints;

    // Ensure vpSegmentAlts has the right length
    while (vpSegmentAlts.length < wps.length - 1) {
        vpSegmentAlts.push(cruiseAltFt);
    }
    while (vpSegmentAlts.length > Math.max(0, wps.length - 1)) {
        vpSegmentAlts.pop();
    }

    const profile = [];

    // Climb: from departure to first WP altitude
    const firstWpAlt = wps[0].altFt;
    const climbFt = Math.max(0, firstWpAlt - depElevFt);
    const climbDistNM = Math.max(0.5, (climbFt / climbRateFpm / 60) * tasKts * 0.85);
    const tocDistNM = Math.min(climbDistNM, wps[0].distNM);

    // Descent: from last WP altitude to destination
    const lastWpAlt = wps[wps.length - 1].altFt;
    const descentFt = Math.max(0, lastWpAlt - destElevFt);
    const descentDistNM = Math.max(0.5, (descentFt / descentRateFpm / 60) * tasKts * 0.9);
    const todDistNM = Math.max(totalDistNM - descentDistNM, wps[wps.length - 1].distNM);

    for (const pt of elevationData) {
        const d = pt.distNM;
        let altFt = cruiseAltFt;

        if (d <= wps[0].distNM) {
            // CLIMB ZONE: departure → first WP
            if (d < tocDistNM) {
                const f = tocDistNM > 0 ? d / tocDistNM : 1;
                altFt = depElevFt + f * (firstWpAlt - depElevFt);
            } else {
                altFt = firstWpAlt;
            }
        } else if (d >= wps[wps.length - 1].distNM) {
            // DESCENT ZONE: last WP → destination
            if (d > todDistNM) {
                const rem = totalDistNM - todDistNM;
                const f = rem > 0 ? (d - todDistNM) / rem : 1;
                altFt = lastWpAlt - f * (lastWpAlt - destElevFt);
            } else {
                altFt = lastWpAlt;
            }
        } else if (wps.length === 1) {
            // Only 1 WP — hold at that altitude
            altFt = wps[0].altFt;
        } else {
            // MIDDLE: between two consecutive waypoints
            for (let i = 0; i < wps.length - 1; i++) {
                if (d >= wps[i].distNM && d <= wps[i + 1].distNM) {
                    const segAlt = vpSegmentAlts[i] !== undefined ? vpSegmentAlts[i] : Math.max(wps[i].altFt, wps[i + 1].altFt);
                    const segDist = wps[i + 1].distNM - wps[i].distNM;
                    const transitionDist = Math.min(segDist * 0.15, 3); // 15% of segment or max 3nm

                    const distFromLeft = d - wps[i].distNM;
                    const distFromRight = wps[i + 1].distNM - d;

                    if (distFromLeft < transitionDist && wps[i].altFt !== segAlt) {
                        // Transition from WP[i].alt to segAlt
                        const f = transitionDist > 0 ? distFromLeft / transitionDist : 1;
                        altFt = wps[i].altFt + f * (segAlt - wps[i].altFt);
                    } else if (distFromRight < transitionDist && wps[i + 1].altFt !== segAlt) {
                        // Transition from segAlt to WP[i+1].alt
                        const f = transitionDist > 0 ? distFromRight / transitionDist : 1;
                        altFt = wps[i + 1].altFt + f * (segAlt - wps[i + 1].altFt);
                    } else {
                        altFt = segAlt;
                    }
                    break;
                }
            }
        }

        profile.push({ distNM: pt.distNM, altFt: Math.round(altFt) });
    }

    return { profile, tocDistNM, todDistNM };
};

// Init altitude waypoints when map table canvas is ready

setTimeout(() => initAltWaypoints(), 2000);
// === VERTICAL PROFILE CONTROLS (V49) ===
let vpMaxAltOverride = 0; // 0 = Auto-Scaling
let vpShowClouds = localStorage.getItem('ga_show_clouds') !== 'false'; // Default: true
let vpShowLandmarks = localStorage.getItem('ga_show_landmarks') !== 'false';
let vpShowObstacles = localStorage.getItem('ga_show_obstacles') !== 'false';
let vpShowLinear = localStorage.getItem('ga_show_linear') !== 'false';
let vpAirspaceMode = parseInt(localStorage.getItem('ga_show_airspaces') || '1'); // 0=Off, 1=Bg, 2=Fg

function updateAirspaceBtn() {
    const btn = document.getElementById('btnToggleAirspaces');
    if (!btn) return;
    btn.classList.toggle('active', vpAirspaceMode !== 0);
    if (vpAirspaceMode === 1) btn.innerHTML = '🛡️<span style="font-size:8px;vertical-align:sub;">BG</span>';
    else if (vpAirspaceMode === 2) btn.innerHTML = '🛡️<span style="font-size:8px;vertical-align:super;">FG</span>';
    else btn.innerHTML = '🛡️<span style="font-size:8px;vertical-align:sub;">OFF</span>';
}
document.addEventListener('DOMContentLoaded', () => {
    const bc = document.getElementById('btnToggleClouds'); if(bc) bc.classList.toggle('active', vpShowClouds);
    const bl = document.getElementById('btnToggleLandmarks'); if(bl) bl.classList.toggle('active', vpShowLandmarks);
    const bo = document.getElementById('btnToggleObstacles'); if(bo) bo.classList.toggle('active', vpShowObstacles);
    const blin = document.getElementById('btnToggleLinear'); if(blin) blin.classList.toggle('active', vpShowLinear);
    updateAirspaceBtn(); // NEU
});
function vpChangeAlt(delta) {
    let val = parseInt(document.getElementById('altMapInput').textContent) || 4500;
    val = Math.max(1500, Math.min(13500, val + delta));
    syncAltFromInput(val);
}
function syncAltFromInput(val) {
    val = parseInt(val) || 4500;
    const inp = document.getElementById('altMapInput');
    if (inp) inp.textContent = val;
    const mainSlider = document.getElementById('altSlider');
    if (mainSlider) mainSlider.value = val;
    handleSliderChange('alt', val); // handleSliderChange übernimmt jetzt den direkten Render
}
function vpChangeRate(delta) {
    let val = parseInt(document.getElementById('rateMapInput').textContent) || 500;
    val = Math.max(200, Math.min(1500, val + delta));
    syncRateFromInput(val);
}
function syncRateFromInput(val) {
    val = parseInt(val) || 500;
    const inp = document.getElementById('rateMapInput');
    inp.innerText = val;
    handleRateChange(val);
}
function vpChangeYAxis(delta) {
    window.activateFastRender();
    if (vpMaxAltOverride === 0) {
        const elevData = (typeof vpZoomLevel !== 'undefined' && vpZoomLevel < 100 && vpHighResData) ? vpHighResData : vpElevationData;
        if (!elevData) return;
        const cruiseAlt = parseInt(document.getElementById('altMapInput')?.textContent || 4500);
        const maxTerrain = Math.max(...elevData.map(p => p.elevFt));
        vpMaxAltOverride = Math.max(cruiseAlt + 2500, maxTerrain + 1000);
        vpMaxAltOverride = Math.ceil(vpMaxAltOverride / 1000) * 1000;
    }
    vpMaxAltOverride = Math.max(3000, vpMaxAltOverride + delta);
    document.getElementById('yAxisDisplay').textContent = (vpMaxAltOverride / 1000) + 'k';
    
    // Performance-Rendering!
    if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
}
function vpResetYAxis() {
    window.activateFastRender();
    vpMaxAltOverride = 0;
    document.getElementById('yAxisDisplay').textContent = 'AUTO';
    renderMapProfile();
    if (document.getElementById('verticalProfileCanvas')) renderVerticalProfile('verticalProfileCanvas');
}
function vpToggleClouds() {
    vpShowClouds = !vpShowClouds;
    localStorage.setItem('ga_show_clouds', vpShowClouds);
    const btn = document.getElementById('btnToggleClouds');
    if (btn) btn.classList.toggle('active', vpShowClouds);
    
    if (vpShowClouds && window._lastVpRouteKey) {
        triggerVerticalProfileUpdate();
    } else {
        window.vpBgNeedsUpdate = true;
        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
    }
}

function vpToggleLandmarks() {
    vpShowLandmarks = !vpShowLandmarks;
    localStorage.setItem('ga_show_landmarks', vpShowLandmarks);
    const btn = document.getElementById('btnToggleLandmarks');
    if (btn) btn.classList.toggle('active', vpShowLandmarks);
    
    if (vpShowLandmarks && window._lastVpRouteKey) {
        localStorage.removeItem('ga_lms_' + window._lastVpRouteKey);
        window._lastLmRouteKey = null; // Zwingt zum erneuten Fetch
        triggerVerticalProfileUpdate();
    } else {
        window.vpBgNeedsUpdate = true; // FIX: Hintergrund zum Löschen zwingen
        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
    }
}

function vpToggleObstacles() {
    if (window.vpFailedOverpassChunks && window.vpFailedOverpassChunks.length > 0) {
        if (typeof window.retryFailedOverpassChunks === 'function') window.retryFailedOverpassChunks();
        return; 
    }
    vpShowObstacles = !vpShowObstacles;
    localStorage.setItem('ga_show_obstacles', vpShowObstacles);
    const btn = document.getElementById('btnToggleObstacles');
    if (btn) btn.classList.toggle('active', vpShowObstacles);
    
    // FIX: Nur neu abfragen, wenn für die aktuelle Route noch nie geladen wurde!
    if (vpShowObstacles && window._lastVpRouteKey && window._lastObsRouteKey !== window._lastVpRouteKey) {
        triggerVerticalProfileUpdate();
    } else {
        window.vpBgNeedsUpdate = true; 
        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
    }
}

function vpToggleLinearFeatures() {
    if (window.vpFailedOverpassChunks && window.vpFailedOverpassChunks.length > 0) {
        if (typeof window.retryFailedOverpassChunks === 'function') window.retryFailedOverpassChunks();
        return; 
    }
    vpShowLinear = !vpShowLinear;
    localStorage.setItem('ga_show_linear', vpShowLinear);
    const btn = document.getElementById('btnToggleLinear');
    if (btn) btn.classList.toggle('active', vpShowLinear);
    
    // FIX: Nur neu abfragen, wenn für die aktuelle Route noch nie geladen wurde!
    if (vpShowLinear && window._lastVpRouteKey && window._lastObsRouteKey !== window._lastVpRouteKey) {
        triggerVerticalProfileUpdate();
    } else {
        window.vpBgNeedsUpdate = true; 
        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
    }
}

function vpToggleAirspaces() {
    vpAirspaceMode = (vpAirspaceMode + 1) % 3;
    localStorage.setItem('ga_show_airspaces', vpAirspaceMode);
    updateAirspaceBtn();
    window.vpBgNeedsUpdate = true; // Zwingt den Hintergrund zum Update
    if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
}

// === PROMPT-EINGABE für ALT / V/S (V57) ===
window.retryFailedOverpassChunks = async function() {
    const chunks = window.vpFailedOverpassChunks;
    if (!chunks || chunks.length === 0) return;
    
    console.log(`[Overpass] Starte manuellen Retry für ${chunks.length} fehlgeschlagene Segmente...`);
    window.vpFailedOverpassChunks = []; 
    if (typeof window.updateOverpassErrorUI === 'function') window.updateOverpassErrorUI();
    
    const btnOb = document.getElementById('btnToggleObstacles');
    if (btnOb) btnOb.classList.add('vp-loading-pulse');

    const overpassServers = ['https://overpass-api.de/api/interpreter', 'https://lz4.overpass-api.de/api/interpreter', 'https://z.overpass-api.de/api/interpreter'];
    let newObs = []; let newLin = [];

    const fetchPromises = chunks.map(async (chunkData, idx) => {
        let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
        chunkData.forEach(p => {
            if (p.lat < minLat) minLat = p.lat; if (p.lat > maxLat) maxLat = p.lat;
            if (p.lon < minLon) minLon = p.lon; if (p.lon > maxLon) maxLon = p.lon;
        });
        const bbox = `${(minLat - 0.05).toFixed(4)},${(minLon - 0.08).toFixed(4)},${(maxLat + 0.05).toFixed(4)},${(maxLon + 0.08).toFixed(4)}`;

        let pathCoords = [];
        const step = Math.max(1, Math.ceil(chunkData.length / 30));
        for (let i = 0; i < chunkData.length; i += step) pathCoords.push(`${chunkData[i].lat.toFixed(4)},${chunkData[i].lon.toFixed(4)}`);
        const lastPt = `${chunkData[chunkData.length-1].lat.toFixed(4)},${chunkData[chunkData.length-1].lon.toFixed(4)}`;
        if (pathCoords[pathCoords.length-1] !== lastPt) pathCoords.push(lastPt);
        
        const queryBody = `node["generator:source"="wind"](around:4000,${pathCoords.join(',')});node["man_made"~"mast|tower"]["height"](around:4000,${pathCoords.join(',')});way["highway"="motorway"](around:4000,${pathCoords.join(',')});way["waterway"="river"](around:4000,${pathCoords.join(',')});`;
        const query = `[out:json][timeout:25][bbox:${bbox}];(${queryBody});out geom qt;`;

        let retries = 5, attempt = 0, success = false;
        while (retries > 0 && !success) {
            const serverUrl = overpassServers[(idx + attempt) % overpassServers.length];
            attempt++;
            try {
                const res = await fetch(serverUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}` });
                if (res.status === 429) { await new Promise(r => setTimeout(r, 15000)); retries--; continue; }
                if (res.status === 504) { await new Promise(r => setTimeout(r, 5000)); retries--; continue; }
                if (!res.ok) { await new Promise(r => setTimeout(r, 3000)); retries--; continue; }

                const json = await res.json();
                if (json.elements) {
                    json.elements.forEach(e => {
                        if (e.type === 'node' && e.lat && e.lon) {
                            let isWind = e.tags && e.tags["generator:source"] === "wind";
                            let hMeter = (e.tags && e.tags.height) ? parseFloat(e.tags.height.replace(',', '.')) : (isWind ? 120 : 50);
                            if (isNaN(hMeter) || hMeter < 30) return;
                            let hFt = Math.round(hMeter * 3.28084);
                            let bestD = Infinity, bestDistNM = 0, baseElevFt = 0;
                            chunkData.forEach(ep => {
                                let d = calcNav(e.lat, e.lon, ep.lat, ep.lon).dist;
                                if (d < bestD) { bestD = d; bestDistNM = ep.distNM; baseElevFt = ep.elevFt; }
                            });
                            newObs.push({ type: isWind ? 'wind' : 'mast', hFt: hFt, distNM: bestDistNM, elevFt: baseElevFt });
                        } else if (e.type === 'way' && e.geometry && e.tags) {
                            let featType = e.tags.highway ? 'highway' : 'river';
                            let name = e.tags.name || e.tags.ref || '';
                            if (!name && featType === 'highway') return;
                            if (typeof routeWaypoints !== 'undefined' && routeWaypoints.length >= 2) {
                                for (let i = 0; i < routeWaypoints.length - 1; i++) {
                                    let rp0 = {lat: routeWaypoints[i].lat, lon: routeWaypoints[i].lng||routeWaypoints[i].lon};
                                    let rp1 = {lat: routeWaypoints[i+1].lat, lon: routeWaypoints[i+1].lng||routeWaypoints[i+1].lon};
                                    for(let j = 0; j < e.geometry.length - 1; j++) {
                                        let wp0 = e.geometry[j], wp1 = e.geometry[j+1];
                                        let s1_x = wp1.lon - wp0.lon, s1_y = wp1.lat - wp0.lat;
                                        let s2_x = rp1.lon - rp0.lon, s2_y = rp1.lat - rp0.lat;
                                        let denom = (-s2_x * s1_y + s1_x * s2_y);
                                        if (Math.abs(denom) > 1e-10) {
                                            let s = (-s1_y * (wp0.lon - rp0.lon) + s1_x * (wp0.lat - rp0.lat)) / denom;
                                            let t = ( s2_x * (wp0.lat - rp0.lat) - s2_y * (wp0.lon - rp0.lon)) / denom;
                                            if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
                                                let ix = { lat: wp0.lat + (t * s1_y), lon: wp0.lon + (t * s1_x) };
                                                let distBefore = 0;
                                                for(let k=0; k<i; k++) distBefore += calcNav(routeWaypoints[k].lat, routeWaypoints[k].lng||routeWaypoints[k].lon, routeWaypoints[k+1].lat, routeWaypoints[k+1].lng||routeWaypoints[k+1].lon).dist;
                                                newLin.push({ type: featType, name: name, distNM: distBefore + calcNav(rp0.lat, rp0.lon, ix.lat, ix.lon).dist });
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
                success = true;
            } catch(e) { await new Promise(r => setTimeout(r, 3000)); retries--; }
        }
        if (!success) window.vpFailedOverpassChunks.push(chunkData);
    });

    await Promise.all(fetchPromises);

    // Merge mit existierenden Daten
    let combinedObs = [...(typeof vpObstacles !== 'undefined' ? vpObstacles : []), ...newObs];
    let buckets = {};
    combinedObs.forEach(obs => {
        let bIdx = Math.floor(obs.distNM / 0.5);
        if (!buckets[bIdx]) buckets[bIdx] = [];
        buckets[bIdx].push(obs);
    });
    let tempFinalObs = [];
    for (let k in buckets) {
        let group = buckets[k];
        group.sort((a,b) => b.hFt - a.hFt);
        let rep = group[0];
        rep.count = group.length;
        tempFinalObs.push(rep);
    }
    vpObstacles = tempFinalObs;

    let combinedLin = [...(typeof vpLinearFeatures !== 'undefined' ? vpLinearFeatures : []), ...newLin];
    vpLinearFeatures = combinedLin.sort((a,b) => a.distNM - b.distNM).filter((f, idx, arr) => idx === 0 || arr[idx-1].name !== f.name || Math.abs(arr[idx-1].distNM - f.distNM) > 1.0);

    window.vpBgNeedsUpdate = true;
    if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
    
    if (btnOb) btnOb.classList.remove('vp-loading-pulse');
    if (typeof window.updateOverpassErrorUI === 'function') window.updateOverpassErrorUI();
};

window.promptForAlt = function() {
    const current = document.getElementById('altMapInput').textContent;
    const res = prompt("Gewünschte Flughöhe (ALT) eingeben:", current);
    if (res !== null && !isNaN(parseInt(res))) {
        let val = parseInt(res);
        val = Math.max(1500, Math.min(13500, val));
        syncAltFromInput(val);
    }
};
window.promptForRate = function() {
    const current = document.getElementById('rateMapInput').textContent;
    const res = prompt("Gewünschte Steig-/Sinkrate (V/S) in ft/min eingeben:", current);
    if (res !== null && !isNaN(parseInt(res))) {
        let val = parseInt(res);
        val = Math.max(200, Math.min(1500, val));
        syncRateFromInput(val);
    }
};

/* =========================================================
   2D SIMULATOR EXPORT (Vollständige Welt)
   ========================================================= */
window.exportFor2DSim = function() {
    if (!vpElevationData || vpElevationData.length < 2) {
        alert("Bitte generiere zuerst eine Route im Dispatcher!");
        return;
    }

    const NM_TO_M = 1852;
    const FT_TO_M = 0.3048;

    let waypoints = [];
    
    // 1. Start-Landebahn generieren
    waypoints.push({ x: 0, elevation: vpElevationData[0].elevFt * FT_TO_M, type: "runway", length: 1200 });
    
    // 2. Wegpunkte / Topographie
    for (let i = 1; i < vpElevationData.length - 1; i++) {
        waypoints.push({ x: vpElevationData[i].distNM * NM_TO_M, elevation: vpElevationData[i].elevFt * FT_TO_M, type: "terrain" });
    }
    
    // 3. Ziel-Landebahn generieren
    let totalDistM = vpElevationData[vpElevationData.length - 1].distNM * NM_TO_M;
    waypoints.push({ x: totalDistM, elevation: vpElevationData[vpElevationData.length - 1].elevFt * FT_TO_M, type: "runway", length: 1200 });

    // 3b. Höhenprofil berechnen und zu jedem Wegpunkt hinzufügen
    const _exportCruiseAlt = parseInt(document.getElementById('altMapInput')?.textContent || 4500);
    const _exportTas = parseInt(document.getElementById('tasSlider')?.value || 115);
    const _exportProf = typeof computeFlightProfile === 'function'
        ? computeFlightProfile(vpElevationData, _exportCruiseAlt, vpClimbRate, vpDescentRate, _exportTas)
        : null;
    if (_exportProf && _exportProf.profile && _exportProf.profile.length > 0) {
        waypoints.forEach(wp => {
            const distNM = wp.x / NM_TO_M;
            let altFt = _exportCruiseAlt;
            for (let _j = 0; _j < _exportProf.profile.length - 1; _j++) {
                const _p0 = _exportProf.profile[_j], _p1 = _exportProf.profile[_j + 1];
                if (distNM >= _p0.distNM && distNM <= _p1.distNM) {
                    const _f = (_p1.distNM > _p0.distNM) ? (distNM - _p0.distNM) / (_p1.distNM - _p0.distNM) : 0;
                    altFt = _p0.altFt + _f * (_p1.altFt - _p0.altFt);
                    break;
                }
            }
            wp.alt = Math.round(altFt); // Reiseflughöhe in Fuß
        });
    }

    // 3c. Dispatcher-Wegpunkte (gesetzt im Vertical Profile) extrahieren
    let altWaypoints = [];
    if (typeof vpAltWaypoints !== 'undefined' && vpAltWaypoints.length > 0) {
        altWaypoints = vpAltWaypoints.map(wp => ({ x: wp.distNM * NM_TO_M, altFt: wp.altFt }));
    }

    // 4. Wetter-Zonen (Regen, Schnee, Wolken)
    let weatherZones = [];
    let cloudBaseMeters = 1500;
    if (typeof vpWeatherData !== 'undefined' && vpWeatherData) {
        if (vpWeatherData.length > 0 && vpWeatherData[0].lowestBase !== Infinity) {
            cloudBaseMeters = vpWeatherData[0].lowestBase * FT_TO_M;
        }
        vpWeatherData.forEach(zone => {
            weatherZones.push({
                x: zone.distNM * NM_TO_M,
                icao: zone.icao,
                hasRain: zone.weather ? zone.weather.hasRain : false,
                hasSnow: zone.weather ? zone.weather.hasSnow : false,
                hasTS: zone.weather ? zone.weather.hasTS : false,
                clouds: zone.clouds ? zone.clouds.map(c => ({
                    type: c.type,
                    baseM: c.baseMsl * FT_TO_M
                })) : []
            });
        });
    }

    // 5. Hindernisse (Windräder, Masten)
    let obstacles = [];
    if (typeof vpObstacles !== 'undefined' && vpObstacles) {
        vpObstacles.forEach(obs => {
            obstacles.push({
                x: obs.distNM * NM_TO_M,
                type: obs.type, // 'wind' oder 'mast'
                heightM: obs.hFt * FT_TO_M
            });
        });
    }

    // 6. Flüsse & Autobahnen
    let linearFeatures = [];
    if (typeof vpLinearFeatures !== 'undefined' && vpLinearFeatures) {
        vpLinearFeatures.forEach(feat => {
            linearFeatures.push({
                x: feat.distNM * NM_TO_M,
                type: feat.type, // 'river' oder 'highway'
                name: feat.name
            });
        });
    }

    // 7. Städte & Flughäfen
    let landmarks = [];
    if (typeof vpLandmarks !== 'undefined' && vpLandmarks) {
        vpLandmarks.forEach(lm => {
            landmarks.push({
                x: lm.distNM * NM_TO_M,
                type: lm.type, // 'apt', 'city', 'town'
                name: lm.name
            });
        });
    }

    // 7b. Lufträume (Airspaces) extrahieren
    let airspaces = [];
    if (typeof activeAirspaces !== 'undefined' && activeAirspaces.length > 0 && typeof getCachedAirspaceIntersections === 'function') {
        let totalDistNM = vpElevationData[vpElevationData.length - 1].distNM;
        let cachedAS = getCachedAirspaceIntersections(vpElevationData, totalDistNM);
        
        cachedAS.forEach(item => {
            // Nur relevante Lufträume exportieren (z.B. keine unendlichen FIRs)
            let asName = item.as.name || "Luftraum";
            // Wir berechnen die absolute MSL Höhe in Metern für den Simulator
            let lowerM = item.lowerFt * FT_TO_M;
            let upperM = item.upperFt * FT_TO_M;
            
            airspaces.push({
                name: asName,
                type: item.as.type, 
                isCTR: asName.includes("CTR") || asName.includes("Control Zone"),
                startX: item.asMinDist * NM_TO_M,
                endX: item.asMaxDist * NM_TO_M,
                lowerM: lowerM,
                upperM: upperM,
                isLowerAgl: item.isLowerAgl
            });
        });
    }

    // 8. JSON zusammensetzen (Update!)
    let simData = {
        weather: { windVX: -5, windVY: 0, oat: 15, qnh: 1013, cloudBase: Math.round(cloudBaseMeters) },
        waypoints: waypoints,
        weatherZones: weatherZones,
        obstacles: obstacles,
        linearFeatures: linearFeatures,
        landmarks: landmarks,
        airspaces: airspaces,
        altWaypoints: altWaypoints
    };

    let jsonString = JSON.stringify(simData);

    // 9. MAGIC TRANSFER: Ab in den localStorage und Simulator öffnen!
    try {
        localStorage.setItem('autoSimFlightPlan', jsonString);
        // Öffnet den Simulator in einem neuen Tab (Pfad ggf. anpassen, falls game.html woanders liegt)
        window.open('game.html', '_blank');
    } catch (e) {
        alert("Fehler beim Transfer! Bitte Cookies/Local Storage im Browser erlauben.");
        console.error(e);
    }
};

/* =========================================================
   HDG-MODUS: Heading-basiertes Vertikalprofil (v1)
   Zeigt Terrain, Lufträume, Städte entlang der aktuellen
   Flugrichtung — ohne neue API-Calls.
   X-Achse = Minuten voraus/zurück (totalDist = Minuten).
   Flugzeug steht bei distNM = VP_HDG_LOOKBACK_MIN (leicht eingerückt).
   ========================================================= */

const VP_HDG_LOOKBACK_MIN = 2;    // Minuten hinter dem Flugzeug (Gelände dahinter)
const VP_HDG_LOOKAHEAD_MIN = 15;  // Minuten voraus (Standard)
const VP_HDG_SAMPLES = 80;        // Anzahl Terrain-Sample-Punkte (gesamt)

let vpMode = 'ROUTE';            // 'ROUTE' | 'HDG'
let vpHdgElevData = null;        // [{distNM (=Minuten), elevFt, lat, lon}]
let vpHdgLandmarks = [];
let vpHdgObstacles = [];
let vpHdgLinearFeatures = [];
let vpHdgUpdateTimer = null;
let vpHdgLastUpdate = { lat: 0, lon: 0, hdg: -999 };

// ── Toggle ──────────────────────────────────────────────
function vpToggleMode() {
    const btn = document.getElementById('btnToggleVpMode');
    const hasGps = window.lastLiveGpsPos && typeof smoothedGS !== 'undefined' && smoothedGS > 20;

    if (vpMode === 'ROUTE') {
        if (!hasGps) {
            // Kein GPS → Button kurz blinken lassen
            if (btn) { btn.style.background = '#833'; setTimeout(() => btn.style.background = '', 600); }
            return;
        }
        vpMode = 'HDG';
        if (btn) { btn.textContent = 'HDG'; btn.classList.add('active'); }
        startHdgCycle();
    } else {
        stopHdgCycle();
        if (btn) { btn.textContent = 'RTE'; btn.classList.remove('active'); }
        // _hdgAutoActivated bleibt true → kein sofortiger Re-Trigger durch GPS-Tick
        // Reset passiert erst beim GPS-Disconnect (in sync.js onclose)
    }
}

function startHdgCycle() {
    updateHdgProfile();
    vpHdgUpdateTimer = setInterval(updateHdgProfile, 1000);
}

function stopHdgCycle() {
    clearInterval(vpHdgUpdateTimer);
    vpHdgUpdateTimer = null;
    vpHdgElevData = null;
    vpHdgLandmarks = [];
    vpHdgObstacles = [];
    vpHdgLinearFeatures = [];
    vpMode = 'ROUTE';
    window.vpBgNeedsUpdate = true;
}

async function updateHdgProfile() {
    if (vpMode !== 'HDG') return;
    if (!window.lastLiveGpsPos) return;

    const { lat, lon, hdg, alt } = window.lastLiveGpsPos;
    const gs = (typeof smoothedGS !== 'undefined' && smoothedGS > 20) ? smoothedGS : 80;

    // Change-Detection: nur updaten wenn Kurs/Position sich nennenswert geändert hat
    const dHdg = Math.abs(((hdg - vpHdgLastUpdate.hdg) + 540) % 360 - 180);
    const dPos = Math.abs(lat - vpHdgLastUpdate.lat) + Math.abs(lon - vpHdgLastUpdate.lon);
    if (vpHdgElevData && dHdg < 2 && dPos < 0.003) return;

    vpHdgLastUpdate = { lat, lon, hdg };
    await generateHdgProfile(lat, lon, hdg, alt, gs);
    computeHdgLandmarks(lat, lon, hdg, gs);
    computeHdgObstacles(lat, lon, hdg, gs);
    computeHdgLinearFeatures(lat, lon, hdg, gs);
    window.vpBgNeedsUpdate = true;
}

// ── Terrain-Sampling entlang der Flugrichtung ────────────
async function generateHdgProfile(lat, lon, hdg, alt, gs) {
    if (typeof sampleTerrainElevation !== 'function') return;

    const totalMin = VP_HDG_LOOKBACK_MIN + VP_HDG_LOOKAHEAD_MIN;
    const totalNM  = gs * (totalMin / 60);
    const stepNM   = totalNM / VP_HDG_SAMPLES;
    const backNM   = gs * (VP_HDG_LOOKBACK_MIN / 60);

    const points = [];
    for (let i = 0; i <= VP_HDG_SAMPLES; i++) {
        const ahead = i * stepNM - backNM;  // negativ = hinter dem Flugzeug
        const bearing = ahead >= 0 ? hdg : (hdg + 180) % 360;
        const dist    = Math.abs(ahead);
        const pt = (typeof getDestinationPoint === 'function')
            ? getDestinationPoint(lat, lon, dist, bearing)
            : { lat, lon };
        // distNM speichern wir in Minuten (i * totalMin / samples)
        const timeMin = i * totalMin / VP_HDG_SAMPLES;
        points.push({ lat: pt.lat, lon: pt.lon, distNM: timeMin });
    }

    // Tiles parallel vorladen (normalerweise 1-3 Tiles)
    const tileSet = new Set();
    const tilePromises = [];
    for (const p of points) {
        const z = 10;
        const n = Math.pow(2, z);
        const tx = Math.floor((p.lon + 180) / 360 * n);
        const latRad = p.lat * Math.PI / 180;
        const ty = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
        const key = `${z}/${tx}/${ty}`;
        if (!tileSet.has(key) && typeof _tawsLoadTile === 'function') {
            tileSet.add(key);
            tilePromises.push(_tawsLoadTile(tx, ty, z).catch(() => null));
        }
    }
    if (tilePromises.length) await Promise.all(tilePromises);

    // Höhen sampeln (synchron aus Cache)
    const result = [];
    for (const p of points) {
        try {
            const elevFt = await sampleTerrainElevation(p.lat, p.lon);
            result.push({ distNM: p.distNM, elevFt: Math.max(0, elevFt), lat: p.lat, lon: p.lon });
        } catch (e) {
            result.push({ distNM: p.distNM, elevFt: 0, lat: p.lat, lon: p.lon });
        }
    }
    vpHdgElevData = result;
}

// ── Landmarks (Städte & Airports) entlang Heading ────────
function computeHdgLandmarks(lat, lon, hdg, gs) {
    vpHdgLandmarks = [];
    if (!window.GLOBAL_CITIES_DATA && typeof globalCities === 'undefined') return;

    const cities = window.GLOBAL_CITIES_DATA || (typeof globalCities !== 'undefined' ? globalCities : []);
    const airports = (typeof globalAirports !== 'undefined' && globalAirports) ? Object.values(globalAirports) : [];
    const totalMin = VP_HDG_LOOKBACK_MIN + VP_HDG_LOOKAHEAD_MIN;
    const totalNM  = gs * (totalMin / 60);
    const backNM   = gs * (VP_HDG_LOOKBACK_MIN / 60);

    const found = [];

    // Städte
    for (const c of cities) {
        if (!c.lat || !c.lon) continue;
        if (typeof calcNav !== 'function') break;
        const nav = calcNav(lat, lon, c.lat, c.lon);
        if (nav.dist > totalNM + 5) continue; // Grob-Filter
        // Winkel zur Heading-Linie prüfen
        const angleOff = Math.abs(((nav.brng - hdg) + 540) % 360 - 180);
        if (angleOff > 20 || nav.dist > totalNM + 3) continue;
        // Seitliche Abweichung prüfen (max 4 NM)
        const sideDevNM = nav.dist * Math.sin(angleOff * Math.PI / 180);
        if (Math.abs(sideDevNM) > 4) continue;
        // Distanz entlang Heading → Minuten
        const alongNM = nav.dist * Math.cos(angleOff * Math.PI / 180);
        const alongMin = (alongNM / gs) * 60;
        const timeMin = VP_HDG_LOOKBACK_MIN + (nav.brng === hdg ? alongMin : -alongMin);
        if (timeMin < 0 || timeMin > totalMin) continue;
        found.push({ name: c.name || c.n, type: 'city', pop: c.pop || 0, distNM: timeMin });
    }

    // Airports
    for (const a of airports) {
        if (!a.lat || !a.lon) continue;
        if (typeof calcNav !== 'function') break;
        const nav = calcNav(lat, lon, a.lat, a.lon);
        if (nav.dist > totalNM + 5) continue;
        const angleOff = Math.abs(((nav.brng - hdg) + 540) % 360 - 180);
        if (angleOff > 20 || nav.dist > totalNM + 3) continue;
        const sideDevNM = nav.dist * Math.sin(angleOff * Math.PI / 180);
        if (Math.abs(sideDevNM) > 4) continue;
        const alongNM = nav.dist * Math.cos(angleOff * Math.PI / 180);
        const alongMin = (alongNM / gs) * 60;
        const timeMin = VP_HDG_LOOKBACK_MIN + (nav.brng === hdg ? alongMin : -alongMin);
        if (timeMin < 0 || timeMin > totalMin) continue;
        found.push({ name: a.icao || a.name, type: 'apt', pop: 999999, distNM: timeMin });
    }

    // Sortieren nach Entfernung, max. 12 Landmarks
    found.sort((a, b) => b.pop - a.pop);
    vpHdgLandmarks = found.slice(0, 12);
}

// ── Hindernisse aus Cache filtern ────────────────────────
function computeHdgObstacles(lat, lon, hdg, gs) {
    vpHdgObstacles = [];
    if (!vpObstacles || vpObstacles.length === 0) return;

    const totalMin = VP_HDG_LOOKBACK_MIN + VP_HDG_LOOKAHEAD_MIN;
    const totalNM  = gs * (totalMin / 60);
    const backNM   = gs * (VP_HDG_LOOKBACK_MIN / 60);

    for (const obs of vpObstacles) {
        if (!obs.lat || !obs.lon) continue;
        if (typeof calcNav !== 'function') break;
        const nav = calcNav(lat, lon, obs.lat, obs.lon);
        if (nav.dist > totalNM + 3) continue;
        const angleOff = Math.abs(((nav.brng - hdg) + 540) % 360 - 180);
        if (angleOff > 20) continue;
        const sideDevNM = nav.dist * Math.sin(angleOff * Math.PI / 180);
        if (Math.abs(sideDevNM) > 3) continue;
        const alongNM = nav.dist * Math.cos(angleOff * Math.PI / 180);
        const alongMin = (alongNM / gs) * 60;
        // angleOff ≤ 20° → Hindernis liegt voraus (Heading-Korridor)
        const timeMin = VP_HDG_LOOKBACK_MIN + alongMin;
        if (timeMin < 0 || timeMin > totalMin) continue;
        vpHdgObstacles.push({ ...obs, distNM: timeMin, groundElevFt: obs.elevFt });
    }
}

// ── Lineare Features (Straßen & Flüsse) entlang Heading ──
function computeHdgLinearFeatures(lat, lon, hdg, gs) {
    vpHdgLinearFeatures = [];
    if (!vpLinearFeatures || vpLinearFeatures.length === 0) return;

    const totalMin = VP_HDG_LOOKBACK_MIN + VP_HDG_LOOKAHEAD_MIN;
    const totalNM  = gs * (totalMin / 60);

    for (const lin of vpLinearFeatures) {
        if (!lin.lat || !lin.lon) continue;
        if (typeof calcNav !== 'function') break;
        const nav = calcNav(lat, lon, lin.lat, lin.lon);
        if (nav.dist > totalNM + 3) continue;
        const angleOff = Math.abs(((nav.brng - hdg) + 540) % 360 - 180);
        if (angleOff > 25) continue; // etwas breiterer Korridor für Straßen/Flüsse
        const sideDevNM = nav.dist * Math.sin(angleOff * Math.PI / 180);
        if (Math.abs(sideDevNM) > 5) continue;
        const alongNM = nav.dist * Math.cos(angleOff * Math.PI / 180);
        const timeMin = VP_HDG_LOOKBACK_MIN + (alongNM / gs) * 60;
        if (timeMin < 0 || timeMin > totalMin) continue;
        vpHdgLinearFeatures.push({ ...lin, distNM: timeMin });
    }
}

