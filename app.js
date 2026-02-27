/* =========================================================
   1. THEME TOGGLE & NOTIZEN TOGGLE
   ========================================================= */
function toggleTheme() {
    const toggle = document.getElementById('themeToggle');
    if(toggle && toggle.checked) {
        document.body.classList.add('theme-retro');
        localStorage.setItem('ga_theme', 'retro');
    } else {
        document.body.classList.remove('theme-retro');
        localStorage.setItem('ga_theme', 'classic');
    }
    updateDynamicColors();
    refreshAllDrums();
}

function toggleNotes() {
    const page1 = document.getElementById('notePage1');
    const page2 = document.getElementById('notePage2');
    if (!page1 || !page2) return;
    if(page1.classList.contains('front-note')) {
        page1.classList.replace('front-note', 'back-note');
        page2.classList.replace('back-note', 'front-note');
    } else {
        page1.classList.replace('back-note', 'front-note');
        page2.classList.replace('front-note', 'back-note');
    }
}

function updateDynamicColors() {
    const isRetro = document.body.classList.contains('theme-retro');
    const primColor = isRetro ? 'var(--piper-white)' : 'var(--blue)';
    const titleColor = isRetro ? 'var(--piper-white)' : 'var(--blue)';
    const hlColor = isRetro ? 'var(--piper-yellow)' : 'var(--green)';
    const mainTitle = document.getElementById('mainTitle');
    if (mainTitle) mainTitle.style.color = isRetro ? '' : titleColor;
    document.querySelectorAll('.theme-color-text').forEach(el => el.style.color = isRetro ? '' : primColor);
    document.querySelectorAll('.theme-green-text').forEach(el => el.style.color = hlColor);
}

function applySavedPanelTheme() {
    const savedPanel = localStorage.getItem('ga_panel_theme') || 'panel-med';
    const panel = document.querySelector('.container');
    if (panel) {
        panel.classList.remove('panel-med', 'panel-creme', 'panel-light', 'panel-dark');
        panel.classList.add(savedPanel);
    }
}

function cyclePanelColor() {
    if (!document.body.classList.contains('theme-retro')) return; 
    const panel = document.querySelector('.container');
    const themes = ['panel-med', 'panel-creme', 'panel-light', 'panel-dark'];
    let currentIndex = 0;
    for (let i = 0; i < themes.length; i++) {
        if (panel.classList.contains(themes[i])) {
            currentIndex = i; panel.classList.remove(themes[i]); break;
        }
    }
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    panel.classList.add(nextTheme);
    localStorage.setItem('ga_panel_theme', nextTheme);
}

/* =========================================================
   2. GLOBALE VARIABLEN & INITIALISIERUNG
   ========================================================= */
let map, polyline, markers = [], currentStartICAO, currentDestICAO, currentMissionData = null, selectedAC = "PA-24";
let globalAirports = null, runwayCache = {};

window.onload = () => {
    const savedTheme = localStorage.getItem('ga_theme') || 'retro'; 
    const themeToggleBtn = document.getElementById('themeToggle');
    if (savedTheme === 'retro') {
        document.body.classList.add('theme-retro');
        if(themeToggleBtn) themeToggleBtn.checked = true;
    } else {
        document.body.classList.remove('theme-retro');
        if(themeToggleBtn) themeToggleBtn.checked = false;
    }
    updateDynamicColors();
    applySavedPanelTheme(); 

    const lastDest = localStorage.getItem('last_icao_dest');
    if (lastDest) document.getElementById('startLoc').value = lastDest;
    
    const savedKey = localStorage.getItem('ga_gemini_key');
    if (savedKey) document.getElementById('apiKeyInput').value = savedKey;

    const aiEnabled = localStorage.getItem('ga_ai_enabled');
    const aiToggleBtn = document.getElementById('aiToggle');
    if(aiToggleBtn) { aiToggleBtn.checked = (aiEnabled !== 'false'); }

    renderLog();
    updateApiFuelMeter(); // API Zähler starten

    const activeMission = localStorage.getItem('ga_active_mission');
    if (activeMission) {
        setTimeout(() => restoreMissionState(JSON.parse(activeMission)), 300);
    }

    requestAnimationFrame(() => {
        setTimeout(() => { refreshAllDrums(); }, 50);
    });
};

function saveApiKey() { localStorage.setItem('ga_gemini_key', document.getElementById('apiKeyInput').value.trim()); }
function saveAiToggle() { const t = document.getElementById('aiToggle'); if(t) localStorage.setItem('ga_ai_enabled', t.checked); }

/* =========================================================
   3. PERSISTENZ (SPEICHERN, LADEN & RESET)
   ========================================================= */
function saveMissionState() {
    if (document.getElementById("briefingBox").style.display !== "block") return;
    const state = {
        mTitle: document.getElementById('mTitle').innerHTML,
        mStory: document.getElementById('mStory').innerText,
        mDepICAO: document.getElementById("mDepICAO").innerText,
        mDepName: document.getElementById("mDepName").innerText,
        mDepCoords: document.getElementById("mDepCoords").innerText,
        mDepRwy: document.getElementById("mDepRwy").innerText,
        destIcon: document.getElementById("destIcon").innerText,
        mDestICAO: document.getElementById("mDestICAO").innerText,
        mDestName: document.getElementById("mDestName").innerText,
        mDestCoords: document.getElementById("mDestCoords").innerText,
        mDestRwy: document.getElementById("mDestRwy").innerText,
        mPay: document.getElementById("mPay").innerText,
        mWeight: document.getElementById("mWeight").innerText,
        mDistNote: document.getElementById("mDistNote").innerText,
        mHeadingNote: document.getElementById("mHeadingNote").innerText,
        mETENote: document.getElementById("mETENote").innerText,
        wikiDescText: document.getElementById("wikiDescText").innerText,
        isPOI: document.getElementById("destRwyContainer").style.display === "none",
        currentMissionData: currentMissionData,
        routeWaypoints: routeWaypoints,
        currentStartICAO: currentStartICAO,
        currentDestICAO: currentDestICAO,
        currentSName: currentSName,
        currentDName: currentDName
    };
    localStorage.setItem('ga_active_mission', JSON.stringify(state));
}

