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

function syncGPSWithTheme(newMode, wasNavcom) {
    const fp  = document.querySelector('.flightplan-container');
    const mod = document.getElementById('kln90bModule');
    if (newMode === 'navcom') {
        if (gpsState.visible) {
            if (mod) mod.style.display = 'flex';
            if (fp)  fp.style.display  = 'none';
            renderGPS();
        } else {
            if (mod) mod.style.display = 'none';
            if (fp)  fp.style.display  = '';
        }
    } else {
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
        el.innerText = value; 
    }
}

function applyNavComPreset(t, g, s, n, btnElement) {
    applyPreset(t, g, s, n); 
    document.getElementById('btnAC-C172').classList.remove('active');
    document.getElementById('btnAC-PA24').classList.remove('active');
    document.getElementById('btnAC-AERO').classList.remove('active');
    btnElement.classList.add('active');
    document.getElementById('tasSlider').value = t;
    document.getElementById('gphSlider').value = g;
    handleSliderChange('tas', t);
    handleSliderChange('gph', g);
    syncToNavCom('tasRadioDisplay', t);
    syncToNavCom('gphRadioDisplay', g);
    saveAudioButtonStates();
}

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

function swapDepDest() {
    const depRadio  = document.getElementById('startLocRadio');
    const destRadio = document.getElementById('destLocRadio');
    const depClassic  = document.getElementById('startLoc');
    const destClassic = document.getElementById('destLoc');
    if (!depRadio || !destRadio) return;

    if (!destRadio.value || !destRadio.value.trim()) {
        destRadio.value = depRadio.value;
        if (destClassic) destClassic.value = depRadio.value;
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
    if (depClassic)  depClassic.value  = depRadio.value;
    if (destClassic) destClassic.value = destRadio.value;
    updateMapFromInputs();
}

function cycleRadioOption(selectId) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;
    let nextIndex = selectEl.selectedIndex + 1;
    if (nextIndex >= selectEl.options.length) nextIndex = 0; 
    selectEl.selectedIndex = nextIndex;
    selectEl.dispatchEvent(new Event('change'));
}

function toggleNotes(event) {
    // Wenn wir auf einen Link oder Button klicken, nichts tun
    if (event && (event.target.tagName === 'A' || event.target.tagName === 'BUTTON')) return;

    const stack = document.getElementById('notesStack');
    const p1 = document.getElementById('notePage1'), p2 = document.getElementById('notePage2'), p3 = document.getElementById('notePage3'), p4 = document.getElementById('notePage4');
    if (!p1 || !p2 || !p3 || !p4) return;

    let forward = true;

    // Wenn auf die Büroklammer geklickt wird -> Immer zurück (ist ja ganz links)
    if (event && event.target && event.target.classList.contains('paperclip')) {
        forward = false;
    }
    // Ansonsten: Einfach - links vom Bildschirm = zurück
    else {
        if (event.clientX < window.innerWidth / 2) {
            forward = false;
        }
    }

    if (forward) {
        if(p1.classList.contains('front-note')) {
            p1.className = 'mission-note-page fourth-note'; p2.className = 'mission-note-page front-note'; p3.className = 'mission-note-page back-note'; p4.className = 'mission-note-page third-note';
        } else if(p2.classList.contains('front-note')) {
            p2.className = 'mission-note-page fourth-note'; p3.className = 'mission-note-page front-note'; p4.className = 'mission-note-page back-note'; p1.className = 'mission-note-page third-note';
        } else if(p3.classList.contains('front-note')) {
            p3.className = 'mission-note-page fourth-note'; p4.className = 'mission-note-page front-note'; p1.className = 'mission-note-page back-note'; p2.className = 'mission-note-page third-note';
        } else {
            p4.className = 'mission-note-page fourth-note'; p1.className = 'mission-note-page front-note'; p2.className = 'mission-note-page back-note'; p3.className = 'mission-note-page third-note';
        }
    } else {
        if(p1.classList.contains('front-note')) {
            p1.className = 'mission-note-page back-note'; p2.className = 'mission-note-page third-note'; p3.className = 'mission-note-page fourth-note'; p4.className = 'mission-note-page front-note';
        } else if(p2.classList.contains('front-note')) {
            p2.className = 'mission-note-page back-note'; p3.className = 'mission-note-page third-note'; p4.className = 'mission-note-page fourth-note'; p1.className = 'mission-note-page front-note';
        } else if(p3.classList.contains('front-note')) {
            p3.className = 'mission-note-page back-note'; p4.className = 'mission-note-page third-note'; p1.className = 'mission-note-page fourth-note'; p2.className = 'mission-note-page front-note';
        } else {
            p4.className = 'mission-note-page back-note'; p1.className = 'mission-note-page third-note'; p2.className = 'mission-note-page fourth-note'; p3.className = 'mission-note-page front-note';
        }
    }
}

function toggleWikiPhoto(event, containerId) {
    const container = document.getElementById(containerId);
    if(!container) { event.stopPropagation(); return; }
    
    // Nur reagieren, wenn das Foto auch auf der aktiven Seite ist!
    const page = container.closest('.mission-note-page');
    if (page && !page.classList.contains('front-note')) {
        // Event durchlassen -> Seite wird umgeblättert
        return; 
    }

    event.stopPropagation();
    container.classList.toggle('photo-zoomed');
    
    let backdrop = document.getElementById('photo-backdrop');
    if (container.classList.contains('photo-zoomed')) {
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'photo-backdrop';
            backdrop.style = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); border-radius: 4px; z-index: 50; opacity: 0; transition: opacity 0.4s;';
            container.parentElement.appendChild(backdrop);
            void backdrop.offsetWidth;
            backdrop.style.opacity = '1';
            backdrop.onclick = function(e) { e.stopPropagation(); toggleWikiPhoto(e, containerId); };
        }
    } else if (backdrop) {
        backdrop.style.opacity = '0';
        setTimeout(() => backdrop.remove(), 400);
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
let currentDepFreq = "";
let currentDestFreq = "";
let globalAirports = null, runwayCache = {}, freqCache = {};

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
   DRAG-KNOB LOGIK
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
        document.body.style.cursor = 'ns-resize'; 
        e.preventDefault();
    }

    function onMove(e) {
        if (!isDragging) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        
        let delta = Math.round((startY - clientY) + (clientX - startX));
        if (type === 'gph') delta = Math.round(delta * 0.3); 
        
        let newVal = startVal + delta;
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        display.innerText = newVal;
        slider.value = newVal;
        
        currentRotation = delta * 5; 
        knob.style.transform = `rotate(${currentRotation}deg)`;

        handleSliderChange(type, newVal);
        if (gpsState.visible && gpsState.mode === 'FPL') {
            refreshGPSAfterDispatch();
        }
    }

    function onEnd() {
        isDragging = false;
        document.body.style.cursor = 'default';
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

    syncToNavCom('startLocRadio', document.getElementById('startLoc').value);
    syncToNavCom('tasRadioDisplay', document.getElementById('tasSlider').value);
    syncToNavCom('gphRadioDisplay', document.getElementById('gphSlider').value);
    syncToNavCom('maxSeatsRadio', document.getElementById('maxSeats').value);

    initDragKnob('tasDragKnob', 'tasRadioDisplay', 'tasSlider', 80, 260, 'tas');
    initDragKnob('gphDragKnob', 'gphRadioDisplay', 'gphSlider', 5, 35, 'gph');
    
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
    
    const imgDepEl = document.getElementById("wikiDepImage");
    const imgDepUrl = (imgDepEl && imgDepEl.style.backgroundImage !== 'url("")') ? imgDepEl.style.backgroundImage : "";
    const imgDestEl = document.getElementById("wikiDestImage");
    const imgDestUrl = (imgDestEl && imgDestEl.style.backgroundImage !== 'url("")') ? imgDestEl.style.backgroundImage : "";

    const state = {
        mTitle: document.getElementById('mTitle').innerHTML,
        mStory: document.getElementById('mStory').innerText,
        mDepICAO: document.getElementById("mDepICAO").innerText,
        mDepName: document.getElementById("mDepName").innerText,
        mDepCoords: document.getElementById("mDepCoords").innerText,
        mDepRwy: '',   
        destIcon: document.getElementById("destIcon").innerText,
        mDestICAO: document.getElementById("mDestICAO").innerText,
        mDestName: document.getElementById("mDestName").innerText,
        mDestCoords: document.getElementById("mDestCoords").innerText,
        mDestRwy: '',  
        mPay: document.getElementById("mPay").innerText,
        mWeight: document.getElementById("mWeight").innerText,
        mDistNote: document.getElementById("mDistNote").innerText,
        mHeadingNote: document.getElementById("mHeadingNote").innerText,
        mETENote: document.getElementById("mETENote").innerText,
        wikiDepDescText: document.getElementById("wikiDepDescText") ? document.getElementById("wikiDepDescText").innerText : "",
        wikiDestDescText: document.getElementById("wikiDestDescText") ? document.getElementById("wikiDestDescText").innerText : "",
        wikiDepFreqText: document.getElementById("wikiDepFreqText") ? document.getElementById("wikiDepFreqText").innerHTML : "",
        wikiDestFreqText: document.getElementById("wikiDestFreqText") ? document.getElementById("wikiDestFreqText").innerHTML : "",
        wikiDepImageUrl: imgDepUrl,
        wikiDestImageUrl: imgDestUrl, 
        isPOI: document.getElementById("destRwyContainer").style.display === "none",
        currentMissionData: currentMissionData,
        routeWaypoints: routeWaypoints,
        currentStartICAO: currentStartICAO,
        currentDestICAO: currentDestICAO,
        currentSName: currentSName,
        currentDName: currentDName,
        currentDepFreq: currentDepFreq,
        currentDestFreq: currentDestFreq,
        freqCache: freqCache
    };
    localStorage.setItem('ga_active_mission', JSON.stringify(state));
}

