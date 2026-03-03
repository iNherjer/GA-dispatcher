/* =========================================================
   1. THEME TOGGLE & NOTIZEN TOGGLE
   ========================================================= */
function changeThemeFromSlider(val) {
    const v = parseInt(val);
    if (v === 0) setTheme('classic');
    else if (v === 1) setTheme('retro');
    else if (v === 2) setTheme('navcom');
}

function setTheme(mode) {
    const wasNavcom = document.body.classList.contains('theme-navcom');
    document.body.classList.remove('theme-retro', 'theme-navcom');
    const lblClassic = document.getElementById('lbl-classic');
    const lblRetro = document.getElementById('lbl-retro');
    const lblNavcom = document.getElementById('lbl-navcom');
    const slider = document.getElementById('themeSlider');

    if(lblClassic) lblClassic.style.color = '#888';
    if(lblRetro) lblRetro.style.color = '#888';
    if(lblNavcom) lblNavcom.style.color = '#888';

    if (mode === 'retro') {
        document.body.classList.add('theme-retro');
        localStorage.setItem('ga_theme', 'retro');
        if(slider) slider.value = 1;
        if(lblRetro) lblRetro.style.color = '#d93829';
    } else if (mode === 'navcom') {
        document.body.classList.add('theme-navcom', 'theme-retro');
        localStorage.setItem('ga_theme', 'navcom');
        if(slider) slider.value = 2;
        if(lblNavcom) lblNavcom.style.color = '#33ff33';
    } else {
        localStorage.setItem('ga_theme', 'classic');
        if(slider) slider.value = 0;
        if(lblClassic) lblClassic.style.color = '#4da6ff';
    }
    updateDynamicColors();
    refreshAllDrums();
    syncGPSWithTheme(mode, wasNavcom);
}

// GPS-Sichtbarkeit mit dem gewählten Design synchronisieren
function syncGPSWithTheme(newMode, wasNavcom) {
    const fp  = document.querySelector('.flightplan-container');
    const mod = document.getElementById('kln90bModule');
    if (newMode === 'navcom') {
        // NavCom aktiv: GPS-Status wiederherstellen
        if (gpsState.visible) {
            if (mod) mod.style.display = 'flex';
            if (fp)  fp.style.display  = 'none';
            renderGPS();
        } else {
            if (mod) mod.style.display = 'none';
            if (fp)  fp.style.display  = '';
        }
    } else {
        // Anderes Design: GPS immer ausblenden, Flugplan immer zeigen
        if (mod) mod.style.display = 'none';
        if (fp)  fp.style.display  = '';
    }
}

function syncToNavCom(radioId, value) {
    const el = document.getElementById(radioId);
    if (!el) return;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        el.value = value;
    } else {
        el.innerText = value; // Für die neuen DIV Displays (TAS/GPH)
    }
}

// NEU: Audio Panel Preset Klick-Logik
function applyNavComPreset(t, g, s, n, btnElement) {
    applyPreset(t, g, s, n); // Nutzt deine bestehende Funktion

    // LEDs umschalten (Nur die ersten 3 Buttons sind Flugzeuge)
    document.getElementById('btnAC-C172').classList.remove('active');
    document.getElementById('btnAC-PA24').classList.remove('active');
    document.getElementById('btnAC-AERO').classList.remove('active');
    btnElement.classList.add('active');

    // Werte für GPH und TAS anpassen
    document.getElementById('tasSlider').value = t;
    document.getElementById('gphSlider').value = g;
    handleSliderChange('tas', t);
    handleSliderChange('gph', g);

    // Aktualisiere die NavCom-Anzeigen
    syncToNavCom('tasRadioDisplay', t);
    syncToNavCom('gphRadioDisplay', g);
    saveAudioButtonStates();
}

// NEU: Audio Panel AI Klick-Logik
function toggleNavComAI(btnElement) {
    const aiToggleBtn = document.getElementById('aiToggle');
    if(aiToggleBtn) {
        aiToggleBtn.checked = !aiToggleBtn.checked;
        saveAiToggle();
        if(aiToggleBtn.checked) btnElement.classList.add('active');
        else btnElement.classList.remove('active');
        saveAudioButtonStates();
    }
}

// NEU: Lässt die Encoder-Knöpfe rotieren und löst den Sync aus!
// Transfer-Button: DEP ↔ DEST tauschen (Rückflug-Funktion)
function swapDepDest() {
    const depRadio  = document.getElementById('startLocRadio');
    const destRadio = document.getElementById('destLocRadio');
    const depClassic  = document.getElementById('startLoc');
    const destClassic = document.getElementById('destLoc');
    if (!depRadio || !destRadio) return;

    // Wenn Ziel leer: Start = Ziel (gleicher Platz), auf POI umschalten
    if (!destRadio.value || !destRadio.value.trim()) {
        destRadio.value = depRadio.value;
        if (destClassic) destClassic.value = depRadio.value;
        // Zieltyp auf POI umschalten
        const targetTypeSel = document.getElementById('targetType');
        if (targetTypeSel) {
            targetTypeSel.value = 'poi';
            targetTypeSel.dispatchEvent(new Event('change'));
        }
        updateMapFromInputs();
        return;
    }

    const tempVal = depRadio.value;
    depRadio.value  = destRadio.value;
    destRadio.value = tempVal;

    // Classic-Inputs synchron halten
    if (depClassic)  depClassic.value  = depRadio.value;
    if (destClassic) destClassic.value = destRadio.value;

    updateMapFromInputs();
}

function cycleRadioOption(selectId) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;
    
    // Nächste Option auswählen
    let nextIndex = selectEl.selectedIndex + 1;
    if (nextIndex >= selectEl.options.length) nextIndex = 0; // Wrap around
    selectEl.selectedIndex = nextIndex;
    
    // Wir werfen manuell ein 'change' Event, damit die originalen Formulare aktualisiert werden
    selectEl.dispatchEvent(new Event('change'));
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
    const isNavcom = document.body.classList.contains('theme-navcom');
    const isRetro = document.body.classList.contains('theme-retro') && !isNavcom;
    
    const primColor = isNavcom ? '#33ff33' : (isRetro ? 'var(--piper-white)' : 'var(--blue)');
    const titleColor = isNavcom ? '#33ff33' : (isRetro ? 'var(--piper-white)' : 'var(--blue)');
    const hlColor = isNavcom ? '#33ff33' : (isRetro ? 'var(--piper-yellow)' : 'var(--green)');
    
    const mainTitle = document.getElementById('mainTitle');
    if (mainTitle) mainTitle.style.color = isRetro || isNavcom ? '' : titleColor;
    document.querySelectorAll('.theme-color-text').forEach(el => el.style.color = isRetro || isNavcom ? '' : primColor);
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

// Fetch mit Timeout-Schutz
async function fetchWithTimeout(url, ms = 6000) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), ms);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        return res;
    } catch(e) { clearTimeout(tid); throw e; }
}

let measureMode = false, measurePoints = [], measurePolyline = null, measureMarkers = [], measureTooltip = null;
let routeWaypoints = [], routeMarkers = [], currentSName = "", currentDName = "";
let miniMap, miniRoutePolyline, miniMapMarkers = [];

/* =========================================================
   DRAG-KNOB LOGIK (TAS & GPH durch Ziehen ändern)
   ========================================================= */
function initDragKnob(knobId, displayId, sliderId, min, max, type) {
    const knob = document.getElementById(knobId);
    const display = document.getElementById(displayId);
    const slider = document.getElementById(sliderId);
    if(!knob || !display || !slider) return;

    let isDragging = false;
    let startY = 0, startX = 0;
    let startVal = 0;
    let currentRotation = 0;

    function onStart(e) {
        isDragging = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        startVal = parseInt(slider.value) || min;
        document.body.style.cursor = 'ns-resize'; // Mauszeiger fixieren
        e.preventDefault();
    }

    function onMove(e) {
        if (!isDragging) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        
        // Berechnung: Ziehen nach oben/rechts erhöht, unten/links verringert
        // Faktor: ca. 1 Pixel = 1 Einheit (TAS) oder 0.2 Einheiten (GPH)
        let delta = Math.round((startY - clientY) + (clientX - startX));
        if (type === 'gph') delta = Math.round(delta * 0.3); // GPH ändert sich langsamer
        
        let newVal = startVal + delta;
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        // Display updaten
        display.innerText = newVal;
        slider.value = newVal;
        
        // Knopf drehen (1 Einheit = 5 Grad Rotation)
        currentRotation = delta * 5; 
        knob.style.transform = `rotate(${currentRotation}deg)`;

        // Live die restlichen System-Zähler updaten
        handleSliderChange(type, newVal);
        // GPS FPL-Seite live aktualisieren (Fuel/Zeit-Berechnung)
        if (gpsState.visible && gpsState.mode === 'FPL') {
            refreshGPSAfterDispatch();
        }
    }

    function onEnd() {
        isDragging = false;
        document.body.style.cursor = 'default';
        // Knopf federt optisch wieder zurück in Ausgangsstellung (Optional, aber cool)
        knob.style.transition = 'transform 0.3s ease';
        knob.style.transform = `rotate(0deg)`;
        setTimeout(() => knob.style.transition = '', 300);
    }

    knob.addEventListener('mousedown', onStart);
    knob.addEventListener('touchstart', onStart, {passive: false});
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
}