function restoreMissionState(state) {
    document.getElementById('mTitle').innerHTML = state.mTitle; document.getElementById('mStory').innerText = state.mStory;
    document.getElementById("mDepICAO").innerText = state.mDepICAO; document.getElementById("mDepName").innerText = state.mDepName;
    document.getElementById("mDepCoords").innerText = state.mDepCoords; document.getElementById("mDepRwy").innerText = state.mDepRwy;
    document.getElementById("destIcon").innerText = state.destIcon; document.getElementById("mDestICAO").innerText = state.mDestICAO;
    document.getElementById("mDestName").innerText = state.mDestName; document.getElementById("mDestCoords").innerText = state.mDestCoords;
    document.getElementById("mDestRwy").innerText = state.mDestRwy; document.getElementById("mPay").innerText = state.mPay;
    document.getElementById("mWeight").innerText = state.mWeight; document.getElementById("mDistNote").innerText = state.mDistNote;
    document.getElementById("mHeadingNote").innerText = state.mHeadingNote; document.getElementById("mETENote").innerText = state.mETENote;
    document.getElementById("wikiDescText").innerText = state.wikiDescText;
    document.getElementById("destRwyContainer").style.display = state.isPOI ? "none" : "block";
    const destSwitchRow = document.getElementById("destSwitchRow"); if(destSwitchRow) destSwitchRow.style.display = state.isPOI ? "none" : "flex";

    currentMissionData = state.currentMissionData; routeWaypoints = state.routeWaypoints;
    currentStartICAO = state.currentStartICAO; currentDestICAO = state.currentDestICAO;
    currentSName = state.currentSName; currentDName = state.currentDName;

    document.getElementById("briefingBox").style.display = "block";
    renderMainRoute(); setDrumCounter('distDrum', state.currentMissionData.dist);
    recalculatePerformance(); document.getElementById('searchIndicator').innerText = "📋 Gespeichertes Briefing geladen.";
}

function resetApp() {
    if(!confirm("Möchtest du das aktuelle Briefing wirklich verwerfen und alles auf Anfang setzen?")) return;
    localStorage.removeItem('ga_active_mission'); document.getElementById("briefingBox").style.display = "none";
    currentMissionData = null; routeWaypoints = [];
    if(map) { routeMarkers.forEach(m => map.removeLayer(m)); if (polyline) map.removeLayer(polyline); if (window.hitBoxPolyline) map.removeLayer(window.hitBoxPolyline); }
    if (miniMap) { if (miniRoutePolyline) miniMap.removeLayer(miniRoutePolyline); miniMapMarkers.forEach(m => miniMap.removeLayer(m)); miniMapMarkers = []; }
    document.getElementById('searchIndicator').innerText = "System bereit."; setDrumCounter('distDrum', 0); recalculatePerformance();
}

/* =========================================================
   4. HELPER-FUNKTIONEN (UI & Mathe)
   ========================================================= */
function setDrumCounter(elementId, valueStr) {
    const container = document.getElementById(elementId);
    if (!container) return;
    if (!document.body.classList.contains('theme-retro')) {
        container.innerHTML = `<span class="theme-color-text" style="font-weight:bold;">${valueStr}</span>`;
        updateDynamicColors(); return;
    }
    let numericValue = valueStr.toString().replace(/[^0-9]/g, '');
    if (numericValue === "") numericValue = "0"; 
    const digits = numericValue.split(''), digitHeight = 22; 
    let windowEl = container.querySelector('.drum-window');
    if (!windowEl) { container.innerHTML = '<div class="drum-window"></div>'; windowEl = container.querySelector('.drum-window'); }
    const existingStrips = windowEl.querySelectorAll('.drum-strip'), neededStrips = digits.length;
    if (existingStrips.length < neededStrips) {
        for (let i = 0; i < (neededStrips - existingStrips.length); i++) {
            const strip = document.createElement('div'); strip.className = 'drum-strip';
            strip.innerHTML = [0,1,2,3,4,5,6,7,8,9].map(d => `<div class="drum-digit">${d}</div>`).join('');
            windowEl.appendChild(strip);
        }
    } else if (existingStrips.length > neededStrips) { for (let i = neededStrips; i < existingStrips.length; i++) { windowEl.removeChild(existingStrips[i]); } }
    const finalStrips = windowEl.querySelectorAll('.drum-strip');
    digits.forEach((digit, index) => { const translateY = -(parseInt(digit) * digitHeight); finalStrips[index].style.transform = `translateY(${translateY}px)`; });
}

function handleSliderChange(type, val) { setDrumCounter(type + 'Drum', val); recalculatePerformance(); }

function recalculatePerformance() {
    if (!currentMissionData) return;
    const tas = parseInt(document.getElementById("tasSlider").value), gph = parseInt(document.getElementById("gphSlider").value), dist = currentMissionData.dist;
    setDrumCounter('timeDrum', Math.round((dist / tas) * 60)); setDrumCounter('fuelDrum', Math.ceil((dist / tas * gph) + (0.75 * gph)));
    setTimeout(() => saveMissionState(), 500);
}

function refreshAllDrums() {
    setDrumCounter('tasDrum', document.getElementById('tasSlider').value); setDrumCounter('gphDrum', document.getElementById('gphSlider').value);
    if(currentMissionData) { setDrumCounter('distDrum', currentMissionData.dist); recalculatePerformance(); }
}

function applyPreset(t, g, s, n) { 
    document.getElementById('tasSlider').value=t; document.getElementById('gphSlider').value=g; 
    document.getElementById('maxSeats').value=s; selectedAC=n;
    handleSliderChange('tas', t); handleSliderChange('gph', g);
}

function copyCoords(elementId) {
    const txt = document.getElementById(elementId).innerText;
    if(txt && txt !== "-") { navigator.clipboard.writeText(txt).then(() => alert("Koordinaten kopiert:\n" + txt)); }
}

function checkBearing(b, dirPref) {
    if (dirPref === 'any') return true;
    if (dirPref === 'N' && (b <= 45 || b >= 315)) return true;
    if (dirPref === 'E' && (b >= 45 && b <= 135)) return true;
    if (dirPref === 'S' && (b >= 135 && b <= 225)) return true;
    if (dirPref === 'W' && (b >= 225 && b <= 315)) return true;
    return false;
}

function resetBtn(btn) { btn.disabled = false; btn.innerText = "Auftrag generieren"; }

function calcNav(lat1, lon1, lat2, lon2) {
    const R = 3440, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    const dist = Math.round(R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    const y = Math.sin(dLon)*Math.cos(lat2*Math.PI/180), x = Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180)-Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLon);
    return { dist, brng: Math.round((Math.atan2(y, x)*180/Math.PI + 360)%360) };
}

function getDestinationPoint(lat, lon, distNM, bearing) {
    const R = 3440.065, lat1 = lat * Math.PI / 180, lon1 = lon * Math.PI / 180, brng = bearing * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distNM / R) + Math.cos(lat1) * Math.sin(distNM / R) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distNM / R) * Math.cos(lat1), Math.cos(distNM / R) - Math.sin(lat1) * Math.sin(lat2));
    return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
}

/* =========================================================
   5. DATEN-FETCHING (APIs & GEMINI KI)
   ========================================================= */