async function restoreMissionState(state) {
    document.getElementById('mTitle').innerHTML = state.mTitle; document.getElementById('mStory').innerText = state.mStory;
    document.getElementById("mDepICAO").innerText = state.mDepICAO; document.getElementById("mDepName").innerText = state.mDepName;
    document.getElementById("mDepCoords").innerText = state.mDepCoords; document.getElementById("mDepRwy").innerText = "Sucht Pisten...";
    const rDepName = document.getElementById('wikiDepNameDisplay');
    if (rDepName) rDepName.innerText = `${state.mDepICAO} – ${state.mDepName}`;
    document.getElementById("destIcon").innerText = state.destIcon; document.getElementById("mDestICAO").innerText = state.mDestICAO;
    document.getElementById("mDestName").innerText = state.mDestName; document.getElementById("mDestCoords").innerText = state.mDestCoords;
    const rDestName = document.getElementById('wikiDestNameDisplay');
    if (rDestName) rDestName.innerText = `${state.mDestICAO} – ${state.mDestName}`;
    document.getElementById("mDestRwy").innerText = state.isPOI ? "" : "Sucht Pisten..."; document.getElementById("mPay").innerText = state.mPay;
    document.getElementById("mWeight").innerText = state.mWeight; document.getElementById("mDistNote").innerText = state.mDistNote;
    document.getElementById("mHeadingNote").innerText = state.mHeadingNote; document.getElementById("mETENote").innerText = state.mETENote;
    
    if (document.getElementById("wikiDepDescText")) document.getElementById("wikiDepDescText").innerText = state.wikiDepDescText || "";
    if (document.getElementById("wikiDestDescText")) document.getElementById("wikiDestDescText").innerText = state.wikiDestDescText || "";
    
    if (document.getElementById("wikiDepFreqText")) document.getElementById("wikiDepFreqText").innerHTML = state.wikiDepFreqText || "";
    if (document.getElementById("wikiDestFreqText")) document.getElementById("wikiDestFreqText").innerHTML = state.wikiDestFreqText || "";
    
    const imgDepContainer = document.getElementById("wikiDepImageContainer");
    const imgDepEl = document.getElementById("wikiDepImage");
    if (state.wikiDepImageUrl && imgDepContainer && imgDepEl) {
        imgDepEl.style.backgroundImage = state.wikiDepImageUrl;
        imgDepContainer.style.display = 'block';
    } else if (imgDepContainer) { imgDepContainer.style.display = 'none'; }

    const imgDestContainer = document.getElementById("wikiDestImageContainer");
    const imgDestEl = document.getElementById("wikiDestImage");
    if (state.wikiDestImageUrl && imgDestContainer && imgDestEl) {
        imgDestEl.style.backgroundImage = state.wikiDestImageUrl;
        imgDestContainer.style.display = 'block';
    } else if (imgDestContainer) { imgDestContainer.style.display = 'none'; }

    document.getElementById("destRwyContainer").style.display = state.isPOI ? "none" : "block";
    if (document.getElementById("wikiDestRwyText")) document.getElementById("wikiDestRwyText").style.display = state.isPOI ? "none" : "block";
    const destSwitchRow = document.getElementById("destSwitchRow"); if(destSwitchRow) destSwitchRow.style.display = "flex";
    const destLinks = document.getElementById("wikiDestLinks"); if(destLinks) destLinks.style.display = state.isPOI ? "none" : "block";

    currentMissionData = state.currentMissionData; routeWaypoints = state.routeWaypoints;
    currentStartICAO = state.currentStartICAO; currentDestICAO = state.currentDestICAO;
    currentSName = state.currentSName; currentDName = state.currentDName;
    currentDepFreq = state.currentDepFreq || ""; currentDestFreq = state.currentDestFreq || "";
    freqCache = state.freqCache || {};

    // Fallback: Wenn Frequenzen im Briefing fehlen (z.B. alte Pinnwand-Daten), neu laden
    if (!state.wikiDepFreqText && currentStartICAO) {
        fetchAirportFreq(currentStartICAO, 'wikiDepFreqText', 'dep');
    }
    if (!state.wikiDestFreqText && currentDestICAO && !state.isPOI) {
        fetchAirportFreq(currentDestICAO, 'wikiDestFreqText', 'dest');
    }

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
    
    gpsState.mode = 'FPL';
    gpsState.subPage = 0;
    gpsState.maxPages = { FPL: 1, DEP: 2, DEST: 2, AIP: 2, WX: 2 };
    gpsState.wikiCache = {};
    gpsState.metarCache = {};
    runwayCache = {};
    document.querySelectorAll('.kln90b-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'FPL'));
    
    setTimeout(() => refreshGPSAfterDispatch(), 200);
    
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
    
    const destLocEl      = document.getElementById('destLoc');
    const destLocRadioEl = document.getElementById('destLocRadio');
    const p1 = document.getElementById('notePage1'), p2 = document.getElementById('notePage2'), p3 = document.getElementById('notePage3');
    if(p1 && p2 && p3) { p1.className = 'mission-note-page front-note'; p2.className = 'mission-note-page back-note'; p3.className = 'mission-note-page third-note'; }
    if (destLocEl)      destLocEl.value      = '';
    if (destLocRadioEl) destLocRadioEl.value = '';

    document.getElementById('searchIndicator').innerText = "System bereit."; setDrumCounter('distDrum', 0); recalculatePerformance();
    const rBtn = document.getElementById('radioGenerateBtn');
    if(rBtn) rBtn.classList.remove('active');
    
    gpsState.wikiCache = {};
    gpsState.metarCache = {};
    runwayCache = {}; 
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

async function fetchAreaDescription(lat, lon, elementId, exactTitle = null, icaoCode = null, imgContainerId = 'wikiDestImageContainer', imgElId = 'wikiDestImage') {
    const imgContainer = document.getElementById(imgContainerId);
    const imgElement = document.getElementById(imgElId);
    const textElement = document.getElementById(elementId);
    if (imgContainer) imgContainer.style.display = 'none';
    if (!textElement) return;

    try {
        let titleToFetch = exactTitle;
        if (!titleToFetch && icaoCode) titleToFetch = await getWikiTitleForAirport(icaoCode, lat, lon);

        if (!titleToFetch) {
            const geoRes = await fetch(`https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=1&format=json&origin=*`);
            const geoData = await geoRes.json();
            if (geoData?.query?.geosearch?.length > 0) titleToFetch = geoData.query.geosearch[0].title;
            else { textElement.innerText = "Keine regionalen Wikipedia-Daten gefunden."; return; }
        }

        if (titleToFetch) {
            const extRes = await fetch(`https://de.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=true&explaintext=true&exsentences=4&pithumbsize=400&titles=${encodeURIComponent(titleToFetch)}&format=json&origin=*`);
            const extData = await extRes.json();
            
            if (extData?.query?.pages) {
                const pageId = Object.keys(extData.query.pages)[0];
                if (pageId !== "-1" && extData.query.pages[pageId].extract) {
                    let prefix = exactTitle ? "" : `Region (${titleToFetch}):\n\n`;
                    textElement.innerText = prefix + extData.query.pages[pageId].extract;
                    
                    const imgUrl = extData.query.pages[pageId].thumbnail?.source;
                    if (imgUrl && imgContainer && imgElement) {
                        imgElement.style.backgroundImage = `url('${imgUrl}')`;
                        imgContainer.style.display = 'block';
                    }
                    return;
                }
            }
        }
        textElement.innerText = "Der Artikel konnte nicht von Wikipedia abgerufen werden.";
    } catch(e) { textElement.innerText = "Wiki-Daten konnten nicht geladen werden."; }
}

async function fetchRunwayDetails(lat, lon, elementId, icaoCode) {
    const domEl = document.getElementById(elementId);
    if (!domEl) return;
    const hColor = document.body.classList.contains('theme-retro') ? 'var(--piper-yellow)' : 'var(--warn)';
    
    // Check Cache first
    if (icaoCode && runwayCache[icaoCode]) { 
        domEl.innerHTML = runwayCache[icaoCode].replace(/\n/g, '<br>'); 
        domEl.style.color = hColor; 
        if (icaoCode === currentStartICAO && document.getElementById('wikiDepRwyText')) document.getElementById('wikiDepRwyText').innerHTML = 'Pisten:<br>' + domEl.innerHTML;
        if (icaoCode === currentDestICAO && document.getElementById('wikiDestRwyText')) document.getElementById('wikiDestRwyText').innerHTML = 'Pisten:<br>' + domEl.innerHTML;
        return; 
    }

    const wikiResult = await fetchRunwayFromWikipedia(icaoCode, lat, lon);
    if (wikiResult) {
        if (icaoCode) runwayCache[icaoCode] = wikiResult;
        domEl.innerHTML = wikiResult.replace(/\n/g, '<br>');
        domEl.style.color = hColor;
        if (icaoCode === currentStartICAO && document.getElementById('wikiDepRwyText')) document.getElementById('wikiDepRwyText').innerHTML = 'Pisten:<br>' + domEl.innerHTML;
        if (icaoCode === currentDestICAO && document.getElementById('wikiDestRwyText')) document.getElementById('wikiDestRwyText').innerHTML = 'Pisten:<br>' + domEl.innerHTML;
        return;
    }

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
            if (parts.length > 0) { 
                const rwyString = parts.join('\n');
                if (icaoCode) runwayCache[icaoCode] = rwyString;
                domEl.innerHTML = rwyString.replace(/\n/g, '<br>'); 
                domEl.style.color = hColor; 
                if (icaoCode === currentStartICAO && document.getElementById('wikiDepRwyText')) document.getElementById('wikiDepRwyText').innerHTML = 'Pisten:<br>' + domEl.innerHTML;
                if (icaoCode === currentDestICAO && document.getElementById('wikiDestRwyText')) document.getElementById('wikiDestRwyText').innerHTML = 'Pisten:<br>' + domEl.innerHTML;
                return; 
            }
        }
    } catch (e) {}
    
    const notFoundStr = "Keine Daten gefunden";
    domEl.innerText = notFoundStr; 
    domEl.style.color = "#888";
    if (icaoCode) runwayCache[icaoCode] = notFoundStr;
    if (icaoCode === currentStartICAO && document.getElementById('wikiDepRwyText')) document.getElementById('wikiDepRwyText').innerText = 'Pisten: ' + notFoundStr;
    if (icaoCode === currentDestICAO && document.getElementById('wikiDestRwyText')) document.getElementById('wikiDestRwyText').innerText = 'Pisten: ' + notFoundStr;
}

const wikiTitleCache = {};

async function getWikiTitleForAirport(icao, lat, lon) {
    if (wikiTitleCache[icao]) return wikiTitleCache[icao];

    try {
        const wdRes = await fetchWithTimeout(`https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P239=${icao}&format=json&origin=*`, 4000);
        const wdData = await wdRes.json();
        if (wdData?.query?.search?.length > 0) {
            wikiTitleCache[icao] = wdData.query.search[0].title;
            return wdData.query.search[0].title;
        }

        const isAirport = (t) => ['flugplatz', 'flughafen', 'airport', 'air base', 'aerodrome', 'segelflug', 'landeplatz', 'fliegerhorst', icao.toLowerCase()].some(kw => t.toLowerCase().includes(kw));
        
        const geoRes = await fetchWithTimeout(`https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=10&format=json&origin=*`, 4000);
        const geoData = await geoRes.json();
        const geoResults = geoData?.query?.geosearch || [];
        
        let hit = geoResults.find(r => isAirport(r.title));
        if (hit) {
            wikiTitleCache[icao] = hit.title;
            return hit.title;
        }

        const txtRes = await fetchWithTimeout(`https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(icao + ' Flughafen OR Flugplatz')}&srlimit=5&format=json&origin=*`, 4000);
        const txtData = await txtRes.json();
        const txtResults = txtData?.query?.search || [];
        
        hit = txtResults.find(r => isAirport(r.title));
        if (hit) {
            wikiTitleCache[icao] = hit.title;
            return hit.title;
        } else if (txtResults.length > 0 && !txtResults[0].title.includes("Terminal")) {
            wikiTitleCache[icao] = txtResults[0].title;
            return txtResults[0].title;
        }
    } catch (e) {}
    return null;
}

async function fetchRunwayFromWikipedia(icaoCode, lat, lon) {
    if (!icaoCode) return null;
    try {
        const title = await getWikiTitleForAirport(icaoCode, lat, lon);
        if (!title) return null;

        const r = await fetchWithTimeout(`https://de.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(title)}&format=json&origin=*`, 5000);
        const d = await r.json();
        const pages = d?.query?.pages;
        
        if (pages) {
            const pageId = Object.keys(pages)[0];
            const wikitext = pages[pageId]?.revisions?.[0]?.slots?.main?.['*'];
            if (wikitext) return parseRunwayFromWikitext(wikitext);
        }
    } catch(e) {}
    return null;
}