window.onload = () => {
    const savedTheme = localStorage.getItem('ga_theme') || 'retro'; 
    setTheme(savedTheme);
    applySavedPanelTheme(); 

    const lastDest = localStorage.getItem('last_icao_dest');
    if (lastDest) document.getElementById('startLoc').value = lastDest;
    
    const savedKey = localStorage.getItem('ga_gemini_key');
    if (savedKey) document.getElementById('apiKeyInput').value = savedKey;

    const aiEnabled = localStorage.getItem('ga_ai_enabled');
    const aiToggleBtn = document.getElementById('aiToggle');
    if(aiToggleBtn) { aiToggleBtn.checked = (aiEnabled !== 'false'); }

    renderLog();
    updateApiFuelMeter(); 

    // INITIALISIERUNG: Pinnwand Tutorial für neue Nutzer
    if (!localStorage.getItem('ga_pinboard_init')) {
        localStorage.setItem('ga_pinboard', JSON.stringify(tutorialNotes));
        localStorage.setItem('ga_pinboard_init', 'true');
    }

    const activeMission = localStorage.getItem('ga_active_mission');
    if (activeMission) {
        setTimeout(() => restoreMissionState(JSON.parse(activeMission)), 300);
    }

    requestAnimationFrame(() => {
        setTimeout(() => { refreshAllDrums(); }, 50);
    });

    // Sync beim Start, damit das NavCom die korrekten Standardwerte zeigt
    syncToNavCom('startLocRadio', document.getElementById('startLoc').value);
    syncToNavCom('tasRadioDisplay', document.getElementById('tasSlider').value);
    syncToNavCom('gphRadioDisplay', document.getElementById('gphSlider').value);
    syncToNavCom('maxSeatsRadio', document.getElementById('maxSeats').value);

    // Initialisiere die Drag-Knobs für das Audio Panel
    initDragKnob('tasDragKnob', 'tasRadioDisplay', 'tasSlider', 80, 260, 'tas');
    initDragKnob('gphDragKnob', 'gphRadioDisplay', 'gphSlider', 5, 35, 'gph');
    
    // Setze die Audio-LED für KI entsprechend des Schalters
    if(aiToggleBtn && aiToggleBtn.checked) {
        const btnAI = document.getElementById('btnToggleAI');
        if(btnAI) btnAI.classList.add('active');
    }
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
        mDepRwy: '',   // Runway-Daten werden bei Restore neu geladen, nicht gecacht
        destIcon: document.getElementById("destIcon").innerText,
        mDestICAO: document.getElementById("mDestICAO").innerText,
        mDestName: document.getElementById("mDestName").innerText,
        mDestCoords: document.getElementById("mDestCoords").innerText,
        mDestRwy: '',  // Runway-Daten werden bei Restore neu geladen, nicht gecacht
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

async function restoreMissionState(state) {
    document.getElementById('mTitle').innerHTML = state.mTitle; document.getElementById('mStory').innerText = state.mStory;
    document.getElementById("mDepICAO").innerText = state.mDepICAO; document.getElementById("mDepName").innerText = state.mDepName;
    document.getElementById("mDepCoords").innerText = state.mDepCoords; document.getElementById("mDepRwy").innerText = "Sucht Pisten...";
    document.getElementById("destIcon").innerText = state.destIcon; document.getElementById("mDestICAO").innerText = state.mDestICAO;
    document.getElementById("mDestName").innerText = state.mDestName; document.getElementById("mDestCoords").innerText = state.mDestCoords;
    document.getElementById("mDestRwy").innerText = state.isPOI ? "" : "Sucht Pisten..."; document.getElementById("mPay").innerText = state.mPay;
    document.getElementById("mWeight").innerText = state.mWeight; document.getElementById("mDistNote").innerText = state.mDistNote;
    document.getElementById("mHeadingNote").innerText = state.mHeadingNote; document.getElementById("mETENote").innerText = state.mETENote;
    document.getElementById("wikiDescText").innerText = state.wikiDescText;
    document.getElementById("destRwyContainer").style.display = state.isPOI ? "none" : "block";
    const destSwitchRow = document.getElementById("destSwitchRow"); if(destSwitchRow) destSwitchRow.style.display = state.isPOI ? "none" : "flex";

    currentMissionData = state.currentMissionData; routeWaypoints = state.routeWaypoints;
    currentStartICAO = state.currentStartICAO; currentDestICAO = state.currentDestICAO;
    currentSName = state.currentSName; currentDName = state.currentDName;

    // Formular-Inputs synchronisieren (Classic + NavCom Radio)
    const startLocEl = document.getElementById('startLoc');
    const destLocEl  = document.getElementById('destLoc');
    const startLocRadioEl = document.getElementById('startLocRadio');
    const destLocRadioEl  = document.getElementById('destLocRadio');
    if (startLocEl) startLocEl.value = currentStartICAO || '';
    if (destLocEl)  destLocEl.value  = (currentDestICAO && currentDestICAO !== currentStartICAO) ? currentDestICAO : '';
    if (startLocRadioEl) startLocRadioEl.value = currentStartICAO || '';
    if (destLocRadioEl)  destLocRadioEl.value  = (currentDestICAO && currentDestICAO !== currentStartICAO) ? currentDestICAO : '';

    document.getElementById("briefingBox").style.display = "block";
    renderMainRoute(); setDrumCounter('distDrum', state.currentMissionData.dist);
    recalculatePerformance(); document.getElementById('searchIndicator').innerText = "📋 Gespeichertes Briefing geladen.";
    // GPS-State für den geladenen Flug zurücksetzen
    gpsState.mode = 'FPL';
    gpsState.subPage = 0;
    gpsState.maxPages = { FPL: 1, DEP: 2, DEST: 2, AIP: 2, WX: 2 };
    gpsState.wikiCache = {};
    gpsState.metarCache = {};
    runwayCache = {};
    document.querySelectorAll('.kln90b-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'FPL'));
    // GPS nach Mission-Restore aktualisieren
    setTimeout(() => refreshGPSAfterDispatch(), 200);
    // Pistendaten frisch laden (nicht aus altem localStorage-Cache)
    if (currentStartICAO) {
        getAirportData(currentStartICAO).then(d => {
            if (d) fetchRunwayDetails(d.lat, d.lon, 'mDepRwy', currentStartICAO);
        });
    }
    if (currentDestICAO && currentDestICAO !== currentStartICAO && !state.isPOI) {
        getAirportData(currentDestICAO).then(d => {
            if (d) fetchRunwayDetails(d.lat, d.lon, 'mDestRwy', currentDestICAO);
        });
    }
}

function resetApp() {
    if(!confirm("Möchtest du das aktuelle Briefing wirklich verwerfen und alles auf Anfang setzen?")) return;
    localStorage.removeItem('ga_active_mission'); document.getElementById("briefingBox").style.display = "none";
    currentMissionData = null; routeWaypoints = [];
    if(map) { routeMarkers.forEach(m => map.removeLayer(m)); if (polyline) map.removeLayer(polyline); if (window.hitBoxPolyline) map.removeLayer(window.hitBoxPolyline); }
    if (miniMap) { if (miniRoutePolyline) miniMap.removeLayer(miniRoutePolyline); miniMapMarkers.forEach(m => miniMap.removeLayer(m)); miniMapMarkers = []; }
    // Zielfeld leeren (Classic + NavCom Radio)
    const destLocEl      = document.getElementById('destLoc');
    const destLocRadioEl = document.getElementById('destLocRadio');
    if (destLocEl)      destLocEl.value      = '';
    if (destLocRadioEl) destLocRadioEl.value = '';

    document.getElementById('searchIndicator').innerText = "System bereit."; setDrumCounter('distDrum', 0); recalculatePerformance();
    const rBtn = document.getElementById('radioGenerateBtn');
    if(rBtn) rBtn.classList.remove('active');
    // GPS-State und alle Caches zurücksetzen
    gpsState.wikiCache = {};
    gpsState.metarCache = {};
    runwayCache = {}; // Pisten-Cache leeren, damit Wikipedia neu abgefragt wird
    gpsState.mode = 'FPL';
    gpsState.subPage = 0;
    gpsState.maxPages = { FPL: 1, DEP: 2, DEST: 2, AIP: 2, WX: 2 };
    document.querySelectorAll('.kln90b-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'FPL'));
    renderGPS();
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

function handleSliderChange(type, val) { 
    setDrumCounter(type + 'Drum', val); 
    recalculatePerformance(); 
    syncToNavCom(type + 'Radio', val);
}

function recalculatePerformance() {
    if (!currentMissionData) return;
    const tas = parseInt(document.getElementById("tasSlider").value), gph = parseInt(document.getElementById("gphSlider").value), dist = currentMissionData.dist;
    setDrumCounter('timeDrum', Math.round((dist / tas) * 60)); setDrumCounter('fuelDrum', Math.ceil((dist / tas * gph) + (0.75 * gph)));
    // GPS FPL live aktualisieren (zeigt Fuel/Zeit/Distanz)
    if (gpsState.visible && gpsState.mode === 'FPL') renderGPS();
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
    syncToNavCom('tasRadio', t);
    syncToNavCom('gphRadio', g);
    syncToNavCom('maxSeatsRadio', s);
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

function resetBtn(btn) {
    if(btn) { btn.disabled = false; btn.innerText = "Auftrag generieren"; }
    const rBtn = document.getElementById('radioGenerateBtn');
    if(rBtn) {
        rBtn.classList.remove('disabled');
        rBtn.style.pointerEvents = '';
        const label = rBtn.querySelector('.audio-btn-label');
        if(label) label.textContent = "DISPATCH";
    }
}

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
    // Priorität: 1. GitHub-Datenbank  2. Nominatim  3. coreDB (letzter Ausweg)
    await loadGlobalAirports();
    if (globalAirports[icao]) return { icao: icao, n: globalAirports[icao].name || globalAirports[icao].city, lat: globalAirports[icao].lat, lon: globalAirports[icao].lon };
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${icao}+airport`); const data = await res.json();
        if (data && data.length > 0) return { icao: icao, n: data[0].display_name.split(',')[0], lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (e) {}
    if (typeof coreDB !== 'undefined' && coreDB[icao]) return coreDB[icao];
    return null;
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

    // Primär: Wikipedia-Abfrage
    const wikiResult = await fetchRunwayFromWikipedia(icaoCode, lat, lon);
    if (wikiResult) {
        if (icaoCode) runwayCache[icaoCode] = wikiResult;
        domEl.innerText = wikiResult;
        domEl.style.color = hColor;
        return;
    }

    // Fallback: OpenStreetMap Overpass – alle Pisten sammeln, nicht nur die erste
    try {
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(`[out:json][timeout:5];way["aeroway"="runway"](around:2000,${lat},${lon});out tags;`)}`);
        const data = await res.json();
        if (data?.elements?.length > 0) {
            const trans = { "asphalt": "Asphalt", "concrete": "Beton", "grass": "Gras",
                            "paved": "Asphalt", "unpaved": "Unbefestigt", "dirt": "Erde", "gravel": "Schotter" };
            const seen = new Set();
            const parts = [];
            for (const el of data.elements) {
                if (!el.tags?.ref) continue;
                const key = el.tags.ref;
                if (seen.has(key)) continue;
                seen.add(key);
                const surf = el.tags.surface ? (trans[el.tags.surface.toLowerCase()] || el.tags.surface) : '?';
                const len  = el.tags.length  ? ` · ${Math.round(el.tags.length)}m` : '';
                parts.push(`${key} – ${surf}${len}`);
            }
            if (parts.length > 0) { domEl.innerText = parts.join('\n'); domEl.style.color = hColor; return; }
        }
    } catch (e) {}
    domEl.innerText = "Keine Daten gefunden"; domEl.style.color = "#888";
}

async function fetchRunwayFromWikipedia(icaoCode, lat, lon) {
    const isAirport = t => ['flugplatz','flughafen','airport','airfield','aerodrome'].some(k => t.toLowerCase().includes(k));
    const seen = new Set();

    async function tryTitle(title) {
        if (!title || seen.has(title)) return null;
        seen.add(title);
        try {
            const r = await fetchWithTimeout(
                `https://de.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&origin=*`, 8000);
            const d = await r.json();
            const wt = d?.parse?.wikitext?.['*'] || '';
            return wt ? parseRunwayFromWikitext(wt) : null;
        } catch(e) { return null; }
    }

    try {
        const candidates = [];

        // 1. Kombinierte ICAO + Flugplatz Suche (präziseste Methode)
        if (icaoCode) {
            const r = await fetchWithTimeout(
                `https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(icaoCode + ' Flugplatz Flughafen')}&srlimit=5&format=json&origin=*`, 5000);
            const d = await r.json();
            for (const hit of (d?.query?.search || [])) {
                if (isAirport(hit.title)) candidates.push(hit.title);
            }
            // Fallback: ersten Treffer nehmen auch ohne Airport-Keyword im Titel
            if (candidates.length === 0 && d?.query?.search?.length > 0)
                candidates.push(d.query.search[0].title);
        }

        // 2. Geosearch 5 km – Airport-Keyword-Treffer priorisieren
        if (candidates.length === 0) {
            const g = await fetchWithTimeout(
                `https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=5000&gslimit=20&format=json&origin=*`, 6000);
            const gd = await g.json();
            for (const hit of (gd?.query?.geosearch || [])) {
                if (isAirport(hit.title)) candidates.push(hit.title);
            }
        }

        // Kandidaten der Reihe nach probieren – erster mit Pistendaten gewinnt
        for (const title of candidates.slice(0, 4)) {
            const result = await tryTitle(title);
            if (result) return result;
        }
        return null;
    } catch (e) {
        return null;
    }
}

function parseRunwayFromWikitext(wikitext) {
    const runways = [];
    let m;

    // Wikitext global vorverarbeiten: Markup entfernen das Regex-Matching verhindert
    wikitext = wikitext
        .replace(/'{3}([^']*?)'{3}/g, '$1')   // '''fett''' → plain
        .replace(/'{2}([^']*?)'{2}/g, '$1')   // ''kursiv'' → plain
        .replace(/&nbsp;/g, ' ')              // geschütztes Leerzeichen
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    // Hilfsfunktion: Wikitext-Markup bereinigen
    const clean = s => s
        .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')  // [[Link|Text]] → Text
        .replace(/<br\s*\/?>/gi, '\n')                     // <br> → Zeilenumbruch
        .replace(/<[^>]+>/g, '')                           // alle anderen HTML-Tags
        .replace(/&nbsp;/g, ' ')
        .trim();

    // Pattern 1a: Infobox-Felder | Piste = / | Pisten = / | Runway = / | runway1_heading_ft = ...
    //             Mehrere Pisten in EINEM Feld, getrennt durch <br> oder Zeilenumbrüche
    const pisteSinglePat = /\|\s*(?:[Pp]isten?|[Rr]unways?)\s*=\s*([\s\S]*?)(?=\n\s*\||\n\}\}|$)/g;
    while ((m = pisteSinglePat.exec(wikitext)) !== null) {
        const raw = clean(m[1]);
        const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        for (const line of lines) {
            if (/\d{2}\/\d{2}/.test(line)) runways.push(line.replace(/[()]/g, '').trim());
        }
    }

    // Pattern 1b: | Piste1 = ..., | Piste2 = ..., | Runway1 = ... (nummerierte Felder)
    const pisteNumPat = /\|\s*(?:[Pp]isten?|[Rr]unways?)(\d+)\s*=\s*([^\n|{}]{4,150})/g;
    while ((m = pisteNumPat.exec(wikitext)) !== null) {
        const val = clean(m[2]);
        if (val.length > 3 && /\d{2}\/\d{2}/.test(val)) {
            runways.push(val.replace(/[()]/g, '').trim());
        }
    }

    // Pattern 2: {{Runway|09/27|1200|Asphalt}} oder {{Runwayend|...}}
    const rwyTpl = /\{\{\s*[Rr]unway[^}]*\|([^}]+)\}\}/g;
    while ((m = rwyTpl.exec(wikitext)) !== null) {
        const parts = m[1].split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 1 && /\d{2}\/\d{2}/.test(parts[0])) {
            const hdg  = parts[0];
            const len  = parts[1] ? parts[1].replace(/[^\d]/g, '') : '';
            const surf = parts[2] || '';
            runways.push([hdg, len ? len + 'm' : '', surf].filter(Boolean).join(' · '));
        }
    }

    // Pattern 3a: Wikitable | 09/27 || 1200 m || Asphalt  (Länge vor Belag)
    const tablePat = /\|\s*(\d{2}[LRC]?\/\d{2}[LRC]?)\s*\|\|\s*([\d.,×x]+\s*m[^\n|]*?)\s*\|\|\s*([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-/]*)/g;
    while ((m = tablePat.exec(wikitext)) !== null) {
        const hdg  = m[1].trim();
        const len  = m[2] ? m[2].trim().replace(/\(.*?\)/g, '').replace(/[×x\s]/g, '').replace(/[^\d]/g, '') : '';
        const surf = m[3] ? m[3].trim() : '';
        if (hdg) runways.push([hdg, len ? len + 'm' : '', surf].filter(Boolean).join(' · '));
    }

    // Pattern 3b: Wikitable | 09/27 || Asphalt || 1200 m  (Belag vor Länge – dt. Standard)
    const tablePatDE = /\|\s*(\d{2}[LRC]?\/\d{2}[LRC]?)\s*\|\|\s*([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-/]*)\s*\|\|\s*([\d.,×x]+[^|\n{]*m[^|\n{]*)/g;
    while ((m = tablePatDE.exec(wikitext)) !== null) {
        const hdg    = m[1].trim();
        const surf   = m[2].trim();
        const rawLen = m[3].trim().replace(/\(.*?\)/g, '').replace(/[×x\s]/g, '').replace(/[^\d]/g, '');
        if (hdg) runways.push([hdg, rawLen ? rawLen + 'm' : '', surf].filter(Boolean).join(' · '));
    }

    // Pattern 3c: Wikitable zeilenweise – jede Zelle in eigener Zeile
    // Format: \n| 09/27\n| Asphalt\n| 1200 m  (dt. Reihenfolge: Kennung | Belag | Länge)
    const tablePatNL = /\n\|\s*(\d{2}[LRC]?\/\d{2}[LRC]?)\s*\n\|\s*([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-/]*)\s*\n\|\s*([\d.,]+[^\n|]*m[^\n|]*)/g;
    while ((m = tablePatNL.exec(wikitext)) !== null) {
        const hdg    = m[1].trim();
        const surf   = m[2].trim();
        const rawLen = m[3].trim().replace(/\(.*?\)/g, '').replace(/[×x\s]/g, '').replace(/[^\d]/g, '');
        if (hdg) runways.push([hdg, rawLen ? rawLen + 'm' : '', surf].filter(Boolean).join(' · '));
    }

    // Pattern 3d: Wikitable zeilenweise – Länge vor Belag
    // Format: \n| 09/27\n| 1200 m\n| Asphalt
    const tablePatNLrev = /\n\|\s*(\d{2}[LRC]?\/\d{2}[LRC]?)\s*\n\|\s*([\d.,]+[^\n|]*m[^\n|]*)\n\|\s*([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-/]*)/g;
    while ((m = tablePatNLrev.exec(wikitext)) !== null) {
        const hdg    = m[1].trim();
        const rawLen = m[2].trim().replace(/\(.*?\)/g, '').replace(/[×x\s]/g, '').replace(/[^\d]/g, '');
        const surf   = m[3].trim();
        if (hdg) runways.push([hdg, rawLen ? rawLen + 'm' : '', surf].filter(Boolean).join(' · '));
    }

    // Pattern 3e: Zeilen-basierter Wikitable-Parser (universell, spaltenreihenfolge-unabhängig)
    // Verarbeitet jede Tabellenzeile als Block, erkennt DD/DD-Zelle und sucht Länge + Belag
    {
        const SURFACES = /\b(asphalt|beton|gras|grass|schotter|gravel|concrete|paved|unpaved|dirt|erde)\b/i;
        const rowBlocks = wikitext.split(/\n\|-+[^\n]*/);
        for (const block of rowBlocks) {
            // Alle Zellen: inline || und zeilenweise | (nicht |-, |}, |!)
            const cellRaw = block.split(/\|\||\n\|(?![-}|!])/).map(c => c.replace(/^\|/, '').trim()).filter(c => c.length > 0);
            const hdgCell = cellRaw.find(c => /^\d{2}[LRC]?\/\d{2}[LRC]?$/.test(c));
            if (!hdgCell) continue;
            const hdg = hdgCell.trim();
            // Länge: erste Zelle mit Zahl + m (z.B. "1.338 m × 30 m", "1338 m", "1.240 m")
            const lenCell = cellRaw.find(c => c !== hdgCell && /\d/.test(c) && /\bm\b/.test(c));
            const len = lenCell ? (lenCell.match(/(\d[\d.,]*)/)?.[1] || '').replace(/\./g, '').replace(/,/g, '') : '';
            // Belag: Zelle die bekanntes Oberflächenwort enthält
            const surfCell = cellRaw.find(c => SURFACES.test(c));
            const surf = surfCell ? (surfCell.match(SURFACES)?.[0] || '') : '';
            // Nur wenn mindestens Heading vorhanden
            const entry = [hdg, len ? len + 'm' : '', surf ? surf.charAt(0).toUpperCase() + surf.slice(1) : ''].filter(Boolean).join(' · ');
            runways.push(entry);
        }
    }

    // Pattern 4: Freitext – "Piste 09/27, 1.575 m, Asphalt"
    const freePat = /[Pp]iste[n]?\s+(\d{2}\/\d{2})[,;\s]+([\d.,]+)\s*m[,;\s]+([A-Za-zÄÖÜäöüß]+)/g;
    while ((m = freePat.exec(wikitext)) !== null) {
        const len = m[2].replace(/[.,]/g, '');
        runways.push(`${m[1]} · ${len}m · ${m[3]}`);
    }

    if (runways.length === 0) return null;

    // Deduplizieren: nur Einträge mit Heading-Muster, max. 5 Pisten
    const unique = [...new Set(
        runways
            .map(r => r.trim().replace(/\s+/g, ' ').replace(/–/g, '·'))
            .filter(r => r.length > 4 && /\d{2}\/\d{2}/.test(r))
    )].slice(0, 5);

    return unique.length > 0 ? unique.join(' | ') : null;
}

async function fetchGeminiMission(startName, destName, dist, isPOI, paxText, cargoText) {
    const aiToggleBtn = document.getElementById('aiToggle');
    if (!aiToggleBtn || !aiToggleBtn.checked) return null; 
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
    if (!apiKey) return null; 

    const poiCategories = [
        "Tourismus & Sightseeing", "Natur- & Umweltschutz (Beobachtung)", 
        "Luftbildfotografie (Medien/Immobilien)", "Infrastruktur-Inspektion (Straßen/Brücken/Leitungen)", 
        "Wissenschaftliche Datenerfassung", "Lokales Event / Großveranstaltung von oben",
        "Kurioses / Verrückte Suchaktion"
    ];
    
    const aptCategories = [
        "Kulinarischer Ausflug ($100 Hamburger/Kuchen)", "Gemütlicher Vereinsausflug / Treffen", 
        "Business-Charter (Alltäglich)", "Eilige, aber unspektakuläre Kleinfracht", 
        "Promi / VIP-Transport", "Tierrettung / Tiertransport", 
        "Spezielles Flugtraining (Seitenwind, Navigation)", "Flugplatz-Logistik (Ersatzteile, Crew-Shuttle)", 
        "Kurioses / Ungewöhnlicher Privatflug"
    ];
    
    const randomTheme = isPOI 
        ? poiCategories[Math.floor(Math.random() * poiCategories.length)] 
        : aptCategories[Math.floor(Math.random() * aptCategories.length)];

    // Wir extrahieren die generierte Zahl aus "3 PAX", damit die KI ein Limit hat
    const maxPaxLimit = paxText.split(' ')[0];

    const prompt = `Du bist ein freundlicher, entspannter Flugdienstleiter in einem lokalen Fliegerclub oder kleinen Charterunternehmen.
    Erstelle ein realistisches Einsatzbriefing für diesen Flug:
    Start: ${startName}
    Ziel: ${destName} ${isPOI ? '(POI / Wendepunkt)' : '(Zielflughafen)'}
    Distanz (Gesamt): ${dist} NM

    WICHTIGE REGELN:
    1. Antworte IMMER auf Deutsch.
    2. TONFALL: Entspannt, kumpelhaft und alltäglich. Keine übertriebene Dramatik, keine Actionfilm-Rhetorik! Fliegen ist Routine und macht Spaß.
    3. THEMA VORGEGEBEN: Dein Auftrag MUSS sich zwingend um dieses Thema drehen: "${randomTheme}".
    4. LOKALES WISSEN: Baue 1-2 echte geografische, infrastrukturelle oder kulturelle Fakten zu "${destName}" ganz natürlich ein.
    ${isPOI ? `5. RUNDFLUG-REGELN: Start und Landung ist ${startName}. Am POI (${destName}) wird NICHT gelandet.` : `5. ROUTEN-REGELN: Normaler Streckenflug von ${startName} nach ${destName}.`}
    6. PASSAGIERE & FRACHT: Erfinde passend zur Mission, WER mitfliegt (maximal ${maxPaxLimit} Personen) und WAS transportiert wird. Wenn niemand mitfliegt, schreibe '0 PAX'.

    Antworte AUSSCHLIESSLICH als JSON. Keine Markdown-Formatierung.
    Struktur: {
        "title": "Kreativer Titel", 
        "story": "Das Briefing (max 3-4 Sätze, lockerer Ton)",
        "pax": "z.B. '2 PAX (Fotograf & Assistent)' oder '0 PAX'",
        "cargo": "z.B. 'Kamera-Gimbal (80 lbs)' oder 'Reisegepäck (40 lbs)'"
    }`;

    const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const reqOptions = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };

    try {
        const resFlash = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, reqOptions);
        if (resFlash.ok) {
            const data = await resFlash.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('flash'); 
            return { t: parsed.title, s: parsed.story, pax: parsed.pax, cargo: parsed.cargo, i: "📋", cat: "std", _source: "Gemini 2.5 Flash" };
        } else if (resFlash.status === 429) {
            console.warn("Flash API Quota erreicht. Wechsle zu Lite...");
        } else {
            throw new Error('Flash API Fehler: ' + resFlash.status);
        }
    } catch (e) {
        console.warn("Gemini Flash fehlgeschlagen:", e);
    }

    try {
        const resLite = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, reqOptions);
        if (resLite.ok) {
            const data = await resLite.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('lite'); 
            return { t: parsed.title, s: parsed.story, pax: parsed.pax, cargo: parsed.cargo, i: "📋", cat: "std", _source: "Gemini 2.5 Flash Lite" };
        }
    } catch (e) {
        console.warn("Gemini Lite fehlgeschlagen:", e);
    }
    return null;
}

/* =========================================================
   6. HAUPT-LOGIK & ZÄHLER
   ========================================================= */
function getQuotaDay() {
    const now = new Date();
    if (now.getHours() < 9) now.setDate(now.getDate() - 1);
    return now.toISOString().split('T')[0];
}

function getApiUsage() {
    const today = getQuotaDay();
    let data = JSON.parse(localStorage.getItem('ga_api_fuel'));
    
    // Wenn keine Daten da sind, ein neuer Tag ist, ODER das alte Format noch im Speicher hängt
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
    const maxCalls = 40; 
    
    if(used > maxCalls) used = maxCalls;
    let percentage = used / maxCalls;
    
    let angle = 45 - (percentage * 90); 
    needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
}

async function generateMission() {
    const btn = document.getElementById('generateBtn'); 
    const rBtn = document.getElementById('radioGenerateBtn');
    if(btn) { btn.disabled = true; btn.innerText = "Sucht Route & Daten..."; }
    if(rBtn) {
        rBtn.classList.add('disabled');
        rBtn.style.pointerEvents = 'none';
        const label = rBtn.querySelector('.audio-btn-label');
        if(label) label.textContent = "CALC...";
    }
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
    
    // Marker Lights anfangen zu blinken
    document.querySelectorAll('.marker-light').forEach(l => { 
        l.classList.remove('on'); 
        l.classList.add('blinking'); 
    });
    
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
    // DEP == DEST: Zielflugplatz ignorieren → POI verwenden
    let forcePOI = false;
    if (targetDest && targetDest === currentStartICAO) {
        targetDest = '';
        forcePOI = true;
    }
    let dataSource = targetDest ? "Manuell" : "Generiert";

    let minNM, maxNM;
    if(rangePref === "any") {
        const roll = Math.random(); if (roll < 0.33) { minNM=10; maxNM=50; } else if (roll < 0.66) { minNM=50; maxNM=100; } else { minNM=100; maxNM=250; }
    } else {
        if(rangePref === "short") { minNM=10; maxNM=50; } if(rangePref === "medium") { minNM=50; maxNM=100; } if(rangePref === "long") { minNM=100; maxNM=250; }
    }

    const effectiveType = (forcePOI || targetType === "poi") ? "poi" : "apt";
    let searchMin = effectiveType === "poi" ? minNM / 2 : minNM, searchMax = effectiveType === "poi" ? maxNM / 2 : maxNM, dest = null;

    if (targetDest) { dest = await getAirportData(targetDest); } else {
        if (effectiveType === "apt") { dest = await findGithubAirport(start.lat, start.lon, searchMin, searchMax, dirPref, regionPref); }
        else { dest = await findWikipediaPOI(start.lat, start.lon, searchMin, searchMax, dirPref); }
    }
    
    if(!dest && !targetDest && typeof coreDB !== 'undefined') {
        if (effectiveType === "apt") {
            dataSource = "Core DB (Fallback)";
            let keys = Object.keys(coreDB).filter(k => k !== currentStartICAO);
            if(regionPref === "de") keys = keys.filter(k => k.startsWith('ED') || k.startsWith('ET'));
            if(regionPref === "int") keys = keys.filter(k => !k.startsWith('ED') && !k.startsWith('ET'));
            let dirFilteredKeys = keys.filter(k => checkBearing(calcNav(start.lat, start.lon, coreDB[k].lat, coreDB[k].lon).brng, dirPref));
            if(dirFilteredKeys.length > 0) keys = dirFilteredKeys;
            if(keys.length === 0) keys = Object.keys(coreDB).filter(k => k !== currentStartICAO);
            dest = coreDB[keys[Math.floor(Math.random()*keys.length)]];
        } else if (effectiveType === "poi" && typeof fallbackPOIs !== 'undefined') {
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

    const isPOI = forcePOI || (effectiveType === 'poi' && !targetDest);
    const nav = calcNav(start.lat, start.lon, dest.lat, dest.lon);
    let totalDist = isPOI ? nav.dist * 2 : nav.dist;
    currentDestICAO = isPOI ? currentStartICAO : dest.icao;
    
    const maxPax = Math.max(1, maxSeats - 1), randomPax = Math.floor(Math.random() * maxPax) + 1;
    let paxText = `${randomPax} PAX`, cargoText = `${Math.floor(Math.random()*300)+20} lbs`;
    
    indicator.innerText = `Kontaktiere KI-Dispatcher...`;
    let m = await fetchGeminiMission(start.n, dest.n, totalDist, isPOI, paxText, cargoText);

    if (m) { 
        dataSource = m._source; 
        if (m.pax) paxText = m.pax;       // Nimmt den KI-Text für Passagiere
        if (m.cargo) cargoText = m.cargo; // Nimmt den KI-Text für Fracht
    } else {
        indicator.innerText = `Lade Auftrag aus lokaler Datenbank...`;
        dataSource = "Lokale DB"; 
        if (isPOI) {
            m = generateDynamicPOIMission(dest.n, maxSeats); paxText = m.payloadText; cargoText = m.cargoText; dataSource = "Wikipedia GeoSearch";
        } else if (typeof missions !== 'undefined') {
            let availM = missions.filter(ms => (nav.dist < 50 || ms.cat === "std"));
            
            // SHUFFLE-BAG SYSTEM: Bereits gespielte Missionen aussortieren
            let history = JSON.parse(localStorage.getItem('ga_std_history')) || [];
            let freshM = availM.filter(ms => !history.includes(ms.t));
            
            // Wenn der Stapel leer ist, History löschen und neu mischen!
            if (freshM.length === 0) { freshM = availM; history = []; }
            
            m = freshM[Math.floor(Math.random() * freshM.length)] || missions[0];
            
            // Gespielte Mission merken (max. die letzten 30 merken)
            history.push(m.t);
            if(history.length > 30) history.shift();
            localStorage.setItem('ga_std_history', JSON.stringify(history));

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

    // Ziel-ICAO in Classic- und NavCom-Inputs eintragen (nur bei echtem Zielflughafen)
    if (!isPOI) {
        const destLocEl      = document.getElementById('destLoc');
        const destLocRadioEl = document.getElementById('destLocRadio');
        if (destLocEl)      destLocEl.value      = currentDestICAO;
        if (destLocRadioEl) destLocRadioEl.value = currentDestICAO;
    }

    updateMap(start.lat, start.lon, dest.lat, dest.lon, currentStartICAO, dest.n);

    indicator.innerText = `Flugplan bereit (${dataSource}). Lade Infos...`;
    fetchRunwayDetails(start.lat, start.lon, 'mDepRwy', currentStartICAO);
    
    setTimeout(() => {
        if (!isPOI) fetchRunwayDetails(dest.lat, dest.lon, 'mDestRwy', currentDestICAO);
        fetchAreaDescription(dest.lat, dest.lon, 'wikiDescText', isPOI ? dest.n : null);
        indicator.innerText = `Briefing komplett.`; resetBtn(btn);
        const rBtnLed = document.getElementById('radioGenerateBtn');
        if(rBtnLed) rBtnLed.classList.add('active');
        
        if(window.meterInterval) clearInterval(window.meterInterval);
        if(needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`; 
        
        if (led) { 
            led.classList.remove('led-green', 'led-blue', 'led-red');
            if (dataSource === "Gemini 2.5 Flash") { led.classList.add('led-blue'); } 
            else if (dataSource === "Gemini 2.5 Flash Lite") { led.classList.add('led-green'); } 
            else { led.classList.add('led-red'); } 
        }

        // Marker Lights: Blinken stoppen und finale Quelle anzeigen
        document.querySelectorAll('.marker-light').forEach(l => l.classList.remove('blinking', 'on'));
        if (dataSource === "Gemini 2.5 Flash") document.getElementById('mkO').classList.add('on'); // Blau
        else if (dataSource === "Gemini 2.5 Flash Lite") document.getElementById('mkM').classList.add('on'); // Amber
        else document.getElementById('mkI').classList.add('on'); // Weiß (Lokal)
        
        setTimeout(() => saveMissionState(), 1000);
        refreshGPSAfterDispatch();
    }, 800); 
}

/* =========================================================
   7. KARTE (LEAFLET, KARTENTISCH & MESS-WERKZEUG)
   ========================================================= */
const hitBoxHtml = (color) => `<div class="pin-hitbox"><div class="pin-dot" style="background-color: ${color};"></div></div>`;
const hitBoxIcon = (color) => L.divIcon({ className: 'custom-pin', html: hitBoxHtml(color), iconSize: [34, 34], iconAnchor: [17, 17] });

const startIcon = hitBoxIcon('#44ff44'), destIcon  = hitBoxIcon('#ff4444');
const wpIcon    = L.divIcon({ className: 'custom-pin', html: `<div class="pin-hitbox" style="cursor: move;"><div class="pin-dot" style="background-color: #fdfd86;"></div></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
const measureIcon = L.divIcon({ className: 'custom-pin', html: `<div class="pin-hitbox" style="cursor: move;"><div class="pin-dot" style="background-color: #fff; width: 12px; height: 12px; min-width: 12px; min-height: 12px;"></div></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });

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
        const nav = calcNav(measurePoints[0].lat, measurePoints[0].lng || measurePoints[0].lon, measurePoints[1].lat, measurePoints[1].lng || measurePoints[1].lon);
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

    // GPS FPL-Seite sofort aktualisieren wenn sichtbar
    if (gpsState.visible && gpsState.mode === 'FPL') renderGPS();
}

function initMapBase() {
    if(map) return;
    
    // 1. BASE MAPS (Untergrund)
    const topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'OpenTopoMap' });
    // NEU: Reine 3D-Geländekarte ohne störenden Text!
    const topoLightMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' }); 
    const satMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' });
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'CartoDB' });
    const lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: 'CartoDB' });

    // 2. OVERLAY MAP (VFR Infos)
    const aeroOverlay = L.tileLayer('https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest', { 
        attribution: 'AeroData / Navigraph',
        opacity: 0.65,
        maxNativeZoom: 12 // Stoppt das Neuladen bei Stufe 12 und vergrößert ab da nur noch digital
    });

    // Da das VFR-Overlay beim Start aktiv ist, blenden wir die Topo-Karte direkt ab
    topoMap.setOpacity(0.5);

    // Startet standardmäßig mit Topo-Karte UND dem transparenten VFR-Overlay darüber
    map = L.map('map', { layers: [topoMap, aeroOverlay], attributionControl: false }).setView([51.1657, 10.4515], 6);
    
    const baseMaps = { 
        "⛰️ Topografie (Mit Text)": topoMap, 
        "🗺️ Terrain (Ohne Text)": topoLightMap,
        "🛰️ Satellit": satMap, 
        "🌑 Dark Mode (Clean)": darkMap,
        "📝 Blank Mode (Weiß)": lightMap
    };
    
    const overlayMaps = {
        "🛩️ VFR Lufträume (Overlay)": aeroOverlay
    };

    L.control.layers(baseMaps, overlayMaps).addTo(map);

    // ==========================================
    // Automatik für das Abblenden der Karte
    // ==========================================
    map.on('overlayadd', function(e) {
        if (e.name === "🛩️ VFR Lufträume (Overlay)") {
            topoMap.setOpacity(0.5); // Topo wird blass, damit die Lufträume gut lesbar sind
        }
    });

    map.on('overlayremove', function(e) {
        if (e.name === "🛩️ VFR Lufträume (Overlay)") {
            topoMap.setOpacity(1.0); // Topo wird wieder 100% kräftig, wenn VFR aus ist
        }
    });
    // ==========================================
    
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

/* iOS-Scroll-Lock: verhindert, dass die Seite unter einem Overlay scrollt und
   stellt sicher, dass das Overlay immer mittig im Viewport erscheint. */
let _scrollLockY = 0;
function lockBodyScroll() {
    if (window.innerWidth >= 1250) return; // Desktop nutzt CSS-Transform, kein Lock nötig
    _scrollLockY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + _scrollLockY + 'px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
}
function unlockBodyScroll() {
    if (window.innerWidth >= 1250) return;
    if (document.body.style.position !== 'fixed') return;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, _scrollLockY);
}

function toggleMapTable() {
    const board = document.getElementById('mapTableOverlay'), pinBoard = document.getElementById('pinboardOverlay');
    if (pinBoard.classList.contains('active')) { togglePinboard(); }
    board.classList.toggle('active'); document.body.classList.toggle('maptable-open');
    if (board.classList.contains('active')) {
        lockBodyScroll();
        if(!map) initMapBase();
        setTimeout(() => {
            if(map) {
                map.invalidateSize();
                if(routeWaypoints && routeWaypoints.length >= 2) map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] });
                else updateMapFromInputs();
            }
        }, 500);
    } else {
        unlockBodyScroll();
        document.body.classList.remove('map-is-fullscreen');
    }
}

/* =========================================================
   8. POLAROID MINIMAP
   ========================================================= */
function updateMiniMap() {
    const miniContainer = document.getElementById('miniMap');
    if (!miniContainer || miniContainer.offsetParent === null) return; 
    
    if (!miniMap) {
        miniMap = L.map('miniMap', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: false });
        
        // Stapelt die Karten für den perfekten Aviation-Look auf dem Foto
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png').addTo(miniMap);
        L.tileLayer('https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest', { 
            opacity: 0.65, 
            maxNativeZoom: 12 
        }).addTo(miniMap);
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
    const newStart = currentMissionData.dest || '';
    document.getElementById('startLoc').value = newStart;
    document.getElementById('destLoc').value = "";
    const startLocRadioEl = document.getElementById('startLocRadio');
    const destLocRadioEl  = document.getElementById('destLocRadio');
    if (startLocRadioEl) startLocRadioEl.value = newStart;
    if (destLocRadioEl)  destLocRadioEl.value  = '';
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
   10. HANGAR PINNWAND (LOKAL & TUTORIAL & SKALIERUNG)
   ========================================================= */
const tutorialNotes = [
    { id: 101, text: "👋 WILLKOMMEN!\n\nZiehe diese Zettel umher, bearbeite sie (✏️) oder lösch sie (✖).", x: 5, y: 8, rot: -2 },
    { id: 102, text: "✈️ AUFTRÄGE\n\nStelle Start, Ziel und Distanz ein. Der Dispatcher sucht dir Missionen.", x: 28, y: 12, rot: 3 },
    { id: 103, text: "🗺️ KARTENTISCH\n\n- Layer-Icon nutzen\n- Wegpunkte verschieben\n- Distanzen messen", x: 52, y: 6, rot: -1 },
    { id: 104, text: "🌤️ WETTER & AIP\n\nIm Briefing-Fenster findest du Schalter für METAR/TAF und AIP.", x: 8, y: 45, rot: 1 },
    { id: 105, text: "🎨 COCKPIT DESIGN\n\nKlicke auf die SCHRAUBE oben links, um die Lackierung zu ändern!", x: 32, y: 48, rot: -3 },
    { id: 106, text: "🤖 GEMINI API\n\nHol dir einen AI Key und die KI generiert individuelle Aufträge!", x: 55, y: 42, rot: 2 }
];

function toggleTutorialNotes() {
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    const hasTutorial = notes.some(n => n.id >= 101 && n.id <= 106);
    
    if (hasTutorial) {
        // Sind sie da, blenden wir sie aus
        notes = notes.filter(n => n.id < 101 || n.id > 106);
    } else {
        // Sind sie weg, holen wir sie zurück (ohne Duplikate)
        tutorialNotes.forEach(tn => {
            if (!notes.find(n => n.id === tn.id)) notes.push(tn);
        });
    }
    localStorage.setItem('ga_pinboard', JSON.stringify(notes));
    renderNotes();
}

function clearPinboard() {
    if(confirm("🗑️ Möchtest du wirklich ALLE Zettel von der Pinnwand in den Müll werfen?")) {
        localStorage.setItem('ga_pinboard', JSON.stringify([]));
        renderNotes();
    }
}

function togglePinboard() {
    const board = document.getElementById('pinboardOverlay');
    const mapBoard = document.getElementById('mapTableOverlay');
    if (mapBoard.classList.contains('active')) { toggleMapTable(); }
    board.classList.toggle('active');
    document.body.classList.toggle('pinboard-open');
    if (board.classList.contains('active')) {
        lockBodyScroll();
        renderNotes();
    } else {
        unlockBodyScroll();
    }
}

function addNote() {
    const text = prompt("Was möchtest du ans schwarze Brett pinnen?");
    if(!text || text.trim() === "") return;
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    notes.push({ id: Date.now(), text: text, x: 30 + Math.random()*15, y: 30 + Math.random()*15, rot: Math.floor(Math.random() * 9) - 4 });
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

function pinCurrentFlight() {
    if (document.getElementById("briefingBox").style.display !== "block" || !currentMissionData) return;
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    if (notes.filter(n => n.type === 'flight').length >= 10) {
        alert("Das Board ist voll! Du kannst maximal 10 Flüge anheften. Bitte lösche alte Flüge von der Pinnwand (✖)."); return;
    }

    const state = {
        mTitle: document.getElementById('mTitle').innerHTML, mStory: document.getElementById('mStory').innerText,
        mDepICAO: document.getElementById("mDepICAO").innerText, mDepName: document.getElementById("mDepName").innerText,
        mDepCoords: document.getElementById("mDepCoords").innerText, mDepRwy: document.getElementById("mDepRwy").innerText,
        destIcon: document.getElementById("destIcon").innerText, mDestICAO: document.getElementById("mDestICAO").innerText,
        mDestName: document.getElementById("mDestName").innerText, mDestCoords: document.getElementById("mDestCoords").innerText,
        mDestRwy: document.getElementById("mDestRwy").innerText, mPay: document.getElementById("mPay").innerText,
        mWeight: document.getElementById("mWeight").innerText, mDistNote: document.getElementById("mDistNote").innerText,
        mHeadingNote: document.getElementById("mHeadingNote").innerText, mETENote: document.getElementById("mETENote").innerText,
        wikiDescText: document.getElementById("wikiDescText").innerText, isPOI: document.getElementById("destRwyContainer").style.display === "none",
        currentMissionData: currentMissionData, routeWaypoints: routeWaypoints, currentStartICAO: currentStartICAO,
        currentDestICAO: currentDestICAO, currentSName: currentSName, currentDName: currentDName
    };

    const routeText = `${currentStartICAO} ➔ ${currentDestICAO === "POI" ? currentMissionData.poiName : currentDestICAO}`;
    notes.push({
        id: Date.now(), type: "flight", flightData: state,
        text: `✈️ <b>${routeText}</b><br><span style="font-size:11px; color:#555;">${state.currentMissionData?.mission || ''}</span><br><span style="font-size:11px;">${state.mDistNote}</span>`,
        x: 35 + Math.random()*15, y: 20 + Math.random()*15, rot: Math.floor(Math.random() * 9) - 4
    });
    
    localStorage.setItem('ga_pinboard', JSON.stringify(notes));
    renderNotes();
    if (!document.getElementById('pinboardOverlay').classList.contains('active')) alert("📌 Flugauftrag erfolgreich ans schwarze Brett geheftet!");
}

function loadPinnedFlight(id) {
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    const note = notes.find(n => n.id === id);
    if (note && note.flightData) {
        restoreMissionState(note.flightData);
        togglePinboard(); 
        setTimeout(() => { if (map && routeWaypoints.length >= 2) { map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] }); updateMiniMap(); } }, 300);
    }
}

// ==========================================
// MISSION EXPORT & IMPORT (Community Feature)
// ==========================================
function exportMission() {
    if (document.getElementById("briefingBox").style.display !== "block" || !currentMissionData) return;
    const wps = routeWaypoints.map(wp => [parseFloat(wp.lat.toFixed(4)), parseFloat((wp.lng||wp.lon).toFixed(4))]);
    const pack = [
        document.getElementById('mTitle').innerHTML, document.getElementById('mStory').innerText,
        document.getElementById("mDepICAO").innerText, document.getElementById("mDepName").innerText,
        document.getElementById("mDepCoords").innerText, document.getElementById("mDepRwy").innerText,
        document.getElementById("destIcon").innerText, document.getElementById("mDestICAO").innerText,
        document.getElementById("mDestName").innerText, document.getElementById("mDestCoords").innerText,
        document.getElementById("mDestRwy").innerText, document.getElementById("mPay").innerText,
        document.getElementById("mWeight").innerText, document.getElementById("mDistNote").innerText,
        document.getElementById("mHeadingNote").innerText, document.getElementById("mETENote").innerText,
        document.getElementById("wikiDescText").innerText, document.getElementById("destRwyContainer").style.display === "none" ? 1 : 0,
        currentMissionData, wps, currentStartICAO, currentDestICAO, currentSName, currentDName
    ];

    const code = btoa(encodeURIComponent(JSON.stringify(pack)));
    navigator.clipboard.writeText(code).then(() => { alert("🔗 Mission Code kopiert!\n\nDu kannst ihn jetzt einfügen und an deine Fliegerkollegen schicken."); })
    .catch(err => { prompt("Dein Browser blockiert das automatische Kopieren. Bitte kopiere den Code hier:", code); });
}

function importMission() {
    const code = prompt("Füge hier den Mission Code ein:");
    if (!code || code.trim() === "") return;
    try {
        const pack = JSON.parse(decodeURIComponent(atob(code.trim())));
        if (!Array.isArray(pack) || pack.length < 24) throw new Error("Ungültiges oder veraltetes Format");
        const wps = pack[19].map(p => ({ lat: p[0], lng: p[1] }));
        const state = {
            mTitle: pack[0], mStory: pack[1], mDepICAO: pack[2], mDepName: pack[3], mDepCoords: pack[4], mDepRwy: pack[5],
            destIcon: pack[6], mDestICAO: pack[7], mDestName: pack[8], mDestCoords: pack[9], mDestRwy: pack[10],
            mPay: pack[11], mWeight: pack[12], mDistNote: pack[13], mHeadingNote: pack[14], mETENote: pack[15],
            wikiDescText: pack[16], isPOI: pack[17] === 1, currentMissionData: pack[18], routeWaypoints: wps, 
            currentStartICAO: pack[20], currentDestICAO: pack[21], currentSName: pack[22], currentDName: pack[23]
        };
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        if (notes.filter(n => n.type === 'flight').length >= 10) { alert("Das Board ist voll! Du kannst maximal 10 Flüge anheften. Bitte lösche alte Flüge (✖)."); return; }
        
        const routeText = `${state.currentStartICAO} ➔ ${state.currentDestICAO === "POI" ? state.currentMissionData.poiName : state.currentDestICAO}`;
        notes.push({
            id: Date.now(), type: "flight", flightData: state,
            text: `✈️ <b>${routeText}</b><br><span style="font-size:11px; color:#555;">${state.currentMissionData.mission}</span><br><span style="font-size:11px;">${state.mDistNote}</span>`,
            x: 40 + Math.random()*15, y: 25 + Math.random()*15, rot: Math.floor(Math.random() * 9) - 4
        });
        localStorage.setItem('ga_pinboard', JSON.stringify(notes));
        renderNotes();
        alert("📥 Flugauftrag erfolgreich empfangen und ans Brett geheftet!");
    } catch (e) { alert("❌ Fehler: Der Code ist ungültig oder beschädigt."); }
}

function renderNotes() {
    const board = document.getElementById('pinboard');
    if (!board) return;
    board.innerHTML = ''; 
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    notes.forEach(note => {
        const div = document.createElement('div'); 
        div.className = note.type === 'flight' ? 'post-it flight-card' : 'post-it';
        
        // Kompatibilität: Wandelt alte feste Pixel in saubere Prozente um
        let posX = note.x > 100 ? (note.x / 1000) * 100 : note.x;
        let posY = note.y > 100 ? (note.y / 600) * 100 : note.y;

        div.style.left = posX + '%'; 
        div.style.top = posY + '%'; 
        div.style.transform = `rotate(${note.rot}deg)`;
        
        if (note.type === 'flight') {
            div.innerHTML = `<div class="post-it-pin"></div><div class="post-it-del" onclick="deleteNote(${note.id})">✖</div>${note.text}<button class="flight-load-btn" onclick="loadPinnedFlight(${note.id})">📂 Flug laden</button>`;
        } else {
            div.innerHTML = `<div class="post-it-pin"></div><div class="post-it-edit" onclick="editNote(${note.id})">✏️</div><div class="post-it-del" onclick="deleteNote(${note.id})">✖</div>${note.text.replace(/\n/g, '<br>')}`;
        }
        makeDraggable(div, note.id); board.appendChild(div);
    });
}

function makeDraggable(element, noteId) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown; element.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        if(e.target.className === 'post-it-del' || e.target.className === 'post-it-edit' || e.target.className === 'flight-load-btn') return; 
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
        
        const board = document.getElementById('pinboard');
        let newTop = element.offsetTop - pos2, newLeft = element.offsetLeft - pos1;
        const padding = 10; 
        const minLeft = padding, maxLeft = board.offsetWidth - element.offsetWidth - padding;
        const minTop = padding, maxTop = board.offsetHeight - element.offsetHeight - padding;
        
        if (newLeft < minLeft) newLeft = minLeft; if (newLeft > maxLeft) newLeft = maxLeft;
        if (newTop < minTop) newTop = minTop; if (newTop > maxTop) newTop = maxTop;
        
        // FIX: Wir weisen die Position schon während des Ziehens stur in % zu!
        // Dadurch kleben die Post-Its bombenfest an der Textur des Brettes, egal was der Monitor macht.
        element.style.top = (newTop / board.offsetHeight * 100) + "%"; 
        element.style.left = (newLeft / board.offsetWidth * 100) + "%";
    }

    function closeDragElement() {
        document.onmouseup = null; document.ontouchend = null; document.onmousemove = null; document.ontouchmove = null;
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        const noteIndex = notes.findIndex(n => n.id === noteId);
        if(noteIndex > -1) {
            const board = document.getElementById('pinboard');
            notes[noteIndex].x = (element.offsetLeft / board.offsetWidth) * 100;
            notes[noteIndex].y = (element.offsetTop / board.offsetHeight) * 100;
            localStorage.setItem('ga_pinboard', JSON.stringify(notes));
        }
    }
}

/* =========================================================
   KLN 90B GPS MODULE
   ========================================================= */
const gpsState = {
    mode: 'FPL',
    subPage: 0,       // universelle Sub-Page; steuert alle Inhalte (Waypoints, Runway, Wiki)
    visible: false,
    maxPages: { FPL: 1, DEP: 2, DEST: 2, AIP: 2, WX: 2 },
    metarCache: {},
    wikiCache: {}     // { icao: ['page1', 'page2', ...] }
};

// --- Toggle GPS Module ---
function toggleGPSModule(btnEl) {
    gpsState.visible = !gpsState.visible;
    const mod = document.getElementById('kln90bModule');
    const fp = document.querySelector('.flightplan-container');
    if (gpsState.visible) {
        if (mod) mod.style.display = 'flex';
        if (fp) fp.style.display = 'none';
        if (btnEl) btnEl.classList.add('active');
    } else {
        if (mod) mod.style.display = 'none';
        if (fp) fp.style.display = '';
        if (btnEl) btnEl.classList.remove('active');
    }
    saveAudioButtonStates();
    renderGPS();
}

// --- Save & Restore all audio button states ---
function saveAudioButtonStates() {
    const states = {};
    document.querySelectorAll('.audio-btn-grid .audio-btn').forEach(btn => {
        const id = btn.id;
        if (id) states[id] = btn.classList.contains('active');
    });
    localStorage.setItem('ga_navcom_buttons', JSON.stringify(states));
}

function restoreAudioButtonStates() {
    const saved = JSON.parse(localStorage.getItem('ga_navcom_buttons') || '{}');
    for (const [id, active] of Object.entries(saved)) {
        const btn = document.getElementById(id);
        if (!btn) continue;
        if (active) btn.classList.add('active');
        else btn.classList.remove('active');
    }
    // GPS visibility
    if (saved['btnToggleGPS']) {
        gpsState.visible = true;
        const mod = document.getElementById('kln90bModule');
        const fp = document.querySelector('.flightplan-container');
        if (mod) mod.style.display = 'flex';
        if (fp) fp.style.display = 'none';
        renderGPS();
    }
    // AI toggle sync
    if (saved['btnToggleAI']) {
        const aiToggle = document.getElementById('aiToggle');
        if (aiToggle) aiToggle.checked = true;
    }
}

// --- Mode Buttons ---
function initGPSButtons() {
    document.querySelectorAll('.kln90b-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetMode = btn.dataset.mode;

            // AIP: Direkt-Link öffnen wenn bereits auf DEP- oder DEST-Seite
            if (targetMode === 'AIP') {
                if (gpsState.mode === 'DEP' && currentStartICAO) {
                    window.open(`https://aip.aero/de/vfr/?${currentStartICAO}`, '_blank');
                    return;
                }
                if (gpsState.mode === 'DEST' && currentDestICAO) {
                    window.open(`https://aip.aero/de/vfr/?${currentDestICAO}`, '_blank');
                    return;
                }
            }

            // WX: Direkt-Link öffnen wenn bereits auf DEP- oder DEST-Seite
            if (targetMode === 'WX') {
                if (gpsState.mode === 'DEP' && currentStartICAO) {
                    window.open(`https://metar-taf.com/de/${currentStartICAO}`, '_blank');
                    return;
                }
                if (gpsState.mode === 'DEST' && currentDestICAO) {
                    window.open(`https://metar-taf.com/de/${currentDestICAO}`, '_blank');
                    return;
                }
            }

            document.querySelectorAll('.kln90b-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gpsState.mode = targetMode;
            gpsState.subPage = 0;
            // Seitenanzahl auf Default zurücksetzen – wird nach Wiki-Fetch aktualisiert
            if (gpsState.mode === 'DEP' || gpsState.mode === 'DEST') {
                gpsState.maxPages[gpsState.mode] = 2;
            }
            renderGPS();
        });
    });
}

// --- Encoder Logic ---
function initGPSEncoders() {
    const encL = document.getElementById('gpsEncoderL');
    const encR = document.getElementById('gpsEncoderR');

    const prevPage = () => {
        const max = gpsState.maxPages[gpsState.mode] || 1;
        gpsState.subPage = (gpsState.subPage - 1 + max) % max;
        renderGPS();
    };
    const nextPage = () => {
        const max = gpsState.maxPages[gpsState.mode] || 1;
        gpsState.subPage = (gpsState.subPage + 1) % max;
        renderGPS();
    };

    // Linker Encoder: vorherige Seite
    if (encL) {
        encL.addEventListener('click', () => prevPage());
        encL.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.deltaY > 0 ? nextPage() : prevPage();
        });
    }
    // Rechter Encoder: nächste Seite
    if (encR) {
        encR.addEventListener('click', () => nextPage());
        encR.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.deltaY > 0 ? nextPage() : prevPage();
        });
    }
}

// --- COM2-Knopf: Ziel löschen ---
function initCom2Knob() {
    const knob = document.getElementById('com2Knob');
    if (!knob) return;
    knob.addEventListener('click', () => {
        currentDestICAO = '';
        const destLocEl      = document.getElementById('destLoc');
        const destLocRadioEl = document.getElementById('destLocRadio');
        if (destLocEl)      destLocEl.value      = '';
        if (destLocRadioEl) destLocRadioEl.value = '';
        // Falls KLN auf DEST steht, zurück zu FPL
        if (gpsState.mode === 'DEST') {
            document.querySelectorAll('.kln90b-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'FPL'));
            gpsState.mode    = 'FPL';
            gpsState.subPage = 0;
            if (gpsState.visible) renderGPS();
        }
    });
}

// --- Main Render ---
function renderGPS() {
    const left    = document.getElementById('gpsLeft');
    const right   = document.getElementById('gpsRight');
    const modeLbl = document.getElementById('gpsModeLbl');
    const pageLbl = document.getElementById('gpsPageLbl');
    if (!left || !right) return;

    const max = gpsState.maxPages[gpsState.mode] || 1;
    modeLbl.textContent = gpsState.mode;
    pageLbl.textContent = `PG ${gpsState.subPage + 1}/${max}`;

    switch (gpsState.mode) {
        case 'FPL':  renderFPL(left, right); break;
        case 'DEP':  renderAirportInfo(left, right, 'dep'); break;
        case 'DEST': renderAirportInfo(left, right, 'dest'); break;
        case 'AIP':  renderAIP(left, right); break;
        case 'WX':   renderWX(left, right); break;
    }
}

// --- FPL Mode ---
const FPL_LEGS_PER_PAGE = 6; // kompakte Zeilen pro Seite im Volldisplay

function renderFPL(left, right) {
    if (!currentMissionData) {
        left.innerHTML  = '<div class="kln90b-line dim">NO FLIGHTPLAN</div>';
        right.innerHTML = '<div class="kln90b-line dim">DISPATCH FIRST</div>';
        return;
    }

    const wps = routeWaypoints;

    // ── Alle Legs berechnen ──────────────────────────────────────────────────
    const legs = [];
    if (wps && wps.length >= 2) {
        for (let i = 0; i < wps.length - 1; i++) {
            const p1 = wps[i], p2 = wps[i + 1];
            const nav = calcNav(p1.lat, p1.lng || p1.lon, p2.lat, p2.lng || p2.lon);
            const n1 = i === 0              ? (currentStartICAO || 'DEP')  : `WP${i}`;
            const n2 = i === wps.length - 2 ? (currentDestICAO  || 'DEST') : `WP${i+1}`;
            legs.push({ n1, n2, brng: nav.brng, dist: nav.dist });
        }
    }

    // Nur Leg-Seiten (Performance wird rechts auf allen Seiten angezeigt)
    const legPages   = Math.max(1, Math.ceil(legs.length / FPL_LEGS_PER_PAGE));
    const totalPages = legPages;
    gpsState.maxPages['FPL'] = totalPages;
    if (gpsState.subPage >= totalPages) gpsState.subPage = totalPages - 1;

    const pageLbl = document.getElementById('gpsPageLbl');
    if (pageLbl) pageLbl.textContent = `PG ${gpsState.subPage + 1}/${totalPages}`;

    if (gpsState.subPage < legPages) {
        // ── Wegpunktseite ────────────────────────────────────────────────────
        const start   = gpsState.subPage * FPL_LEGS_PER_PAGE;
        const visible = legs.slice(start, start + FPL_LEGS_PER_PAGE);
        left.innerHTML = visible.map((l, idx) => {
            const absIdx = start + idx;
            const isEnd  = absIdx === 0 || absIdx === legs.length - 1;
            const cls    = isEnd ? 'highlight' : '';
            return `<div class="kln90b-line ${cls}" style="font-size:10px; line-height:1.5; white-space:nowrap;">${l.n1}\u2192${l.n2}&nbsp;&nbsp;<span class="dim">${l.brng}\u00b0&thinsp;${l.dist}&thinsp;NM</span></div>`;
        }).join('');
        if (legs.length === 0) {
            const dep  = currentStartICAO || '----';
            const dest = currentDestICAO  || '----';
            left.innerHTML = `<div class="kln90b-line highlight">${dep}</div><div class="kln90b-line dim">→${dest}</div>`;
        }
        // Rechts immer Performance zeigen auch auf Wegpunkt-Seiten
        const _dist2 = Math.round((currentMissionData.dist||0)*10)/10;
        const _tas2  = parseInt(document.getElementById('tasSlider')?.value)||115;
        const _gph2  = parseInt(document.getElementById('gphSlider')?.value)||9;
        const _mins2 = Math.round((_dist2/_tas2)*60);
        const _fuel2 = Math.ceil((_dist2/_tas2)*_gph2+0.75*_gph2);
        let _hdg2 = currentMissionData.heading||0;
        if (wps && wps.length>=2){const _f=wps[0],_l=wps[wps.length-1];_hdg2=calcNav(_f.lat,_f.lng||_f.lon,_l.lat,_l.lng||_l.lon).brng;}
        right.innerHTML =
            `<div class="kln90b-line dim" style="font-size:9px;">TOTAL:</div>`+
            `<div class="kln90b-line" style="font-size:10px;">DST ${_dist2}NM</div>`+
            `<div class="kln90b-line" style="font-size:10px;">TME ${_mins2}m</div>`+
            `<div class="kln90b-line" style="font-size:10px;">FUL ${_fuel2}G</div>`+
            `<div class="kln90b-line" style="font-size:10px;">HDG ${_hdg2}°</div>`;
    }
}

// --- DEP / DEST Mode ---
async function renderAirportInfo(left, right, type) {
    const icao = type === 'dep' ? currentStartICAO : currentDestICAO;
    if (!icao) {
        left.innerHTML  = '<div class="kln90b-line dim">NO DATA</div>';
        right.innerHTML = '<div class="kln90b-line dim">DISPATCH</div>';
        return;
    }

    const mode = gpsState.mode;
    const data = await getAirportData(icao);
    const name = (data && data.n) ? data.n : (type==='dep' ? currentSName : currentDName) || icao;
    const lat  = data ? data.lat.toFixed(4) : '---';
    const lon  = data ? data.lon.toFixed(4) : '---';
    const elev = data && data.elev ? data.elev + ' ft' : '---';

    // Linke Spalte: immer Ident + Name + Koordinaten
    left.innerHTML =
        `<div class="kln90b-line highlight" style="font-size:11px;">${icao}</div>` +
        `<div class="kln90b-line" style="font-size:9px; white-space:normal; line-height:1.35;">${name}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px; margin-top:2px;">${lat}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px;">${lon}</div>`;

    // Runway-Daten: Overpass sofort parallel starten, Wikipedia im Hintergrund
    right.innerHTML = '<div class="kln90b-line dim kln-loading-dots" style="margin-top:8px;"><span>●</span><span>●</span><span>●</span></div>';

    if (!runwayCache[icao] && data) {
        const trans = {asphalt:'Asphalt',concrete:'Beton',grass:'Gras',paved:'Asphalt',unpaved:'Unbefestigt',dirt:'Erde',gravel:'Schotter'};

        // Overpass sofort (schnell, ~1-2 s) → Platzhalter
        const ovPromise = fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
            `[out:json][timeout:8];way["aeroway"="runway"](around:3000,${data.lat},${data.lon});out tags;`)}`)
            .then(r => r.json())
            .then(ov => {
                if (ov?.elements?.length > 0 && !runwayCache[icao]) {
                    const seen = new Set(), parts = [];
                    for (const e of ov.elements) {
                        if (!e.tags?.ref || seen.has(e.tags.ref)) continue;
                        seen.add(e.tags.ref);
                        const surf = e.tags.surface ? (trans[e.tags.surface.toLowerCase()] || e.tags.surface) : '?';
                        const len  = e.tags.length  ? ' · '+Math.round(e.tags.length)+'m' : '';
                        parts.push(`${e.tags.ref} – ${surf}${len}`);
                    }
                    if (parts.length > 0) {
                        runwayCache[icao] = parts.join(' | ');
                        // Anzeige sofort aktualisieren falls noch auf Runway-Seite
                        if (gpsState.mode === mode && gpsState.subPage === 0) renderGPS();
                    }
                }
            }).catch(() => {});

        // Wikipedia parallel (langsamer, dafür vollständige Daten)
        fetchRunwayFromWikipedia(icao, data.lat, data.lon).then(wikiResult => {
            if (wikiResult) {
                runwayCache[icao] = wikiResult;   // überschreibt ggf. Overpass-Platzhalter
                // Anzeige aktualisieren falls noch auf Runway- oder Wiki-Seite
                if (gpsState.mode === mode) renderGPS();
            }
        }).catch(() => {});

        // Auf Overpass warten damit erste Render-Seite nicht leer ist
        await ovPromise;
    }

    const RWYS_PER_PAGE = 4;
    const allRunways  = runwayCache[icao] ? runwayCache[icao].split(' | ').filter(r=>r.trim()) : [];
    const rwyPages    = Math.max(1, Math.ceil(allRunways.length / RWYS_PER_PAGE));
    const sp          = gpsState.subPage;

    if (sp < rwyPages) {
        // Runway-Seite(n) – startet jetzt bei subPage 0
        const slice = allRunways.slice(sp * RWYS_PER_PAGE, (sp + 1) * RWYS_PER_PAGE);
        const label = rwyPages > 1 ? `RUNWAYS (${sp+1}/${rwyPages}):` : 'RUNWAYS:';
        right.innerHTML =
            `<div class="kln90b-line dim" style="font-size:9px; margin-bottom:1px;">${label}</div>` +
            (slice.length
                ? slice.map(r=>`<div class="kln90b-line" style="font-size:9px; white-space:normal; line-height:1.4;">▸ ${r}</div>`).join('')
                : '<div class="kln90b-line dim">NO RWY DATA</div>');

        // maxPages aktualisieren (Wiki noch unbekannt → 1 Platzhalter)
        const wikiN = gpsState.wikiCache[icao]?.length || 1;
        const total = rwyPages + wikiN;
        if (gpsState.maxPages[mode] !== total) {
            gpsState.maxPages[mode] = total;
            const lbl = document.getElementById('gpsPageLbl');
            if (lbl) lbl.textContent = `PG ${sp+1}/${total}`;
        }
        return;
    }

    // Wiki-Seite(n) – erst jetzt laden wenn wirklich gebraucht
    if (!gpsState.wikiCache[icao] && data) {
        await fetchAndCacheWikiPages(icao, data.lat, data.lon);
    }
    const wikiArr = gpsState.wikiCache[icao] || ['Keine Daten.'];
    const total   = rwyPages + wikiArr.length;
    if (gpsState.maxPages[mode] !== total) {
        gpsState.maxPages[mode] = total;
        const lbl = document.getElementById('gpsPageLbl');
        if (lbl) lbl.textContent = `PG ${sp+1}/${total}`;
    }
    if (gpsState.subPage >= total) gpsState.subPage = total - 1;

    const wikiIdx = sp - rwyPages;
    if (wikiIdx >= 0 && wikiIdx < wikiArr.length) {
        right.innerHTML =
            `<div class="kln90b-line" style="font-size:9px; line-height:1.5; white-space:normal;">${wikiArr[wikiIdx]}</div>`;
    } else {
        right.innerHTML = '<div class="kln90b-line dim">NO WIKI DATA</div>';
    }
}

// --- Wiki-Text für einen Flugplatz holen und in Seiten aufteilen ---
async function fetchAndCacheWikiPages(icao, lat, lon) {
    try {
        // Zuerst Direktsuche nach ICAO + Flugplatz-Begriffen
        const airportKeywords = ['Flugplatz', 'Flughafen', 'Airport', 'Aerodrome', icao];
        let title = null;

        // Geosearch mit größerem Radius, mehr Ergebnisse
        const geoRes = await fetch(
            `https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=10&format=json&origin=*`
        );
        const geoData = await geoRes.json();
        const results = geoData?.query?.geosearch || [];

        // Flugplatz-Artikel bevorzugen
        const airportArticle = results.find(r =>
            airportKeywords.some(kw => r.title.toLowerCase().includes(kw.toLowerCase()))
        );
        title = airportArticle ? airportArticle.title : (results[0]?.title || null);

        // Falls kein guter Treffer: Direktsuche nach ICAO
        if (!title || (!airportArticle && results.length > 0)) {
            try {
                const searchRes = await fetch(
                    `https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(icao + ' Flugplatz')}&srlimit=3&format=json&origin=*`
                );
                const searchData = await searchRes.json();
                const searchHit  = searchData?.query?.search?.find(r =>
                    airportKeywords.some(kw => r.title.toLowerCase().includes(kw.toLowerCase()))
                );
                if (searchHit) title = searchHit.title;
            } catch(e2) {}
        }

        if (!title) {
            gpsState.wikiCache[icao] = ['Keine Wikipedia-Daten gefunden.'];
            return;
        }

        // Mehr Sätze holen (bis zu 12) – wir paginieren selbst
        const extRes = await fetch(
            `https://de.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&exsentences=12&titles=${encodeURIComponent(title)}&format=json&origin=*`
        );
        const extData = await extRes.json();
        const pageId  = Object.keys(extData.query.pages)[0];
        const txt     = extData.query.pages[pageId]?.extract?.trim() || 'Keine Information verfügbar.';

        gpsState.wikiCache[icao] = splitTextIntoPages(txt, 170);
    } catch (e) {
        gpsState.wikiCache[icao] = ['Fetch-Fehler – bitte erneut versuchen.'];
    }
}

// --- Text an Satz-/Wortgrenzen in Seiten aufteilen ---
function splitTextIntoPages(text, charsPerPage = 360) {
    // Überschüssige Leerzeilen entfernen
    const cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
    const pages   = [];
    let remaining = cleaned;
    while (remaining.length > 0) {
        if (remaining.length <= charsPerPage) {
            pages.push(remaining);
            break;
        }
        // Satzgrenze in ±40 Zeichen um das Limit suchen (.!?)
        let cut = charsPerPage;
        const lo = Math.max(cut - 60, 1), hi = Math.min(cut + 40, remaining.length - 1);
        for (let i = hi; i >= lo; i--) {
            if (('.!?').includes(remaining[i]) && remaining[i+1] === ' ') {
                cut = i + 1; break;
            }
        }
        // Fallback: Wortgrenze
        if (cut === charsPerPage) {
            while (cut > 0 && remaining[cut] !== ' ' && remaining[cut] !== '\n') cut--;
            if (cut === 0) cut = charsPerPage;
        }
        pages.push(remaining.substring(0, cut).trim());
        remaining = remaining.substring(cut).trim();
    }
    return pages.length > 0 ? pages : ['Keine Info'];
}

// --- AIP Mode ---
function renderAIP(left, right) {
    // subPage 0 = DEP, subPage 1 = DEST
    const isDep  = gpsState.subPage === 0;
    const icao   = isDep ? currentStartICAO : currentDestICAO;
    const name   = isDep ? currentSName : currentDName;
    const label  = isDep ? 'DEP' : 'DEST';
    gpsState.maxPages['AIP'] = 2;

    left.innerHTML =
        `<div class="kln90b-line highlight">${label}</div>` +
        `<div class="kln90b-line" style="font-size:10px;">${icao || '----'}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px; white-space:normal;">${name||''}</div>`;

    if (!icao) { right.innerHTML = '<div class="kln90b-line dim">NO DATA</div>'; return; }

    right.innerHTML =
        `<div class="kln90b-line dim">AIP VFR</div>` +
        `<div class="kln90b-line highlight" style="cursor:pointer;" onclick="window.open('https://aip.aero/de/vfr/?${icao}','_blank')">OPEN ▸</div>` +
        `<div class="kln90b-line dim" style="font-size:9px;">aip.aero</div>`;
}

// --- WX / METAR Mode ---
function renderWX(left, right) {
    // subPage 0 = DEP, subPage 1 = DEST
    const isDep  = gpsState.subPage === 0;
    const icao   = isDep ? currentStartICAO : currentDestICAO;
    const name   = isDep ? currentSName : currentDName;
    const label  = isDep ? 'DEP' : 'DEST';
    gpsState.maxPages['WX'] = 2;

    left.innerHTML =
        `<div class="kln90b-line highlight">${label}</div>` +
        `<div class="kln90b-line" style="font-size:10px;">${icao||'----'}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px; white-space:normal;">${name||''}</div>`;

    if (!icao) { right.innerHTML = '<div class="kln90b-line dim">NO DATA</div>'; return; }

    right.innerHTML =
        `<div class="kln90b-line dim">METAR/TAF</div>` +
        `<div class="kln90b-line highlight" style="cursor:pointer;" onclick="window.open('https://metar-taf.com/de/${icao}','_blank')">OPEN ▸</div>` +
        `<div class="kln90b-line dim" style="font-size:9px;">metar-taf.com</div>`;
}

// --- Refresh GPS after mission dispatch ---
function refreshGPSAfterDispatch() {
    if (gpsState.visible) {
        setTimeout(() => renderGPS(), 500);
    }
}

// --- Init on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    initGPSButtons();
    initGPSEncoders();
    initCom2Knob();
    restoreAudioButtonStates();
});