async function loadGlobalAirports() {
    if (globalAirports) return;
    try { const res = await fetch('https://raw.githubusercontent.com/mwgg/Airports/master/airports.json'); globalAirports = await res.json(); } catch (e) { globalAirports = {}; }
}

async function getAirportData(icao) {
    if (typeof coreDB !== 'undefined' && coreDB[icao]) return coreDB[icao]; 
    await loadGlobalAirports(); 
    if (globalAirports[icao]) return { icao: icao, n: globalAirports[icao].name || globalAirports[icao].city, lat: globalAirports[icao].lat, lon: globalAirports[icao].lon };
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${icao}+airport`); const data = await res.json();
        if (data && data.length > 0) return { icao: icao, n: data[0].display_name.split(',')[0], lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (e) {} return null;
}

async function findGithubAirport(lat, lon, minNM, maxNM, dirPref, regionPref) {
    await loadGlobalAirports(); let validAirports = [];
    for (const key in globalAirports) {
        const apt = globalAirports[key]; if(apt.icao === currentStartICAO) continue;
        const isDE = apt.icao.startsWith('ED') || apt.icao.startsWith('ET');
        if (regionPref === "de" && !isDE) continue; if (regionPref === "int" && isDE) continue;
        const navCalc = calcNav(lat, lon, apt.lat, apt.lon);
        if (navCalc.dist >= minNM && navCalc.dist <= maxNM && checkBearing(navCalc.brng, dirPref)) { validAirports.push({ icao: apt.icao, n: apt.name || apt.city || "Unbekannt", lat: apt.lat, lon: apt.lon }); }
    }
    if (validAirports.length > 0) return validAirports[Math.floor(Math.random() * validAirports.length)];
    return null;
}

async function findWikipediaPOI(lat, lon, minNM, maxNM, dirPref) {
    const dist = Math.floor(Math.random() * (maxNM - minNM + 1)) + minNM;
    let minB = 0, maxB = 360;
    if (dirPref === 'N') { minB = 315; maxB = 405; } else if (dirPref === 'E') { minB = 45; maxB = 135; } else if (dirPref === 'S') { minB = 135; maxB = 225; } else if (dirPref === 'W') { minB = 225; maxB = 315; }
    let bearing = Math.floor(Math.random() * (maxB - minB + 1)) + minB; bearing = bearing % 360;
    const target = getDestinationPoint(lat, lon, dist, bearing);
    const url = `https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${target.lat}|${target.lon}&gsradius=10000&gslimit=30&format=json&origin=*`;
    try {
        const res = await fetch(url); const data = await res.json();
        if (data.query && data.query.geosearch && data.query.geosearch.length > 0) {
            const poi = data.query.geosearch[Math.floor(Math.random() * data.query.geosearch.length)];
            return { icao: "POI", n: poi.title, lat: poi.lat, lon: poi.lon };
        }
    } catch(e) {}
    return null;
}

async function fetchAreaDescription(lat, lon, elementId, exactTitle = null) {
    try {
        let titleToFetch = exactTitle;
        if (!titleToFetch) {
            const geoRes = await fetch(`https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=1&format=json&origin=*`);
            const geoData = await geoRes.json();
            if (geoData?.query?.geosearch?.length > 0) titleToFetch = geoData.query.geosearch[0].title;
            else { document.getElementById(elementId).innerText = "Keine regionalen Wikipedia-Daten gefunden."; return; }
        }
        if (titleToFetch) {
            const extRes = await fetch(`https://de.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&exsentences=3&titles=${encodeURIComponent(titleToFetch)}&format=json&origin=*`);
            const extData = await extRes.json();
            if (extData?.query?.pages) {
                const pageId = Object.keys(extData.query.pages)[0];
                if (pageId !== "-1" && extData.query.pages[pageId].extract) {
                    let prefix = exactTitle ? "" : `Region (${titleToFetch}):\n`;
                    document.getElementById(elementId).innerText = prefix + extData.query.pages[pageId].extract; return;
                }
            }
        }
        document.getElementById(elementId).innerText = "Der Artikel konnte nicht von Wikipedia abgerufen werden.";
    } catch(e) { document.getElementById(elementId).innerText = "Wiki-Daten konnten nicht geladen werden."; }
}