function parseRunwayFromWikitext(wikitext) {
    const runways = [];
    const commentRegex = new RegExp('<' + '!--[\\s\\S]*?--' + '>', 'g');
    let text = wikitext.replace(commentRegex, '');
    text = text.replace(/<br\s*\/?>/gi, ' ');
    text = text.replace(/&#160;/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&times;/gi, '×');
    text = text.replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2'); 
    text = text.replace(/<[^>]+>/g, ' '); 
    text = text.replace(/\s+/g, ' '); 

    const HDG_PATTERN = /\b((?:0?[1-9]|[12]\d|3[0-6])[LRC]?\s*\/\s*(?:0?[1-9]|[12]\d|3[0-6])[LRC]?)\b/g;
    const SURFACES = /\b(asphalt|beton|gras|grass|schotter|gravel|concrete|paved|unpaved|dirt|erde|sand|wasser|water|eis|ice)\b/i;
    const LEN_PATTERN = /(?:(?:länge|length|len)\d*\s*=\s*([1-9][\d.,]*))|(?:([1-9][\d.,]*)\s*(?:m|Meter)\b)|(?:([1-9][\d.,]*)\s*(?:x|×)\s*\d+)/i;

    let matches = [];
    let match;
    while ((match = HDG_PATTERN.exec(text)) !== null) {
        let cleanHdg = match[1].replace(/\s+/g, '');
        let parts = cleanHdg.split('/');
        if (Math.abs(parseInt(parts[0], 10) - parseInt(parts[1], 10)) === 18) {
            matches.push({ hdg: cleanHdg, index: match.index, raw: match[1] });
        }
    }

    for (let i = 0; i < matches.length; i++) {
        const hdg = matches[i].hdg;
        const startIdx = matches[i].index;
        
        let endIdx = Math.min(startIdx + 200, text.length);
        if (i + 1 < matches.length) {
            if (matches[i+1].index < endIdx) endIdx = matches[i+1].index;
        }
        let contextFwd = text.substring(startIdx, endIdx);
        
        let preStartIdx = Math.max(0, startIdx - 60);
        if (i > 0) {
            const prevEnd = matches[i-1].index + matches[i-1].raw.length;
            if (prevEnd > preStartIdx) preStartIdx = prevEnd;
        }
        let contextBwd = text.substring(preStartIdx, startIdx);

        let length = '';
        let surface = '';

        let lenMatch = contextFwd.match(LEN_PATTERN);
        if (!lenMatch) lenMatch = contextBwd.match(LEN_PATTERN); 
        
        let rawLen = lenMatch ? (lenMatch[1] || lenMatch[2] || lenMatch[3]) : null;
        
        if (!rawLen) {
            let isolatedNum = contextFwd.match(/(?:\||\s|^)([1-9][\d.]{2,3})(?:\s|\||$)/);
            if (!isolatedNum) isolatedNum = contextBwd.match(/(?:\||\s|^)([1-9][\d.]{2,3})(?:\s|\||$)/);
            if (isolatedNum) rawLen = isolatedNum[1];
        }

        if (rawLen) length = rawLen.replace(/[.,]/g, '') + 'm';

        let surfMatch = contextFwd.match(SURFACES);
        if (!surfMatch) surfMatch = contextBwd.match(SURFACES);
        
        if (surfMatch) surface = surfMatch[1].charAt(0).toUpperCase() + surfMatch[1].slice(1).toLowerCase();

        if (length || surface || matches.length === 1) {
            runways.push([hdg, length, surface].filter(Boolean).join(' · '));
        }
    }

    if (runways.length === 0) return null;
    
    const uniqueRunways = [...new Set(runways)];
    uniqueRunways.sort((a, b) => b.length - a.length);
    
    const finalRunways = [];
    
    for (const rwy of uniqueRunways) {
        const parts = rwy.split(' · ');
        const currentHdg = parts[0];
        
        const currentSurfMatch = rwy.match(new RegExp(SURFACES.source, 'i'));
        const currentSurf = currentSurfMatch ? currentSurfMatch[1].toLowerCase() : null;

        let isSubsetOrHistory = false;

        for (const existing of finalRunways) {
            const existingParts = existing.split(' · ');
            if (existingParts[0] === currentHdg) {
                
                let allAttrMatch = true;
                for (let j = 1; j < parts.length; j++) {
                    if (!existing.includes(parts[j])) {
                        allAttrMatch = false;
                        break;
                    }
                }
                
                if (allAttrMatch) {
                    isSubsetOrHistory = true;
                    break;
                }

                const existingSurfMatch = existing.match(new RegExp(SURFACES.source, 'i'));
                const existingSurf = existingSurfMatch ? existingSurfMatch[1].toLowerCase() : null;

                if (existingSurf === currentSurf || !currentSurf) {
                    isSubsetOrHistory = true;
                    break;
                }
            }
        }
        
        if (!isSubsetOrHistory) {
            finalRunways.push(rwy);
        }
    }
    
    return finalRunways.slice(0, 5).join('\n');
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
        "Kulinarischer Ausflug ($100 Burger, legendäre Pizza, Steak oder BBQ am Ziel)",
        "Kaffee & Kuchen Run (Klassischer Nachmittagsausflug zum Flugplatz-Café)",
        "Tagesausflug mit Freunden (Wandern, Action oder einfach abhängen am Zielort)",
        "Städtetrip (Sightseeing, Kultur, 1-2 echte Highlights der Zielstadt erkunden)",
        "Wellness-Urlaub / Romantischer Wochenendausflug mit der Frau/dem Partner",
        "Besuch bei einem befreundeten Fliegerverein (Stammtisch, Fly-In, Austausch)",
        "Flugplatz-Logistik (Ersatzteil für die Vereinsmaschine holen, Mechaniker-Shuttle)",
        "Spezielles Flugtraining (Seitenwind, Navigation, Platzrunden-Drill am fremden Platz)",
        "Business-Charter (Alltäglicher Flug für einen Architekten, Anwalt oder Bauleiter)",
        "Eilige, aber unspektakuläre Kleinfracht (Dokumente, Ersatzteile)",
        "Kurioses / Verrückter, aber friedlicher Privatflug",
        "Tierrettung / Tiertransport" 
    ];
    
    const randomTheme = isPOI 
        ? poiCategories[Math.floor(Math.random() * poiCategories.length)] 
        : aptCategories[Math.floor(Math.random() * aptCategories.length)];

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
        const resFlash3 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, reqOptions);
        if (resFlash3.ok) {
            const data = await resFlash3.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('flash'); 
            return { t: parsed.title, s: parsed.story, pax: parsed.pax, cargo: parsed.cargo, i: "📋", cat: "std", _source: "Gemini 3.0 Flash" };
        } 
    } catch (e) {}

    try {
        const resFlash = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, reqOptions);
        if (resFlash.ok) {
            const data = await resFlash.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('flash'); 
            return { t: parsed.title, s: parsed.story, pax: parsed.pax, cargo: parsed.cargo, i: "📋", cat: "std", _source: "Gemini 2.5 Flash" };
        }
    } catch (e) {}

    try {
        const resLite = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, reqOptions);
        if (resLite.ok) {
            const data = await resLite.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('lite'); 
            return { t: parsed.title, s: parsed.story, pax: parsed.pax, cargo: parsed.cargo, i: "📋", cat: "std", _source: "Gemini 2.5 Flash Lite" };
        }
    } catch (e) {}
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