async function fetchRunwayDetails(lat, lon, elementId, icaoCode) {
    const domEl = document.getElementById(elementId);
    const hColor = document.body.classList.contains('theme-retro') ? 'var(--piper-yellow)' : 'var(--warn)';
    if (icaoCode && runwayCache[icaoCode]) { domEl.innerText = runwayCache[icaoCode]; domEl.style.color = hColor; return; }
    try {
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(`[out:json][timeout:5];way["aeroway"="runway"](around:2000,${lat},${lon});out tags;`)}`);
        const data = await res.json();
        if (data?.elements?.length > 0) {
            let rwyElement = data.elements.find(el => el.tags && el.tags.ref) || data.elements[0];
            const ref = rwyElement.tags.ref || "???";
            let surface = rwyElement.tags.surface ? rwyElement.tags.surface.toLowerCase() : "unbekannt";
            const trans = { "asphalt": "Asphalt", "concrete": "Beton", "grass": "Gras", "paved": "Befestigt", "unpaved": "Unbefestigt", "dirt": "Erde", "gravel": "Schotter" };
            const finalString = `${ref} - ${trans[surface] || surface}${rwyElement.tags.length ? ` (${rwyElement.tags.length}m)` : ""}`;
            if (icaoCode && finalString !== "??? - unbekannt") runwayCache[icaoCode] = finalString;
            domEl.innerText = finalString; domEl.style.color = hColor; return;
        }
    } catch (e) {}
    domEl.innerText = "Keine Daten gefunden"; domEl.style.color = "#888";
}

async function fetchGeminiMission(startName, destName, dist, isPOI, paxText, cargoText) {
    const aiToggleBtn = document.getElementById('aiToggle');
    if (!aiToggleBtn || !aiToggleBtn.checked) return null; 
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
    if (!apiKey) return null; 

    const prompt = `Du bist ein Dispatcher für die allgemeine Luftfahrt (General Aviation).
    Erstelle ein realistisches Einsatzbriefing:
    Start: ${startName}
    Ziel/Fokus: ${destName} ${isPOI ? '(POI / Wendepunkt)' : '(Zielflughafen)'}
    Distanz (Gesamt): ${dist} NM
    Zuladung: ${paxText}, ${cargoText} Fracht.

    WICHTIGE REGELN:
    1. Antworte IMMER auf Deutsch!
    2. Schreibe knapp und professionell im Ton eines echten Dispatcher-Briefings auf dem Klemmbrett.
    3. Baue echte geografische oder historische Fakten zur Region ein.
    ${isPOI ? 
    `4. RUNDFLUG-REGELN: Start/Landung ist ${startName}. Am POI (${destName}) wird NICHTS gelandet! 
    5. AUFGABE: Klassische Rundflug-Motive (Fotoflug, LiDAR). TRAININGS-FALLBACK: Übungsflug bei langweiligem POI.` 
    : `4. ROUTEN-REGELN: Normaler Streckenflug von ${startName} nach ${destName}. Typische GA-Aufgaben.`}

    Antworte AUSSCHLIESSLICH als JSON. Keine Markdown-Formatierung.
    Struktur: {"title": "Kurzer, knackiger Titel", "story": "Das Briefing (max 3-4 Sätze)"}`;

    const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const reqOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };

    // VERSUCH 1: Gemini 2.5 Flash (Primary)
    try {
        const resFlash = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, reqOptions);
        if (resFlash.ok) {
            const data = await resFlash.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('flash'); // Zähler für die Tankanzeige
            return { t: parsed.title, s: parsed.story, i: "📋", cat: "std", _source: "Gemini 2.5 Flash" };
        } else if (resFlash.status === 429) {
            console.warn("Flash API Quota erreicht (429). Wechsle zu Lite Modell...");
        } else {
            throw new Error('Flash API Fehler: ' + resFlash.status);
        }
    } catch (e) {
        console.warn("Gemini Flash fehlgeschlagen:", e);
    }

    // VERSUCH 2: Gemini 2.5 Flash Lite (Fallback)
    try {
        const resLite = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, reqOptions);
        if (resLite.ok) {
            const data = await resLite.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('lite'); // Zähler für die Tankanzeige
            return { t: parsed.title, s: parsed.story, i: "📋", cat: "std", _source: "Gemini 2.5 Flash Lite" };
        } else {
            console.warn("Lite API Fehler (Code: " + resLite.status + "). Wechsle zu lokaler Datenbank.");
            return null; // Gibt Null zurück -> Lokale Datenbank springt ein
        }
    } catch (e) {
        console.warn("Gemini Lite fehlgeschlagen:", e);
        return null; // Gibt Null zurück -> Lokale Datenbank springt ein
    }
}

/* =========================================================
   6. HAUPT-LOGIK & ZÄHLER
   ========================================================= */
function getQuotaDay() {
    const now = new Date();
    // Vor 09:00 Uhr zählt noch zum Vortag
    if (now.getHours() < 9) now.setDate(now.getDate() - 1);
    return now.toISOString().split('T')[0];
}

function getApiUsage() {
    const today = getQuotaDay();
    let data = JSON.parse(localStorage.getItem('ga_api_fuel'));
    
    // Wenn keine Daten da sind, ein neuer Tag ist, ODER das alte Format (ohne 'flash') noch im Speicher hängt: Reset!
    if (!data || data.date !== today || data.flash === undefined) { 
        data = { date: today, flash: 0, lite: 0 }; 
        localStorage.setItem('ga_api_fuel', JSON.stringify(data)); 
    }
    return data;
}

function incrementApiUsage(modelType) {
    const today = getQuotaDay();
    let data = getApiUsage();
    if (modelType === 'flash') data.flash++;
    else if (modelType === 'lite') data.lite++;
    localStorage.setItem('ga_api_fuel', JSON.stringify({ date: today, flash: data.flash, lite: data.lite }));
    updateApiFuelMeter();
}

function updateApiFuelMeter() {
    const needle = document.getElementById('apiNeedle');
    if(!needle) return;
    const data = getApiUsage();
    let used = data.flash + data.lite;
    const maxCalls = 40; // 20x Flash + 20x Flash Lite
    
    if(used > maxCalls) used = maxCalls;
    let percentage = used / maxCalls;
    
    // Nadel-Berechnung: +45° (Voll/F/Rechts) bis -45° (Leer/E/Links)
    let angle = 45 - (percentage * 90); 
    needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
}

async function generateMission() {
    const btn = document.getElementById('generateBtn'); 
    btn.disabled = true; btn.innerText = "Sucht Route & Daten...";
    document.getElementById("briefingBox").style.display = "none";
    
    const page1 = document.getElementById('notePage1'), page2 = document.getElementById('notePage2');
    if(page1 && page2) { page1.classList.replace('back-note', 'front-note'); page2.classList.replace('front-note', 'back-note'); }
    
    document.getElementById("mDepRwy").innerText = "Sucht Pisten-Infos..."; document.getElementById("mDepRwy").style.color = "#fff";
    document.getElementById("mDestRwy").innerText = "Sucht Pisten-Infos..."; document.getElementById("mDestRwy").style.color = "#fff";
    document.getElementById("wikiDescText").innerText = "Lade Region-Info...";

    const indicator = document.getElementById('searchIndicator');
    const needle = document.getElementById('meterNeedle');
    const led = document.getElementById('meterLed');
    if (led) led.classList.remove('led-green', 'led-blue', 'led-red');
    
    if (window.meterInterval) clearInterval(window.meterInterval);
    window.meterInterval = setInterval(() => {
        const randomAngle = Math.floor(Math.random() * 60) - 20; 
        if (needle) needle.style.transform = `translateX(-50%) rotate(${randomAngle}deg)`;
    }, 120);

    currentStartICAO = document.getElementById("startLoc").value.toUpperCase();
    const start = await getAirportData(currentStartICAO);
    if(!start) { 
        alert("Startplatz unbekannt!"); resetBtn(btn); 
        if(window.meterInterval) clearInterval(window.meterInterval);
        if (needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`; return; 
    }
    
    const rangePref = document.getElementById("distRange").value, regionPref = document.getElementById("regionFilter").value;
    const targetType = document.getElementById("targetType").value, dirPref = document.getElementById("dirPref").value;
    const maxSeats = parseInt(document.getElementById("maxSeats").value);
    const selectedTas = parseInt(document.getElementById("tasSlider").value) || 160;
    const selectedGph = parseInt(document.getElementById("gphSlider").value) || 14;
    
    let targetDest = document.getElementById("destLoc").value.toUpperCase();
    let dataSource = targetDest ? "Manuell" : "Generiert";
    
    let minNM, maxNM;
    if(rangePref === "any") {
        const roll = Math.random(); if (roll < 0.33) { minNM=10; maxNM=50; } else if (roll < 0.66) { minNM=50; maxNM=100; } else { minNM=100; maxNM=250; }
    } else {
        if(rangePref === "short") { minNM=10; maxNM=50; } if(rangePref === "medium") { minNM=50; maxNM=100; } if(rangePref === "long") { minNM=100; maxNM=250; }
    }

    let searchMin = targetType === "poi" ? minNM / 2 : minNM, searchMax = targetType === "poi" ? maxNM / 2 : maxNM, dest = null;
    
    if (targetDest) { dest = await getAirportData(targetDest); } else {
        if (targetType === "apt") { dest = await findGithubAirport(start.lat, start.lon, searchMin, searchMax, dirPref, regionPref); } 
        else if (targetType === "poi") { dest = await findWikipediaPOI(start.lat, start.lon, searchMin, searchMax, dirPref); }
    }
    
    if(!dest && !targetDest && typeof coreDB !== 'undefined') {
        if (targetType === "apt") {
            dataSource = "Core DB (Fallback)";
            let keys = Object.keys(coreDB).filter(k => k !== currentStartICAO);
            if(regionPref === "de") keys = keys.filter(k => k.startsWith('ED') || k.startsWith('ET'));
            if(regionPref === "int") keys = keys.filter(k => !k.startsWith('ED') && !k.startsWith('ET'));
            let dirFilteredKeys = keys.filter(k => checkBearing(calcNav(start.lat, start.lon, coreDB[k].lat, coreDB[k].lon).brng, dirPref));
            if(dirFilteredKeys.length > 0) keys = dirFilteredKeys;
            if(keys.length === 0) keys = Object.keys(coreDB).filter(k => k !== currentStartICAO); 
            dest = coreDB[keys[Math.floor(Math.random()*keys.length)]];
        } else if (targetType === "poi" && typeof fallbackPOIs !== 'undefined') {
            dataSource = "Fallback POIs";
            let validPOIs = fallbackPOIs.filter(p => checkBearing(calcNav(start.lat, start.lon, p.lat, p.lon).brng, dirPref));
            if(validPOIs.length === 0) validPOIs = fallbackPOIs; 
            dest = validPOIs[Math.floor(Math.random() * validPOIs.length)]; dest.icao = "POI";
        }
    }

    if(!dest) { 
        indicator.innerText = "Fehler: Kein passendes Ziel gefunden."; resetBtn(btn); 
        if(window.meterInterval) clearInterval(window.meterInterval);
        if (needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`; return; 
    }
    
    const isPOI = (targetType === 'poi' && !targetDest);
    const nav = calcNav(start.lat, start.lon, dest.lat, dest.lon);
    let totalDist = isPOI ? nav.dist * 2 : nav.dist;
    currentDestICAO = isPOI ? currentStartICAO : dest.icao;
    
    const maxPax = Math.max(1, maxSeats - 1), randomPax = Math.floor(Math.random() * maxPax) + 1;
    let paxText = `${randomPax} PAX`, cargoText = `${Math.floor(Math.random()*300)+20} lbs`;
    
    indicator.innerText = `Kontaktiere KI-Dispatcher...`;
    let m = await fetchGeminiMission(start.n, dest.n, totalDist, isPOI, paxText, cargoText);

    if (m) { dataSource = m._source; } else {
        indicator.innerText = `Lade Auftrag aus lokaler Datenbank...`;
        dataSource = "Lokale DB"; // Setze Fallback-Quelle explizit
        if (isPOI) {
            m = generateDynamicPOIMission(dest.n, maxSeats); paxText = m.payloadText; cargoText = m.cargoText; dataSource = "Wikipedia GeoSearch";
        } else if (typeof missions !== 'undefined') {
            const availM = missions.filter(ms => (nav.dist < 50 || ms.cat === "std"));
            m = availM[Math.floor(Math.random()*availM.length)] || missions[0];
            if(dataSource === "Generiert") dataSource = "GitHub Airport DB";
            if (m.cat === "trn" || m.cat === "cargo") { paxText = "0 PAX"; }
        }
    }
    
    const fuel = Math.ceil((totalDist / selectedTas * selectedGph) + (0.75 * selectedGph));
    const totalMinutes = Math.round((totalDist / selectedTas) * 60);
    const hrs = Math.floor(totalMinutes / 60), mins = totalMinutes % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} Min.`;

    currentMissionData = { start: currentStartICAO, dest: currentDestICAO, poiName: isPOI ? dest.n : null, mission: m.t, dist: totalDist, ac: selectedAC, heading: nav.brng };
    
    document.getElementById("mTitle").innerHTML = `${m.i ? m.i + ' ' : ''}${m.t}`;
    document.getElementById("mStory").innerText = m.s;
    document.getElementById("mDepICAO").innerText = currentStartICAO;
    document.getElementById("mDepName").innerText = start.n;
    document.getElementById("mDepCoords").innerText = `${start.lat.toFixed(4)}, ${start.lon.toFixed(4)}`;
    
    setDrumCounter('distDrum', totalDist);
    recalculatePerformance();

    document.getElementById("destIcon").innerText = isPOI ? "🎯" : "🛬";
    document.getElementById("mDestICAO").innerText = isPOI ? "POI" : currentDestICAO;
    document.getElementById("mDestName").innerText = dest.n;
    document.getElementById("mDestCoords").innerText = `${dest.lat.toFixed(4)}, ${dest.lon.toFixed(4)}`;
    
    document.getElementById("mPay").innerText = paxText; document.getElementById("mWeight").innerText = cargoText;
    document.getElementById("mDistNote").innerText = `${totalDist} NM`; 
    document.getElementById("mETENote").innerText = timeStr;
    const mHeadingNote = document.getElementById("mHeadingNote");
    if(mHeadingNote) mHeadingNote.innerText = `${nav.brng}°`;
    
    document.getElementById("destRwyContainer").style.display = isPOI ? "none" : "block";
    const destSwitchRow = document.getElementById("destSwitchRow"); if(destSwitchRow) destSwitchRow.style.display = isPOI ? "none" : "flex";

    document.getElementById("briefingBox").style.display = "block";
    
    updateMap(start.lat, start.lon, dest.lat, dest.lon, currentStartICAO, dest.n);

    indicator.innerText = `Flugplan bereit (${dataSource}). Lade Infos...`;
    fetchRunwayDetails(start.lat, start.lon, 'mDepRwy', currentStartICAO);
    
    setTimeout(() => {
        if (!isPOI) fetchRunwayDetails(dest.lat, dest.lon, 'mDestRwy', currentDestICAO);
        fetchAreaDescription(dest.lat, dest.lon, 'wikiDescText', isPOI ? dest.n : null);
        indicator.innerText = `Briefing komplett.`; resetBtn(btn);
        
        if(window.meterInterval) clearInterval(window.meterInterval);
        if(needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`; 
        
        if (led) { 
            led.classList.remove('led-green', 'led-blue', 'led-red');
            if (dataSource === "Gemini 2.5 Flash") { led.classList.add('led-blue'); } 
            else if (dataSource === "Gemini 2.5 Flash Lite") { led.classList.add('led-green'); } 
            else { led.classList.add('led-red'); } 
        }
        
        // AUTOMATISCH SPEICHERN
        setTimeout(() => saveMissionState(), 1000);
    }, 800); 
}

/* =========================================================
   7. KARTE (LEAFLET, KARTENTISCH & MESS-WERKZEUG)
   ========================================================= */
let measureMode = false, measurePoints = [], measurePolyline = null, measureMarkers = [], measureTooltip = null;
let routeWaypoints = [], routeMarkers = [], currentSName = "", currentDName = "";

const hitBoxHtml = (color) => `<div style="background-color: transparent; width: 34px; height: 34px; display:flex; justify-content:center; align-items:center;"><div style="background-color: ${color}; border: 2px solid #222; width: 14px; height: 14px; border-radius: 50%;"></div></div>`;
const hitBoxIcon = (color) => L.divIcon({ className: 'custom-pin', html: hitBoxHtml(color), iconSize: [34, 34], iconAnchor: [17, 17] });

const startIcon = hitBoxIcon('#44ff44'), destIcon  = hitBoxIcon('#ff4444');
const wpIcon    = L.divIcon({ className: 'custom-pin', html: `<div style="background-color: transparent; width: 34px; height: 34px; display:flex; justify-content:center; align-items:center; cursor: move;"><div style="background-color: #fdfd86; border: 2px solid #222; width: 14px; height: 14px; border-radius: 50%;"></div></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
const measureIcon = L.divIcon({ className: 'custom-pin', html: `<div style="background-color: transparent; width: 34px; height: 34px; display:flex; justify-content:center; align-items:center; cursor: move;"><div style="background-color: #fff; border: 2px solid #222; width: 12px; height: 12px; border-radius: 50%;"></div></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });

function toggleMeasureMode() {
    measureMode = !measureMode; const btn = document.getElementById('measureBtn');
    if (measureMode) {
        btn.innerText = '📏 Messen (An)'; btn.style.background = 'var(--piper-yellow)'; btn.style.color = '#000';
        document.getElementById('map').style.cursor = 'crosshair';
    } else {
        btn.innerText = '📏 Messen (Aus)'; btn.style.background = '#444'; btn.style.color = '#fff';
        document.getElementById('map').style.cursor = '';
    }
}

function addMeasurePoint(latlng) {
    if (measureMarkers.length >= 2) { clearMeasure(); }
    const marker = L.marker(latlng, {icon: measureIcon, draggable: true}).addTo(map);
    marker.on('drag', updateMeasureRoute); marker.on('dragend', updateMeasureRoute);
    measureMarkers.push(marker); updateMeasureRoute();
}

function updateMeasureRoute() {
    if(measurePolyline) map.removeLayer(measurePolyline);
    if(measureTooltip) { map.removeLayer(measureTooltip); measureTooltip = null; }
    measurePoints = measureMarkers.map(m => m.getLatLng());
    
    if(measurePoints.length === 2) {
        measurePolyline = L.polyline(measurePoints, {color: '#f2c12e', weight: 4, dashArray: '6,6'}).addTo(map);
        const nav = calcNav(measurePoints[0].lat, measurePoints[0].lng, measurePoints[1].lat, measurePoints[1].lng);
        const centerLat = (measurePoints[0].lat + measurePoints[1].lat) / 2, centerLng = (measurePoints[0].lng + measurePoints[1].lng) / 2;
        const labelText = `<div style="font-weight:bold; font-size:14px; color:#111; text-align:center; line-height: 1.2;">${nav.brng}°<br>${nav.dist} NM</div>`;
        measureTooltip = L.tooltip({ permanent: true, direction: 'center', className: 'measure-label' }).setLatLng([centerLat, centerLng]).setContent(labelText).addTo(map);
    }
}

function clearMeasure() {
    if(measurePolyline) map.removeLayer(measurePolyline);
    if(measureTooltip) { map.removeLayer(measureTooltip); measureTooltip = null; }
    measureMarkers.forEach(m => map.removeLayer(m)); measurePoints = []; measureMarkers = [];
}

window.removeRouteWaypoint = function(index) { routeWaypoints.splice(index, 1); renderMainRoute(); };

function resetMainRoute() {
    if(routeWaypoints.length > 2) {
        routeWaypoints = [routeWaypoints[0], routeWaypoints[routeWaypoints.length - 1]];
        renderMainRoute(); map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] });
    }
}

function renderMainRoute() {
    if (!map) initMapBase();
    routeMarkers.forEach(m => map.removeLayer(m)); if (polyline) map.removeLayer(polyline); if (window.hitBoxPolyline) map.removeLayer(window.hitBoxPolyline); routeMarkers = [];
    if(routeWaypoints.length === 0) return;

    polyline = L.polyline(routeWaypoints, { color: '#ff4444', weight: 8, dashArray: '10,10', interactive: false }).addTo(map);
    window.hitBoxPolyline = L.polyline(routeWaypoints, { color: 'transparent', weight: 45, opacity: 0, className: 'interactive-route' }).addTo(map);
    
    window.hitBoxPolyline.on('click', function(e) {
        let bestIndex = 1, minDiff = Infinity;
        for (let i = 0; i < routeWaypoints.length - 1; i++) {
            let p1 = L.latLng(routeWaypoints[i].lat, routeWaypoints[i].lng || routeWaypoints[i].lon), p2 = L.latLng(routeWaypoints[i+1].lat, routeWaypoints[i+1].lng || routeWaypoints[i+1].lon);
            let d1 = map.distance(p1, e.latlng), d2 = map.distance(e.latlng, p2), d = map.distance(p1, p2), diff = d1 + d2 - d;
            if (diff < minDiff) { minDiff = diff; bestIndex = i + 1; }
        }
        routeWaypoints.splice(bestIndex, 0, e.latlng); renderMainRoute(); 
    });

    routeWaypoints.forEach((latlng, index) => {
        let isStart = (index === 0), isDest = (index === routeWaypoints.length - 1 && routeWaypoints.length > 1);
        let icon = isStart ? startIcon : (isDest ? destIcon : wpIcon);
        let draggable = (!isStart && !isDest); 
        let marker = L.marker(latlng, {icon: icon, draggable: draggable}).addTo(map);

        if (isStart) marker.bindPopup(`<b>DEP:</b> ${currentSName}`);
        else if (isDest) marker.bindPopup(`<b>DEST:</b> ${currentDName}`);
        else marker.bindPopup(`<div style="text-align:center;"><b>Wegpunkt</b><br><button onclick="removeRouteWaypoint(${index})" style="margin-top:5px; background:#d93829; color:#fff; border:none; padding:4px 8px; cursor:pointer; border-radius: 2px;">🗑️ Löschen</button></div>`);

        if(draggable) marker.on('dragend', function(e) { routeWaypoints[index] = e.target.getLatLng(); renderMainRoute(); });
        routeMarkers.push(marker);
    });
    
    updateRoutePerformance(); updateMiniMap(); 
}

function updateRoutePerformance() {
    if(routeWaypoints.length < 2 || !currentMissionData) return;
    let totalNM = 0, wpHTML = '';
    
    for(let i=0; i<routeWaypoints.length - 1; i++) {
        let p1 = routeWaypoints[i], p2 = routeWaypoints[i+1], nav = calcNav(p1.lat, p1.lng || p1.lon, p2.lat, p2.lng || p2.lon);
        totalNM += nav.dist;
        let name1 = (i === 0) ? currentSName : `WP ${i}`, name2 = (i === routeWaypoints.length - 2) ? currentDName : `WP ${i+1}`;
        wpHTML += `<div class="wp-row"><span class="wp-name">${name1} ➔ ${name2}</span><span class="wp-data">${nav.brng}° | ${nav.dist} NM</span></div>`;
    }
    
    let initialNav = calcNav(routeWaypoints[0].lat, routeWaypoints[0].lng || routeWaypoints[0].lon, routeWaypoints[1].lat, routeWaypoints[1].lng || routeWaypoints[1].lon);
    currentMissionData.dist = totalNM; currentMissionData.heading = initialNav.brng;

    setDrumCounter('distDrum', totalNM);
    const mHeadingNote = document.getElementById("mHeadingNote"); if(mHeadingNote) mHeadingNote.innerText = `${initialNav.brng}°`;
    const wpListContainer = document.getElementById("waypointList"); if(wpListContainer) wpListContainer.innerHTML = wpHTML;
    
    recalculatePerformance();
    const mDistNote = document.getElementById("mDistNote"); if(mDistNote) mDistNote.innerText = `${totalNM} NM`;
    const tas = parseInt(document.getElementById("tasSlider").value) || 160, totalMinutes = Math.round((totalNM / tas) * 60);
    const hrs = Math.floor(totalMinutes / 60), mins = totalMinutes % 60;
    const mETENote = document.getElementById("mETENote"); if(mETENote) mETENote.innerText = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} Min.`;

    setTimeout(() => saveMissionState(), 500);
}

function initMapBase() {
    if(map) return;
    const aeroMap = L.tileLayer('https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest', { attribution: 'AeroData / Navigraph' });
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'CartoDB' });
    const topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'OpenTopoMap' });
    const satMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' });

    map = L.map('map', { layers: [aeroMap], attributionControl: false }).setView([51.1657, 10.4515], 6);
    const baseMaps = { "🛩️ VFR Lufträume (Aero)": aeroMap, "⛰️ Topografie (VFR)": topoMap, "🌑 Dark Mode (Clean)": darkMap, "🛰️ Satellit (Esri)": satMap };
    L.control.layers(baseMaps).addTo(map);
    
    const fsControl = L.control({position: 'topleft'});
    fsControl.onAdd = function() {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
        btn.innerHTML = '⛶'; btn.title = 'Vollbildmodus'; btn.style.width = '30px'; btn.style.height = '30px';
        btn.style.lineHeight = '30px'; btn.style.backgroundColor = '#fff'; btn.style.border = '1px solid #ccc';
        btn.style.cursor = 'pointer'; btn.style.fontSize = '18px'; btn.style.fontWeight = 'bold'; btn.style.textAlign = 'center'; btn.style.padding = '0';
        
        btn.onclick = function(e){
            e.preventDefault(); document.body.classList.toggle('map-is-fullscreen');
            if (document.body.classList.contains('map-is-fullscreen')) { btn.innerHTML = '✖'; } else { btn.innerHTML = '⛶'; }
            setTimeout(() => { if(map) map.invalidateSize(); updateMiniMap(); }, 300);
        };
        return btn;
    };
    fsControl.addTo(map);
    map.on('click', function(e) { if (!measureMode) return; addMeasurePoint(e.latlng); });
}

function updateMap(lat1, lon1, lat2, lon2, s, d) {
    if (!map) initMapBase();
    currentSName = s || "Start"; currentDName = d || "Ziel";
    routeWaypoints = [{lat: lat1, lng: lon1}, {lat: lat2, lng: lon2}];
    renderMainRoute();
}

async function updateMapFromInputs() {
    if(!document.getElementById('mapTableOverlay').classList.contains('active')) return;
    const sIcao = document.getElementById('startLoc').value.toUpperCase(), dIcao = document.getElementById('destLoc').value.toUpperCase();
    if(!sIcao) return;
    if(!map) initMapBase();
    let sData = await getAirportData(sIcao), dData = dIcao ? await getAirportData(dIcao) : null;
    if(sData && dData) {
        currentSName = sData.icao; currentDName = dData.icao;
        routeWaypoints = [{lat: sData.lat, lng: sData.lon}, {lat: dData.lat, lng: dData.lon}];
        renderMainRoute(); map.fitBounds(L.latLngBounds([sData.lat, sData.lon], [dData.lat, dData.lon]), { padding: [40, 40] });
    } else if (sData) {
        currentSName = sData.icao; routeWaypoints = [{lat: sData.lat, lng: sData.lon}];
        renderMainRoute(); map.panTo([sData.lat, sData.lon]); if(map.getZoom() < 8) map.setZoom(9);
    }
}

function toggleMapTable() {
    const board = document.getElementById('mapTableOverlay'), pinBoard = document.getElementById('pinboardOverlay');
    if (pinBoard.classList.contains('active')) { togglePinboard(); }
    board.classList.toggle('active'); document.body.classList.toggle('maptable-open');
    if (board.classList.contains('active')) {
        if(!map) initMapBase();
        setTimeout(() => { 
            if(map) {
                map.invalidateSize();
                if(routeWaypoints && routeWaypoints.length >= 2) map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] });
                else updateMapFromInputs();
            }
        }, 500); 
    } else { document.body.classList.remove('map-is-fullscreen'); }
}