async function fetchAirportFreq(icao, elementId, type) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = '📻 Sucht Frequenz...';
    const proxy = 'https://ga-proxy.einherjer.workers.dev';

    const freqLabelMap = {
        'TWR': 'Turm', 'TOWER': 'Turm',
        'GND': 'Rollkontrolle', 'GROUND': 'Rollkontrolle',
        'ATIS': 'Information', 'INFO': 'Information',
        'RADIO': 'Radio', 'CTAF': 'Radio', 'UNICOM': 'Radio', 'MULTICOM': 'Radio',
        'APP': 'Anflug', 'APPROACH': 'Anflug',
        'DEP': 'Abflug', 'DEPARTURE': 'Abflug',
        'FIS': 'FIS', 'APRON': 'Vorfeld', 'AWOS': 'AWOS'
    };

    try {
        const res = await fetch(`${proxy}/api/airports?search=${icao}&limit=1&t=${Date.now()}`);
        const data = await res.json();
        if (data && data.items && data.items.length > 0) {
            const apt = data.items[0];
            if (apt.frequencies && apt.frequencies.length > 0) {
                
                // Bestimme die relevanteste Frequenz (Tower > Info > Radio)
                const prio = { 'TOWER':1, 'TWR':1, 'INFO':2, 'INFORMATION':2, 'ATIS':2, 'RADIO':3, 'CTAF':3, 'UNICOM':3, 'MULTICOM':3, 'APP':4, 'APPROACH':4 };
                let bestF = apt.frequencies[0];
                let bestScore = 99;
                apt.frequencies.forEach(f => {
                    const n = (f.name||'').toUpperCase().trim();
                    const score = prio[n] || 99;
                    if(score < bestScore) { bestScore = score; bestF = f; }
                });
                
                // Speichere NUR den Zahlenwert für die Routen-Tabelle
                const bestFreqValue = bestF.value;
                if (type === 'dep') currentDepFreq = bestFreqValue;
                if (type === 'dest') currentDestFreq = bestFreqValue;
                
                updateRoutePerformance();

                // Für die Detail-Anzeige auf der Karte alle formatieren
                const labeledFreqs = apt.frequencies.map(f => {
                    const fName = (f.name || '').toUpperCase().trim();
                    const label = freqLabelMap[fName] || f.name || 'Freq';
                    return { label: label, value: f.value };
                });
                const lines = labeledFreqs.map(lf => `📻 ${lf.label}: ${lf.value}`);
                if (el) el.innerHTML = lines.join('<br>');

                freqCache[icao] = labeledFreqs;
                return bestFreqValue;
            }
        }
        if (el) el.innerText = '';
        freqCache[icao] = []; // Mark as fetched but empty
    } catch(e) {
        if (el) el.innerText = '';
        freqCache[icao] = []; // Mark as fetched but empty
    }
    return null;
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
    
    if(document.getElementById("wikiDepDescText")) document.getElementById("wikiDepDescText").innerText = "Lade Start-Info...";
    if(document.getElementById("wikiDestDescText")) document.getElementById("wikiDestDescText").innerText = "Lade Ziel-Info...";

    const indicator = document.getElementById('searchIndicator');
    const needle = document.getElementById('meterNeedle');
    const led = document.getElementById('meterLed');
    if (led) led.classList.remove('led-green', 'led-blue', 'led-red');
    
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
        if (m.pax) paxText = m.pax;       
        if (m.cargo) cargoText = m.cargo; 
    } else {
        indicator.innerText = `Lade Auftrag aus lokaler Datenbank...`;
        dataSource = "Lokale DB"; 
        if (isPOI) {
            m = generateDynamicPOIMission(dest.n, maxSeats); paxText = m.payloadText; cargoText = m.cargoText; dataSource = "Wikipedia GeoSearch";
        } else if (typeof missions !== 'undefined') {
            let availM = missions.filter(ms => (nav.dist < 50 || ms.cat === "std"));
            
            let history = JSON.parse(localStorage.getItem('ga_std_history')) || [];
            let freshM = availM.filter(ms => !history.includes(ms.t));
            
            if (freshM.length === 0) { freshM = availM; history = []; }
            
            m = freshM[Math.floor(Math.random() * freshM.length)] || missions[0];
            
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
    const wikiDepNameEl = document.getElementById('wikiDepNameDisplay');
    if (wikiDepNameEl) wikiDepNameEl.innerText = `${currentStartICAO} – ${start.n}`;

    setDrumCounter('distDrum', totalDist);
    recalculatePerformance();

    document.getElementById("destIcon").innerText = isPOI ? "🎯" : "🛬";
    document.getElementById("mDestICAO").innerText = isPOI ? "POI" : currentDestICAO;
    document.getElementById("mDestName").innerText = dest.n;
    document.getElementById("mDestCoords").innerText = `${dest.lat.toFixed(4)}, ${dest.lon.toFixed(4)}`;
    const wikiDestNameEl = document.getElementById('wikiDestNameDisplay');
    if (wikiDestNameEl) wikiDestNameEl.innerText = `${isPOI ? 'POI' : currentDestICAO} – ${dest.n}`;
    
    document.getElementById("mPay").innerText = paxText; document.getElementById("mWeight").innerText = cargoText;
    document.getElementById("mDistNote").innerText = `${totalDist} NM`; 
    document.getElementById("mETENote").innerText = timeStr;
    const mHeadingNote = document.getElementById("mHeadingNote");
    if(mHeadingNote) mHeadingNote.innerText = `${nav.brng}°`;
    
    document.getElementById("destRwyContainer").style.display = isPOI ? "none" : "block";
    if (document.getElementById("wikiDestRwyText")) document.getElementById("wikiDestRwyText").style.display = isPOI ? "none" : "block";
    const destSwitchRow = document.getElementById("destSwitchRow"); if(destSwitchRow) destSwitchRow.style.display = isPOI ? "none" : "flex";

    document.getElementById("briefingBox").style.display = "block";

    const destLocEl      = document.getElementById('destLoc');
    const destLocRadioEl = document.getElementById('destLocRadio');
    if (destLocEl)      destLocEl.value      = '';
    if (destLocRadioEl) destLocRadioEl.value = '';

    updateMap(start.lat, start.lon, dest.lat, dest.lon, currentStartICAO, dest.n);
    
    const destLinks = document.getElementById("wikiDestLinks");
    if(destLinks) destLinks.style.display = isPOI ? "none" : "block";

    indicator.innerText = `Flugplan bereit (${dataSource}). Lade Infos...`;
    fetchRunwayDetails(start.lat, start.lon, 'mDepRwy', currentStartICAO);
    
    setTimeout(() => {
        if (!isPOI) fetchRunwayDetails(dest.lat, dest.lon, 'mDestRwy', currentDestICAO);
        
        fetchAreaDescription(start.lat, start.lon, 'wikiDepDescText', null, currentStartICAO, 'wikiDepImageContainer', 'wikiDepImage');
        fetchAreaDescription(dest.lat, dest.lon, 'wikiDestDescText', isPOI ? dest.n : null, isPOI ? null : currentDestICAO, 'wikiDestImageContainer', 'wikiDestImage');
        
        currentDepFreq = ""; 
        currentDestFreq = "";
        
        fetchAirportFreq(currentStartICAO, 'wikiDepFreqText', 'dep');
        renderTileCanvas(start.lat, start.lon, 13, 600, 400).then(url => {
            const img = document.getElementById('uiDepDetailMap');
            if(img) { img.src = url; img.style.display = 'block'; }
        });
        
        if (!isPOI) {
            fetchAirportFreq(currentDestICAO, 'wikiDestFreqText', 'dest');
        } else {
            const df = document.getElementById('wikiDestFreqText');
            if(df) df.innerHTML = '';
        }

        renderTileCanvas(dest.lat, dest.lon, 13, 600, 400).then(url => {
            const img = document.getElementById('uiDestDetailMap');
            if(img) { img.src = url; img.style.display = 'block'; }
        });

        indicator.innerText = `Briefing komplett.`; resetBtn(btn);
        const rBtnLed = document.getElementById('radioGenerateBtn');
        if(rBtnLed) rBtnLed.classList.add('active');
        
        if(window.meterInterval) clearInterval(window.meterInterval);
        if(needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`; 
        
        if (led) { 
            led.classList.remove('led-green', 'led-blue', 'led-red', 'led-flash3');
            if (dataSource === "Gemini 3.0 Flash") { led.classList.add('led-flash3'); } 
            else if (dataSource === "Gemini 2.5 Flash") { led.classList.add('led-blue'); } 
            else if (dataSource === "Gemini 2.5 Flash Lite") { led.classList.add('led-green'); } 
            else { led.classList.add('led-red'); } 
        }

        document.querySelectorAll('.marker-light').forEach(l => l.classList.remove('blinking', 'on'));
        if (dataSource === "Gemini 3.0 Flash") { 
            document.getElementById('mkO').classList.add('on'); 
            document.getElementById('mkM').classList.add('on'); 
        }
        else if (dataSource === "Gemini 2.5 Flash") document.getElementById('mkO').classList.add('on'); 
        else if (dataSource === "Gemini 2.5 Flash Lite") document.getElementById('mkM').classList.add('on'); 
        else document.getElementById('mkI').classList.add('on');
        
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

        if (isStart) {
            marker.bindPopup(`<b>DEP:</b> ${currentSName}`);
        } else if (isDest) {
            marker.bindPopup(`<b>DEST:</b> ${currentDName}`);
        } else {
            let wpName = routeWaypoints[index].name ? `<b>${routeWaypoints[index].name}</b>` : `<b>Wegpunkt</b>`;
            marker.bindPopup(`<div style="text-align:center;">${wpName}<br><button onclick="removeRouteWaypoint(${index})" style="margin-top:5px; background:#d93829; color:#fff; border:none; padding:4px 8px; cursor:pointer; border-radius: 2px;">🗑️ Löschen</button></div>`);
        }
        
       if (draggable) {
            marker.on('drag', function(e) {
                if (snapMode && cachedNavData.length > 0) {
                    let mousePoint = map.latLngToLayerPoint(e.latlng);
                    let closest = null;
                    let bestScore = -1; 
                    
                    cachedNavData.forEach(nav => {
                        let navPoint = map.latLngToLayerPoint([nav.lat, nav.lng]);
                        let d = mousePoint.distanceTo(navPoint);
                        if (d < 25) {
                            let score = 25 - d;
                            // PRIORITÄT: VORs und Airports gewinnen bei Überlappung
                            if (nav.name.includes('APT ')) score += 100;
                            else if (nav.name.includes('[')) score += 50; 
                            
                            if (score > bestScore) {
                                bestScore = score;
                                closest = nav;
                            }
                        }
                    });
                    
                    if (closest) marker.setLatLng([closest.lat, closest.lng]); 
                    else marker.setLatLng(e.latlng); 
                }
            });

            marker.on('dragend', function(e) {
                let dropLatLng = marker.getLatLng(); 
                
                if (snapMode && cachedNavData.length > 0) {
                    let mousePoint = map.latLngToLayerPoint(dropLatLng);
                    let closest = null;
                    let bestScore = -1;
                    
                    cachedNavData.forEach(nav => {
                        let navPoint = map.latLngToLayerPoint([nav.lat, nav.lng]);
                        let d = mousePoint.distanceTo(navPoint);
                        if (d < 25) {
                            let score = 25 - d;
                            if (nav.name.includes('APT ')) score += 100;
                            else if (nav.name.includes('[')) score += 50; 
                            
                            if (score > bestScore) {
                                bestScore = score;
                                closest = nav;
                            }
                        }
                    });

                    if (closest) {
                        routeWaypoints[index].lat = closest.lat;
                        routeWaypoints[index].lng = closest.lng;
                        routeWaypoints[index].name = closest.name;
                    } else {
                        routeWaypoints[index].lat = dropLatLng.lat;
                        routeWaypoints[index].lng = dropLatLng.lng;
                        routeWaypoints[index].name = null;
                    }
                } else {
                    routeWaypoints[index].lat = dropLatLng.lat;
                    routeWaypoints[index].lng = dropLatLng.lng;
                    routeWaypoints[index].name = null;
                }
                renderMainRoute(); 
            });
        }
        routeMarkers.push(marker);
    });
    
    updateRoutePerformance(); updateMiniMap(); 
}

function updateRoutePerformance() {
    if(routeWaypoints.length < 2 || !currentMissionData) return;
    let totalNM = 0, wpHTML = '';
    const tas = parseInt(document.getElementById("tasSlider").value) || 160;
    const gph = parseInt(document.getElementById("gphSlider").value) || 14;
    
    let totalTime = 0;
    let totalFuel = 0;

    let blHTML = '<table style="width:100%; border-collapse:collapse; text-align:left; font-size:14px; font-family:\'Courier New\', monospace; font-weight:bold; color:#222; margin-top:5px;">';
    blHTML += '<colgroup><col style="width:30%;"><col style="width:20%;"><col style="width:16%;"><col style="width:10%;"><col style="width:10%;"><col style="width:14%;"></colgroup>';
    blHTML += '<tr style="border-bottom:2px solid #888; color:#0b1f65;"><th>Route</th><th>FREQ</th><th>HDG</th><th>NM</th><th>Min</th><th>Gal</th></tr>';
    
    for(let i=0; i<routeWaypoints.length - 1; i++) {
        let p1 = routeWaypoints[i], p2 = routeWaypoints[i+1], nav = calcNav(p1.lat, p1.lng || p1.lon, p2.lat, p2.lng || p2.lon);
        totalNM += nav.dist;
        
        let isStart = (i === 0);
        let isEnd = (i === routeWaypoints.length - 2);

        let name1 = isStart ? currentStartICAO : (routeWaypoints[i].name || `WP ${i}`);
        let name2 = isEnd ? currentDestICAO : (routeWaypoints[i+1].name || `WP ${i+1}`);
        
        let cleanName1 = name1.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '');
        let cleanName2 = name2.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '');

        // Frequenz aus Namen extrahieren
        let f1 = "";
        let m1 = cleanName1.match(/\(([^)]+)\)/);
        if (m1) { f1 = m1[1]; cleanName1 = cleanName1.replace(/\s*\([^)]+\)/, ''); }
        else if (isStart && currentDepFreq) { f1 = currentDepFreq; }

        let f2 = "";
        let m2 = cleanName2.match(/\(([^)]+)\)/);
        if (m2) { f2 = m2[1]; cleanName2 = cleanName2.replace(/\s*\([^)]+\)/, ''); }
        else if (isEnd && currentDestFreq) { f2 = currentDestFreq; }

        // VOR Klammern erhalten - nur Kennung nutzen wenn vorhanden
        let v1 = cleanName1.match(/\[([^\]]+)\]/); 
        let isV1 = !!v1;
        if (v1) cleanName1 = `[${v1[1].trim().split(/\s+/)[0]}]`;
        else cleanName1 = cleanName1.trim();
        
        let v2 = cleanName2.match(/\[([^\]]+)\]/);
        let isV2 = !!v2;
        if (v2) cleanName2 = `[${v2[1].trim().split(/\s+/)[0]}]`;
        else cleanName2 = cleanName2.trim();
        
        let legTime = Math.round((nav.dist / tas) * 60);
        let legFuel = parseFloat((nav.dist / tas * gph).toFixed(1));

        totalTime += legTime;
        totalFuel += legFuel;

        const c1 = isV1 ? '#111' : '#0b1f65';
        const c2 = isV2 ? '#111' : '#0b1f65';

        blHTML += `<tr style="border-bottom:1px dashed #ccc;">`;
        blHTML += `<td style="padding:8px 0 8px 8px; color:#111; line-height: 1.4;"><span style="display:inline-block; min-width:20px; text-align:right;">${i+1}.</span> ${cleanName1}<br><span style="display:inline-block; min-width:20px; text-align:left;">➔</span> ${cleanName2}</td>`;
        blHTML += `<td style="padding:8px 0 8px 4px; font-size:14px; line-height: 1.6;"><span style="color:${c1}">${f1}</span><br><span style="color:${c2}">${f2}</span></td>`;
        blHTML += `<td style="padding:8px 0 8px 16px; color:#d93829; vertical-align:middle;">${nav.brng}°</td>`;
        blHTML += `<td style="padding:8px 0; color:#d93829; vertical-align:middle;">${nav.dist}</td>`;
        blHTML += `<td style="padding:8px 0; color:#d93829; vertical-align:middle;">${legTime}</td>`;
        blHTML += `<td style="padding:8px 0; color:#d93829; vertical-align:middle;">${legFuel.toFixed(1)}</td>`;
        blHTML += `</tr>`;
        
        wpHTML += `<div class="wp-row"><span class="wp-name">${cleanName1.replace(/<[^>]+>/g, '').trim()} ➔ ${cleanName2.replace(/<[^>]+>/g, '').trim()}</span><span class="wp-data">${nav.brng}° | ${nav.dist} NM</span></div>`;
    }
    
    blHTML += `<tr style="border-top:2px solid #888; color:#0b1f65; font-size:15px;"><td style="padding-top:8px;">TOTAL</td><td style="padding-top:8px;"></td><td style="padding-top:8px;"></td><td style="padding-top:8px;">${totalNM}</td><td style="padding-top:8px;">${totalTime}</td><td style="padding-top:8px;">${totalFuel.toFixed(1)}</td></tr>`;
    blHTML += '</table>';
    
    const blDiv = document.getElementById('briefingNavLog');
    if (blDiv) blDiv.innerHTML = blHTML;

    let initialNav = calcNav(routeWaypoints[0].lat, routeWaypoints[0].lng || routeWaypoints[0].lon, routeWaypoints[1].lat, routeWaypoints[1].lng || routeWaypoints[1].lon);
    currentMissionData.dist = totalNM; currentMissionData.heading = initialNav.brng;

    setDrumCounter('distDrum', totalNM);
    const mHeadingNote = document.getElementById("mHeadingNote"); if(mHeadingNote) mHeadingNote.innerText = `${initialNav.brng}°`;
    const wpListContainer = document.getElementById("waypointList"); if(wpListContainer) wpListContainer.innerHTML = wpHTML;
    
    recalculatePerformance();
    const mDistNote = document.getElementById("mDistNote"); if(mDistNote) mDistNote.innerText = `${totalNM} NM`;
    const hrs = Math.floor(totalTime / 60), mins = totalTime % 60;
    const mETENote = document.getElementById("mETENote"); if(mETENote) mETENote.innerText = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} Min.`;

    setTimeout(() => saveMissionState(), 500);
    if (gpsState.visible && gpsState.mode === 'FPL') renderGPS();
}

function initMapBase() {
    if(map) return;
    
    const topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'OpenTopoMap' });
    const topoLightMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' }); 
    const satMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' });
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'CartoDB' });
    const lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: 'CartoDB' });

    const aeroOverlay = L.tileLayer('https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest', { 
        attribution: 'AeroData / Navigraph',
        opacity: 0.65,
        maxNativeZoom: 12 
    });

    topoMap.setOpacity(0.5);

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

    map.on('overlayadd', function(e) {
        if (e.name === "🛩️ VFR Lufträume (Overlay)") {
            topoMap.setOpacity(0.5); 
        }
    });

    map.on('overlayremove', function(e) {
        if (e.name === "🛩️ VFR Lufträume (Overlay)") {
            topoMap.setOpacity(1.0); 
        }
    });
    
    let fetchTimeout = null;
    map.on('moveend', function() {
        if (snapMode) {
            clearTimeout(fetchTimeout); // Löscht alte, noch nicht ausgeführte Anfragen
            fetchTimeout = setTimeout(fetchOpenAIPData, 600); // Wartet 0,6 Sekunden Stillstand ab
        }
    });
    
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

let _scrollLockY = 0;
function lockBodyScroll() {
    if (window.innerWidth >= 1250) return; 
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
                
                updateSnapButtonUI(); // Button blau machen
                if(snapMode) fetchOpenAIPData(); // Direkt Punkte für den Ausschnitt laden!
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

    // Verzögerung, um UI-Blockierung zu vermeiden
    setTimeout(() => {
        if (!miniMap) {
            miniMap = L.map('miniMap', { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: false });
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
            setTimeout(() => { miniMap.invalidateSize(); miniMap.fitBounds(L.latLngBounds(routeWaypoints), { padding: [15, 15] }); }, 50);
        }
    }, 100); // Kurze Verzögerung vor dem Start
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
    { id: 101, text: "👋 WILLKOMMEN!\n\nZiehe diese Zettel umher, bearbeite sie (✏️) oder lösch sie (✖).", x: 4, y: 6, rot: -2 },
    { id: 102, text: "📻 NAVCOM THEME\n\nZieh mit gedrückter Maus an den runden Drehknöpfen, um TAS und GPH schnell einzustellen!", x: 28, y: 10, rot: 3 },
    { id: 103, text: "🗺️ KARTENTISCH\n\nKlick auf die rote Route für neue Wegpunkte. Nutze das ⛶ Icon für den echten Vollbildmodus!", x: 52, y: 5, rot: -1 },
    { id: 104, text: "🔗 MULTIPLAYER\n\nKlick im Briefing auf das Link-Symbol, um den Code für deine Freunde zu kopieren (Import hier am Brett).", x: 76, y: 12, rot: 4 },
    { id: 105, text: "🌤️ WETTER & AIP\n\nIm Briefing (oder auf dem GPS) findest du Direkt-Links zu aktuellen METARs und Anflugkarten.", x: 6, y: 45, rot: 1 },
    { id: 106, text: "🎨 ANALOG DESIGN\n\nKlicke im Retro-Modus auf die silberne SCHRAUBE oben links, um die Panel-Lackierung zu wechseln!", x: 30, y: 50, rot: -3 },
    { id: 107, text: "🤖 KI DISPATCHER\n\nTrag unten deinen Gemini API-Key ein für kreative Missions-Storys mit Passagieren & Fracht.", x: 55, y: 42, rot: 2 },
    { id: 108, text: "📌 FLÜGE MERKEN\n\nPinne coole Routen an dieses Brett. Geflogen? Logge sie unten, um deinen Startplatz zu versetzen!", x: 78, y: 46, rot: -2 }
];

function toggleTutorialNotes() {
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    const hasTutorial = notes.some(n => n.id >= 101 && n.id <= 108);

    if (hasTutorial) {
        notes = notes.filter(n => n.id < 101 || n.id > 108);
    } else {
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
        wikiDepDescText: document.getElementById("wikiDepDescText") ? document.getElementById("wikiDepDescText").innerText : "",
        wikiDestDescText: document.getElementById("wikiDestDescText") ? document.getElementById("wikiDestDescText").innerText : "",
        wikiDepFreqText: document.getElementById("wikiDepFreqText") ? document.getElementById("wikiDepFreqText").innerHTML : "",
        wikiDestFreqText: document.getElementById("wikiDestFreqText") ? document.getElementById("wikiDestFreqText").innerHTML : "",
        wikiDepImageUrl: document.getElementById("wikiDepImage") ? document.getElementById("wikiDepImage").style.backgroundImage : "",
        wikiDestImageUrl: document.getElementById("wikiDestImage") ? document.getElementById("wikiDestImage").style.backgroundImage : "",
        isPOI: document.getElementById("destRwyContainer").style.display === "none",
        currentMissionData: currentMissionData, routeWaypoints: routeWaypoints, currentStartICAO: currentStartICAO,
        currentDestICAO: currentDestICAO, currentSName: currentSName, currentDName: currentDName,
        currentDepFreq: currentDepFreq, currentDestFreq: currentDestFreq, freqCache: freqCache
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
    
    const wikiData = {
        dep: document.getElementById("wikiDepDescText") ? document.getElementById("wikiDepDescText").innerText : "",
        dest: document.getElementById("wikiDestDescText") ? document.getElementById("wikiDestDescText").innerText : ""
    };

    const pack = [
        document.getElementById('mTitle').innerHTML, document.getElementById('mStory').innerText,
        document.getElementById("mDepICAO").innerText, document.getElementById("mDepName").innerText,
        document.getElementById("mDepCoords").innerText, document.getElementById("mDepRwy").innerText,
        document.getElementById("destIcon").innerText, document.getElementById("mDestICAO").innerText,
        document.getElementById("mDestName").innerText, document.getElementById("mDestCoords").innerText,
        document.getElementById("mDestRwy").innerText, document.getElementById("mPay").innerText,
        document.getElementById("mWeight").innerText, document.getElementById("mDistNote").innerText,
        document.getElementById("mHeadingNote").innerText, document.getElementById("mETENote").innerText,
        wikiData, document.getElementById("destRwyContainer").style.display === "none" ? 1 : 0,
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
        
        const wikiData = typeof pack[16] === 'object' && pack[16] !== null ? pack[16] : { dep: "", dest: pack[16] };
        
        const state = {
            mTitle: pack[0], mStory: pack[1], mDepICAO: pack[2], mDepName: pack[3], mDepCoords: pack[4], mDepRwy: pack[5],
            destIcon: pack[6], mDestICAO: pack[7], mDestName: pack[8], mDestCoords: pack[9], mDestRwy: pack[10],
            mPay: pack[11], mWeight: pack[12], mDistNote: pack[13], mHeadingNote: pack[14], mETENote: pack[15],
            wikiDepDescText: wikiData.dep, wikiDestDescText: wikiData.dest, isPOI: pack[17] === 1, currentMissionData: pack[18], routeWaypoints: wps, 
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

// ==========================================
// PDF BRIEFING PACK EXPORT
// ==========================================

function gatherBriefingData() {
    const tas = parseInt(document.getElementById('tasSlider').value) || 115;
    const gph = parseInt(document.getElementById('gphSlider').value) || 9;
    const dist = currentMissionData.dist;
    const totalMinutes = Math.round((dist / tas) * 60);
    const hrs = Math.floor(totalMinutes / 60), mins = totalMinutes % 60;
    return {
        title:      document.getElementById('mTitle').innerText,
        story:      document.getElementById('mStory').innerText,
        payload:    document.getElementById('mPay').innerText,
        cargo:      document.getElementById('mWeight').innerText,
        distance:   document.getElementById('mDistNote').innerText,
        heading:    document.getElementById('mHeadingNote').innerText,
        ete:        document.getElementById('mETENote').innerText,
        aircraft:   selectedAC,
        tas:        tas,
        gph:        gph,
        depICAO:    document.getElementById('mDepICAO').innerText,
        depName:    document.getElementById('mDepName').innerText,
        depCoords:  document.getElementById('mDepCoords').innerText,
        depRwy:     document.getElementById('mDepRwy').innerText,
        destICAO:   document.getElementById('mDestICAO').innerText,
        destName:   document.getElementById('mDestName').innerText,
        destCoords: document.getElementById('mDestCoords').innerText,
        destRwy:    document.getElementById('mDestRwy').innerText,
        depDesc:    document.getElementById('wikiDepDescText')?.innerText || '',
        destDesc:   document.getElementById('wikiDestDescText')?.innerText || '',
        depRwyText: document.getElementById('wikiDepRwyText')?.innerText || '',
        destRwyText:document.getElementById('wikiDestRwyText')?.innerText || '',
        depFreq:    document.getElementById('wikiDepFreqText')?.innerText || '',
        destFreq:   document.getElementById('wikiDestFreqText')?.innerText || '',
        isPOI:      document.getElementById('destRwyContainer')?.style.display === 'none',
        date:       new Date().toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }),
        time:       new Date().toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' }),
        totalDist:  Math.round(dist),
        totalTime:  totalMinutes,
        totalTimeStr: hrs > 0 ? `${hrs}h ${mins}m` : `${mins} Min`,
        totalFuel:  Math.ceil((dist / tas * gph) + (0.75 * gph)),
        reserveFuel: Math.ceil(0.75 * gph)
    };
}

function computeLegs() {
    const legs = [];
    const tas = parseInt(document.getElementById('tasSlider').value) || 115;
    const gph = parseInt(document.getElementById('gphSlider').value) || 9;

    for (let i = 0; i < routeWaypoints.length - 1; i++) {
        const p1 = routeWaypoints[i], p2 = routeWaypoints[i+1];
        const nav = calcNav(p1.lat, p1.lng || p1.lon, p2.lat, p2.lng || p2.lon);
        
        let n1 = (i === 0) ? currentSName : (routeWaypoints[i].name || `WP ${i}`);
        let n2 = (i === routeWaypoints.length - 2) ? currentDName : (routeWaypoints[i+1].name || `WP ${i+1}`);
        
        n1 = n1.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '');
        n2 = n2.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '');

        let f1 = "";
        let m1 = n1.match(/\(([^)]+)\)/);
        if (m1) { f1 = m1[1]; n1 = n1.replace(/\s*\([^)]+\)/, ''); }
        else if (i === 0 && currentDepFreq) { f1 = currentDepFreq; }

        let f2 = "";
        let m2 = n2.match(/\(([^)]+)\)/);
        if (m2) { f2 = m2[1]; n2 = n2.replace(/\s*\([^)]+\)/, ''); }
        else if (i === routeWaypoints.length - 2 && currentDestFreq) { f2 = currentDestFreq; }

        let c1 = n1.match(/\[([^\]]+)\]/); if (c1) n1 = `[${c1[1]}]`;
        let c2 = n2.match(/\[([^\]]+)\]/); if (c2) n2 = `[${c2[1]}]`;

        const time = Math.round((nav.dist / tas) * 60);
        const fuel = (nav.dist / tas * gph).toFixed(1);
        legs.push({ from: n1.trim(), to: n2.trim(), f1: f1, f2: f2, heading: nav.brng, dist: nav.dist, time: time, fuel: fuel });
    }
    return legs;
}

function extractImageUrl(element) {
    if (!element) return null;
    const bg = element.style.backgroundImage;
    if (!bg || bg === 'url("")' || bg === '' || bg === 'url()') return null;
    return bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
}

async function getImageAsBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch(e) { return null; }
}

function stripEmojis(text) {
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
}

async function captureMapForPDF() {
    if (routeWaypoints.length < 2) return null;

    const W = 900, H = 600;
    const bounds = L.latLngBounds(routeWaypoints);

    // Calculate zoom and center manually for tile rendering
    let zoom = 1;
    for (let z = 14; z >= 1; z--) {
        const nw = bounds.getNorthWest(), se = bounds.getSouthEast();
        const p1 = latLngToPixel(nw.lat, nw.lng || nw.lon, z);
        const p2 = latLngToPixel(se.lat, se.lng || se.lon, z);
        const routeW = Math.abs(p2.x - p1.x), routeH = Math.abs(p2.y - p1.y);
        if (routeW < W - 20 && routeH < H - 20) { zoom = z; break; }
    }

    const center = bounds.getCenter();
    const centerPx = latLngToPixel(center.lat, center.lng, zoom);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(0, 0, W, H);

    // Load tiles
    const tileSize = 256;
    const subdomains = ['a', 'b', 'c'];
    const tilePromises = [];

    const startTileX = Math.floor((centerPx.x - W / 2) / tileSize);
    const startTileY = Math.floor((centerPx.y - H / 2) / tileSize);
    const endTileX = Math.ceil((centerPx.x + W / 2) / tileSize);
    const endTileY = Math.ceil((centerPx.y + H / 2) / tileSize);

    for (let tx = startTileX; tx <= endTileX; tx++) {
        for (let ty = startTileY; ty <= endTileY; ty++) {
            const s = subdomains[(tx + ty) % 3];
            const topoUrl = `https://${s}.tile.opentopomap.org/${zoom}/${tx}/${ty}.png`;
            const drawX = (tx * tileSize) - (centerPx.x - W / 2);
            const drawY = (ty * tileSize) - (centerPx.y - H / 2);
            tilePromises.push(loadTileImage(topoUrl).then(img => {
                if (img) { ctx.globalAlpha = 0.5; ctx.drawImage(img, drawX, drawY, tileSize, tileSize); ctx.globalAlpha = 1.0; }
            }));
        }
    }

    // VFR aero overlay
    const aeroZoom = Math.min(zoom, 12);
    const scale = Math.pow(2, zoom - aeroZoom);
    const aeroCenterPx = latLngToPixel(center.lat, center.lng, aeroZoom);
    const aeroTileSize = tileSize * scale;
    const aStartX = Math.floor((aeroCenterPx.x - (W / 2) / scale) / tileSize);
    const aStartY = Math.floor((aeroCenterPx.y - (H / 2) / scale) / tileSize);
    const aEndX = Math.ceil((aeroCenterPx.x + (W / 2) / scale) / tileSize);
    const aEndY = Math.ceil((aeroCenterPx.y + (H / 2) / scale) / tileSize);

    for (let tx = aStartX; tx <= aEndX; tx++) {
        for (let ty = aStartY; ty <= aEndY; ty++) {
            const aeroUrl = `https://nwy-tiles-api.prod.newaydata.com/tiles/${aeroZoom}/${tx}/${ty}.png?path=latest/aero/latest`;
            const drawX = (tx * aeroTileSize) - (aeroCenterPx.x * scale - W / 2);
            const drawY = (ty * aeroTileSize) - (aeroCenterPx.y * scale - H / 2);
            tilePromises.push(loadTileImage(aeroUrl).then(img => {
                if (img) { ctx.globalAlpha = 0.65; ctx.drawImage(img, drawX, drawY, aeroTileSize, aeroTileSize); ctx.globalAlpha = 1.0; }
            }));
        }
    }

    await Promise.all(tilePromises);

    // Draw route line
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    routeWaypoints.forEach((wp, i) => {
        const px = latLngToPixel(wp.lat, wp.lng || wp.lon, zoom);
        const x = px.x - (centerPx.x - W / 2), y = px.y - (centerPx.y - H / 2);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw markers
    routeWaypoints.forEach((wp, i) => {
        const px = latLngToPixel(wp.lat, wp.lng || wp.lon, zoom);
        const x = px.x - (centerPx.x - W / 2), y = px.y - (centerPx.y - H / 2);
        const isStart = (i === 0), isDest = (i === routeWaypoints.length - 1);
        const r = (isStart || isDest) ? 9 : 7;
        const fill = isStart ? '#44ff44' : isDest ? '#ff4444' : '#fdfd86';

        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();

        let label = isStart ? currentSName : isDest ? currentDName : (wp.name || `WP${i}`);
        if (isStart && currentDepFreq) { label += ` (${currentDepFreq.split(',')[0].trim()})`; }
        else if (isDest && currentDestFreq) { label += ` (${currentDestFreq.split(',')[0].trim()})`; }
        if (!isStart && !isDest) {
            label = label.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '');
            const idM = label.match(/\[([^\]]+)\]/);
            if (idM) { const frM = label.match(/\(([^)]+)\)/); label = frM ? `${idM[1]} (${frM[1]})` : idM[1]; }
        }
        ctx.font = 'bold 11px Helvetica, Arial, sans-serif';
        ctx.fillStyle = '#111';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.strokeText(label, x + 12, y + 4);
        ctx.fillText(label, x + 12, y + 4);
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    return { data: imgData, width: canvas.width, height: canvas.height };
}

async function renderTileCanvas(centerLat, centerLng, zoom, W, H) {
    const centerPx = latLngToPixel(centerLat, centerLng, zoom);
    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(0, 0, W, H);

    const tileSize = 256;
    const subdomains = ['a', 'b', 'c'];
    const tilePromises = [];

    const startTileX = Math.floor((centerPx.x - W / 2) / tileSize);
    const startTileY = Math.floor((centerPx.y - H / 2) / tileSize);
    const endTileX = Math.ceil((centerPx.x + W / 2) / tileSize);
    const endTileY = Math.ceil((centerPx.y + H / 2) / tileSize);

    for (let tx = startTileX; tx <= endTileX; tx++) {
        for (let ty = startTileY; ty <= endTileY; ty++) {
            const s = subdomains[(tx + ty) % 3];
            const topoUrl = `https://${s}.tile.opentopomap.org/${zoom}/${tx}/${ty}.png`;
            const drawX = (tx * tileSize) - (centerPx.x - W / 2);
            const drawY = (ty * tileSize) - (centerPx.y - H / 2);
            tilePromises.push(loadTileImage(topoUrl).then(img => {
                if (img) { ctx.globalAlpha = 0.5; ctx.drawImage(img, drawX, drawY, tileSize, tileSize); ctx.globalAlpha = 1.0; }
            }));
        }
    }

    const aeroZoom = Math.min(zoom, 12);
    const scale = Math.pow(2, zoom - aeroZoom);
    const aeroCenterPx = latLngToPixel(centerLat, centerLng, aeroZoom);
    const aeroTileSize = tileSize * scale;
    const aStartX = Math.floor((aeroCenterPx.x - (W / 2) / scale) / tileSize);
    const aStartY = Math.floor((aeroCenterPx.y - (H / 2) / scale) / tileSize);
    const aEndX = Math.ceil((aeroCenterPx.x + (W / 2) / scale) / tileSize);
    const aEndY = Math.ceil((aeroCenterPx.y + (H / 2) / scale) / tileSize);

    for (let tx = aStartX; tx <= aEndX; tx++) {
        for (let ty = aStartY; ty <= aEndY; ty++) {
            const aeroUrl = `https://nwy-tiles-api.prod.newaydata.com/tiles/${aeroZoom}/${tx}/${ty}.png?path=latest/aero/latest`;
            const drawX = (tx * aeroTileSize) - (aeroCenterPx.x * scale - W / 2);
            const drawY = (ty * aeroTileSize) - (aeroCenterPx.y * scale - H / 2);
            tilePromises.push(loadTileImage(aeroUrl).then(img => {
                if (img) { ctx.globalAlpha = 0.65; ctx.drawImage(img, drawX, drawY, aeroTileSize, aeroTileSize); ctx.globalAlpha = 1.0; }
            }));
        }
    }

    await Promise.all(tilePromises);

    const apx = latLngToPixel(centerLat, centerLng, zoom);
    const cx = apx.x - (centerPx.x - W / 2), cy = apx.y - (centerPx.y - H / 2);
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4444'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

    return canvas.toDataURL('image/jpeg', 0.92);
}

function latLngToPixel(lat, lng, zoom) {
    const x = ((lng + 180) / 360) * Math.pow(2, zoom) * 256;
    const latRad = lat * Math.PI / 180;
    const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom) * 256;
    return { x, y };
}