/* =========================================================
   8. POLAROID MINIMAP
   ========================================================= */
let miniMap, miniRoutePolyline, miniMapMarkers = [];

function updateMiniMap() {
    const miniContainer = document.getElementById('miniMap');
    if (!miniContainer || miniContainer.offsetParent === null) return; 
    
    if (!miniMap) {
        miniMap = L.map('miniMap', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: false });
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png').addTo(miniMap);
    }
    
    if (routeWaypoints && routeWaypoints.length > 0) {
        if (miniRoutePolyline) miniMap.removeLayer(miniRoutePolyline);
        miniRoutePolyline = L.polyline(routeWaypoints, { color: '#d93829', weight: 4 }).addTo(miniMap);
        miniMapMarkers.forEach(m => miniMap.removeLayer(m)); miniMapMarkers = [];

        const startMarker = L.circleMarker(routeWaypoints[0], { radius: 5, color: '#111', weight: 2, fillColor: '#44ff44', fillOpacity: 1 }).addTo(miniMap);
        const destMarker = L.circleMarker(routeWaypoints[routeWaypoints.length - 1], { radius: 5, color: '#111', weight: 2, fillColor: '#ff4444', fillOpacity: 1 }).addTo(miniMap);
        
        miniMapMarkers.push(startMarker, destMarker);
        setTimeout(() => { miniMap.invalidateSize(); miniMap.fitBounds(L.latLngBounds(routeWaypoints), { padding: [15, 15] }); }, 150);
    }
}