function loadTileImage(url) {
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

function drawNotebookBackground(doc, pageNum, totalPages) {
    const W = 210, H = 297;

    doc.setFillColor(253, 245, 230);
    doc.rect(0, 0, W, H, 'F');

    doc.setDrawColor(180, 200, 215);
    doc.setLineWidth(0.15);
    for (let y = 21; y < H - 10; y += 7) {
        doc.line(12, y, W - 12, y);
    }

    doc.setDrawColor(210, 70, 70);
    doc.setLineWidth(0.35);
    doc.line(28, 0, 28, H);

    doc.setDrawColor(180, 175, 160);
    doc.setLineWidth(0.3);
    [55, H / 2, H - 55].forEach(y => {
        doc.circle(9, y, 3.5);
    });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 115, 100);
    doc.text(`Seite ${pageNum} / ${totalPages}`, W - 15, H - 12, { align: 'right' });

    doc.setFontSize(7);
    doc.setTextColor(170, 165, 150);
    doc.text('GA Dispatcher \u2013 Briefing Pack', W / 2, H - 6, { align: 'center' });
}

function pdfWrappedText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line, i) => {
        doc.text(line, x, y + (i * lineHeight));
    });
    return y + (lines.length * lineHeight);
}

function drawMissionBriefingPage(doc, data, mapImage) {
    let y = 30;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(11, 31, 101);
    const cleanTitle = stripEmojis(data.title);
    const titleLines = doc.splitTextToSize(cleanTitle, 155);
    titleLines.forEach((line, i) => { doc.text(line, 32, y + (i * 8)); });
    y += titleLines.length * 8 + 3;

    doc.setDrawColor(11, 31, 101); doc.setLineWidth(0.5); doc.line(32, y, 190, y);
    y += 10;

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(80, 80, 80);
    const routeStr = data.isPOI ? `${data.depICAO} > ${data.destName} (Rundflug)` : `${data.depICAO} (${data.depName}) > ${data.destICAO} (${data.destName})`;
    const routeLines = doc.splitTextToSize(routeStr, 155);
    routeLines.forEach((line, i) => { doc.text(line, 32, y + (i * 6)); });
    y += routeLines.length * 6 + 6;

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    y = pdfWrappedText(doc, stripEmojis(data.story), 32, y, 155, 5.5);
    y += 8;

    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0);
    y += 10;

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(217, 56, 41); doc.text('PAYLOAD:', 32, y);
    doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(data.payload, 62, y);
    y += 7;

    doc.setFont('Helvetica', 'bold'); doc.setTextColor(217, 56, 41); doc.text('FRACHT:', 32, y);
    doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(data.cargo, 62, y);
    y += 14;

    doc.setDrawColor(180, 175, 160); doc.setFillColor(248, 243, 228); doc.setLineWidth(0.3);
    doc.roundedRect(32, y - 4, 158, 50, 2, 2, 'FD');

    y += 4;
    const col1 = 38, col2 = 110;

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(217, 56, 41); doc.text('STRECKE:', col1, y);
    doc.setTextColor(40, 40, 40); doc.text(data.distance, col1 + 35, y);

    doc.setTextColor(217, 56, 41); doc.text('KURS:', col2, y);
    doc.setTextColor(40, 40, 40); doc.text(data.heading, col2 + 25, y);
    y += 8;

    doc.setTextColor(217, 56, 41); doc.text('ETE CA:', col1, y);
    doc.setTextColor(40, 40, 40); doc.text(data.totalTimeStr, col1 + 35, y);

    doc.setTextColor(217, 56, 41); doc.text('FUEL:', col2, y);
    doc.setTextColor(40, 40, 40); doc.text(`${data.totalFuel} Gal`, col2 + 25, y);
    y += 8;

    doc.setTextColor(217, 56, 41); doc.text('AIRCRAFT:', col1, y);
    doc.setTextColor(40, 40, 40); doc.text(data.aircraft, col1 + 35, y);

    doc.setTextColor(217, 56, 41); doc.text('TAS:', col2, y);
    doc.setTextColor(40, 40, 40); doc.text(`${data.tas} kts`, col2 + 25, y);
    y += 8;

    doc.setTextColor(217, 56, 41); doc.text('GPH:', col1, y);
    doc.setTextColor(40, 40, 40); doc.text(`${data.gph} gal/h`, col1 + 35, y);

    doc.setTextColor(217, 56, 41); doc.text('DATUM:', col2, y);
    doc.setTextColor(40, 40, 40); doc.text(`${data.date} ${data.time}`, col2 + 25, y);

    y += 24; 
    if (mapImage) {
        doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 31, 101);
        doc.text('ROUTE MAP', 32, y);
        y += 4;

        const maxW = 158; 
        const maxH = Math.min(100, 280 - y);
        const ratio = mapImage.width / mapImage.height;
        let imgW, imgH;
        if (ratio > maxW / maxH) { imgW = maxW; imgH = maxW / ratio; } else { imgH = maxH; imgW = maxH * ratio; }
        const imgX = 32 + (maxW - imgW) / 2; 

        doc.setFillColor(230, 225, 210); doc.rect(imgX - 2, y - 2, imgW + 4, imgH + 4, 'F');
        doc.setDrawColor(160, 155, 140); doc.setLineWidth(0.5); doc.rect(imgX - 2, y - 2, imgW + 4, imgH + 4, 'S');
        doc.addImage(mapImage.data, 'JPEG', imgX, y, imgW, imgH);
    }
}

function drawRouteNavigationPage(doc, data, legs) {
    let y = 30;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(11, 31, 101);
    doc.text('ROUTE & NAVIGATION', 32, y); y += 4;
    doc.setDrawColor(11, 31, 101); doc.setLineWidth(0.5); doc.line(32, y, 190, y); y += 12;

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    const wpNames = [data.depICAO || currentStartICAO];
    for (let i = 1; i < routeWaypoints.length - 1; i++) wpNames.push(`WP${i}`);
    if (routeWaypoints.length > 1) wpNames.push(data.destICAO || currentDestICAO);
    doc.text(wpNames.join(' -> '), 32, y); y += 10;

    const tableX = 32, colWidths = [10, 42, 16, 16, 16, 16, 16];
    const tableW = colWidths.reduce((a, b) => a + b, 0), rowH = 12; 

    doc.setFillColor(220, 215, 200); doc.rect(tableX, y, tableW, 8, 'F');
    doc.setDrawColor(160, 155, 140); doc.rect(tableX, y, tableW, 8, 'S');

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
    doc.text('LEG', tableX + 2, y + 5.5);
    doc.text('ROUTE', tableX + colWidths[0] + 2, y + 5.5);
    doc.text('FREQ', tableX + colWidths[0] + colWidths[1] + 2, y + 5.5);
    doc.text('HDG', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5.5);
    doc.text('DIST', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 5.5);
    doc.text('TIME', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, y + 5.5);
    doc.text('FUEL', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2, y + 5.5);
    y += 8;

    doc.setFont('Helvetica', 'normal');
    
    let totalTime = 0;
    let totalFuel = 0;

    legs.forEach((leg, i) => {
        totalTime += leg.time;
        totalFuel += parseFloat(leg.fuel);

        if (i % 2 === 0) { doc.setFillColor(250, 246, 235); doc.rect(tableX, y, tableW, rowH, 'F'); }
        doc.setDrawColor(200, 195, 180); doc.rect(tableX, y, tableW, rowH, 'S');

        doc.setTextColor(40, 40, 40);
        doc.setFontSize(9);
        doc.text(`${i + 1}`, tableX + 3, y + 7);
        
        doc.text(`${leg.from}`, tableX + colWidths[0] + 2, y + 4.5);
        doc.text(`-> ${leg.to}`, tableX + colWidths[0] + 2, y + 9.5); 
        
        doc.setFontSize(8);
        doc.setTextColor(11, 31, 101); 
        if (leg.f1) doc.text(leg.f1, tableX + colWidths[0] + colWidths[1] + 2, y + 4.5);
        if (leg.f2) doc.text(leg.f2, tableX + colWidths[0] + colWidths[1] + 2, y + 9.5);
        
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(`${leg.heading}\u00B0`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 7);
        doc.text(`${leg.dist} NM`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 7);
        doc.text(`${leg.time} m`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, y + 7);
        doc.text(`${leg.fuel} G`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2, y + 7);
        y += rowH;
    });

    doc.setFillColor(210, 205, 190); doc.rect(tableX, y, tableW, 8, 'F');
    doc.setDrawColor(160, 155, 140); doc.rect(tableX, y, tableW, 8, 'S');
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(11, 31, 101);
    doc.text('TOTAL', tableX + colWidths[0] + 2, y + 5.5);
    doc.text(`${data.totalDist} NM`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 5.5);
    doc.text(`${totalTime} m`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, y + 5.5);
    doc.text(`${totalFuel.toFixed(1)} G`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2, y + 5.5);
    y += 8 + 14;

    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0); y += 10;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(11, 31, 101); doc.text('PERFORMANCE', 32, y); y += 12;

    doc.setFontSize(10); const perfCol1 = 38, perfCol2 = 110;
    doc.setTextColor(217, 56, 41); doc.text('Aircraft:', perfCol1, y); doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(data.aircraft, perfCol1 + 38, y);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(217, 56, 41); doc.text('TAS:', perfCol2, y); doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(`${data.tas} kts`, perfCol2 + 28, y); y += 8;
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(217, 56, 41); doc.text('GPH:', perfCol1, y); doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(`${data.gph} gal/h`, perfCol1 + 38, y);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(217, 56, 41); doc.text('Dist:', perfCol2, y); doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(`${data.totalDist} NM`, perfCol2 + 28, y); y += 8;
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(217, 56, 41); doc.text('ETE:', perfCol1, y); doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(data.totalTimeStr, perfCol1 + 38, y);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(217, 56, 41); doc.text('Fuel:', perfCol2, y); doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(`${data.totalFuel} Gal`, perfCol2 + 28, y); y += 16;
}