/* =========================================================
   9. EXTERNE LINKS & LOGBUCH
   ========================================================= */
function openAIP(t) { window.open(`https://aip.aero/de/vfr/?${t==='dep'?currentStartICAO:currentDestICAO}`, '_blank'); }
function openMetar(t) { window.open(`https://metar-taf.com/de/${t==='dep'?currentStartICAO:currentDestICAO}`, '_blank'); }

function logCurrentFlight() {
    if(!currentMissionData) return;
    const log = JSON.parse(localStorage.getItem('ga_logbook')) || [];
    log.unshift({ ...currentMissionData, date: new Date().toLocaleString('de-DE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) });
    localStorage.setItem('ga_logbook', JSON.stringify(log.slice(0, 50)));
    localStorage.setItem('last_icao_dest', currentMissionData.dest);
    document.getElementById('startLoc').value = currentMissionData.dest; document.getElementById('destLoc').value = "";
    renderLog(); alert(`Flug geloggt! Du bist in ${currentMissionData.dest}.`);
}

function renderLog() {
    const log = JSON.parse(localStorage.getItem('ga_logbook')) || [];
    const container = document.getElementById('logContent');
    container.innerHTML = log.length ? '' : '<div style="color:#888; font-size:11px;">Keine Einträge vorhanden.</div>';
    const isRetro = document.body.classList.contains('theme-retro');
    log.forEach(e => {
        const div = document.createElement('div'); div.className = 'log-entry';
        const routeStr = e.poiName ? `<b>${e.start} ➔ ${e.poiName} ➔ ${e.dest}</b>` : `<b>${e.start} ➔ ${e.dest}</b>`;
        const hlColor = isRetro ? 'var(--piper-yellow)' : 'var(--blue)', subColor = isRetro ? '#aaa' : '#888';
        div.innerHTML = `<span style="color:${subColor};">${e.date} • ${e.ac}</span><br>${routeStr}<br><span style="color:${hlColor}">${e.mission} (${e.dist} NM)</span>`;
        container.appendChild(div);
    });
}
function clearLog() { if(confirm("Gesamtes Logbuch löschen?")) { localStorage.removeItem('ga_logbook'); localStorage.removeItem('last_icao_dest'); renderLog(); } }

/* =========================================================
   10. HANGAR PINNWAND (LOKAL)
   ========================================================= */
function togglePinboard() {
    const board = document.getElementById('pinboardOverlay');
    const mapBoard = document.getElementById('mapTableOverlay');
    if (mapBoard.classList.contains('active')) { toggleMapTable(); } 
    
    board.classList.toggle('active');
    document.body.classList.toggle('pinboard-open'); 
    
    if(board.classList.contains('active')) { renderNotes(); }
}

function addNote() {
    const text = prompt("Was möchtest du ans schwarze Brett pinnen?");
    if(!text || text.trim() === "") return;
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    const rot = Math.floor(Math.random() * 9) - 4;
    notes.push({ id: Date.now(), text: text, x: 300, y: 200, rot: rot });
    localStorage.setItem('ga_pinboard', JSON.stringify(notes));
    renderNotes();
}

function deleteNote(id) {
    if(!confirm("Zettel wirklich abreißen?")) return;
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('ga_pinboard', JSON.stringify(notes));
    renderNotes();
}

function editNote(id) {
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    const noteIndex = notes.findIndex(n => n.id === id);
    if(noteIndex > -1) {
        const newText = prompt("Notiz bearbeiten:", notes[noteIndex].text);
        if(newText !== null && newText.trim() !== "") {
            notes[noteIndex].text = newText;
            localStorage.setItem('ga_pinboard', JSON.stringify(notes));
            renderNotes();
        }
    }
}

function renderNotes() {
    const board = document.getElementById('pinboard');
    if (!board) return;
    board.innerHTML = ''; 
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    notes.forEach(note => {
        const div = document.createElement('div'); div.className = 'post-it';
        div.style.left = note.x + 'px'; div.style.top = note.y + 'px'; div.style.transform = `rotate(${note.rot}deg)`;
        div.innerHTML = `<div class="post-it-pin"></div><div class="post-it-edit" onclick="editNote(${note.id})">✏️</div><div class="post-it-del" onclick="deleteNote(${note.id})">✖</div>${note.text.replace(/\n/g, '<br>')}`;
        makeDraggable(div, note.id); board.appendChild(div);
    });
}

function makeDraggable(element, noteId) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown; element.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        if(e.target.className === 'post-it-del' || e.target.className === 'post-it-edit') return; 
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX, clientY = e.touches ? e.touches[0].clientY : e.clientY;
        pos3 = clientX; pos4 = clientY;
        document.onmouseup = closeDragElement; document.ontouchend = closeDragElement;
        document.onmousemove = elementDrag; document.ontouchmove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault(); 
        const clientX = e.touches ? e.touches[0].clientX : e.clientX, clientY = e.touches ? e.touches[0].clientY : e.clientY;
        pos1 = pos3 - clientX; pos2 = pos4 - clientY; pos3 = clientX; pos4 = clientY;
        
        let newTop = element.offsetTop - pos2, newLeft = element.offsetLeft - pos1;
        const board = document.getElementById('pinboard'), padding = 15; 
        const minLeft = padding, maxLeft = board.offsetWidth - element.offsetWidth - padding;
        const minTop = padding, maxTop = board.offsetHeight - element.offsetHeight - padding;
        
        if (newLeft < minLeft) newLeft = minLeft; if (newLeft > maxLeft) newLeft = maxLeft;
        if (newTop < minTop) newTop = minTop; if (newTop > maxTop) newTop = maxTop;
        
        element.style.top = newTop + "px"; element.style.left = newLeft + "px";
    }

    function closeDragElement() {
        document.onmouseup = null; document.ontouchend = null; document.onmousemove = null; document.ontouchmove = null;
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        const noteIndex = notes.findIndex(n => n.id === noteId);
        if(noteIndex > -1) { notes[noteIndex].x = element.offsetLeft; notes[noteIndex].y = element.offsetTop; localStorage.setItem('ga_pinboard', JSON.stringify(notes)); }
    }
}