function drawAirportInfoPage(doc, type, data, photo, detailMap) {
    let y = 30;
    const isDep = (type === 'dep');
    const isPOI = (!isDep && data.isPOI);

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(11, 31, 101);
    doc.text(isPOI ? 'ZIELPUNKT INFO' : (isDep ? 'DEPARTURE AIRPORT' : 'DESTINATION AIRPORT'), 32, y);
    y += 4;
    doc.setDrawColor(11, 31, 101); doc.setLineWidth(0.5); doc.line(32, y, 190, y);
    y += 14;

    const icao = isDep ? data.depICAO : data.destICAO;
    const name = isDep ? data.depName : data.destName;
    const coords = isDep ? data.depCoords : data.destCoords;
    const rwy = isDep ? data.depRwy : data.destRwy;
    const desc = isDep ? data.depDesc : data.destDesc;
    const freq = isDep ? data.depFreq : data.destFreq;

    const photoYStart = y - 2;
    if (photo) {
        try {
            doc.addImage(photo, 'JPEG', 152, photoYStart, 38, 28);
            doc.setDrawColor(200, 195, 180); doc.setLineWidth(0.4); doc.rect(151, photoYStart - 1, 40, 34);
        } catch(e) {}
    }

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(11, 31, 101);
    doc.text(icao, 32, y);
    y += 7; 

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(60, 60, 60);
    doc.text(name, 32, y);
    y += 7;

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(`Coords: ${coords}`, 32, y); 

    y = photo ? Math.max(y + 6, photoYStart + 36) : y + 6;

    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0);
    y += 8;

    if (!isPOI) {
    let blockY = y;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(217, 56, 41);
    doc.text('RUNWAYS', 32, blockY);
    doc.text('FREQUENZEN', 115, blockY);
    
    let rwyY = blockY + 7;
    let freqY = blockY + 7;

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    if (rwy && rwy !== 'Sucht Pisten-Infos...' && rwy !== 'Keine Daten gefunden') {
        const runways = rwy.split(/\s*(?:\||\n|<br\s*\/?>)\s*/i).filter(r => r.trim());
        runways.forEach(r => { doc.text(stripEmojis(r.trim()), 34, rwyY); rwyY += 6; });
    } else {
        doc.setTextColor(120, 120, 120); doc.text('Keine Pistendaten verfuegbar.', 34, rwyY); rwyY += 6;
    }

    doc.setTextColor(11, 31, 101);
    if (freq && !freq.includes('Sucht Frequenz') && freq.trim() !== '') {
        const freqClean = stripEmojis(freq);
        const freqLines = freqClean.split('\n').filter(l => l.trim());
        freqLines.forEach(line => { doc.text(line.trim(), 117, freqY); freqY += 6; });
    } else {
        doc.setTextColor(120, 120, 120); doc.text('Keine Frequenzdaten verfuegbar.', 117, freqY); freqY += 6;
    }

    y = Math.max(rwyY, freqY) + 4;

    doc.setDrawColor(100, 100, 100); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0);
    y += 8;
    }

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(11, 31, 101);
    doc.text(isPOI ? 'INFO' : 'AIRPORT INFO', 32, y);
    y += 7;

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 50, 50);

    if (desc && desc !== 'Warte auf Daten...') {
        const maxChars = 600;
        const trimmedDesc = desc.length > maxChars ? desc.substring(0, maxChars) + '...' : desc;
        y = pdfWrappedText(doc, trimmedDesc, 32, y, 155, 5.5);
    } else {
        doc.text('Keine weiteren Informationen verfuegbar.', 32, y);
        y += 6;
    }

    if (detailMap) {
        y = Math.max(y + 6, 170);
        doc.setDrawColor(100, 100, 100); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0);
        y += 6;

        doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 31, 101);
        doc.text(isPOI ? 'KARTE' : `PLATZKARTE ${icao}`, 32, y);
        y += 5;

        // Berechne Aspect Ratio basierend auf 700x360
        const mapRatio = 700 / 360;
        const maxW = 155;
        const maxH = Math.min(100, 280 - y);
        let mapW, mapH;

        if (maxW / maxH < mapRatio) {
            mapW = maxW;
            mapH = mapW / mapRatio;
        } else {
            mapH = maxH;
            mapW = mapH * mapRatio;
        }
        
        const mapX = 32 + (maxW - mapW) / 2;

        doc.setFillColor(230, 225, 210); doc.rect(mapX - 1, y - 1, mapW + 2, mapH + 2, 'F');
        doc.setDrawColor(160, 155, 140); doc.setLineWidth(0.4); doc.rect(mapX - 1, y - 1, mapW + 2, mapH + 2, 'S');
        doc.addImage(detailMap, 'JPEG', mapX, y, mapW, mapH);
    }
}

async function generateBriefingPDF() {
    if (!currentMissionData || document.getElementById("briefingBox").style.display !== "block") {
        alert('Kein aktives Briefing vorhanden.');
        return;
    }
    if (!window.jspdf) {
        alert('PDF-Bibliothek nicht geladen. Bitte Seite neu laden.');
        return;
    }

    const indicator = document.getElementById('searchIndicator');
    if (indicator) indicator.innerText = '\uD83D\uDCC4 Erstelle Briefing Pack PDF...';

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const data = gatherBriefingData();
        const legs = computeLegs();
        const isPOI = data.isPOI;
        const totalPages = isPOI ? 3 : 4;

        const mapImagePromise = captureMapForPDF();
        const depLL = routeWaypoints[0];
        const destLL = routeWaypoints[routeWaypoints.length - 1];
        const detailZoom = 12; 
        const depDetailPromise = renderTileCanvas(depLL.lat, depLL.lng || depLL.lon, detailZoom, 700, 360);
        const destDetailPromise = renderTileCanvas(destLL.lat, destLL.lng || destLL.lon, detailZoom, 700, 360);

        const depPhotoUrl = extractImageUrl(document.getElementById('wikiDepImage'));
        const destPhotoUrl = extractImageUrl(document.getElementById('wikiDestImage'));
        const [depPhoto, destPhoto, depDetail, destDetail] = await Promise.all([
            depPhotoUrl ? getImageAsBase64(depPhotoUrl) : Promise.resolve(null),
            destPhotoUrl ? getImageAsBase64(destPhotoUrl) : Promise.resolve(null),
            depDetailPromise,
            destDetailPromise
        ]);

        const mapImage = await mapImagePromise;

        doc.setProperties({ title: `Briefing Pack - ${data.depICAO} to ${isPOI ? 'POI' : data.destICAO}` });

        drawNotebookBackground(doc, 1, totalPages);
        drawMissionBriefingPage(doc, data, mapImage);

        doc.addPage();
        drawNotebookBackground(doc, 2, totalPages);
        drawRouteNavigationPage(doc, data, legs);

        doc.addPage();
        drawNotebookBackground(doc, 3, totalPages);
        drawAirportInfoPage(doc, 'dep', data, depPhoto, depDetail);

        doc.addPage();
        drawNotebookBackground(doc, 4, totalPages);
        drawAirportInfoPage(doc, 'dest', data, destPhoto, destDetail);

        const filename = `Briefing_${data.depICAO}_${isPOI ? 'Rundflug' : data.destICAO}_${data.date.replace(/\./g, '')}.pdf`;
        doc.save(filename);

        if (indicator) indicator.innerText = '\uD83D\uDCC4 Briefing Pack PDF erstellt!';
        setTimeout(() => { if (indicator) indicator.innerText = 'System bereit.'; }, 4000);
    } catch (e) {
        console.error('PDF generation failed:', e);
        if (indicator) indicator.innerText = '\u274C PDF-Erstellung fehlgeschlagen.';
        alert('PDF konnte nicht erstellt werden: ' + e.message);
    }
}

function renderNotes() {
    const board = document.getElementById('pinboard');
    if (!board) return;
    board.innerHTML = ''; 
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    notes.forEach(note => {
        const div = document.createElement('div'); 
        div.className = note.type === 'flight' ? 'post-it flight-card' : 'post-it';
        
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
    subPage: 0,       
    visible: false,
    maxPages: { FPL: 1, DEP: 2, DEST: 2, AIP: 2, WX: 2 },
    metarCache: {},
    wikiCache: {}     
};

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
    if (saved['btnToggleGPS']) {
        gpsState.visible = true;
        const mod = document.getElementById('kln90bModule');
        const fp = document.querySelector('.flightplan-container');
        if (mod) mod.style.display = 'flex';
        if (fp) fp.style.display = 'none';
        renderGPS();
    }
    if (saved['btnToggleAI']) {
        const aiToggle = document.getElementById('aiToggle');
        if (aiToggle) aiToggle.checked = true;
    }
}

function initGPSButtons() {
    document.querySelectorAll('.kln90b-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetMode = btn.dataset.mode;

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
            if (gpsState.mode === 'DEP' || gpsState.mode === 'DEST') {
                gpsState.maxPages[gpsState.mode] = 2;
            }
            renderGPS();
        });
    });
}

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

    if (encL) {
        encL.addEventListener('click', () => prevPage());
        encL.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.deltaY > 0 ? nextPage() : prevPage();
        });
    }
    if (encR) {
        encR.addEventListener('click', () => nextPage());
        encR.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.deltaY > 0 ? nextPage() : prevPage();
        });
    }
}

function initCom2Knob() {
    const knob = document.getElementById('com2Knob');
    if (!knob) return;
    knob.addEventListener('click', () => {
        currentDestICAO = '';
        const destLocEl      = document.getElementById('destLoc');
        const destLocRadioEl = document.getElementById('destLocRadio');
        if (destLocEl)      destLocEl.value      = '';
        if (destLocRadioEl) destLocRadioEl.value = '';
        if (gpsState.mode === 'DEST') {
            document.querySelectorAll('.kln90b-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'FPL'));
            gpsState.mode    = 'FPL';
            gpsState.subPage = 0;
            if (gpsState.visible) renderGPS();
        }
    });
}

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

const FPL_LEGS_PER_PAGE = 6; 

function renderFPL(left, right) {
    if (!currentMissionData) { left.innerHTML = '<div class="kln90b-line dim">NO FLIGHTPLAN</div>'; right.innerHTML = '<div class="kln90b-line dim">DISPATCH FIRST</div>'; return; }

    const wps = routeWaypoints, legs = [];
    if (wps && wps.length >= 2) {
        for (let i = 0; i < wps.length - 1; i++) {
            const p1 = wps[i], p2 = wps[i + 1], nav = calcNav(p1.lat, p1.lng || p1.lon, p2.lat, p2.lng || p2.lon);
            let n1 = i === 0 ? (currentStartICAO || 'DEP')  : (wps[i].name || `WP${i}`);
            let n2 = i === wps.length - 2 ? (currentDestICAO  || 'DEST') : (wps[i+1].name || `WP${i+1}`);
            
            n1 = n1.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '');
            n2 = n2.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '');
            
            let m1 = n1.match(/\[([^\]]+)\]/); if (m1) n1 = `[${m1[1]}]`;
            let m2 = n2.match(/\[([^\]]+)\]/); if (m2) n2 = `[${m2[1]}]`;
            
            n1 = n1.replace(/\s*\([^)]+\)/, '');
            n2 = n2.replace(/\s*\([^)]+\)/, '');

            const n1Short = n1.length > 8 ? n1.substring(0, 7) + '.' : n1;
            const n2Short = n2.length > 8 ? n2.substring(0, 7) + '.' : n2;
            legs.push({ n1: n1Short, n2: n2Short, brng: nav.brng, dist: nav.dist });
        }
    }

    const legPages = Math.max(1, Math.ceil(legs.length / 6));
    gpsState.maxPages['FPL'] = legPages;
    if (gpsState.subPage >= legPages) gpsState.subPage = legPages - 1;
    const pageLbl = document.getElementById('gpsPageLbl');
    if (pageLbl) pageLbl.textContent = `PG ${gpsState.subPage + 1}/${legPages}`;

    if (gpsState.subPage < legPages) {
        const start = gpsState.subPage * 6;
        const visible = legs.slice(start, start + 6);
        left.innerHTML = visible.map((l, idx) => {
            const isEnd = (start + idx) === 0 || (start + idx) === legs.length - 1;
            return `<div class="kln90b-line ${isEnd ? 'highlight' : ''}" style="font-size:10px; line-height:1.5; white-space:nowrap;">${l.n1}\u2192${l.n2}&nbsp;&nbsp;<span class="dim">${l.brng}\u00b0&thinsp;${l.dist}&thinsp;NM</span></div>`;
        }).join('');
        if (legs.length === 0) left.innerHTML = `<div class="kln90b-line highlight">${currentStartICAO}</div><div class="kln90b-line dim">→${currentDestICAO}</div>`;
        
        const _d = Math.round((currentMissionData.dist||0)*10)/10, _t = parseInt(document.getElementById('tasSlider')?.value)||115, _g = parseInt(document.getElementById('gphSlider')?.value)||9;
        right.innerHTML = `<div class="kln90b-line dim" style="font-size:9px;">TOTAL:</div><div class="kln90b-line" style="font-size:10px;">DST ${_d}NM</div><div class="kln90b-line" style="font-size:10px;">TME ${Math.round((_d/_t)*60)}m</div><div class="kln90b-line" style="font-size:10px;">FUL ${Math.ceil((_d/_t)*_g+0.75*_g)}G</div><div class="kln90b-line" style="font-size:10px;">HDG ${currentMissionData.heading||0}°</div>`;
    }
}
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

    left.innerHTML =
        `<div class="kln90b-line highlight" style="font-size:11px;">${icao}</div>` +
        `<div class="kln90b-line" style="font-size:9px; white-space:normal; line-height:1.35;">${name}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px; margin-top:2px;">${lat}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px;">${lon}</div>`;

    right.innerHTML = '<div class="kln90b-line dim kln-loading-dots" style="margin-top:8px;"><span>●</span><span>●</span><span>●</span></div>';

    if (!runwayCache[icao] && data) {
        const wikiResult = await fetchRunwayFromWikipedia(icao, data.lat, data.lon);
        
        if (wikiResult) {
            runwayCache[icao] = wikiResult;
            if (gpsState.mode === mode) renderGPS(); 
        } else {
            try {
                const ov = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(`[out:json][timeout:8];way["aeroway"="runway"](around:3000,${data.lat},${data.lon});out tags;`)}`).then(r => r.json());
                if (ov?.elements?.length > 0) {
                    const trans = {asphalt:'Asphalt',concrete:'Beton',grass:'Gras',paved:'Asphalt',unpaved:'Unbefestigt',dirt:'Erde',gravel:'Schotter'};
                    const seen = new Set(), parts = [];
                    for (const e of ov.elements) {
                        if (!e.tags?.ref || seen.has(e.tags.ref)) continue;
                        seen.add(e.tags.ref);
                        const surf = e.tags.surface ? (trans[e.tags.surface.toLowerCase()] || e.tags.surface) : '?';
                        const len  = e.tags.length  ? ' · '+Math.round(e.tags.length)+'m' : '';
                        parts.push(`${e.tags.ref} – ${surf}${len}`);
                    }
                    if (parts.length > 0) {
                        runwayCache[icao] = parts.join('\n');
                        if (gpsState.mode === mode) renderGPS();
                    }
                } else {
                    runwayCache[icao] = "Keine Daten gefunden";
                    if (gpsState.mode === mode) renderGPS();
                }
            } catch(e) {
                runwayCache[icao] = "Keine Daten gefunden";
                if (gpsState.mode === mode) renderGPS();
            }
        }
    }

    // Frequenz-Fallback: Wenn nicht im Cache, nachladen
    if (freqCache[icao] === undefined && (!gpsState.fetchingFreqs || !gpsState.fetchingFreqs.has(icao))) {
        if (!gpsState.fetchingFreqs) gpsState.fetchingFreqs = new Set();
        gpsState.fetchingFreqs.add(icao);
        fetchAirportFreq(icao, null, null).then(() => {
            gpsState.fetchingFreqs.delete(icao);
            if (gpsState.mode === mode) renderGPS();
        });
    }

    const RWYS_PER_PAGE = 4;
    const FREQS_PER_PAGE = 4;
    const allRunways  = runwayCache[icao] ? runwayCache[icao].split(/\s*(?:\||\n|<br\s*\/?>)\s*/i).filter(r=>r.trim()) : [];
    const allFreqs    = freqCache[icao] || [];
    const rwyPages    = Math.max(1, Math.ceil(allRunways.length / RWYS_PER_PAGE));
    const freqPages   = allFreqs.length > 0 ? Math.ceil(allFreqs.length / FREQS_PER_PAGE) : 0;
    const sp          = gpsState.subPage;

    if (sp < rwyPages) {
        const slice = allRunways.slice(sp * RWYS_PER_PAGE, (sp + 1) * RWYS_PER_PAGE);
        const label = rwyPages > 1 ? `RUNWAYS (${sp+1}/${rwyPages}):` : 'RUNWAYS:';
        right.innerHTML =
            `<div class="kln90b-line dim" style="font-size:9px; margin-bottom:1px;">${label}</div>` +
            (slice.length
                ? slice.map(r=>`<div class="kln90b-line" style="font-size:9px; white-space:normal; line-height:1.4;">▸ ${r}</div>`).join('')
                : '<div class="kln90b-line dim">NO RWY DATA</div>');

        const wikiN = gpsState.wikiCache[icao]?.length || 1;
        const total = rwyPages + freqPages + wikiN;
        if (gpsState.maxPages[mode] !== total) {
            gpsState.maxPages[mode] = total;
            const lbl = document.getElementById('gpsPageLbl');
            if (lbl) lbl.textContent = `PG ${sp+1}/${total}`;
        }
        return;
    }

    const freqIdx = sp - rwyPages;
    if (freqPages > 0 && freqIdx >= 0 && freqIdx < freqPages) {
        const fSlice = allFreqs.slice(freqIdx * FREQS_PER_PAGE, (freqIdx + 1) * FREQS_PER_PAGE);
        const fLabel = freqPages > 1 ? `FREQ (${freqIdx+1}/${freqPages}):` : 'FREQ:';
        right.innerHTML =
            `<div class="kln90b-line dim" style="font-size:9px; margin-bottom:1px;">${fLabel}</div>` +
            fSlice.map(f => `<div class="kln90b-line" style="font-size:9px; white-space:normal; line-height:1.4;">▸ ${f.label}: ${f.value}</div>`).join('');

        const wikiN = gpsState.wikiCache[icao]?.length || 1;
        const total = rwyPages + freqPages + wikiN;
        if (gpsState.maxPages[mode] !== total) {
            gpsState.maxPages[mode] = total;
            const lbl = document.getElementById('gpsPageLbl');
            if (lbl) lbl.textContent = `PG ${sp+1}/${total}`;
        }
        return;
    }

    if (!gpsState.wikiCache[icao] && data) {
        await fetchAndCacheWikiPages(icao, data.lat, data.lon);
    }
    const wikiArr = gpsState.wikiCache[icao] || ['Keine Daten.'];
    const total   = rwyPages + freqPages + wikiArr.length;
    if (gpsState.maxPages[mode] !== total) {
        gpsState.maxPages[mode] = total;
        const lbl = document.getElementById('gpsPageLbl');
        if (lbl) lbl.textContent = `PG ${sp+1}/${total}`;
    }
    if (gpsState.subPage >= total) gpsState.subPage = total - 1;

    const wikiPageIdx = sp - rwyPages - freqPages;
    if (wikiPageIdx >= 0 && wikiPageIdx < wikiArr.length) {
        right.innerHTML =
            `<div class="kln90b-line" style="font-size:9px; line-height:1.5; white-space:normal;">${wikiArr[wikiPageIdx]}</div>`;
    } else {
        right.innerHTML = '<div class="kln90b-line dim">NO WIKI DATA</div>';
    }
}

async function fetchAndCacheWikiPages(icao, lat, lon) {
    try {
        let title = wikiTitleCache[icao];

        if (!title) {
            const wdRes = await fetchWithTimeout(`https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P239=${icao}&format=json&origin=*`, 4000);
            const wdData = await wdRes.json();
            
            if (wdData?.query?.search?.length > 0) {
                title = wdData.query.search[0].title;
            } else {
                const fallRes = await fetchWithTimeout(`https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(icao + ' Flugplatz OR Flugplatz')}&srlimit=1&format=json&origin=*`, 4000);
                const fallData = await fallRes.json();
                if (fallData?.query?.search?.length > 0) title = fallData.query.search[0].title;
            }
            if (title) wikiTitleCache[icao] = title;
        }

        if (!title) {
            gpsState.wikiCache[icao] = ['Keine Wikipedia-Daten gefunden.'];
            return;
        }

        const extRes = await fetchWithTimeout(`https://de.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&exsentences=12&titles=${encodeURIComponent(title)}&format=json&origin=*`, 5000);
        const extData = await extRes.json();
        
        const pageId = Object.keys(extData.query.pages)[0];
        const txt = extData.query.pages[pageId]?.extract?.trim() || 'Keine Information verfügbar.';

        gpsState.wikiCache[icao] = splitTextIntoPages(txt, 170);
    } catch (e) {
        gpsState.wikiCache[icao] = ['Fetch-Fehler – bitte erneut versuchen.'];
    }
}

function splitTextIntoPages(text, charsPerPage = 360) {
    const cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
    const pages   = [];
    let remaining = cleaned;
    while (remaining.length > 0) {
        if (remaining.length <= charsPerPage) {
            pages.push(remaining);
            break;
        }
        let cut = charsPerPage;
        const lo = Math.max(cut - 60, 1), hi = Math.min(cut + 40, remaining.length - 1);
        for (let i = hi; i >= lo; i--) {
            if (('.!?').includes(remaining[i]) && remaining[i+1] === ' ') {
                cut = i + 1; break;
            }
        }
        if (cut === charsPerPage) {
            while (cut > 0 && remaining[cut] !== ' ' && remaining[cut] !== '\n') cut--;
            if (cut === 0) cut = charsPerPage;
        }
        pages.push(remaining.substring(0, cut).trim());
        remaining = remaining.substring(cut).trim();
    }
    return pages.length > 0 ? pages : ['Keine Info'];
}

function renderAIP(left, right) {
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

function renderWX(left, right) {
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

function refreshGPSAfterDispatch() {
    if (gpsState.visible) {
        setTimeout(() => renderGPS(), 500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initGPSButtons();
    initGPSEncoders();
    initCom2Knob();
    restoreAudioButtonStates();
});

/* =========================================================
   19. OPENAIP SNAPPING (NAVAIDS & REP-POINTS)
   ========================================================= */
let snapMode = true; 
let cachedNavData = [];

function toggleSnapMode() {
    snapMode = !snapMode;
    updateSnapButtonUI();
    if (snapMode && map) fetchOpenAIPData();
    else cachedNavData = [];
}

function updateSnapButtonUI() {
    const btn = document.getElementById('snapBtn');
    if (!btn) return;
    if (snapMode) {
        btn.innerText = '🧲 Snapping (An)';
        btn.style.background = '#4da6ff';
        btn.style.color = '#fff';
    } else {
        btn.innerText = '🧲 Snapping (Aus)';
        btn.style.background = '#444';
        btn.style.color = '#fff';
    }
}

async function fetchOpenAIPData() {
    if (!map || !snapMode) return;
    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const proxy = 'https://ga-proxy.einherjer.workers.dev';
    
    try {
        const [navRes, repRes, aptRes] = await Promise.all([
            fetch(`${proxy}/api/navaids?bbox=${bbox}&limit=250&t=${Date.now()}`),
            fetch(`${proxy}/api/reporting-points?bbox=${bbox}&limit=250&t=${Date.now()}`),
            fetch(`${proxy}/api/airports?bbox=${bbox}&limit=250&t=${Date.now()}`)
        ]);
        
        const navJson = await navRes.json(), repJson = await repRes.json(), aptJson = await aptRes.json();
        cachedNavData = [];
        
        let navArray = navJson.items || [];
        let repArray = repJson.items || [];
        let aptArray = aptJson.items || [];

        navArray.forEach(i => {
            if (!i.geometry) return;
            let freqVal = '';
            if (i.frequency !== undefined && i.frequency !== null) {
                freqVal = (typeof i.frequency === 'object' && i.frequency.value) ? i.frequency.value : i.frequency;
            } else if (i.frequencies && i.frequencies.length > 0) {
                freqVal = i.frequencies[0].value || i.frequencies[0];
            }
            let freq = freqVal ? ` (${freqVal})` : '';
            let idVal = i.identifier || i.designator || '';
            let ident = idVal ? ` [${idVal}]` : '';
            cachedNavData.push({ name: `${i.name}${ident}${freq}`, lat: i.geometry.coordinates[1], lng: i.geometry.coordinates[0] });
        });
        
        repArray.forEach(i => {
            if (!i.geometry) return;
            cachedNavData.push({ name: `RPP ${i.name}`, lat: i.geometry.coordinates[1], lng: i.geometry.coordinates[0] });
        });
        
        aptArray.forEach(i => {
            if (!i.geometry) return;
            let freq = (i.frequencies && i.frequencies.length > 0 && i.frequencies[0].value) ? ` (${i.frequencies[0].value})` : '';
            let displayName = i.icaoCode ? i.icaoCode : i.name;
            cachedNavData.push({ name: `APT ${displayName}${freq}`, lat: i.geometry.coordinates[1], lng: i.geometry.coordinates[0] });
        });
    } catch(e) { console.error("❌ Fetch Error:", e); }
}