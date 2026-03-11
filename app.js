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

    if (lblClassic) lblClassic.style.color = '#888';
    if (lblRetro) lblRetro.style.color = '#888';
    if (lblNavcom) lblNavcom.style.color = '#888';

    if (mode === 'retro') {
        document.body.classList.add('theme-retro');
        localStorage.setItem('ga_theme', 'retro');
        if (slider) slider.value = 1;
        if (lblRetro) lblRetro.style.color = '#d93829';
    } else if (mode === 'navcom') {
        document.body.classList.add('theme-navcom', 'theme-retro');
        localStorage.setItem('ga_theme', 'navcom');
        if (slider) slider.value = 2;
        if (lblNavcom) lblNavcom.style.color = '#33ff33';
    } else {
        localStorage.setItem('ga_theme', 'classic');
        if (slider) slider.value = 0;
        if (lblClassic) lblClassic.style.color = '#4da6ff';
    }
    updateDynamicColors();
    refreshAllDrums();
    syncGPSWithTheme(mode, wasNavcom);
}

function syncGPSWithTheme(newMode, wasNavcom) {
    const fp = document.querySelector('.flightplan-container');
    const mod = document.getElementById('kln90bModule');
    if (newMode === 'navcom') {
        if (gpsState.visible) {
            if (mod) mod.style.display = 'flex';
            if (fp) fp.style.display = 'none';
            renderGPS();
        } else {
            if (mod) mod.style.display = 'none';
            if (fp) fp.style.display = '';
        }
    } else {
        if (mod) mod.style.display = 'none';
        if (fp) fp.style.display = '';
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
    syncToNavCom('gphRadioDisplay', g.toString().padStart(2, '0'));
    saveAudioButtonStates();
}

function toggleNavComAI(btnElement) {
    const aiToggleBtn = document.getElementById('aiToggle');
    if (aiToggleBtn) {
        aiToggleBtn.checked = !aiToggleBtn.checked;
        saveAiToggle();
        if (aiToggleBtn.checked) btnElement.classList.add('active');
        else btnElement.classList.remove('active');
        saveAudioButtonStates();
    }
}

function swapDepDest() {
    const depRadio = document.getElementById('startLocRadio');
    const destRadio = document.getElementById('destLocRadio');
    const depClassic = document.getElementById('startLoc');
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
    depRadio.value = destRadio.value;
    destRadio.value = tempVal;
    if (depClassic) depClassic.value = depRadio.value;
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

    const pages = ['notePage1', 'notePage2', 'notePage3', 'notePage4', 'notePage5'].map(id => document.getElementById(id)).filter(Boolean);
    if (pages.length < 2) return;
    const classes = ['front-note', 'back-note', 'third-note', 'fourth-note', 'fifth-note'];

    let forward = true;
    if (event && event.target && event.target.classList.contains('paperclip')) {
        forward = false;
    } else if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        if (clickX < rect.width / 2) forward = false;
    } else if (event) {
        if (event.clientX < window.innerWidth / 2) forward = false;
    }

    // Find current front page index
    let frontIdx = pages.findIndex(p => p.classList.contains('front-note'));
    if (frontIdx < 0) frontIdx = 0;

    if (forward) {
        frontIdx = (frontIdx + 1) % pages.length;
    } else {
        frontIdx = (frontIdx - 1 + pages.length) % pages.length;
    }

    // Assign classes in order starting from frontIdx
    for (let i = 0; i < pages.length; i++) {
        let pageIdx = (frontIdx + i) % pages.length;
        pages[pageIdx].className = 'mission-note-page ' + classes[i];
    }
}

function toggleWikiPhoto(event, containerId) {
    const container = document.getElementById(containerId);
    if (!container) { event.stopPropagation(); return; }

    // ── ZOOM-OUT: Placeholder im DOM → Element ist gerade gezoomt ──
    const placeholder = document.getElementById('photo-zoom-placeholder');
    if (placeholder) {
        event.stopPropagation();
        const origTransform = container.dataset.wikiOrigTransform || '';
        const rotMatch  = origTransform.match(/rotate\(([^)]+)\)/);
        const origAngle = rotMatch ? rotMatch[1] : '0deg';

        // Viewport-Mitte und Startskalierung aus Zoom-In wiederverwenden
        const vpCx       = parseFloat(container.dataset.wikiVpCx  || window.innerWidth  / 2);
        const vpCy       = parseFloat(container.dataset.wikiVpCy  || window.innerHeight * 0.42);
        const startScale = parseFloat(container.dataset.wikiZoomStartScale || 0.35);

        // Platzhalter-Mitte = Viewport-Position der Originalstelle (dank margin-left:auto im Platzhalter korrekt)
        const phRect = placeholder.getBoundingClientRect();
        const phCx   = phRect.left + phRect.width  / 2;
        const phCy   = phRect.top  + phRect.height / 2;

        // Schliess-Transform: von Mitte (translate 0,0 scale 1) zurück zur Originalposition (startScale)
        void container.offsetWidth;
        container.style.transform = `translate(${(phCx - vpCx).toFixed(1)}px, ${(phCy - vpCy).toFixed(1)}px) scale(${startScale.toFixed(4)}) rotate(${origAngle})`;
        container.style.boxShadow = '';
        container.style.cursor    = '';

        setTimeout(() => {
            placeholder.parentNode.insertBefore(container, placeholder);
            placeholder.remove();
            // Outer-Container-Style vollständig wiederherstellen (width, position, margin, transform …)
            container.style.cssText = container.dataset.wikiOrigCssText || '';
            // Inner photo-img-Höhe wiederherstellen
            const imgEl = container.querySelector('.photo-img');
            if (imgEl) imgEl.style.height = container.dataset.wikiPhotoImgOrigHeight || '';
        }, 430);

        const bd = document.getElementById('photo-backdrop');
        if (bd) { bd.style.opacity = '0'; setTimeout(() => bd.remove(), 400); }
        return;
    }

    // Zoom-In nur auf aktiver Seite
    const page = container.closest('.mission-note-page');
    if (page && !page.classList.contains('front-note')) return;

    event.stopPropagation();

    // ── ZOOM-IN ──
    // Strategie: Element auf Ziel-Displaygröße setzen (scale 1 im Endzustand) statt
    // kleines Element hochzuskalieren. background-size:cover rendert dann nativ in
    // voller Zielauflösung → gestochen scharfes Bild, keine GPU-Upscale-Unschärfe.
    const rect = container.getBoundingClientRect();
    container.dataset.wikiOrigTransform = container.style.transform || '';
    container.dataset.wikiOrigCssText   = container.style.cssText;

    const noteRef = container.closest('.notes-stack') || container.closest('.mission-note-page');
    const noteW   = noteRef ? noteRef.getBoundingClientRect().width : window.innerWidth * 0.7;

    const isMobile   = window.innerWidth <= 767;
    const targetW    = isMobile ? (window.innerWidth - 24) : (noteW * 1.2);
    const scaleRatio = targetW / rect.width;

    // Photo-img proportional skalieren, damit background-size:cover die Zielgröße füllt
    const imgEl = container.querySelector('.photo-img');
    container.dataset.wikiPhotoImgOrigHeight = imgEl ? (imgEl.style.height || '') : '';
    const origPhotoH = imgEl
        ? (parseFloat(imgEl.style.height) || parseFloat(window.getComputedStyle(imgEl).height) || 100)
        : 100;
    const newPhotoH = Math.round(origPhotoH * scaleRatio);
    if (imgEl) imgEl.style.height = newPhotoH + 'px';

    // Platzhalter mit korrektem margin-left → Zoom-Out landet exakt an Originalposition
    const mlMatch = (container.dataset.wikiOrigCssText || '').match(/margin-left\s*:\s*([^;]+)/i);
    const origML  = mlMatch ? mlMatch[1].trim() : 'auto';
    const ph = document.createElement('div');
    ph.id = 'photo-zoom-placeholder';
    ph.style.cssText = `width:${rect.width}px;height:${rect.height}px;flex-shrink:0;margin-left:${origML};visibility:hidden;`;
    container.parentNode.insertBefore(ph, container);

    // Gesamthöhe analytisch berechnen (padding-top 6 + padding-bottom 22 + border 2 = 30px)
    const actualTargetH = newPhotoH + 30;

    // Viewport-Mitte für Zoom (wird für Zoom-Out gespeichert)
    const vpCx = window.innerWidth  / 2;
    const vpCy = window.innerHeight * 0.42;
    container.dataset.wikiVpCx = vpCx;
    container.dataset.wikiVpCy = vpCy;

    const startScale = rect.width / targetW;   // < 1 → lässt Element in Originalgröße erscheinen
    container.dataset.wikiZoomStartScale = startScale.toFixed(6);

    // Element nach <body> verschieben – kein overflow-clipping durch Ancestors
    document.body.appendChild(container);

    // Transition unterdrücken während Setup (überschreibt das !important der CSS-Klasse)
    container.classList.add('wiki-zoom-setup');

    container.style.position = 'fixed';
    // Breite mit !important setzen, damit das mobile CSS (!important: 100px) überschrieben wird.
    // Inline-!important schlägt Stylesheet-!important in der CSS-Kaskade.
    container.style.setProperty('width', Math.round(targetW) + 'px', 'important');
    container.style.top      = Math.round(vpCy - actualTargetH / 2) + 'px';
    container.style.left     = Math.round(vpCx - targetW        / 2) + 'px';
    container.style.margin   = '0';
    container.style.float    = 'none';
    container.style.zIndex   = '10000';
    container.style.cursor   = 'zoom-out';

    // Starttransform: Element erscheint an Originalposition in Originalgröße
    const origCx = rect.left + rect.width  / 2;
    const origCy = rect.top  + rect.height / 2;
    const rotIn  = (container.dataset.wikiOrigTransform || '').match(/rotate\(([^)]+)\)/);
    const startAngle = rotIn ? rotIn[1] : '3deg';
    container.style.transform = `translate(${(origCx - vpCx).toFixed(1)}px, ${(origCy - vpCy).toFixed(1)}px) scale(${startScale.toFixed(4)}) rotate(${startAngle})`;

    // Startzustand einfrieren, dann Transition wieder aktivieren
    void container.offsetWidth;
    container.classList.remove('wiki-zoom-setup');

    // Hintergrund-Verdunkelung
    const bd = document.createElement('div');
    bd.id = 'photo-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:9999;opacity:0;transition:opacity 0.4s;';
    document.body.appendChild(bd);
    void bd.offsetWidth;
    bd.style.opacity = '1';
    bd.onclick = e => { e.stopPropagation(); toggleWikiPhoto(e, containerId); };

    // Zielzustand: Element in voller Zielgröße, zentriert im Viewport – kein GPU-Upscaling
    void container.offsetWidth;
    container.style.transform = `translate(0px, 0px) scale(1) rotate(2deg)`;
    container.style.boxShadow = '5px 20px 50px rgba(0, 0, 0, 0.8)';
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
    const tid = setTimeout(() => ctrl.abort(), ms);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        return res;
    } catch (e) { clearTimeout(tid); throw e; }
}

let measureMode = false, measurePoints = [], measurePolyline = null, measureMarkers = [], measureTooltip = null;
let routeWaypoints = [], routeMarkers = [], currentSName = "", currentDName = "";
let miniMap, miniRoutePolyline, miniMapMarkers = [];

/* =========================================================
   DRAG-KNOB LOGIK
   ========================================================= */
let navcomAltMode = 'alt'; // 'alt' or 'rate'

function toggleAltRateMode() {
    const label = document.getElementById('altRateToggle');
    const display = document.getElementById('altRadioDisplay');
    if (!label || !display) return;
    if (navcomAltMode === 'alt') {
        navcomAltMode = 'rate';
        label.textContent = 'V/S';
        label.style.color = '#ff8800';
        display.textContent = vpClimbRate;
    } else {
        navcomAltMode = 'alt';
        label.textContent = 'ALT';
        label.style.color = '';
        display.textContent = document.getElementById('altSlider')?.value || '4500';
    }
}

function initDragKnob(knobId, displayId, sliderId, min, max, type) {
    const knob = document.getElementById(knobId);
    const display = document.getElementById(displayId);
    const slider = document.getElementById(sliderId);
    if (!knob || !display || !slider) return;

    let isDragging = false;
    let startY = 0, startX = 0;
    let startVal = 0;
    let currentRotation = 0;

    function onStart(e) {
        isDragging = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        // ALT knob in rate mode: use rate value
        if (type === 'alt' && navcomAltMode === 'rate') {
            startVal = vpClimbRate || 500;
        } else {
            startVal = parseInt(slider.value) || min;
        }
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    }

    function onMove(e) {
        if (!isDragging) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

        // ALT knob in rate mode: different range and sensitivity
        if (type === 'alt' && navcomAltMode === 'rate') {
            let delta = Math.round((startY - clientY) + (clientX - startX));
            delta = Math.round(delta * 3);
            let newVal = startVal + delta;
            newVal = Math.max(200, Math.min(1500, newVal));
            newVal = Math.round(newVal / 50) * 50;
            display.innerText = newVal;
            currentRotation = (delta / 3) * 5;
            knob.style.transform = `rotate(${currentRotation}deg)`;
            handleRateChange(newVal);
            return;
        }

        let delta = Math.round((startY - clientY) + (clientX - startX));
        if (type === 'gph') delta = Math.round(delta * 0.3);
        if (type === 'alt') delta = Math.round(delta * 10);

        let newVal = startVal + delta;
        if (newVal < min) newVal = min;
        if (newVal > max) newVal = max;

        // Snap to slider step
        const step = parseInt(slider.step) || 1;
        if (step > 1) newVal = Math.round(newVal / step) * step;

        let displayVal = newVal;
        if (type === 'gph') displayVal = newVal.toString().padStart(2, '0');

        display.innerText = displayVal;
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
    knob.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
}

window.onload = () => {
    // iOS 10+ ignoriert user-scalable=no im Viewport-Tag.
    // Pinch-to-Zoom auf dem gesamten Dokument per JS sperren (passive:false erforderlich).
    document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove',  e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

    const savedTheme = localStorage.getItem('ga_theme') || 'retro';
    setTheme(savedTheme);
    applySavedPanelTheme();

    const lastDest = localStorage.getItem('last_icao_dest');
    if (lastDest) document.getElementById('startLoc').value = lastDest;

    const savedKey = localStorage.getItem('ga_gemini_key');
    if (savedKey) document.getElementById('apiKeyInput').value = savedKey;

    const aiEnabled = localStorage.getItem('ga_ai_enabled');
    const aiToggleBtn = document.getElementById('aiToggle');
    if (aiToggleBtn) { aiToggleBtn.checked = (aiEnabled !== 'false'); }

    renderLog();
    updateApiFuelMeter();

    if (!localStorage.getItem('ga_pinboard_init')) {
        localStorage.setItem('ga_pinboard', JSON.stringify(tutorialNotes));
        localStorage.setItem('ga_pinboard_init', 'true');
    }

    const activeMission = localStorage.getItem('ga_active_mission');
    if (activeMission) {
        setTimeout(() => {
            restoreMissionState(JSON.parse(activeMission));
            // Clear destination input on initial load to allow easy random route generation
            const dInp = document.getElementById('destLoc');
            if (dInp) dInp.value = '';
        }, 300);
    }

    requestAnimationFrame(() => {
        setTimeout(() => { refreshAllDrums(); }, 50);
    });

    syncToNavCom('startLocRadio', document.getElementById('startLoc').value);
    syncToNavCom('tasRadioDisplay', document.getElementById('tasSlider').value);
    syncToNavCom('gphRadioDisplay', document.getElementById('gphSlider').value.toString().padStart(2, '0'));
    syncToNavCom('maxSeatsRadio', document.getElementById('maxSeats').value);

    initDragKnob('tasDragKnob', 'tasRadioDisplay', 'tasSlider', 80, 260, 'tas');
    initDragKnob('gphDragKnob', 'gphRadioDisplay', 'gphSlider', 5, 35, 'gph');
    initDragKnob('altDragKnob', 'altRadioDisplay', 'altSlider', 1500, 9500, 'alt');
    syncToNavCom('altRadioDisplay', document.getElementById('altSlider') ? document.getElementById('altSlider').value : '4500');

    if (aiToggleBtn && aiToggleBtn.checked) {
        const btnAI = document.getElementById('btnToggleAI');
        if (btnAI) btnAI.classList.add('active');
    }

    const savedSyncId = localStorage.getItem('ga_sync_id');
    if (savedSyncId) {
        const syncInput = document.getElementById('syncIdInput');
        if(syncInput) syncInput.value = savedSyncId;
    }

    // Sync Toggle Status laden (Standardmäßig auf AUS / false)
    const syncTggl = document.getElementById('syncToggle');
    if (syncTggl) { syncTggl.checked = (localStorage.getItem('ga_sync_enabled') === 'true'); }

    // Lade Gruppen-Settings
    const gName = localStorage.getItem('ga_group_name');
    const gNick = localStorage.getItem('ga_group_nick');
    if (gName && gNick) {
        const inpN = document.getElementById('groupNameInput');
        const inpU = document.getElementById('groupNickInput');
        const stat = document.getElementById('groupStatus');
        if (inpN) inpN.value = gName;
        if (inpU) inpU.value = gNick;
        if (stat) { stat.innerText = "Verbunden als " + gNick; stat.style.color = "var(--green)"; }
    }
};

function saveApiKey() { localStorage.setItem('ga_gemini_key', document.getElementById('apiKeyInput').value.trim()); }
function saveAiToggle() { const t = document.getElementById('aiToggle'); if (t) localStorage.setItem('ga_ai_enabled', t.checked); }

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
        freqCache: freqCache,
        vpAltWaypoints: typeof vpAltWaypoints !== 'undefined' ? vpAltWaypoints : [],
        vpSegmentAlts: typeof vpSegmentAlts !== 'undefined' ? vpSegmentAlts : [],
        vpElevationData: typeof vpElevationData !== 'undefined' ? vpElevationData : null
    };
    localStorage.setItem('ga_active_mission', JSON.stringify(state));
    triggerCloudSave();
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
    const destSwitchRow = document.getElementById("destSwitchRow"); if (destSwitchRow) destSwitchRow.style.display = "flex";
    const destLinks = document.getElementById("wikiDestLinks"); if (destLinks) destLinks.style.display = state.isPOI ? "none" : "block";

    currentMissionData = state.currentMissionData; routeWaypoints = state.routeWaypoints;
    currentStartICAO = state.currentStartICAO; currentDestICAO = state.currentDestICAO;
    currentSName = state.currentSName; currentDName = state.currentDName;
    currentDepFreq = state.currentDepFreq || ""; currentDestFreq = state.currentDestFreq || "";
    freqCache = state.freqCache || {};
    vpAltWaypoints = state.vpAltWaypoints || [];
    vpSegmentAlts  = state.vpSegmentAlts  || [];
    vpElevationData = state.vpElevationData || null;
    // Routenwechsel-Detektor vorbelegen – verhindert, dass vpAltWaypoints nach dem Restore
    // sofort wieder gelöscht werden (window._lastVpRouteKey ist nach Reload undefined)
    if (state.routeWaypoints && state.routeWaypoints.length > 0) {
        window._lastVpRouteKey = state.routeWaypoints.map(p =>
            `${(p.lat || 0).toFixed(4)},${((p.lng || p.lon) || 0).toFixed(4)}`
        ).join('|');
    }

    // Fallback: Wenn Frequenzen im Briefing fehlen (z.B. alte Pinnwand-Daten), neu laden
    if (!state.wikiDepFreqText && currentStartICAO) {
        fetchAirportFreq(currentStartICAO, 'wikiDepFreqText', 'dep');
    }
    if (!state.wikiDestFreqText && currentDestICAO && !state.isPOI) {
        fetchAirportFreq(currentDestICAO, 'wikiDestFreqText', 'dest');
    }

    const startLocEl = document.getElementById('startLoc');
    const destLocEl = document.getElementById('destLoc');
    const startLocRadioEl = document.getElementById('startLocRadio');
    const destLocRadioEl = document.getElementById('destLocRadio');
    if (startLocEl) startLocEl.value = currentStartICAO || '';
    if (destLocEl) destLocEl.value = (currentDestICAO && currentDestICAO !== currentStartICAO) ? currentDestICAO : '';
    if (startLocRadioEl) startLocRadioEl.value = currentStartICAO || '';
    if (destLocRadioEl) destLocRadioEl.value = (currentDestICAO && currentDestICAO !== currentStartICAO) ? currentDestICAO : '';

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

    setTimeout(() => {
        refreshGPSAfterDispatch();
        vpUpdatePosition(0);
    }, 200);

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

    // --- NEU: Restore METAR Widgets ---
    const depP = routeWaypoints && routeWaypoints.length > 0 ? routeWaypoints[0] : null;
    loadMetarWidget(currentStartICAO, 'metarContainerDep', depP?.lat, depP?.lng || depP?.lon);

    const destP = routeWaypoints && routeWaypoints.length > 1 ? routeWaypoints[routeWaypoints.length - 1] : null;
    loadMetarWidget(state.isPOI ? null : currentDestICAO, 'metarContainerDest', destP?.lat, destP?.lng || destP?.lon);

}

function resetApp() {
    if (!confirm("Möchtest du das aktuelle Briefing wirklich verwerfen und alles auf Anfang setzen?")) return;
    localStorage.removeItem('ga_active_mission'); document.getElementById("briefingBox").style.display = "none";
    currentMissionData = null; routeWaypoints = [];
    vpAltWaypoints = []; vpSegmentAlts = [];
    if (map) { routeMarkers.forEach(m => map.removeLayer(m)); if (polyline) map.removeLayer(polyline); if (window.hitBoxPolyline) map.removeLayer(window.hitBoxPolyline); clearAirspaceMapLayers(); }
    if (miniMap) { if (miniRoutePolyline) miniMap.removeLayer(miniRoutePolyline); miniMapMarkers.forEach(m => miniMap.removeLayer(m)); miniMapMarkers = []; }

    const destLocEl = document.getElementById('destLoc');
    const destLocRadioEl = document.getElementById('destLocRadio');
    const p1 = document.getElementById('notePage1'), p2 = document.getElementById('notePage2'), p3 = document.getElementById('notePage3');
    if (p1 && p2 && p3) { p1.className = 'mission-note-page front-note'; p2.className = 'mission-note-page back-note'; p3.className = 'mission-note-page third-note'; }
    if (destLocEl) destLocEl.value = '';
    if (destLocRadioEl) destLocRadioEl.value = '';

    document.getElementById('searchIndicator').innerText = "System bereit."; setDrumCounter('distDrum', 0); recalculatePerformance();
    const rBtn = document.getElementById('radioGenerateBtn');
    if (rBtn) rBtn.classList.remove('active');

    gpsState.wikiCache = {};
    gpsState.metarCache = {};
    runwayCache = {};
    gpsState.mode = 'FPL';
    gpsState.subPage = 0;
    gpsState.maxPages = { FPL: 1, DEP: 2, DEST: 2, AIP: 2, WX: 2 };
    document.querySelectorAll('.kln90b-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'FPL'));
    renderGPS();

    // --- NEU: METAR Widgets resetten ---
    loadMetarWidget(null, 'metarContainerDep');
    loadMetarWidget(null, 'metarContainerDest');

    // Position Marker im Profil zurücksetzen
    vpPositionFraction = 0;
    if (vpPositionLeafletMarker && map) {
        map.removeLayer(vpPositionLeafletMarker);
        vpPositionLeafletMarker = null;
    }
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
            strip.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<div class="drum-digit">${d}</div>`).join('');
            windowEl.appendChild(strip);
        }
    } else if (existingStrips.length > neededStrips) { for (let i = neededStrips; i < existingStrips.length; i++) { windowEl.removeChild(existingStrips[i]); } }
    const finalStrips = windowEl.querySelectorAll('.drum-strip');
    digits.forEach((digit, index) => { const translateY = -(parseInt(digit) * digitHeight); finalStrips[index].style.transform = `translateY(${translateY}px)`; });
}

function handleSliderChange(type, val) {
    let drumVal = val;
    if (type === 'gph') {
        drumVal = val.toString().padStart(2, '0');
        syncToNavCom('gphRadioDisplay', drumVal);
    }
    setDrumCounter(type + 'Drum', drumVal);
    if (type !== 'alt') recalculatePerformance();
    syncToNavCom(type + 'Radio', val);
    if (type === 'alt') {
        syncToNavCom('altRadioDisplay', val);
        triggerVerticalProfileUpdate();
        if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
    }
}

function handleRateChange(val) {
    val = parseInt(val);
    vpClimbRate = val;
    vpDescentRate = val;
    // Sync displays
    setDrumCounter('rateDrum', val);
    const rateMapDisplay = document.getElementById('rateMapDisplay');
    if (rateMapDisplay) rateMapDisplay.textContent = val;
    // Sync sliders
    const rateSlider = document.getElementById('rateSlider');
    const rateSliderMap = document.getElementById('rateSliderMap');
    if (rateSlider) rateSlider.value = val;
    if (rateSliderMap) rateSliderMap.value = val;
    // Sync NAVCOM if in rate mode
    if (typeof navcomAltMode !== 'undefined' && navcomAltMode === 'rate') {
        const altRadioDisplay = document.getElementById('altRadioDisplay');
        if (altRadioDisplay) altRadioDisplay.textContent = val;
    }
    // Re-render profiles
    if (typeof renderMapProfile === 'function') renderMapProfile();
    if (typeof renderVerticalProfile === 'function') renderVerticalProfile('verticalProfileCanvas');
    if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
}

function recalculatePerformance() {
    if (!currentMissionData) return;
    const tas = parseInt(document.getElementById("tasSlider").value), gph = parseInt(document.getElementById("gphSlider").value), dist = currentMissionData.dist;
    setDrumCounter('timeDrum', Math.round((dist / tas) * 60)); setDrumCounter('fuelDrum', Math.ceil((dist / tas * gph) + (0.75 * gph)));
    if (gpsState.visible && gpsState.mode === 'FPL') renderGPS();
    setTimeout(() => saveMissionState(), 500);
}

function refreshAllDrums() {
    setDrumCounter('tasDrum', document.getElementById('tasSlider').value);
    setDrumCounter('gphDrum', document.getElementById('gphSlider').value.toString().padStart(2, '0'));
    const altSlider = document.getElementById('altSlider'); if (altSlider) setDrumCounter('altDrum', altSlider.value);
    const rateSlider = document.getElementById('rateSlider'); if (rateSlider) setDrumCounter('rateDrum', rateSlider.value);
    if (currentMissionData) { setDrumCounter('distDrum', currentMissionData.dist); recalculatePerformance(); }
}

function applyPreset(t, g, s, n) {
    document.getElementById('tasSlider').value = t; document.getElementById('gphSlider').value = g;
    document.getElementById('maxSeats').value = s; selectedAC = n;
    handleSliderChange('tas', t); handleSliderChange('gph', g);
    syncToNavCom('tasRadio', t);
    syncToNavCom('gphRadio', g);
    syncToNavCom('maxSeatsRadio', s);
}

function copyCoords(elementId) {
    const txt = document.getElementById(elementId).innerText;
    if (txt && txt !== "-") { navigator.clipboard.writeText(txt).then(() => alert("Koordinaten kopiert:\n" + txt)); }
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
    if (btn) { btn.disabled = false; btn.innerText = "Auftrag generieren"; }
    const rBtn = document.getElementById('radioGenerateBtn');
    if (rBtn) {
        rBtn.classList.remove('disabled');
        rBtn.style.pointerEvents = '';
        const label = rBtn.querySelector('.audio-btn-label');
        if (label) label.textContent = "DISPATCH";
    }
}

async function loadMetarWidget(icao, containerId, lat, lon) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div style="padding:20px; text-align:center; color:#888; font-size:12px; background:#1a1a1a; border-radius:6px;">Sucht lokales Wetter...</div>';

    if (!icao || icao === 'POI') {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';

    try {
        let metarDataList = [];
        let isFallback = false;
        let foundIcao = icao;

        // Hilfsfunktion: Versucht direkten Fetch, bei CORS-Blockade (Catch) nutzt sie einen schnellen, rohen Proxy
        async function safeFetch(urlObj) {
            try {
                const r = await fetch(urlObj);
                if (r.ok && r.status !== 204) return await r.text();
            } catch (err) {
                try {
                    const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(urlObj)}`;
                    const pr = await fetch(proxyUrl);
                    if (pr.ok && pr.status !== 204) return await pr.text();
                } catch (pxErr) {
                    console.error("Proxy fetch failed", pxErr);
                }
            }
            return null;
        }

        const directUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json&t=${Date.now()}`;
        const mainText = await safeFetch(directUrl);
        if (mainText) {
            try { metarDataList = JSON.parse(mainText); } catch (e) { }
        }

        // Falls kein METAR da ist, Fallback auf Umkreissuche
        if ((!metarDataList || metarDataList.length === 0) && lat !== undefined && lon !== undefined) {
            const latMin = lat - 0.6, latMax = lat + 0.6;
            const lonMin = lon - 0.8, lonMax = lon + 0.8;
            const fbUrl = `https://aviationweather.gov/api/data/metar?bbox=${latMin},${lonMin},${latMax},${lonMax}&format=json&t=${Date.now()}`;
            const fbText = await safeFetch(fbUrl);

            if (fbText) {
                try {
                    const fbData = JSON.parse(fbText);
                    if (fbData && fbData.length > 0) {
                        let closest = fbData[0];
                        let minDist = calcNav(lat, lon, closest.lat, closest.lon).dist;
                        for (let i = 1; i < fbData.length; i++) {
                            let d = calcNav(lat, lon, fbData[i].lat, fbData[i].lon).dist;
                            if (d < minDist) { minDist = d; closest = fbData[i]; }
                        }
                        metarDataList = [closest];
                        foundIcao = closest.icaoId;
                        isFallback = true;
                    }
                } catch (parseErr) {
                    console.error("Failed to parse fallback JSON", parseErr);
                }
            }
        }

        if (!metarDataList || metarDataList.length === 0) {
            container.innerHTML = `
                <div style="background:#1a1a1a; border-radius:6px; padding:15px; text-align:center; border: 1px solid #333;">
                    <div style="color:#d93829; font-weight:bold; margin-bottom:5px;">Kein METAR in der Nähe von ${icao}</div>
                    <div style="font-size:11px; color:#888; margin-bottom:12px;">Für diesen Bereich steht kein automatisches Wetter zur Verfügung.</div>
                    <a href="https://metar-taf.com/de/${icao}" target="_blank" style="display:inline-block; background:#4da6ff; color:#111; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:12px; font-weight:bold; transition: background 0.2s;">Manuell suchen ➔</a>
                </div>`;
            return;
        }

        const metar = metarDataList[0];
        const raw = metar.rawOb || "";
        const temp = metar.temp !== null ? metar.temp + '°C' : '--';
        const dewp = metar.dewp !== null ? metar.dewp + '°C' : '--';

        // Parse Flight Category color
        let catColor = "#fff";
        let catText = metar.fltCat || "N/A";
        if (catText === "VFR") catColor = "#33ff33";
        else if (catText === "MVFR") catColor = "#4da6ff";
        else if (catText === "IFR") catColor = "#ff3333";
        else if (catText === "LIFR") catColor = "#ff33ff";

        let cover = metar.cover || "--";
        if (cover === "Clear") cover = "CLR";

        let qnhStr = "--";
        const qMatch = raw.match ? raw.match(/Q(\d{4})/) : null;
        const aMatch = raw.match ? raw.match(/A(\d{4})/) : null;
        if (qMatch) qnhStr = qMatch[1] + ' hPa';
        else if (aMatch) qnhStr = Math.round((parseInt(aMatch[1]) / 100) * 33.8639) + ' hPa';

        let wdir = metar.wdir;
        let wspd = metar.wspd || 0;
        let wgst = metar.wgst ? `G${metar.wgst}` : '';
        let isVRB = raw.match ? /VRB\d{2,3}KT/.test(raw) : (wdir === "VRB");

        let windText = isVRB ? `VRB / ${wspd}${wgst} kt` : `${wdir}° / ${wspd}${wgst} kt`;
        if (wspd === 0) windText = "Calm (0 kt)";

        let retries = 0;
        while (!runwayCache[foundIcao] && !runwayCache[icao] && retries < 15) {
            await new Promise(r => setTimeout(r, 200));
            retries++;
        }

        let rwyHdg = 0;
        let rwy1 = "";
        let rwy2 = "";
        const rData = runwayCache[foundIcao] || runwayCache[icao];
        if (rData && !rData.includes('Keine Daten')) {
            const match = rData.match(/(?:^|\s|\n|<br\s*\/?>)(0[1-9]|[12]\d|3[0-6])([LRC]?)\s*\/\s*((?:0[1-9]|[12]\d|3[0-6])[LRC]?)/);
            if (match) {
                rwyHdg = parseInt(match[1], 10) * 10;
                rwy1 = match[1] + match[2];
                rwy2 = match[3];
            }
        }

        let svgTicks = '';
        for (let i = 0; i < 360; i += 5) {
            const isCard = i % 90 === 0;
            const isLong = i % 10 === 0;
            const len = isCard ? 8 : (isLong ? 5 : 3);
            const sw = isCard ? 2 : 1;
            const col = isCard ? '#111' : '#888';
            svgTicks += `<line x1="80" y1="2" x2="80" y2="${2 + len}" stroke="${col}" stroke-width="${sw}" transform="rotate(${i} 80 80)" />`;

            if (i % 30 === 0 && !isCard) {
                const angleRad = (i - 90) * Math.PI / 180;
                const r = 61; // Radius for the numbers
                const tx = 80 + r * Math.cos(angleRad);
                const ty = 80 + r * Math.sin(angleRad);
                svgTicks += `<text x="${tx}" y="${ty}" font-family="sans-serif" font-size="10" fill="#333" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(${i} ${tx} ${ty})">${i / 10}</text>`;
            } else if (isCard) {
                const angleRad = (i - 90) * Math.PI / 180;
                const r = 61; // Radius for the letters
                const tx = 80 + r * Math.cos(angleRad);
                const ty = 80 + r * Math.sin(angleRad);
                let letter = '';
                if (i === 0) letter = 'N';
                else if (i === 90) letter = 'O';
                else if (i === 180) letter = 'S';
                else if (i === 270) letter = 'W';
                svgTicks += `<text x="${tx}" y="${ty}" font-family="sans-serif" font-size="14" fill="#111" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(${i} ${tx} ${ty})">${letter}</text>`;
            }
        }

        let arrowHtml = '';
        if (!isVRB && wspd > 0 && wdir !== null && wdir !== "VRB") {
            arrowHtml = `
            <svg viewBox="0 0 160 160" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; pointer-events:none;">
                <g transform="rotate(${wdir} 80 80)">
                    <line x1="80" y1="6" x2="80" y2="70" stroke="#1a73e8" stroke-width="4" stroke-linecap="round"/>
                    <polygon points="72,55 80,80 88,55" fill="#1a73e8" />
                </g>
            </svg>`;
        }

        const headerText = isFallback ? `▶ NEAREST: ${foundIcao}` : `▶ STATION: ${icao}`;

        container.innerHTML = `
            <div style="background:#f0eada; border-radius:12px; padding:15px 15px 20px 15px; border: 3px solid #c2bba8; box-shadow: 0 4px 8px rgba(0,0,0,0.2), inset 0 2px 5px rgba(255,255,255,0.5); font-family: 'Arial', sans-serif; color: #333; position:relative; overflow:hidden;">
                
                <div style="position:absolute; top:6px; left:6px; width:6px; height:6px; background:#ddd; border-radius:50%; box-shadow: inset 0 0 2px #555;"></div>
                <div style="position:absolute; bottom:6px; right:6px; width:6px; height:6px; background:#ddd; border-radius:50%; box-shadow: inset 0 0 2px #555;"></div>
                <div style="position:absolute; top:6px; right:6px; width:6px; height:6px; background:#ddd; border-radius:50%; box-shadow: inset 0 0 2px #555;"></div>
                <div style="position:absolute; bottom:6px; left:6px; width:6px; height:6px; background:#ddd; border-radius:50%; box-shadow: inset 0 0 2px #555;"></div>

                <div style="color: #8a1a12; font-size: 14px; font-weight: bold; margin-bottom: 12px; border-bottom: 2px dashed #c2bba8; padding-bottom: 8px; font-family: 'Courier New', Courier, monospace; display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.5px;">
                    <span>${headerText}</span>
                    <span style="color:${catColor}; font-size:14px; padding: 2px 8px; border: 2px solid ${catColor}; border-radius: 4px; background: rgba(255,255,255,0.7); box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${catText}</span>
                </div>
                
                <div style="background:#e6e0ce; color:#333; font-family: 'Courier New', Courier, monospace; padding:10px; border-radius:4px; font-size:11.5px; margin-bottom:18px; border: 1px inset #c2bba8; line-height: 1.4; letter-spacing: 0.5px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                    ${raw}
                </div>
                
                <div style="display:flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <div style="display:flex; flex-direction:column; gap:8px; font-family: 'Courier New', Courier, monospace; flex-shrink: 1; min-width: 0;">
                        <div><div style="color:#666; font-size:10px; font-weight:bold; letter-spacing:1px;">WIND</div><div style="color:#1a73e8; font-size:15px; font-weight:bold; white-space: nowrap;">${windText}</div></div>
                        <div style="display:flex; gap:12px;">
                            <div><div style="color:#666; font-size:10px; font-weight:bold; letter-spacing:1px;">TEMP</div><div style="color:#111; font-size:15px; font-weight:bold; white-space: nowrap;">${temp}</div></div>
                            <div><div style="color:#666; font-size:10px; font-weight:bold; letter-spacing:1px;">DEWP</div><div style="color:#111; font-size:15px; font-weight:bold; white-space: nowrap;">${dewp}</div></div>
                        </div>
                        <div><div style="color:#666; font-size:10px; font-weight:bold; letter-spacing:1px;">QNH</div><div style="color:#111; font-size:15px; font-weight:bold; white-space: nowrap;">${qnhStr}</div></div>
                        <div><div style="color:#666; font-size:10px; font-weight:bold; letter-spacing:1px;">COVER</div><div style="color:#111; font-size:15px; font-weight:bold; white-space: nowrap;">${cover}</div></div>
                    </div>
                    
                    <div style="position:relative; width:160px; height:160px; flex-shrink: 0; border:4px solid #a8a291; border-radius:50%; background:#fcfaf5; box-shadow: inset 0 2px 8px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.2);">
                        <svg viewBox="0 0 160 160" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1; pointer-events:none;">
                            ${svgTicks}
                        </svg>
                        
                        <div style="position:absolute; top:50%; left:50%; width:26px; height:105px; background:#444; border:1px solid #111; border-radius: 3px; transform: translate(-50%, -50%) rotate(${rwyHdg}deg); transform-origin: center center; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding: 4px 0; box-sizing: border-box; z-index:5; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                            <div style="width:100%; text-align:center; font-size:10px; line-height:1; color:#fff; font-weight:bold; transform: rotate(180deg); font-family: sans-serif;">${rwy1}</div>
                            <div style="width:2px; flex-grow:1; margin: 4px 0; background: repeating-linear-gradient(to bottom, #d4d4d4 0, #d4d4d4 8px, transparent 8px, transparent 16px);"></div>
                            <div style="width:100%; text-align:center; font-size:10px; line-height:1; color:#fff; font-weight:bold; font-family: sans-serif;">${rwy2}</div>
                        </div>
                        
                        ${arrowHtml}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error("METAR fetch error:", err);
        container.innerHTML = `<div style="padding:10px; text-align:center; color:#d93829; font-size:12px; background:#1a1a1a;">Fehler beim Laden des METARs: <br/>${err.message || err}</div>`;
    }
}
function calcNav(lat1, lon1, lat2, lon2) {
    const R = 3440, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180), x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    return { dist, brng: Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360) };
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
    } catch (e) { }
    if (typeof coreDB !== 'undefined' && coreDB[icao]) return coreDB[icao];
    return null;
}

async function findGithubAirport(lat, lon, minNM, maxNM, dirPref, regionPref) {
    await loadGlobalAirports(); let validAirports = [];
    for (const key in globalAirports) {
        const apt = globalAirports[key]; if (apt.icao === currentStartICAO) continue;
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
    } catch (e) { }
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
            const extRes = await fetch(`https://de.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=true&explaintext=true&exsentences=4&pithumbsize=1200&titles=${encodeURIComponent(titleToFetch)}&format=json&origin=*`);
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
    } catch (e) { textElement.innerText = "Wiki-Daten konnten nicht geladen werden."; }
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
            const trans = {
                "asphalt": "Asphalt", "concrete": "Beton", "grass": "Gras",
                "paved": "Asphalt", "unpaved": "Unbefestigt", "dirt": "Erde", "gravel": "Schotter"
            };
            const seen = new Set();
            const parts = [];
            for (const el of data.elements) {
                if (!el.tags?.ref) continue;
                const key = el.tags.ref;
                if (seen.has(key)) continue;
                seen.add(key);
                const surf = el.tags.surface ? (trans[el.tags.surface.toLowerCase()] || el.tags.surface) : '?';
                const len = el.tags.length ? ` · ${Math.round(el.tags.length)}m` : '';
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
    } catch (e) { }

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
    } catch (e) { }
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
    } catch (e) { }
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
            if (matches[i + 1].index < endIdx) endIdx = matches[i + 1].index;
        }
        let contextFwd = text.substring(startIdx, endIdx);

        let preStartIdx = Math.max(0, startIdx - 60);
        if (i > 0) {
            const prevEnd = matches[i - 1].index + matches[i - 1].raw.length;
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
    } catch (e) { }

    try {
        const resFlash = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, reqOptions);
        if (resFlash.ok) {
            const data = await resFlash.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('flash');
            return { t: parsed.title, s: parsed.story, pax: parsed.pax, cargo: parsed.cargo, i: "📋", cat: "std", _source: "Gemini 2.5 Flash" };
        }
    } catch (e) { }

    try {
        const resLite = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, reqOptions);
        if (resLite.ok) {
            const data = await resLite.json();
            const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
            incrementApiUsage('lite');
            return { t: parsed.title, s: parsed.story, pax: parsed.pax, cargo: parsed.cargo, i: "📋", cat: "std", _source: "Gemini 2.5 Flash Lite" };
        }
    } catch (e) { }
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
    if (!needle) return;
    const data = getApiUsage();
    let used = data.flash + data.lite;
    const maxCalls = 40;

    if (used > maxCalls) used = maxCalls;
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
                const prio = { 'TOWER': 1, 'TWR': 1, 'INFO': 2, 'INFORMATION': 2, 'ATIS': 2, 'RADIO': 3, 'CTAF': 3, 'UNICOM': 3, 'MULTICOM': 3, 'APP': 4, 'APPROACH': 4 };
                let bestF = apt.frequencies[0];
                let bestScore = 99;
                apt.frequencies.forEach(f => {
                    const n = (f.name || '').toUpperCase().trim();
                    const score = prio[n] || 99;
                    if (score < bestScore) { bestScore = score; bestF = f; }
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
    } catch (e) {
        if (el) el.innerText = '';
        freqCache[icao] = []; // Mark as fetched but empty
    }
    return null;
}

/* =========================================================
   OPENAIP AIRSPACE LOGIC
   ========================================================= */
let activeAirspaces = [];
let airspaceMapLayers = [];
let highlightedAirspaceIdx = -1; // track which airspace is toggled on
let vpHighlightPulseIdx = -1; // airspace index pulsing in profile canvas
let vpPulseAnimFrame = null; // requestAnimationFrame ID
let vpPulsePhase = 0; // 0..1 for pulse animation

function vpStartHighlightPulse() {
    vpStopHighlightPulse();
    vpPulsePhase = 0;
    function animate() {
        vpPulsePhase = (vpPulsePhase + 0.02) % 1;
        if (typeof renderMapProfile === 'function') renderMapProfile();
        vpPulseAnimFrame = requestAnimationFrame(animate);
    }
    vpPulseAnimFrame = requestAnimationFrame(animate);
}

function vpStopHighlightPulse() {
    if (vpPulseAnimFrame) {
        cancelAnimationFrame(vpPulseAnimFrame);
        vpPulseAnimFrame = null;
    }
}

function clearAirspaceMapLayers() {
    if (!map) return;
    airspaceMapLayers.forEach(l => map.removeLayer(l));
    airspaceMapLayers = [];
    highlightedAirspaceIdx = -1;
    vpHighlightPulseIdx = -1;
    vpStopHighlightPulse();
    // Remove active styling from all rows
    document.querySelectorAll('.as-row.as-active').forEach(el => el.classList.remove('as-active'));
    if (typeof renderMapProfile === 'function') renderMapProfile();
}

function toggleAirspaceHighlight(idx) {
    if (!map || !activeAirspaces[idx]) return;

    // If same airspace is already highlighted, toggle it off
    if (highlightedAirspaceIdx === idx) {
        clearAirspaceMapLayers();
        return;
    }

    // Clear previous
    airspaceMapLayers.forEach(l => map.removeLayer(l));
    airspaceMapLayers = [];
    document.querySelectorAll('.as-row.as-active').forEach(el => el.classList.remove('as-active'));

    const airspace = activeAirspaces[idx];
    highlightedAirspaceIdx = idx;

    const coords = airspace.geometry.coordinates;
    let polys = [];
    if (airspace.geometry.type === 'Polygon') {
        polys = [coords[0].map(c => [c[1], c[0]])];
    } else if (airspace.geometry.type === 'MultiPolygon') {
        polys = coords.map(pc => pc[0].map(c => [c[1], c[0]]));
    }

    const info = getAirspaceStyle(airspace);
    polys.forEach(ring => {
        const layer = L.polygon(ring, {
            color: info.mapColor || '#ff4444',
            weight: 3,
            fillColor: info.mapColor || '#ff4444',
            fillOpacity: 0.25,
            dashArray: '6,4',
            className: 'airspace-highlight-pulse'
        }).addTo(map);

        const displayName = getAirspaceDisplayName(airspace);
        layer.bindTooltip(`<b>${info.icon} ${displayName}</b>`, { sticky: true, className: 'airspace-tooltip' });
        airspaceMapLayers.push(layer);
    });

    // Mark the row as active
    const row = document.querySelector(`.as-row[data-as-idx="${idx}"]`);
    if (row) row.classList.add('as-active');

    // Start pulsing animation in the vertical profile canvas
    vpHighlightPulseIdx = idx;
    vpStartHighlightPulse();

    // Re-render profile to show highlighted airspace
    if (typeof renderMapProfile === 'function') renderMapProfile();
}

function getAirspaceDisplayName(a) {
    const t = a.type;
    const name = a.name || 'Unbekannt';
    if (t === 33) return `FIS ${name}`;
    return name;
}

function getAirspaceFreqInfo(a) {
    const t = a.type;
    if (!a.frequencies || a.frequencies.length === 0) return '';

    // For CTR/TMA/CTA (type 4, 7, 26) and type 0 with icaoClass 3: show Tower/Approach freq
    if ([4, 7, 26].includes(t) || (t === 0 && a.icaoClass === 3)) {
        const primary = a.frequencies.find(f => f.primary) || a.frequencies[0];
        if (primary) {
            const label = primary.name || 'TWR';
            return `<span style="color:#f2c12e; font-weight:bold; font-size:10px;">📻 ${label}: ${primary.value}</span>`;
        }
    }

    // For TMZ (type 5 or 27): show squawk if available, otherwise freq
    if (t === 5 || t === 27) {
        const primary = a.frequencies.find(f => f.primary) || a.frequencies[0];
        if (primary) {
            return `<span style="color:#9966ff; font-weight:bold; font-size:10px;">📻 ${primary.name || 'XPDR'}: ${primary.value}</span>`;
        }
    }

    // For RMZ (type 6 or 28) and FIS (type 33): show freq
    if ([6, 28, 33].includes(t)) {
        const primary = a.frequencies.find(f => f.primary) || a.frequencies[0];
        if (primary) {
            return `<span style="color:#66cccc; font-weight:bold; font-size:10px;">📻 ${primary.name || 'INFO'}: ${primary.value}</span>`;
        }
    }

    return '';
}

function getAirspaceStyle(a) {
    const t = a.type;
    const classLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const cls = (a.icaoClass !== undefined && classLetters[a.icaoClass]) ? '-' + classLetters[a.icaoClass] : '';
    if (t === 1) return { color: '#ff3333', icon: '⛔', mapColor: '#ff3333', category: 'ED-R / Restricted' };
    if (t === 2) return { color: '#ff6600', icon: '⛔', mapColor: '#ff6600', category: 'Danger' };
    if (t === 3) return { color: '#cc0000', icon: '🚫', mapColor: '#cc0000', category: 'Prohibited' };
    if (t === 4) return { color: '#f2c12e', icon: '⚠️', mapColor: '#f2c12e', category: `CTR${cls}` };
    if (t === 7) return { color: '#4da6ff', icon: '⚠️', mapColor: '#4da6ff', category: `TMA${cls}` };
    if (t === 26) return { color: '#4da6ff', icon: '⚠️', mapColor: '#4da6ff', category: `CTA${cls}` };
    if (t === 5 || t === 27) return { color: '#9966ff', icon: '📡', mapColor: '#9966ff', category: 'TMZ' };
    if (t === 6 || t === 28) return { color: '#66cccc', icon: '📡', mapColor: '#66cccc', category: 'RMZ' };
    if (t === 0 && a.icaoClass === 3) return { color: '#f2c12e', icon: '⚠️', mapColor: '#dda820', category: 'CTR-D (HX)' };
    if (t === 33) return { color: '#888', icon: '🌐', mapColor: '#888', category: 'FIS' };
    return { color: '#aaa', icon: '📋', mapColor: '#aaa', category: `Type ${t}` };
}

async function fetchRouteAirspaces(routePts) {
    const listEl = document.getElementById('routeAirspacesList');
    const container = document.getElementById('routeAirspacesContainer');

    if (!routePts || routePts.length < 2) return;

    if (container) {
        container.style.display = 'block';
        listEl.innerHTML = '<span style="color:#888;">Berechne Lufträume (OpenAIP)...</span>';
    }

    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    routePts.forEach(p => {
        let lat = p.lat, lon = p.lng || p.lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
    });

    minLat -= 0.15; maxLat += 0.15;
    minLon -= 0.25; maxLon += 0.25;

    try {
        let allItems = [];
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages && page <= 5) {
            const url = `https://ga-proxy.einherjer.workers.dev/api/airspaces?bbox=${minLon},${minLat},${maxLon},${maxLat}&limit=200&page=${page}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            if (!data || !data.items) break;
            allItems = allItems.concat(data.items);
            totalPages = data.totalPages || 1;
            page++;
        }

        if (allItems.length === 0) {
            listEl.innerHTML = '<span style="color:#888;">Keine Daten gefunden.</span>';
            return;
        }

        const airspaces = allItems;
        const intersecting = [];

        const testPoints = [];
        for (let i = 0; i < routePts.length - 1; i++) {
            const p1 = routePts[i], p2 = routePts[i + 1];
            const lat1 = p1.lat, lon1 = p1.lng || p1.lon;
            const lat2 = p2.lat, lon2 = p2.lng || p2.lon;
            const dist = calcNav(lat1, lon1, lat2, lon2).dist;

            const steps = Math.max(2, Math.ceil(dist));
            for (let j = 0; j <= steps; j++) {
                const f = j / steps;
                testPoints.push({ lat: lat1 + (lat2 - lat1) * f, lon: lon1 + (lon2 - lon1) * f });
            }
        }

        function pointInPolygon(pt, polygon) {
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                const xi = polygon[i][0], yi = polygon[i][1];
                const xj = polygon[j][0], yj = polygon[j][1];
                const intersect = ((yi > pt.lat) !== (yj > pt.lat))
                    && (pt.lon < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        // Segment-segment intersection (for catching small airspaces between sample points)
        function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
            const d1x = x2-x1, d1y = y2-y1, d2x = x4-x3, d2y = y4-y3;
            const cross = d1x*d2y - d1y*d2x;
            if (Math.abs(cross) < 1e-12) return false;
            const t = ((x3-x1)*d2y - (y3-y1)*d2x) / cross;
            const u = ((x3-x1)*d1y - (y3-y1)*d1x) / cross;
            return t >= 0 && t <= 1 && u >= 0 && u <= 1;
        }
        function routeCrossesPolygon(polygon) {
            for (let i = 0; i < routePts.length - 1; i++) {
                const p1 = routePts[i], p2 = routePts[i + 1];
                const lat1 = p1.lat, lon1 = p1.lng || p1.lon;
                const lat2 = p2.lat, lon2 = p2.lng || p2.lon;
                if (pointInPolygon({lat: lat1, lon: lon1}, polygon)) return true;
                if (pointInPolygon({lat: lat2, lon: lon2}, polygon)) return true;
                for (let j = 0, k = polygon.length - 1; j < polygon.length; k = j++) {
                    if (segmentsIntersect(lon1, lat1, lon2, lat2, polygon[k][0], polygon[k][1], polygon[j][0], polygon[j][1])) return true;
                }
            }
            return false;
        }

        // Relevant: 0 (CTR HX sectors), 1 (ED-R), 2 (Danger), 3 (Prohibited),
        // 4 (CTR), 5 (TMZ), 6 (RMZ alt code), 7 (TMA), 26 (CTA), 27 (TMZ alt code), 28 (RMZ), 33 (FIS)
        // Excluded: 10 (FIR)
        const relevantTypes = new Set([0, 1, 2, 3, 4, 5, 6, 7, 26, 27, 28, 33]);

        const addedIds = new Set();
        for (const as of airspaces) {
            if (addedIds.has(as._id)) continue;
            if (!relevantTypes.has(as.type)) continue;
            // Type 0: only include CTR sectors (icaoClass 3)
            if (as.type === 0 && as.icaoClass !== 3) continue;

            let hits = false;
            if (as.geometry && as.geometry.type === 'Polygon') {
                hits = routeCrossesPolygon(as.geometry.coordinates[0]);
            } else if (as.geometry && as.geometry.type === 'MultiPolygon') {
                for (const polyContainer of as.geometry.coordinates) {
                    if (routeCrossesPolygon(polyContainer[0])) { hits = true; break; }
                }
            }

            if (hits) {
                intersecting.push(as);
                addedIds.add(as._id);
            }
        }

        const sortOrder = { 3: 1, 1: 2, 2: 3, 4: 4, 0: 5, 5: 8, 7: 6, 26: 7, 27: 8, 6: 9, 28: 9, 33: 10 };
        intersecting.sort((a, b) => (sortOrder[a.type] || 99) - (sortOrder[b.type] || 99));

        // Deduplicate by name: type 0 (icaoClass 3) and type 4 often represent the same CTR in OpenAIP
        // Keep type 4, but inherit frequencies from the duplicate if type 4 has none
        const byName = new Map();
        for (const as of intersecting) {
            const key = as.name || as._id;
            if (!byName.has(key)) {
                byName.set(key, as);
            } else {
                const existing = byName.get(key);
                if (as.type === 4 && existing.type !== 4) {
                    if ((!as.frequencies || as.frequencies.length === 0) && existing.frequencies?.length > 0)
                        as.frequencies = existing.frequencies;
                    byName.set(key, as);
                } else if (existing.type === 4 && as.type !== 4) {
                    if ((!existing.frequencies || existing.frequencies.length === 0) && as.frequencies?.length > 0)
                        existing.frequencies = as.frequencies;
                }
            }
        }
        activeAirspaces = [...byName.values()];
        clearAirspaceMapLayers();
        renderAirspaceWarningsList();
        if (typeof renderMapProfile === 'function' && typeof vpMapProfileVisible !== 'undefined' && vpMapProfileVisible) renderMapProfile();
        if (typeof renderVerticalProfile === 'function' && document.getElementById('vpCanvas')) renderVerticalProfile();

    } catch (e) {
        console.error("OpenAIP Error", e);
        listEl.innerHTML = '<span style="color:#d93829;">Fehler beim Laden der Luftraumdaten.</span>';
    }
}

function renderAirspaceWarningsList() {
    const listEl = document.getElementById('routeAirspacesList');
    if (!listEl) return;

    if (!activeAirspaces || activeAirspaces.length === 0) {
        listEl.innerHTML = '<span style="color:#33ff33;">✅ Route frei – keine Konflikte erkannt.</span>';
        return;
    }

    const filterCheckbox = document.getElementById('navLogAirspaceFilter');
    const filterActive = filterCheckbox && filterCheckbox.checked;

    let fpResult = null;
    if (filterActive && typeof vpElevationData !== 'undefined' && vpElevationData && vpElevationData.length >= 2) {
        const cruiseAlt = parseInt(document.getElementById('altSliderMap')?.value || document.getElementById('altSlider')?.value || 4500);
        const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
        fpResult = computeFlightProfile(vpElevationData, cruiseAlt, vpClimbRate, vpDescentRate, tas);
    }

    let finalAirspaces = activeAirspaces;

    if (filterActive && fpResult && fpResult.profile) {
        finalAirspaces = activeAirspaces.filter(a => {
            if (!a.lowerLimit || !a.upperLimit) return true;
            const lowerFt = airspaceLimitToFt(a.lowerLimit);
            const upperFt = airspaceLimitToFt(a.upperLimit);
            if (lowerFt === null || upperFt === null) return true;

            const isLowerAgl = a.lowerLimit.referenceDatum === 0;
            const isUpperAgl = a.upperLimit.referenceDatum === 0;

            let intersects = false;
            if (a.geometry) {
                const polys = [];
                if (a.geometry.type === 'Polygon') polys.push(a.geometry.coordinates[0]);
                else if (a.geometry.type === 'MultiPolygon') a.geometry.coordinates.forEach(mc => polys.push(mc[0]));

                for (let i = 0; i < fpResult.profile.length; i++) {
                    const pp = fpResult.profile[i];
                    const elev = vpElevationData[i].elevFt;
                    const realLower = isLowerAgl ? elev + lowerFt : lowerFt;
                    const realUpper = isUpperAgl ? elev + upperFt : upperFt;

                    if (pp.altFt >= realLower && pp.altFt <= realUpper) {
                        const pt = vpElevationData[i];
                        for (const poly of polys) {
                            if (vpPointInPoly(pt, poly)) {
                                intersects = true; break;
                            }
                        }
                    }
                    if (intersects) break;
                }
            } else {
                for (let i = 0; i < fpResult.profile.length; i++) {
                    const pp = fpResult.profile[i];
                    const elev = vpElevationData[i].elevFt;
                    const realLower = isLowerAgl ? elev + lowerFt : lowerFt;
                    const realUpper = isUpperAgl ? elev + upperFt : upperFt;
                    if (pp.altFt >= realLower && pp.altFt <= realUpper) { intersects = true; break; }
                }
            }
            return intersects;
        });
    }

    if (finalAirspaces.length === 0) {
        listEl.innerHTML = '<span style="color:#33ff33;">✅ Route auf dieser Flughöhe frei.</span>';
        return;
    }

    let html = '';
    finalAirspaces.forEach((a) => {
        const idx = activeAirspaces.indexOf(a); // Keep original idx for map toggling
        const style = getAirspaceStyle(a);
        const displayName = getAirspaceDisplayName(a);
        const freqInfo = getAirspaceFreqInfo(a);

        let limitStr = '';
        const fmtLmt = (lim) => {
            if (!lim) return '?';
            if (lim.referenceDatum === 0 && lim.value === 0) return 'GND';
            if (lim.unit === 6) return `FL ${lim.value}`;
            let u = lim.unit === 1 ? 'FT' : (lim.unit === 6 ? 'FL ' : 'M');
            let r = lim.referenceDatum === 1 ? ' MSL' : (lim.referenceDatum === 0 ? ' AGL' : '');
            return `${lim.value} ${u}${r}`;
        };

        if (a.lowerLimit && a.upperLimit) {
            limitStr = `<span style="color:#555; font-size:9px; white-space:nowrap;">[${fmtLmt(a.lowerLimit)} – ${fmtLmt(a.upperLimit)}]</span>`;
        }

        const catLabel = `<span style="font-size:9px; color:#888;">${style.category}</span>`;
        const freqLine = freqInfo ? `<div style="margin-top:1px;">${freqInfo}</div>` : '';

        html += `<div class="as-row" data-as-idx="${idx}" 
                    onclick="toggleAirspaceHighlight(${idx}); event.stopPropagation();"
                    style="padding: 5px 4px; border-bottom: 1px dashed #bbb; cursor:pointer; transition: background 0.15s;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <span style="color:${style.color}; line-height:1.3;">
                            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${style.color}; margin-right:4px; vertical-align:middle;"></span>${style.icon} <b>${displayName}</b>
                            <span style="margin-left:4px;">${catLabel}</span>
                        </span>
                        ${limitStr}
                    </div>
                    ${freqLine}
                </div>`;
    });
    listEl.innerHTML = html;
}

async function generateMission() {
    const btn = document.getElementById('generateBtn');
    const rBtn = document.getElementById('radioGenerateBtn');
    if (btn) { btn.disabled = true; btn.innerText = "Sucht Route & Daten..."; }
    if (rBtn) {
        rBtn.classList.add('disabled');
        rBtn.style.pointerEvents = 'none';
        const label = rBtn.querySelector('.audio-btn-label');
        if (label) label.textContent = "CALC...";
    }
    document.getElementById("briefingBox").style.display = "none";

    const page1 = document.getElementById('notePage1'), page2 = document.getElementById('notePage2');
    if (page1 && page2) { page1.classList.replace('back-note', 'front-note'); page2.classList.replace('front-note', 'back-note'); }

    document.getElementById("mDepRwy").innerText = "Sucht Pisten-Infos..."; document.getElementById("mDepRwy").style.color = "#fff";
    document.getElementById("mDestRwy").innerText = "Sucht Pisten-Infos..."; document.getElementById("mDestRwy").style.color = "#fff";

    if (document.getElementById("wikiDepDescText")) document.getElementById("wikiDepDescText").innerText = "Lade Start-Info...";
    if (document.getElementById("wikiDestDescText")) document.getElementById("wikiDestDescText").innerText = "Lade Ziel-Info...";

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
    if (!start) {
        alert("Startplatz unbekannt!"); resetBtn(btn);
        if (window.meterInterval) clearInterval(window.meterInterval);
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
    if (rangePref === "any") {
        const roll = Math.random(); if (roll < 0.33) { minNM = 10; maxNM = 50; } else if (roll < 0.66) { minNM = 50; maxNM = 100; } else { minNM = 100; maxNM = 250; }
    } else {
        if (rangePref === "short") { minNM = 10; maxNM = 50; } if (rangePref === "medium") { minNM = 50; maxNM = 100; } if (rangePref === "long") { minNM = 100; maxNM = 250; }
    }

    const effectiveType = (forcePOI || targetType === "poi") ? "poi" : "apt";
    let searchMin = effectiveType === "poi" ? minNM / 2 : minNM, searchMax = effectiveType === "poi" ? maxNM / 2 : maxNM, dest = null;

    if (targetDest) { dest = await getAirportData(targetDest); } else {
        if (effectiveType === "apt") { dest = await findGithubAirport(start.lat, start.lon, searchMin, searchMax, dirPref, regionPref); }
        else { dest = await findWikipediaPOI(start.lat, start.lon, searchMin, searchMax, dirPref); }
    }

    if (!dest && !targetDest && typeof coreDB !== 'undefined') {
        if (effectiveType === "apt") {
            dataSource = "Core DB (Fallback)";
            let keys = Object.keys(coreDB).filter(k => k !== currentStartICAO);
            if (regionPref === "de") keys = keys.filter(k => k.startsWith('ED') || k.startsWith('ET'));
            if (regionPref === "int") keys = keys.filter(k => !k.startsWith('ED') && !k.startsWith('ET'));
            let dirFilteredKeys = keys.filter(k => checkBearing(calcNav(start.lat, start.lon, coreDB[k].lat, coreDB[k].lon).brng, dirPref));
            if (dirFilteredKeys.length > 0) keys = dirFilteredKeys;
            if (keys.length === 0) keys = Object.keys(coreDB).filter(k => k !== currentStartICAO);
            dest = coreDB[keys[Math.floor(Math.random() * keys.length)]];
        } else if (effectiveType === "poi" && typeof fallbackPOIs !== 'undefined') {
            dataSource = "Fallback POIs";
            let validPOIs = fallbackPOIs.filter(p => checkBearing(calcNav(start.lat, start.lon, p.lat, p.lon).brng, dirPref));
            if (validPOIs.length === 0) validPOIs = fallbackPOIs;
            dest = validPOIs[Math.floor(Math.random() * validPOIs.length)]; dest.icao = "POI";
        }
    }

    if (!dest) {
        indicator.innerText = "Fehler: Kein passendes Ziel gefunden."; resetBtn(btn);
        if (window.meterInterval) clearInterval(window.meterInterval);
        if (needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`; return;
    }

    const isPOI = forcePOI || (effectiveType === 'poi' && !targetDest);
    const nav = calcNav(start.lat, start.lon, dest.lat, dest.lon);
    let totalDist = isPOI ? nav.dist * 2 : nav.dist;
    currentDestICAO = isPOI ? currentStartICAO : dest.icao;

    const maxPax = Math.max(1, maxSeats - 1), randomPax = Math.floor(Math.random() * maxPax) + 1;
    let paxText = `${randomPax} PAX`, cargoText = `${Math.floor(Math.random() * 300) + 20} lbs`;

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
            if (history.length > 30) history.shift();
            localStorage.setItem('ga_std_history', JSON.stringify(history));

            if (dataSource === "Generiert") dataSource = "GitHub Airport DB";
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
    if (mHeadingNote) mHeadingNote.innerText = `${nav.brng}°`;

    document.getElementById("destRwyContainer").style.display = isPOI ? "none" : "block";
    if (document.getElementById("wikiDestRwyText")) document.getElementById("wikiDestRwyText").style.display = isPOI ? "none" : "block";
    const destSwitchRow = document.getElementById("destSwitchRow"); if (destSwitchRow) destSwitchRow.style.display = isPOI ? "none" : "flex";

    document.getElementById("briefingBox").style.display = "block";

    const destLocEl = document.getElementById('destLoc');
    const destLocRadioEl = document.getElementById('destLocRadio');
    if (destLocEl) destLocEl.value = '';
    if (destLocRadioEl) destLocRadioEl.value = '';

    updateMap(start.lat, start.lon, dest.lat, dest.lon, currentStartICAO, dest.n);

    const destLinks = document.getElementById("wikiDestLinks");
    if (destLinks) destLinks.style.display = isPOI ? "none" : "block";

    indicator.innerText = `Flugplan bereit (${dataSource}). Lade Infos...`;
    fetchRunwayDetails(start.lat, start.lon, 'mDepRwy', currentStartICAO);

    setTimeout(() => {
        if (!isPOI) fetchRunwayDetails(dest.lat, dest.lon, 'mDestRwy', currentDestICAO);

        fetchAreaDescription(start.lat, start.lon, 'wikiDepDescText', null, currentStartICAO, 'wikiDepImageContainer', 'wikiDepImage');
        fetchAreaDescription(dest.lat, dest.lon, 'wikiDestDescText', isPOI ? dest.n : null, isPOI ? null : currentDestICAO, 'wikiDestImageContainer', 'wikiDestImage');

        currentDepFreq = "";
        currentDestFreq = "";

        fetchAirportFreq(currentStartICAO, 'wikiDepFreqText', 'dep');

        // --- NEU: METAR Start laden ---
        loadMetarWidget(currentStartICAO, 'metarContainerDep', start.lat, start.lon);

        if (!isPOI) {
            fetchAirportFreq(currentDestICAO, 'wikiDestFreqText', 'dest');
        } else {
            const df = document.getElementById('wikiDestFreqText');
            if (df) df.innerHTML = '';
        }

        // --- NEU: METAR Ziel laden (nur wenn kein POI) ---
        loadMetarWidget(isPOI ? null : currentDestICAO, 'metarContainerDest', dest.lat, dest.lon);

        indicator.innerText = `Briefing komplett.`; resetBtn(btn);
        const rBtnLed = document.getElementById('radioGenerateBtn');
        if (rBtnLed) rBtnLed.classList.add('active');

        if (window.meterInterval) clearInterval(window.meterInterval);
        if (needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`;

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
        // Position im Profil auf Start zurücksetzen
        vpUpdatePosition(0);
    }, 800);
}

/* =========================================================
   7. KARTE (LEAFLET, KARTENTISCH & MESS-WERKZEUG)
   ========================================================= */
const hitBoxHtml = (color) => `<div class="pin-hitbox"><div class="pin-dot" style="background-color: ${color};"></div></div>`;
const hitBoxIcon = (color) => L.divIcon({ className: 'custom-pin', html: hitBoxHtml(color), iconSize: [34, 34], iconAnchor: [17, 17] });

const startIcon = hitBoxIcon('#44ff44'), destIcon = hitBoxIcon('#ff4444');
const wpIcon = L.divIcon({ className: 'custom-pin', html: `<div class="pin-hitbox" style="cursor: move;"><div class="pin-dot" style="background-color: #fdfd86;"></div></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
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
    const marker = L.marker(latlng, { icon: measureIcon, draggable: true }).addTo(map);
    marker.on('drag', updateMeasureRoute); marker.on('dragend', updateMeasureRoute);
    measureMarkers.push(marker); updateMeasureRoute();
}

function updateMeasureRoute() {
    if (measurePolyline) map.removeLayer(measurePolyline);
    if (measureTooltip) { map.removeLayer(measureTooltip); measureTooltip = null; }
    measurePoints = measureMarkers.map(m => m.getLatLng());

    if (measurePoints.length === 2) {
        measurePolyline = L.polyline(measurePoints, { color: '#f2c12e', weight: 4, dashArray: '6,6' }).addTo(map);
        const nav = calcNav(measurePoints[0].lat, measurePoints[0].lng || measurePoints[0].lon, measurePoints[1].lat, measurePoints[1].lng || measurePoints[1].lon);
        const centerLat = (measurePoints[0].lat + measurePoints[1].lat) / 2, centerLng = (measurePoints[0].lng + measurePoints[1].lng) / 2;
        const labelText = `<div style="font-weight:bold; font-size:14px; color:#111; text-align:center; line-height: 1.2;">${nav.brng}°<br>${nav.dist} NM</div>`;
        measureTooltip = L.tooltip({ permanent: true, direction: 'center', className: 'measure-label' }).setLatLng([centerLat, centerLng]).setContent(labelText).addTo(map);
    }
}

function clearMeasure() {
    if (measurePolyline) map.removeLayer(measurePolyline);
    if (measureTooltip) { map.removeLayer(measureTooltip); measureTooltip = null; }
    measureMarkers.forEach(m => map.removeLayer(m)); measurePoints = []; measureMarkers = [];
}

window.removeRouteWaypoint = function (index) { routeWaypoints.splice(index, 1); renderMainRoute(); };

function resetMainRoute() {
    if (routeWaypoints.length > 2) {
        routeWaypoints = [routeWaypoints[0], routeWaypoints[routeWaypoints.length - 1]];
        renderMainRoute(); map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] });
    }
}

function renderMainRoute() {
    if (!map) initMapBase();
    routeMarkers.forEach(m => map.removeLayer(m)); if (polyline) map.removeLayer(polyline); if (window.hitBoxPolyline) map.removeLayer(window.hitBoxPolyline); routeMarkers = [];
    if (routeWaypoints.length === 0) return;

    polyline = L.polyline(routeWaypoints, { color: '#ff4444', weight: 8, dashArray: '10,10', interactive: false }).addTo(map);
    window.hitBoxPolyline = L.polyline(routeWaypoints, { color: 'transparent', weight: 45, opacity: 0, className: 'interactive-route' }).addTo(map);

    window.hitBoxPolyline.on('click', function (e) {
        let bestIndex = 1, minDiff = Infinity;
        for (let i = 0; i < routeWaypoints.length - 1; i++) {
            let p1 = L.latLng(routeWaypoints[i].lat, routeWaypoints[i].lng || routeWaypoints[i].lon), p2 = L.latLng(routeWaypoints[i + 1].lat, routeWaypoints[i + 1].lng || routeWaypoints[i + 1].lon);
            let d1 = map.distance(p1, e.latlng), d2 = map.distance(e.latlng, p2), d = map.distance(p1, p2), diff = d1 + d2 - d;
            if (diff < minDiff) { minDiff = diff; bestIndex = i + 1; }
        }
        routeWaypoints.splice(bestIndex, 0, e.latlng); renderMainRoute();
    });

    routeWaypoints.forEach((latlng, index) => {
        let isStart = (index === 0), isDest = (index === routeWaypoints.length - 1 && routeWaypoints.length > 1);
        let icon = isStart ? startIcon : (isDest ? destIcon : wpIcon);
        let draggable = (!isStart && !isDest);
        let marker = L.marker(latlng, { icon: icon, draggable: draggable }).addTo(map);

        if (isStart) {
            marker.bindPopup(`<b>DEP:</b> ${currentSName}`);
        } else if (isDest) {
            marker.bindPopup(`<b>DEST:</b> ${currentDName}`);
        } else {
            let wpName = routeWaypoints[index].name ? `<b>${routeWaypoints[index].name}</b>` : `<b>Wegpunkt</b>`;
            marker.bindPopup(`<div style="text-align:center;">${wpName}<br><button onclick="removeRouteWaypoint(${index})" style="margin-top:5px; background:#d93829; color:#fff; border:none; padding:4px 8px; cursor:pointer; border-radius: 2px;">🗑️ Löschen</button></div>`);
        }

        if (draggable) {
            marker.on('drag', function (e) {
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

            marker.on('dragend', function (e) {
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
    if (routeWaypoints.length < 2 || !currentMissionData) return;
    let totalNM = 0, wpHTML = '';
    const tas = parseInt(document.getElementById("tasSlider").value) || 160;
    const gph = parseInt(document.getElementById("gphSlider").value) || 14;

    let totalTime = 0;
    let totalFuel = 0;

    let blHTML = '<table style="width:100%; border-collapse:collapse; text-align:left; font-size:14px; font-family:\'Courier New\', monospace; font-weight:bold; color:var(--navlog-text); margin-top:5px;">';
    blHTML += '<colgroup><col style="width:30%;"><col style="width:20%;"><col style="width:16%;"><col style="width:10%;"><col style="width:10%;"><col style="width:14%;"></colgroup>';
    blHTML += '<tr style="border-bottom:2px solid var(--navlog-border); color:var(--navlog-heading);"><th>Route</th><th>FREQ</th><th>HDG</th><th>NM</th><th>Min</th><th>Gal</th></tr>';

    for (let i = 0; i < routeWaypoints.length - 1; i++) {
        let p1 = routeWaypoints[i], p2 = routeWaypoints[i + 1], nav = calcNav(p1.lat, p1.lng || p1.lon, p2.lat, p2.lng || p2.lon);
        totalNM += nav.dist;

        let isStart = (i === 0);
        let isEnd = (i === routeWaypoints.length - 2);

        let name1 = isStart ? currentStartICAO : (routeWaypoints[i].name || `WP ${i}`);
        let name2 = isEnd ? (currentMissionData?.poiName ? 'POI' : currentDestICAO) : (routeWaypoints[i + 1].name || `WP ${i + 1}`);

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

        const c1 = isV1 ? 'var(--navlog-text)' : 'var(--navlog-freq)';
        const c2 = isV2 ? 'var(--navlog-text)' : 'var(--navlog-freq)';

        blHTML += `<tr style="border-bottom:1px dashed var(--navlog-border);">`;
        blHTML += `<td style="padding:8px 0 8px 8px; color:var(--navlog-text); line-height: 1.4;"><span style="display:inline-block; min-width:20px; text-align:right;">${i + 1}.</span> ${cleanName1}<br><span style="display:inline-block; min-width:20px; text-align:left;">➔</span> ${cleanName2}</td>`;
        blHTML += `<td style="padding:8px 0 8px 4px; font-size:14px; line-height: 1.6;"><span style="color:${c1}">${f1}</span><br><span style="color:${c2}">${f2}</span></td>`;
        blHTML += `<td style="padding:8px 0 8px 16px; color:var(--navlog-data); vertical-align:middle;">${nav.brng}°</td>`;
        blHTML += `<td style="padding:8px 0; color:var(--navlog-data); vertical-align:middle;">${nav.dist}</td>`;
        blHTML += `<td style="padding:8px 0; color:var(--navlog-data); vertical-align:middle;">${legTime}</td>`;
        blHTML += `<td style="padding:8px 0; color:var(--navlog-data); vertical-align:middle;">${legFuel.toFixed(1)}</td>`;
        blHTML += `</tr>`;

        wpHTML += `<div class="wp-row"><span class="wp-name">${cleanName1.replace(/<[^>]+>/g, '').trim()} ➔ ${cleanName2.replace(/<[^>]+>/g, '').trim()}</span><span class="wp-data">${nav.brng}° | ${nav.dist} NM</span></div>`;
    }

    blHTML += `<tr style="border-top:2px solid var(--navlog-border); color:var(--navlog-heading); font-size:15px;"><td style="padding-top:8px;">TOTAL</td><td style="padding-top:8px;"></td><td style="padding-top:8px;"></td><td style="padding-top:8px;">${totalNM}</td><td style="padding-top:8px;">${totalTime}</td><td style="padding-top:8px;">${totalFuel.toFixed(1)}</td></tr>`;
    blHTML += '</table>';

    const blDiv = document.getElementById('briefingNavLog');
    if (blDiv) blDiv.innerHTML = blHTML;

    let initialNav = calcNav(routeWaypoints[0].lat, routeWaypoints[0].lng || routeWaypoints[0].lon, routeWaypoints[1].lat, routeWaypoints[1].lng || routeWaypoints[1].lon);

    if (currentMissionData) {
        currentMissionData.dist = totalNM;
        currentMissionData.heading = initialNav.brng;
    }

    setDrumCounter('distDrum', totalNM);
    const mHeadingNote = document.getElementById("mHeadingNote"); if (mHeadingNote) mHeadingNote.innerText = `${initialNav.brng}°`;
    const wpListContainer = document.getElementById("waypointList"); if (wpListContainer) wpListContainer.innerHTML = wpHTML;

    recalculatePerformance();
    const mDistNote = document.getElementById("mDistNote"); if (mDistNote) mDistNote.innerText = `${totalNM} NM`;
    const hrs = Math.floor(totalTime / 60), mins = totalTime % 60;
    const mETENote = document.getElementById("mETENote"); if (mETENote) mETENote.innerText = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} Min.`;

    // Trigger Airspace Check
    if (window.airspaceFetchTimeout) clearTimeout(window.airspaceFetchTimeout);
    window.airspaceFetchTimeout = setTimeout(() => {
        fetchRouteAirspaces(routeWaypoints);
    }, 800);

    // Trigger Vertical Profile Update
    triggerVerticalProfileUpdate();

    setTimeout(() => saveMissionState(), 500);
    if (gpsState.visible && gpsState.mode === 'FPL') renderGPS();
}

function initMapBase() {
    if (map) return;

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

    map.on('overlayadd', function (e) {
        if (e.name === "🛩️ VFR Lufträume (Overlay)") {
            topoMap.setOpacity(0.5);
        }
    });

    map.on('overlayremove', function (e) {
        if (e.name === "🛩️ VFR Lufträume (Overlay)") {
            topoMap.setOpacity(1.0);
        }
    });

    let fetchTimeout = null;
    map.on('moveend', function () {
        if (snapMode) {
            clearTimeout(fetchTimeout); // Löscht alte, noch nicht ausgeführte Anfragen
            fetchTimeout = setTimeout(fetchOpenAIPData, 600); // Wartet 0,6 Sekunden Stillstand ab
        }
    });

    const fsControl = L.control({ position: 'topleft' });
    fsControl.onAdd = function () {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
        btn.innerHTML = '⛶'; btn.title = 'Vollbildmodus'; btn.style.width = '30px'; btn.style.height = '30px';
        btn.style.lineHeight = '30px'; btn.style.backgroundColor = '#fff'; btn.style.border = '1px solid #ccc';
        btn.style.cursor = 'pointer'; btn.style.fontSize = '18px'; btn.style.fontWeight = 'bold'; btn.style.textAlign = 'center'; btn.style.padding = '0';

        btn.onclick = function (e) {
            e.preventDefault(); document.body.classList.toggle('map-is-fullscreen');
            if (document.body.classList.contains('map-is-fullscreen')) { btn.innerHTML = '✖'; } else { btn.innerHTML = '⛶'; }
            setTimeout(() => {
                if (map) map.invalidateSize();
                updateMiniMap();
                if (typeof renderMapProfile === 'function') renderMapProfile();
            }, 300);
        };
        return btn;
    };
    fsControl.addTo(map);
    map.on('click', function (e) { if (!measureMode) return; addMeasurePoint(e.latlng); });
}

function updateMap(lat1, lon1, lat2, lon2, s, d) {
    if (!map) initMapBase();
    currentSName = s || "Start"; currentDName = d || "Ziel";
    routeWaypoints = [{ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }];
    renderMainRoute();
}

async function updateMapFromInputs() {
    if (!document.getElementById('mapTableOverlay').classList.contains('active')) return;
    const sIcao = document.getElementById('startLoc').value.toUpperCase(), dIcao = document.getElementById('destLoc').value.toUpperCase();
    if (!sIcao) return;
    if (!map) initMapBase();
    let sData = await getAirportData(sIcao), dData = dIcao ? await getAirportData(dIcao) : null;
    if (sData && dData) {
        currentSName = sData.icao; currentDName = dData.icao;
        if (!currentMissionData) {
            map.fitBounds(L.latLngBounds([sData.lat, sData.lon], [dData.lat, dData.lon]), { padding: [40, 40] });
        } else {
            routeWaypoints = [{ lat: sData.lat, lng: sData.lon }, { lat: dData.lat, lng: dData.lon }];
            renderMainRoute();
            map.fitBounds(L.latLngBounds([sData.lat, sData.lon], [dData.lat, dData.lon]), { padding: [40, 40] });
        }
    } else if (sData) {
        currentSName = sData.icao;
        if (!currentMissionData) {
            map.panTo([sData.lat, sData.lon]); if (map.getZoom() < 8) map.setZoom(9);
        } else {
            routeWaypoints = [{ lat: sData.lat, lng: sData.lon }];
            renderMainRoute();
            map.panTo([sData.lat, sData.lon]); if (map.getZoom() < 8) map.setZoom(9);
        }
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
        if (!map) initMapBase();

        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                if (routeWaypoints && routeWaypoints.length >= 2) map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] });
                else updateMapFromInputs();

                updateSnapButtonUI(); // Button blau machen
                if (snapMode) fetchOpenAIPData(); // Direkt Punkte für den Ausschnitt laden!
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
function openAIP(t) { window.open(`https://aip.aero/de/vfr/?${t === 'dep' ? currentStartICAO : currentDestICAO}`, '_blank'); }
function openMetar(t) { window.open(`https://metar-taf.com/de/${t === 'dep' ? currentStartICAO : currentDestICAO}`, '_blank'); }

function logCurrentFlight() {
    if (!currentMissionData) return;
    const log = JSON.parse(localStorage.getItem('ga_logbook')) || [];
    log.unshift({ ...currentMissionData, date: new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) });
    localStorage.setItem('ga_logbook', JSON.stringify(log.slice(0, 50)));
    localStorage.setItem('last_icao_dest', currentMissionData.dest);
    const newStart = currentMissionData.dest || '';
    document.getElementById('startLoc').value = newStart;
    document.getElementById('destLoc').value = "";
    const startLocRadioEl = document.getElementById('startLocRadio');
    const destLocRadioEl = document.getElementById('destLocRadio');
    if (startLocRadioEl) startLocRadioEl.value = newStart;
    if (destLocRadioEl) destLocRadioEl.value = '';
    renderLog(); alert(`Flug geloggt! Du bist in ${currentMissionData.dest}.`);
    triggerCloudSave();
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
function clearLog() { if (confirm("Gesamtes Logbuch löschen?")) { localStorage.removeItem('ga_logbook'); localStorage.removeItem('last_icao_dest'); renderLog(); triggerCloudSave(); } }

/* =========================================================
   10. HANGAR PINNWAND & CREW BOARD MULTIPLAYER
   ========================================================= */
let currentBoardMode = 'private'; 
let pendingPinNote = null;
let groupDataCache = { members: [], notes: [] };
const tutorialNotes = [
    { id: 101, text: "👋 WILLKOMMEN!\n\nZiehe diese Zettel umher, bearbeite sie (✏️) oder lösch sie (✖).", x: 4, y: 6, rot: -2 },
    { id: 102, text: "📻 NAVCOM THEME\n\nZieh mit gedrückter Maus an den runden Drehknöpfen, um TAS und GPH schnell einzustellen!", x: 28, y: 10, rot: 3 },
    { id: 103, text: "🗺️ KARTENTISCH\n\nKlick auf die rote Route für neue Wegpunkte. Nutze das ⛶ Icon für den echten Vollbildmodus!", x: 52, y: 5, rot: -1 },
    { id: 104, text: "🔗 MULTIPLAYER\n\nTritt unten in den Settings einer Crew bei, um Zettel und Flüge in Echtzeit zu teilen!", x: 76, y: 12, rot: 4 },
    { id: 105, text: "🌤️ WETTER & AIP\n\nIm Briefing (oder auf dem GPS) findest du Direkt-Links zu aktuellen METARs und Anflugkarten.", x: 6, y: 45, rot: 1 },
    { id: 106, text: "🎨 ANALOG DESIGN\n\nKlicke im Retro-Modus auf die silberne SCHRAUBE oben links, um die Panel-Lackierung zu wechseln!", x: 30, y: 50, rot: -3 },
    { id: 107, text: "🤖 KI DISPATCHER\n\nTrag unten deinen Gemini API-Key ein für kreative Missions-Storys mit Passagieren & Fracht.", x: 55, y: 42, rot: 2 },
    { id: 108, text: "📌 FLÜGE MERKEN\n\nPinne coole Routen an dieses Brett. Geflogen? Logge sie unten, um deinen Startplatz zu versetzen!", x: 78, y: 46, rot: -2 }
];
function getGroupName() { return localStorage.getItem('ga_group_name') || ""; }
function getGroupNick() { return localStorage.getItem('ga_group_nick') || ""; }
function getGroupPin() { return localStorage.getItem('ga_group_pin') || null; }
function hashPin(str) {
    let h = 0;
    for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return h.toString();
}
async function joinGroup() {
    const gName = document.getElementById('groupNameInput').value.trim().toUpperCase();
    const gNick = document.getElementById('groupNickInput').value.trim();
    const gPin = document.getElementById('groupPinInput').value.trim();
    if(!gName || !gNick) { alert("Bitte Gruppen-Code und Rufname eingeben!"); return; }
    document.getElementById('groupStatus').innerText = "Prüfe Zugang...";

    try {
        const res = await fetch(SYNC_URL + "GROUP_" + gName);
        let data = { members: [], kicked: [] };
        if (res.ok) data = await res.json();
        // 1. Kick-Prüfung
        if (data.kicked && data.kicked.includes(gNick)) {
            alert("Dieser Rufname wurde aus der Crew gebannt!");
            document.getElementById('groupStatus').innerText = "Nicht verbunden";
            return;
        }
        // 2. PIN-Prüfung
        const existingUser = (data.members || []).find(m => m.nick === gNick);
        const pinHash = gPin ? hashPin(gPin) : null;
        if (existingUser && existingUser.pin) {
            if (existingUser.pin !== pinHash) {
                alert("Falscher PIN für diesen Rufnamen!");
                document.getElementById('groupStatus').innerText = "Nicht verbunden";
                return;
            }
        }
        // Zugang gewährt
        localStorage.setItem('ga_group_name', gName);
        localStorage.setItem('ga_group_nick', gNick);
        if (pinHash) localStorage.setItem('ga_group_pin', pinHash); else localStorage.removeItem('ga_group_pin');
        document.getElementById('groupStatus').innerText = "Verbunden als " + gNick;
        document.getElementById('groupStatus').style.color = "var(--green)";

        forceGroupSync();
        triggerCloudSave(true);
        alert("🤝 Du bist der Crew '" + gName + "' beigetreten!");
    } catch(e) {
        alert("Verbindungsfehler.");
        document.getElementById('groupStatus').innerText = "Offline";
    }
}
async function removeSelfFromGroup(gName, gNick) {
    try {
        const res = await fetch(SYNC_URL + "GROUP_" + gName);
        if (!res.ok) return;
        let data = await res.json();
        if (data.members) {
            const me = data.members.find(m => m.nick === gNick);
            data.members = data.members.filter(m => m.nick !== gNick);

            // Admin-Rechte weitergeben, falls Admin geht
            if (me && me.isAdmin && data.members.length > 0) {
                data.members.sort((a,b) => a.lastSeen - b.lastSeen);
                data.members[0].isAdmin = true;
            }

            data.lastModified = Date.now();
            await fetch(SYNC_URL + "GROUP_" + gName, { method: 'POST', body: JSON.stringify(data), keepalive: true });
        }
    } catch(e) {}
}
function leaveGroup(isBanned = false) {
    const oldName = getGroupName();
    const oldNick = getGroupNick();
    if (oldName && oldNick && !isBanned) {
        removeSelfFromGroup(oldName, oldNick);
    }
    localStorage.removeItem('ga_group_name');
    localStorage.removeItem('ga_group_nick');
    localStorage.removeItem('ga_group_pin');
    document.getElementById('groupNameInput').value = "";
    document.getElementById('groupStatus').innerText = "Nicht verbunden";
    document.getElementById('groupStatus').style.color = "#888";
    if(currentBoardMode === 'group') switchPinboardMode('private');
    triggerCloudSave(true);
    if(!isBanned) alert("🚪 Crew verlassen.");
}
async function kickGroupUser(targetNick) {
    if(!confirm(`Möchtest du ${targetNick} wirklich aus der Crew kicken?`)) return;
    const gName = getGroupName();
    try {
        const res = await fetch(SYNC_URL + "GROUP_" + gName);
        if (!res.ok) return;
        let data = await res.json();
        data.members = (data.members || []).filter(m => m.nick !== targetNick);
        data.kicked = data.kicked || [];
        data.kicked.push(targetNick);
        data.lastModified = Date.now();
        await fetch(SYNC_URL + "GROUP_" + gName, { method: 'POST', body: JSON.stringify(data) });
        forceGroupSync();
    } catch(e) {}
}
function updateGroupUIFromSync(gName, gNick) {
    if (gName && gNick) {
        localStorage.setItem('ga_group_name', gName);
        localStorage.setItem('ga_group_nick', gNick);
        const inpN = document.getElementById('groupNameInput');
        const inpU = document.getElementById('groupNickInput');
        const stat = document.getElementById('groupStatus');
        if (inpN) inpN.value = gName;
        if (inpU) inpU.value = gNick;
        if (stat) { stat.innerText = "Verbunden als " + gNick; stat.style.color = "var(--green)"; }
        silentGroupSync();
    } else {
        leaveGroup(true); // Lautlos aufräumen
    }
}
function setNavComLed(btnId, state) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.remove('led-syncing', 'led-success', 'led-error');
    if (state !== 'off') btn.classList.add(`led-${state}`);
}
function updateGroupBadgeUI() {
    let newBadges = JSON.parse(localStorage.getItem('ga_group_new')) || [];
    let hidden = JSON.parse(localStorage.getItem('ga_group_hidden')) || [];

    // GHOST BUSTER: Wenn ein Zettel im lokalen Müll liegt, kann er nicht "Neu" sein!
    let initialLen = newBadges.length;
    newBadges = newBadges.filter(id => !hidden.includes(id));
    if (newBadges.length !== initialLen) {
        localStorage.setItem('ga_group_new', JSON.stringify(newBadges));
    }
    const mainBadge = document.getElementById('mainPinboardBadge');
    const tabBadge = document.getElementById('groupBadge');
    const hasNew = newBadges.length > 0;

    if (mainBadge) mainBadge.style.display = hasNew ? 'inline-block' : 'none';
    if (tabBadge && currentBoardMode !== 'group') {
        tabBadge.style.display = hasNew ? 'inline-block' : 'none';
    } else if (tabBadge && currentBoardMode === 'group') {
        tabBadge.style.display = 'none';
    }
}
function switchPinboardMode(mode) {
    if(mode === 'group' && !getGroupName()) {
        alert("Bitte zuerst unten in den Einstellungen einer Crew beitreten!"); return;
    }
    currentBoardMode = mode;
    document.getElementById('tabPrivate').classList.toggle('active', mode === 'private');
    document.getElementById('tabGroup').classList.toggle('active', mode === 'group');
    updateGroupBadgeUI();
    renderNotes();
}
function toggleTutorialNotes() {
    if (currentBoardMode === 'group') { alert("Tipps können nur auf dem privaten Brett geladen werden."); return; }
    let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
    const hasTutorial = notes.some(n => n.id >= 101 && n.id <= 108);
    if (hasTutorial) notes = notes.filter(n => n.id < 101 || n.id > 108);
    else tutorialNotes.forEach(tn => { if (!notes.find(n => n.id === tn.id)) notes.push(tn); });
    localStorage.setItem('ga_pinboard', JSON.stringify(notes));
    renderNotes();
}
function clearPinboard() {
    if (currentBoardMode === 'group') {
        alert("Du kannst nicht das gesamte Crew-Brett löschen. Bitte lösche deine Zettel einzeln."); return;
    }
    if (confirm("🗑️ Möchtest du wirklich ALLE Zettel von deinem privaten Brett in den Müll werfen?")) {
        localStorage.setItem('ga_pinboard', JSON.stringify([]));
        renderNotes(); triggerCloudSave();
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
        silentSyncLoad();
        if(getGroupName()) silentGroupSync();
    } else {
        unlockBodyScroll();
        triggerCloudSave();
        if(getGroupName()) triggerGroupSave();
    }
}
function addNote() {
    const text = prompt("Was möchtest du ans Brett pinnen?");
    if (!text || text.trim() === "") return;
    const newNote = { id: Date.now(), text: text, x: 30 + Math.random() * 15, y: 30 + Math.random() * 15, rot: Math.floor(Math.random() * 9) - 4 };
    
    if (currentBoardMode === 'group') {
        newNote.author = getGroupNick();
        let gNotes = groupDataCache.notes || [];
        gNotes.push(newNote);
        groupDataCache.notes = gNotes;
        renderNotes(); triggerGroupSave(true);
    } else {
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        notes.push(newNote);
        localStorage.setItem('ga_pinboard', JSON.stringify(notes));
        renderNotes(); triggerCloudSave();
    }
}
function deleteNote(id, isGroup) {
    clearNewBadge(id);
    if (isGroup) {
        let gNotes = groupDataCache.notes || [];
        const note = gNotes.find(n => n.id === id);
        if (note && note.author === getGroupNick()) {
            if(!confirm("Zettel für ALLE Crew-Mitglieder löschen?")) return;
            groupDataCache.notes = gNotes.filter(n => n.id !== id);
            renderNotes(); triggerGroupSave(true);
        } else {
            let hidden = JSON.parse(localStorage.getItem('ga_group_hidden')) || [];
            hidden.push(id);
            localStorage.setItem('ga_group_hidden', JSON.stringify(hidden));
            renderNotes();
        }
    } else {
        if (!confirm("Zettel wirklich abreißen?")) return;
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem('ga_pinboard', JSON.stringify(notes));
        renderNotes(); triggerCloudSave();
    }
}
function editNote(id, isGroup) {
    if (isGroup) {
        let gNotes = groupDataCache.notes || [];
        const noteIndex = gNotes.findIndex(n => n.id === id);
        if (noteIndex > -1 && gNotes[noteIndex].author === getGroupNick()) {
            const newText = prompt("Notiz bearbeiten:", gNotes[noteIndex].text);
            if (newText !== null && newText.trim() !== "") {
                gNotes[noteIndex].text = newText;
                renderNotes(); triggerGroupSave(true);
            }
        }
    } else {
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        const noteIndex = notes.findIndex(n => n.id === id);
        if (noteIndex > -1) {
            const newText = prompt("Notiz bearbeiten:", notes[noteIndex].text);
            if (newText !== null && newText.trim() !== "") {
                notes[noteIndex].text = newText;
                localStorage.setItem('ga_pinboard', JSON.stringify(notes));
                renderNotes(); triggerCloudSave();
            }
        }
    }
}
function pinCurrentFlight() {
    if (document.getElementById("briefingBox").style.display !== "block" || !currentMissionData) return;
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
        currentDepFreq: currentDepFreq, currentDestFreq: currentDestFreq, freqCache: freqCache,
        vpAltWaypoints: typeof vpAltWaypoints !== 'undefined' ? vpAltWaypoints : [],
        vpSegmentAlts: typeof vpSegmentAlts !== 'undefined' ? vpSegmentAlts : [],
        vpElevationData: typeof vpElevationData !== 'undefined' ? vpElevationData : null
    };
    const routeText = `${currentStartICAO} ➔ ${currentDestICAO === "POI" ? currentMissionData.poiName : currentDestICAO}`;
    pendingPinNote = {
        id: Date.now(), type: "flight", flightData: state,
        text: `✈️ <b>${routeText}</b><br><span style="font-size:11px; color:#555;">${state.currentMissionData?.mission || ''}</span><br><span style="font-size:11px;">${state.mDistNote}</span>`,
        x: 35 + Math.random() * 15, y: 20 + Math.random() * 15, rot: Math.floor(Math.random() * 9) - 4
    };
    if(getGroupName()) {
        document.getElementById('pinModalOverlay').style.display = 'flex';
        document.getElementById('btnPinGroup').innerText = `👥 An die Crew (${getGroupName()})`;
    } else {
        executePin('private');
    }
}
function closePinModal() {
    document.getElementById('pinModalOverlay').style.display = 'none';
    pendingPinNote = null;
}
function executePin(target) {
    if(!pendingPinNote) return;
    if(target === 'private') {
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        if (notes.filter(n => n.type === 'flight').length >= 10) {
            alert("Dein privates Board ist voll! (Max 10 Flüge)."); closePinModal(); return;
        }
        notes.push(pendingPinNote);
        localStorage.setItem('ga_pinboard', JSON.stringify(notes));
        triggerCloudSave();
        if (!document.getElementById('pinboardOverlay').classList.contains('active')) alert("📌 Flugauftrag privat gespeichert!");
    } else if (target === 'group') {
        pendingPinNote.author = getGroupNick();
        let gNotes = groupDataCache.notes || [];
        gNotes.push(pendingPinNote);
        groupDataCache.notes = gNotes;
        triggerGroupSave(true);
        if (!document.getElementById('pinboardOverlay').classList.contains('active')) alert("👥 Flugauftrag mit der Crew geteilt!");
    }
    if(document.getElementById('pinboardOverlay').classList.contains('active')) renderNotes();
    closePinModal();
}
function loadPinnedFlight(id, isGroup) {
    let note;
    if(isGroup) {
        note = (groupDataCache.notes || []).find(n => n.id === id);
    } else {
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        note = notes.find(n => n.id === id);
    }
    if (note && note.flightData) {
        restoreMissionState(note.flightData);
        togglePinboard();
        setTimeout(() => { if (map && routeWaypoints.length >= 2) { map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] }); updateMiniMap(); } }, 300);
    }
}
function renderNotes() {
    const board = document.getElementById('pinboard');
    if (!board) return;
    board.innerHTML = '';
    
    if (currentBoardMode === 'private') {
        let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
        notes.forEach(note => createNoteDOM(note, false));
    } else {
        // Render Crew Roster
        const roster = document.createElement('div');
        roster.className = 'post-it roster-card';
        roster.style.left = '8%'; // Weiter nach rechts verschoben, damit er nicht auf dem Rahmen liegt
        roster.style.top = '4%';
        roster.style.transform = 'rotate(-2deg)';
        
        const amIAdmin = (groupDataCache.members || []).find(m => m.nick === getGroupNick())?.isAdmin;
        let membersHtml = (groupDataCache.members || []).map(m => {
            const isMe = m.nick === getGroupNick();
            const timeoutMs = m.isAdmin ? (365 * 24 * 60 * 60 * 1000) : (28 * 24 * 60 * 60 * 1000); // Admin=12Mon, Normal=28Tage
            const isStale = (Date.now() - m.lastSeen) > timeoutMs;
            if(isStale) return '';

            const adminIcon = m.isAdmin ? '<span title="Admin">👑 </span>' : '';
            const kickBtn = (amIAdmin && !isMe) ? `<span onclick="kickGroupUser('${m.nick}')" style="cursor:pointer; font-size:1cqw; margin-left:6px; transition:transform 0.2s;" title="Mitglied kicken">👢</span>` : '';

            return `<div class="roster-item"><span style="font-weight:${isMe?'bold':'normal'}">${adminIcon}${m.nick}</span><span class="roster-status" style="display:flex; align-items:center;">${isMe?'Online':'Aktiv'}${kickBtn}</span></div>`;
        }).join('');
        
        roster.innerHTML = `<div class="post-it-pin"></div><div style="font-weight:bold; font-size:1.4cqw; border-bottom:2px solid #aaa; padding-bottom:4px; margin-bottom:4px;">👥 CREW: ${getGroupName()}</div><div class="roster-list">${membersHtml}</div>`;
        board.appendChild(roster);
        // Render Group Notes
        let gNotes = groupDataCache.notes || [];
        let hidden = JSON.parse(localStorage.getItem('ga_group_hidden')) || [];
        let localPos = JSON.parse(localStorage.getItem('ga_group_positions')) || {};
        let newBadges = JSON.parse(localStorage.getItem('ga_group_new')) || [];
        
        gNotes.forEach(note => {
            if (hidden.includes(note.id)) return;
            let renderNote = { ...note };
            if (localPos[note.id]) {
                renderNote.x = localPos[note.id].x;
                renderNote.y = localPos[note.id].y;
            }
            if (newBadges.includes(note.id)) renderNote.isNew = true;
            createNoteDOM(renderNote, true);
        });
    }
}
function createNoteDOM(note, isGroup) {
    const board = document.getElementById('pinboard');
    const div = document.createElement('div');
    div.className = note.type === 'flight' ? 'post-it flight-card' : 'post-it';
    let posX = note.x > 100 ? (note.x / 1000) * 100 : note.x;
    let posY = note.y > 100 ? (note.y / 600) * 100 : note.y;
    div.style.left = posX + '%'; div.style.top = posY + '%'; div.style.transform = `rotate(${note.rot}deg)`;
    
    let badgeHtml = note.isNew ? `<div class="post-it-new-badge">NEU</div>` : '';
    let authorHtml = isGroup && note.author ? `<div style="position:absolute; bottom:0.4cqw; right:0.8cqw; font-size:0.8cqw; color:#888; font-family:sans-serif;">@${note.author}</div>` : '';
    
    if (note.type === 'flight') {
        div.innerHTML = `${badgeHtml}<div class="post-it-pin"></div><div class="post-it-del" onclick="deleteNote(${note.id}, ${isGroup})">✖</div>${note.text}<button class="flight-load-btn" onclick="loadPinnedFlight(${note.id}, ${isGroup})">📂 Flug laden</button>${authorHtml}`;
    } else {
        let editBtn = (!isGroup || note.author === getGroupNick()) ? `<div class="post-it-edit" onclick="editNote(${note.id}, ${isGroup})">✏️</div>` : '';
        div.innerHTML = `${badgeHtml}<div class="post-it-pin"></div>${editBtn}<div class="post-it-del" onclick="deleteNote(${note.id}, ${isGroup})">✖</div>${note.text.replace(/\n/g, '<br>')}${authorHtml}`;
    }
    
    div.addEventListener('mousedown', () => clearNewBadge(note.id));
    div.addEventListener('touchstart', () => clearNewBadge(note.id), {passive:true});
    makeDraggable(div, note.id, isGroup);
    board.appendChild(div);
}
function clearNewBadge(id) {
    let newBadges = JSON.parse(localStorage.getItem('ga_group_new')) || [];
    if(newBadges.includes(id)) {
        newBadges = newBadges.filter(nid => nid !== id);
        localStorage.setItem('ga_group_new', JSON.stringify(newBadges));
        updateGroupBadgeUI();
        triggerCloudSave(true); // "Gelesen"-Status sofort geräteübergreifend in die Cloud pushen

        const b = document.getElementById('pinboard');
        const renderedBadges = b.querySelectorAll('.post-it-new-badge');
        renderedBadges.forEach(el => el.style.display = 'none');
        if(currentBoardMode === 'group') renderNotes();
    }
}
function makeDraggable(element, noteId, isGroup) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown; element.ontouchstart = dragMouseDown;
    function dragMouseDown(e) {
        if (e.target.className === 'post-it-del' || e.target.className === 'post-it-edit' || e.target.className === 'flight-load-btn') return;
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
        const board = document.getElementById('pinboard');
        if (isGroup) {
            let localPos = JSON.parse(localStorage.getItem('ga_group_positions')) || {};
            localPos[noteId] = {
                x: (element.offsetLeft / board.offsetWidth) * 100,
                y: (element.offsetTop / board.offsetHeight) * 100
            };
            localStorage.setItem('ga_group_positions', JSON.stringify(localPos));
        } else {
            let notes = JSON.parse(localStorage.getItem('ga_pinboard')) || [];
            const noteIndex = notes.findIndex(n => n.id === noteId);
            if (noteIndex > -1) {
                notes[noteIndex].x = (element.offsetLeft / board.offsetWidth) * 100;
                notes[noteIndex].y = (element.offsetTop / board.offsetHeight) * 100;
                localStorage.setItem('ga_pinboard', JSON.stringify(notes));
                triggerCloudSave();
            }
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
        const destLocEl = document.getElementById('destLoc');
        const destLocRadioEl = document.getElementById('destLocRadio');
        if (destLocEl) destLocEl.value = '';
        if (destLocRadioEl) destLocRadioEl.value = '';
        if (gpsState.mode === 'DEST') {
            document.querySelectorAll('.kln90b-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'FPL'));
            gpsState.mode = 'FPL';
            gpsState.subPage = 0;
            if (gpsState.visible) renderGPS();
        }
    });
}

function renderGPS() {
    const left = document.getElementById('gpsLeft');
    const right = document.getElementById('gpsRight');
    const modeLbl = document.getElementById('gpsModeLbl');
    const pageLbl = document.getElementById('gpsPageLbl');
    if (!left || !right) return;

    const max = gpsState.maxPages[gpsState.mode] || 1;
    modeLbl.textContent = gpsState.mode;
    pageLbl.textContent = `PG ${gpsState.subPage + 1}/${max}`;

    switch (gpsState.mode) {
        case 'FPL': renderFPL(left, right); break;
        case 'DEP': renderAirportInfo(left, right, 'dep'); break;
        case 'DEST': renderAirportInfo(left, right, 'dest'); break;
        case 'AIP': renderAIP(left, right); break;
        case 'WX': renderWX(left, right); break;
    }
}

const FPL_LEGS_PER_PAGE = 6;

function renderFPL(left, right) {
    if (!currentMissionData) { left.innerHTML = '<div class="kln90b-line dim">NO FLIGHTPLAN</div>'; right.innerHTML = '<div class="kln90b-line dim">DISPATCH FIRST</div>'; return; }

    const wps = routeWaypoints, legs = [];
    if (wps && wps.length >= 2) {
        for (let i = 0; i < wps.length - 1; i++) {
            const p1 = wps[i], p2 = wps[i + 1], nav = calcNav(p1.lat, p1.lng || p1.lon, p2.lat, p2.lng || p2.lon);
            let n1 = i === 0 ? (currentStartICAO || 'DEP') : (wps[i].name || `WP${i}`);
            let n2 = i === wps.length - 2 ? (currentMissionData?.poiName ? 'POI' : (currentDestICAO || 'DEST')) : (wps[i + 1].name || `WP${i + 1}`);

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
        if (legs.length === 0) left.innerHTML = `<div class="kln90b-line highlight">${currentStartICAO}</div><div class="kln90b-line dim">→${currentMissionData?.poiName ? 'POI' : currentDestICAO}</div>`;

        const _d = Math.round((currentMissionData.dist || 0) * 10) / 10, _t = parseInt(document.getElementById('tasSlider')?.value) || 115, _g = parseInt(document.getElementById('gphSlider')?.value) || 9;
        right.innerHTML = `<div class="kln90b-line dim" style="font-size:9px;">TOTAL:</div><div class="kln90b-line" style="font-size:10px;">DST ${_d}NM</div><div class="kln90b-line" style="font-size:10px;">TME ${Math.round((_d / _t) * 60)}m</div><div class="kln90b-line" style="font-size:10px;">FUL ${Math.ceil((_d / _t) * _g + 0.75 * _g)}G</div><div class="kln90b-line" style="font-size:10px;">HDG ${currentMissionData.heading || 0}°</div>`;
    }
}
async function renderAirportInfo(left, right, type) {
    const isPOIMission = currentMissionData?.poiName && type === 'dest';
    const icao = type === 'dep' ? currentStartICAO : (isPOIMission ? 'POI' : currentDestICAO);
    if (!icao) {
        left.innerHTML = '<div class="kln90b-line dim">NO DATA</div>';
        right.innerHTML = '<div class="kln90b-line dim">DISPATCH</div>';
        return;
    }

    const mode = gpsState.mode;
    const realIcao = type === 'dep' ? currentStartICAO : currentDestICAO;
    const data = await getAirportData(realIcao);
    const name = isPOIMission ? currentMissionData.poiName : ((data && data.n) ? data.n : (type === 'dep' ? currentSName : currentDName) || icao);
    const lat = data ? data.lat.toFixed(4) : '---';
    const lon = data ? data.lon.toFixed(4) : '---';

    left.innerHTML =
        `<div class="kln90b-line highlight" style="font-size:11px;">${icao}</div>` +
        `<div class="kln90b-line" style="font-size:9px; white-space:normal; line-height:1.35;">${name}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px; margin-top:2px;">${lat}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px;">${lon}</div>`;

    right.innerHTML = '<div class="kln90b-line dim kln-loading-dots" style="margin-top:8px;"><span>●</span><span>●</span><span>●</span></div>';

    // POI-Missionen: Keine Runway/Freq-Daten, nur Wiki-Info
    if (isPOIMission) {
        const wikiKey = currentMissionData.poiName || 'POI';
        if (!gpsState.wikiCache[wikiKey] && data) {
            await fetchAndCacheWikiPages(realIcao, data.lat, data.lon);
            if (gpsState.wikiCache[realIcao]) gpsState.wikiCache[wikiKey] = gpsState.wikiCache[realIcao];
        }
        const wikiArr = gpsState.wikiCache[wikiKey] || gpsState.wikiCache[realIcao] || ['Keine Daten.'];
        const total = wikiArr.length;
        gpsState.maxPages[mode] = total;
        const lbl = document.getElementById('gpsPageLbl');
        if (lbl) lbl.textContent = `PG ${gpsState.subPage + 1}/${total}`;
        if (gpsState.subPage >= total) gpsState.subPage = total - 1;
        const sp = gpsState.subPage;
        if (sp >= 0 && sp < wikiArr.length) {
            right.innerHTML =
                `<div class="kln90b-line" style="font-size:9px; line-height:1.5; white-space:normal;">${wikiArr[sp]}</div>`;
        } else {
            right.innerHTML = '<div class="kln90b-line dim">NO DATA</div>';
        }
        return;
    }

    if (!runwayCache[icao] && data) {
        const wikiResult = await fetchRunwayFromWikipedia(icao, data.lat, data.lon);

        if (wikiResult) {
            runwayCache[icao] = wikiResult;
            if (gpsState.mode === mode) renderGPS();
        } else {
            try {
                const ov = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(`[out:json][timeout:8];way["aeroway"="runway"](around:3000,${data.lat},${data.lon});out tags;`)}`).then(r => r.json());
                if (ov?.elements?.length > 0) {
                    const trans = { asphalt: 'Asphalt', concrete: 'Beton', grass: 'Gras', paved: 'Asphalt', unpaved: 'Unbefestigt', dirt: 'Erde', gravel: 'Schotter' };
                    const seen = new Set(), parts = [];
                    for (const e of ov.elements) {
                        if (!e.tags?.ref || seen.has(e.tags.ref)) continue;
                        seen.add(e.tags.ref);
                        const surf = e.tags.surface ? (trans[e.tags.surface.toLowerCase()] || e.tags.surface) : '?';
                        const len = e.tags.length ? ' · ' + Math.round(e.tags.length) + 'm' : '';
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
            } catch (e) {
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
    const allRunways = runwayCache[icao] ? runwayCache[icao].split(/\s*(?:\||\n|<br\s*\/?>)\s*/i).filter(r => r.trim()) : [];
    const allFreqs = freqCache[icao] || [];
    const rwyPages = Math.max(1, Math.ceil(allRunways.length / RWYS_PER_PAGE));
    const freqPages = allFreqs.length > 0 ? Math.ceil(allFreqs.length / FREQS_PER_PAGE) : 0;
    const sp = gpsState.subPage;

    if (sp < rwyPages) {
        const slice = allRunways.slice(sp * RWYS_PER_PAGE, (sp + 1) * RWYS_PER_PAGE);
        const label = rwyPages > 1 ? `RUNWAYS (${sp + 1}/${rwyPages}):` : 'RUNWAYS:';
        right.innerHTML =
            `<div class="kln90b-line dim" style="font-size:9px; margin-bottom:1px;">${label}</div>` +
            (slice.length
                ? slice.map(r => `<div class="kln90b-line" style="font-size:9px; white-space:normal; line-height:1.4;">▸ ${r}</div>`).join('')
                : '<div class="kln90b-line dim">NO RWY DATA</div>');

        const wikiN = gpsState.wikiCache[icao]?.length || 1;
        const total = rwyPages + freqPages + wikiN;
        if (gpsState.maxPages[mode] !== total) {
            gpsState.maxPages[mode] = total;
            const lbl = document.getElementById('gpsPageLbl');
            if (lbl) lbl.textContent = `PG ${sp + 1}/${total}`;
        }
        return;
    }

    const freqIdx = sp - rwyPages;
    if (freqPages > 0 && freqIdx >= 0 && freqIdx < freqPages) {
        const fSlice = allFreqs.slice(freqIdx * FREQS_PER_PAGE, (freqIdx + 1) * FREQS_PER_PAGE);
        const fLabel = freqPages > 1 ? `FREQ (${freqIdx + 1}/${freqPages}):` : 'FREQ:';
        right.innerHTML =
            `<div class="kln90b-line dim" style="font-size:9px; margin-bottom:1px;">${fLabel}</div>` +
            fSlice.map(f => `<div class="kln90b-line" style="font-size:9px; white-space:normal; line-height:1.4;">▸ ${f.label}: ${f.value}</div>`).join('');

        const wikiN = gpsState.wikiCache[icao]?.length || 1;
        const total = rwyPages + freqPages + wikiN;
        if (gpsState.maxPages[mode] !== total) {
            gpsState.maxPages[mode] = total;
            const lbl = document.getElementById('gpsPageLbl');
            if (lbl) lbl.textContent = `PG ${sp + 1}/${total}`;
        }
        return;
    }

    if (!gpsState.wikiCache[icao] && data) {
        await fetchAndCacheWikiPages(icao, data.lat, data.lon);
    }
    const wikiArr = gpsState.wikiCache[icao] || ['Keine Daten.'];
    const total = rwyPages + freqPages + wikiArr.length;
    if (gpsState.maxPages[mode] !== total) {
        gpsState.maxPages[mode] = total;
        const lbl = document.getElementById('gpsPageLbl');
        if (lbl) lbl.textContent = `PG ${sp + 1}/${total}`;
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
    const pages = [];
    let remaining = cleaned;
    while (remaining.length > 0) {
        if (remaining.length <= charsPerPage) {
            pages.push(remaining);
            break;
        }
        let cut = charsPerPage;
        const lo = Math.max(cut - 60, 1), hi = Math.min(cut + 40, remaining.length - 1);
        for (let i = hi; i >= lo; i--) {
            if (('.!?').includes(remaining[i]) && remaining[i + 1] === ' ') {
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
    const isDep = gpsState.subPage === 0;
    const icao = isDep ? currentStartICAO : currentDestICAO;
    const name = isDep ? currentSName : currentDName;
    const label = isDep ? 'DEP' : 'DEST';
    gpsState.maxPages['AIP'] = 2;

    left.innerHTML =
        `<div class="kln90b-line highlight">${label}</div>` +
        `<div class="kln90b-line" style="font-size:10px;">${icao || '----'}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px; white-space:normal;">${name || ''}</div>`;

    if (!icao) { right.innerHTML = '<div class="kln90b-line dim">NO DATA</div>'; return; }

    right.innerHTML =
        `<div class="kln90b-line dim">AIP VFR</div>` +
        `<div class="kln90b-line highlight" style="cursor:pointer;" onclick="window.open('https://aip.aero/de/vfr/?${icao}','_blank')">OPEN ▸</div>` +
        `<div class="kln90b-line dim" style="font-size:9px;">aip.aero</div>`;
}

function renderWX(left, right) {
    const isDep = gpsState.subPage === 0;
    const icao = isDep ? currentStartICAO : currentDestICAO;
    const name = isDep ? currentSName : currentDName;
    const label = isDep ? 'DEP' : 'DEST';
    gpsState.maxPages['WX'] = 2;

    left.innerHTML =
        `<div class="kln90b-line highlight">${label}</div>` +
        `<div class="kln90b-line" style="font-size:10px;">${icao || '----'}</div>` +
        `<div class="kln90b-line dim" style="font-size:9px; white-space:normal;">${name || ''}</div>`;

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

    // SW Version auslesen und sofort anzeigen (wartet nicht auf Bilder)
    fetch('sw.js', { cache: 'no-store' })
        .then(r => r.text())
        .then(text => {
            const match = text.match(/const CACHE = ['"]([^'"]+)['"]/);
            if (match) {
                const el = document.getElementById('swVersionDisplay');
                if (el) el.innerText = match[1];
            }
        }).catch(() => {
            const el = document.getElementById('swVersionDisplay');
            if (el) el.innerText = "Offline";
        });
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

    // 1. Schutz: Nicht laden, wenn man zu weit rausgezoomt ist (verhindert "Box too large" 500er Fehler)
    if (map.getZoom() < 8) {
        cachedNavData = [];
        return;
    }
    const b = map.getBounds();

    // 2. Schutz: Koordinaten auf die reale Weltkarte limitieren (-180 bis 180 / -90 bis 90)
    const w = Math.max(-180, b.getWest());
    const s = Math.max(-90, b.getSouth());
    const e = Math.min(180, b.getEast());
    const n = Math.min(90, b.getNorth());

    const bbox = `${w},${s},${e},${n}`;
    const proxy = 'https://ga-proxy.einherjer.workers.dev';
    try {
        const [navRes, repRes, aptRes] = await Promise.all([
            fetch(`${proxy}/api/navaids?bbox=${bbox}&limit=250&t=${Date.now()}`),
            fetch(`${proxy}/api/reporting-points?bbox=${bbox}&limit=250&t=${Date.now()}`),
            fetch(`${proxy}/api/airports?bbox=${bbox}&limit=250&t=${Date.now()}`)
        ]);
        // 3. Schutz: Falls OpenAIP blockt, breche leise ab statt abzustürzen
        if (!navRes.ok || !repRes.ok || !aptRes.ok) {
            return;
        }
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
    } catch (e) {
        // Leiser Fallback, wenn das Netzwerk mal hakt
    }
}

/* =========================================================
   VERTICAL PROFILE (Höhenprofil) ENGINE
   ========================================================= */
let vpElevationData = null;
let vpProfileTimeout = null;
let vpZoomLevel = 100; // 100 = full route, 10 = 10% view
let vpHighResData = null; // Higher resolution elevation data for zoom
let vpElevationCache = {}; // Cache to prevent API rate limits (HTTP 429)
let vpClimbRate = 500; // ft/min climb rate (configurable)
let vpDescentRate = 500; // ft/min descent rate (configurable)

function triggerVerticalProfileUpdate() {
    if (vpProfileTimeout) clearTimeout(vpProfileTimeout);
    vpProfileTimeout = setTimeout(async () => {
        if (!routeWaypoints || routeWaypoints.length < 2) return;

        const cacheKey = routeWaypoints.map(p => `${(p.lat || 0).toFixed(4)},${((p.lng || p.lon) || 0).toFixed(4)}`).join('|');
        if (window._lastVpRouteKey !== cacheKey) {
            vpAltWaypoints = []; vpSegmentAlts = [];
            vpHighResData = null;
            vpZoomLevel = 100;
            const zd = document.getElementById('vpZoomDisplay');
            if (zd) zd.textContent = '0%';
            window._lastVpRouteKey = cacheKey;
        }

        const page5 = document.getElementById('notePage5');
        if (page5) page5.style.display = '';
        const status = document.getElementById('verticalProfileStatus');
        if (status) status.textContent = 'Lade Höhendaten...';

        try {
            vpElevationData = await fetchRouteElevation(routeWaypoints);
            renderVerticalProfile('verticalProfileCanvas');
            if (status) status.textContent = vpElevationData.length + ' Höhenpunkte geladen';
        } catch (e) {
            console.error('Vertical Profile Error:', e);
            if (status) status.textContent = 'Limit API/Fehler';

            // If we have nothing, render a flat baseline so the canvas still draws and airspaces update
            if (!vpElevationData || vpElevationData.length === 0) {
                const totalDist = routeWaypoints.reduce((acc, wp, i) => i === 0 ? 0 : acc + calcNav(routeWaypoints[i - 1].lat, routeWaypoints[i - 1].lng || routeWaypoints[i - 1].lon, wp.lat, wp.lng || wp.lon).dist, 0);
                vpElevationData = [
                    { distNM: 0, elevFt: 0, lat: routeWaypoints[0].lat, lon: routeWaypoints[0].lng || routeWaypoints[0].lon },
                    { distNM: Math.max(1, totalDist), elevFt: 0, lat: routeWaypoints[routeWaypoints.length - 1].lat, lon: routeWaypoints[routeWaypoints.length - 1].lng || routeWaypoints[routeWaypoints.length - 1].lon }
                ];
            }
            renderVerticalProfile('verticalProfileCanvas');
        }
    }, 1200);
}

async function fetchRouteElevation(routePts) {
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

    const res = await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + lats + '&longitude=' + lons);
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
}

function computeFlightProfile(elevationData, cruiseAltFt, climbRateFpm, descentRateFpm, tasKts) {
    if (!elevationData || elevationData.length < 2) return null;

    const depElevFt = elevationData[0].elevFt;
    let destElevFt = elevationData[elevationData.length - 1].elevFt;
    // If destination is a POI, stay at cruise altitude (no descent)
    if (typeof currentMissionData !== 'undefined' && currentMissionData && currentMissionData.poiName) {
        destElevFt = cruiseAltFt;
    }
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

function renderVerticalProfile(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !vpElevationData || vpElevationData.length < 2) return;

    const container = canvas.parentElement;
    const displayWidth = container.clientWidth || 400;
    const displayHeight = Math.round(displayWidth * 0.4);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = displayWidth + 'px';
    canvas.style.height = 'auto';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const padLeft = 45, padRight = 15, padTop = 20, padBottom = 30;
    const plotW = displayWidth - padLeft - padRight;
    const plotH = displayHeight - padTop - padBottom;

    const cruiseAlt = parseInt(document.getElementById('altSlider')?.value || 4500);
    const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
    const totalDist = vpElevationData[vpElevationData.length - 1].distNM;
    const maxTerrain = Math.max(...vpElevationData.map(p => p.elevFt));
    const maxAlt = Math.max(cruiseAlt + 500, maxTerrain + 1500);
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
    if (typeof activeAirspaces !== 'undefined' && activeAirspaces.length > 0) {
        for (const as of activeAirspaces) {
            // FIS Sektoren (Typ 33) ignorieren
            if (as.type === 33) continue;
            if (!as.lowerLimit || !as.upperLimit) continue;
            const lowerFt = airspaceLimitToFt(as.lowerLimit);
            const upperFt = airspaceLimitToFt(as.upperLimit);
            if (lowerFt === null || upperFt === null || upperFt <= minAlt || lowerFt >= maxAlt) continue;

            const isLowerAgl = as.lowerLimit.referenceDatum === 0;
            const isUpperAgl = as.upperLimit.referenceDatum === 0;

            let asMinDist = totalDist, asMaxDist = 0, found = false;
            const polys = [];
            if (as.geometry) {
                if (as.geometry.type === 'Polygon') polys.push(as.geometry.coordinates[0]);
                else if (as.geometry.type === 'MultiPolygon') as.geometry.coordinates.forEach(mc => polys.push(mc[0]));

                for (let pi = 0; pi < vpElevationData.length; pi++) {
                    const pt = vpElevationData[pi];
                    for (const poly of polys) {
                        if (vpPointInPoly(pt, poly)) {
                            if (pt.distNM < asMinDist) asMinDist = pt.distNM;
                            if (pt.distNM > asMaxDist) asMaxDist = pt.distNM;
                            found = true; break;
                        }
                    }
                    // Also check segment to next point (catches small airspaces between samples)
                    if (!found && pi < vpElevationData.length - 1) {
                        const pt2 = vpElevationData[pi + 1];
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

            // Expand range to include adjacent elevation points for smooth polygon edges
            const eps = (vpElevationData.length > 1) ? (vpElevationData[1].distNM - vpElevationData[0].distNM) * 0.5 : 0.5;
            const relevantPts = vpElevationData.filter(p => p.distNM >= asMinDist - eps && p.distNM <= asMaxDist + eps);
            if (relevantPts.length < 1) continue;

            const style = getAirspaceStyle(as);
            const x1 = xOf(asMinDist), x2 = xOf(asMaxDist);

            ctx.fillStyle = vpHexToRgba(style.color, 0.15);
            ctx.strokeStyle = vpHexToRgba(style.color, 0.4);
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);

            ctx.beginPath();
            // Top path
            for (let i = 0; i < relevantPts.length; i++) {
                const p = relevantPts[i];
                const realUpper = isUpperAgl ? p.elevFt + upperFt : upperFt;
                ctx.lineTo(xOf(p.distNM), yOf(Math.min(realUpper, maxAlt)));
            }
            // Bottom path (backwards)
            for (let i = relevantPts.length - 1; i >= 0; i--) {
                const p = relevantPts[i];
                const realLower = isLowerAgl ? p.elevFt + lowerFt : lowerFt;
                ctx.lineTo(xOf(p.distNM), yOf(Math.max(realLower, minAlt)));
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            const displayName = getAirspaceDisplayName(as);
            ctx.fillStyle = vpHexToRgba(style.color, 0.7);
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            
            // Estimate label Y
            let sumUpper = 0;
            relevantPts.forEach(p => sumUpper += (isUpperAgl ? p.elevFt + upperFt : upperFt));
            const avgUpper = sumUpper / relevantPts.length;
            const labelY = yOf(Math.min(avgUpper, maxAlt));

            ctx.fillText(displayName, (x1 + x2) / 2, labelY + 10);
            ctx.font = '7px Arial';
            ctx.fillText(lowerFt + '–' + upperFt + (isUpperAgl ? ' ft AGL' : ' ft'), (x1 + x2) / 2, labelY + 19);
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
        else if (i === routeWaypoints.length - 1) wpLabel = (currentMissionData?.poiName ? 'POI' : currentDestICAO) || 'DEST';
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

function vpZoom(delta) {
    vpZoomLevel = Math.max(10, Math.min(100, vpZoomLevel + delta));
    // Anzeige invertiert: 0 % = rausgezoomt (vpZoomLevel 100), 100 % = maximal rein (vpZoomLevel 10)
    document.getElementById('vpZoomDisplay').textContent = Math.round((100 - vpZoomLevel) / 90 * 100) + '%';

    // If zoomed in, fetch higher resolution data
    if (vpZoomLevel < 100 && routeWaypoints && routeWaypoints.length >= 2) {
        fetchHighResElevation().then(() => renderMapProfile());
    } else {
        vpHighResData = null;
        renderMapProfile();
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
    const canvas = document.getElementById('mapProfileCanvas');
    const scrollContainer = document.getElementById('mapProfileScroll');
    if (!canvas || !scrollContainer) return;

    const elevData = (vpZoomLevel < 100 && vpHighResData) ? vpHighResData : vpElevationData;
    if (!elevData || elevData.length < 2) return;

    const containerHeight = scrollContainer.clientHeight || 100;
    const baseWidth = scrollContainer.clientWidth || 600;

    // Zoom: canvas is wider than container when zoomed in
    const zoomFactor = 100 / vpZoomLevel;
    const canvasWidth = Math.round(baseWidth * zoomFactor);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = containerHeight + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const padLeft = 33, padRight = 16, padTop = 12, padBottom = 22;
    const plotW = canvasWidth - padLeft - padRight;
    const plotH = containerHeight - padTop - padBottom;

    const cruiseAlt = parseInt(document.getElementById('altSliderMap')?.value || document.getElementById('altSlider')?.value || 4500);
    const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
    const totalDist = elevData[elevData.length - 1].distNM;
    const maxTerrain = Math.max(...elevData.map(p => p.elevFt));
    const maxAlt = Math.max(cruiseAlt + 500, maxTerrain + 1500);
    const minAlt = 0;

    const fpResult = computeFlightProfile(elevData, cruiseAlt, vpClimbRate, vpDescentRate, tas);

    const xOf = (distNM) => padLeft + (distNM / totalDist) * plotW;
    const yOf = (altFt) => padTop + plotH - ((altFt - minAlt) / (maxAlt - minAlt)) * plotH;

    // Background - dark theme for map strip
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, containerHeight);

    // Sky gradient (dark)
    const skyGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    skyGrad.addColorStop(0, '#1a2a3a');
    skyGrad.addColorStop(0.5, '#1a2030');
    skyGrad.addColorStop(1, '#151a20');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    // Airspace blocks (dark theme) with pulse highlight support
    if (typeof activeAirspaces !== 'undefined' && activeAirspaces.length > 0) {
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
                    // Also check segment to next point (catches small airspaces between samples)
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

            const style = getAirspaceStyle(as);
            const x1 = xOf(asMinDist), x2 = xOf(asMaxDist);

            // Pulsing highlight for the active airspace
            const isHighlighted = (vpHighlightPulseIdx >= 0 && asIdx === vpHighlightPulseIdx);
            const pulseOpacity = isHighlighted ? 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(vpPulsePhase * Math.PI * 2)) : 0.15;
            const strokeOpacity = isHighlighted ? 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(vpPulsePhase * Math.PI * 2)) : 0.5;
            const lineW = isHighlighted ? 2 + 2 * (0.5 + 0.5 * Math.sin(vpPulsePhase * Math.PI * 2)) : 2;

            ctx.fillStyle = vpHexToRgba(style.color, pulseOpacity);
            ctx.strokeStyle = vpHexToRgba(style.color, strokeOpacity);
            ctx.lineWidth = lineW;
            ctx.setLineDash(isHighlighted ? [] : [3, 3]);

            ctx.beginPath();
            // Top path
            for (let i = 0; i < relevantPts.length; i++) {
                const p = relevantPts[i];
                const realUpper = isUpperAgl ? p.elevFt + upperFt : upperFt;
                ctx.lineTo(xOf(p.distNM), yOf(Math.min(realUpper, maxAlt)));
            }
            // Bottom path (backwards)
            for (let i = relevantPts.length - 1; i >= 0; i--) {
                const p = relevantPts[i];
                const realLower = isLowerAgl ? p.elevFt + lowerFt : lowerFt;
                ctx.lineTo(xOf(p.distNM), yOf(Math.max(realLower, minAlt)));
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);

            // Airspace label (only if zoomed enough to show)
            if (zoomFactor >= 1.5 || (x2 - x1) > 40 || isHighlighted) {
                const displayName = getAirspaceDisplayName(as);
                ctx.fillStyle = vpHexToRgba(style.color, isHighlighted ? 0.9 : 0.6);
                ctx.font = isHighlighted ? 'bold 11px Arial' : 'bold 10px Arial';
                ctx.textAlign = 'center';

                // Estimate label Y from average upper limit in this segment
                let sumUpper = 0;
                relevantPts.forEach(p => sumUpper += (isUpperAgl ? p.elevFt + upperFt : upperFt));
                const avgUpper = sumUpper / relevantPts.length;
                const labelY = yOf(Math.min(avgUpper, maxAlt));

                ctx.fillText(displayName, (x1 + x2) / 2, labelY + 12);
                if (zoomFactor >= 2 || isHighlighted) {
                    ctx.font = '9px Arial';
                    ctx.fillText(lowerFt + '–' + upperFt + (isUpperAgl ? ' ft AGL' : ' ft'), (x1 + x2) / 2, labelY + 23);
                }
            }
        }
    }
    ctx.textAlign = 'left';

    // Safety line
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(200, 120, 40, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < elevData.length; i++) {
        const x = xOf(elevData[i].distNM), y = yOf(elevData[i].elevFt + 1000);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Terrain polygon
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(0));
    for (let i = 0; i < elevData.length; i++) ctx.lineTo(xOf(elevData[i].distNM), yOf(elevData[i].elevFt));
    ctx.lineTo(xOf(totalDist), yOf(0));
    ctx.closePath();

    const terrainGrad = ctx.createLinearGradient(0, yOf(maxTerrain), 0, yOf(0));
    terrainGrad.addColorStop(0, '#6B5B3C');
    terrainGrad.addColorStop(0.3, '#3B5B23');
    terrainGrad.addColorStop(0.7, '#1B5B22');
    terrainGrad.addColorStop(1, '#1E5B37');
    ctx.fillStyle = terrainGrad;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < elevData.length; i++) {
        const x = xOf(elevData[i].distNM), y = yOf(elevData[i].elevFt);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#4a7a30';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Flight profile
    if (fpResult && fpResult.profile) {
        ctx.beginPath();
        for (let i = 0; i < fpResult.profile.length; i++) {
            const x = xOf(fpResult.profile[i].distNM), y = yOf(fpResult.profile[i].altFt) + 1;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < fpResult.profile.length; i++) {
            const x = xOf(fpResult.profile[i].distNM), y = yOf(fpResult.profile[i].altFt);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Cruise altitude line
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    ctx.moveTo(padLeft, yOf(cruiseAlt));
    ctx.lineTo(padLeft + plotW, yOf(cruiseAlt));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 68, 68, 0.7)';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('CRZ ' + cruiseAlt + ' ft', padLeft + 4, yOf(cruiseAlt) - 4);

    // Waypoint markers
    let wpCumDist = 0;
    for (let i = 0; i < routeWaypoints.length; i++) {
        if (i > 0) {
            const prev = routeWaypoints[i - 1], curr = routeWaypoints[i];
            wpCumDist += calcNav(prev.lat, prev.lng || prev.lon, curr.lat, curr.lng || curr.lon).dist;
        }
        const x = xOf(wpCumDist);

        ctx.beginPath();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        let wpLabel;
        if (i === 0) wpLabel = currentStartICAO || 'DEP';
        else if (i === routeWaypoints.length - 1) wpLabel = (currentMissionData?.poiName ? 'POI' : currentDestICAO) || 'DEST';
        else wpLabel = routeWaypoints[i].name ? routeWaypoints[i].name.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '').split(' ')[0] : 'WP' + i;
        if (!zoomFactor || zoomFactor < 2) { if (wpLabel.length > 6) wpLabel = wpLabel.substring(0, 5) + '…'; }
        else { if (wpLabel.length > 12) wpLabel = wpLabel.substring(0, 11) + '…'; }

        // Colored dot
        ctx.beginPath();
        ctx.arc(x, padTop + plotH + 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#44ff44' : (i === routeWaypoints.length - 1 ? '#ff4444' : '#ffcc00');
        ctx.fill();

        // Label  
        ctx.fillStyle = '#bbb';
        ctx.font = (zoomFactor >= 2) ? 'bold 11px Arial' : 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(wpLabel, x, padTop + plotH + 16);
    }

    // Y axis
    ctx.textAlign = 'right';
    const altStep = maxAlt > 6000 ? 2000 : (maxAlt > 3000 ? 1000 : 500);
    for (let alt = 0; alt <= maxAlt; alt += altStep) {
        const y = yOf(alt);
        if (y < padTop - 3 || y > padTop + plotH + 3) continue;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 0.5;
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + plotW, y);
        ctx.stroke();
        ctx.fillStyle = '#777';
        ctx.font = '9px Arial';
        ctx.fillText(alt >= 1000 ? (alt / 1000).toFixed(0) + 'k' : alt + '', padLeft - 3, y + 3);
    }

    // X axis ticks
    ctx.textAlign = 'center';
    const distStep = totalDist > 150 ? 25 : (totalDist > 80 ? 10 : 5);
    for (let d = distStep; d < totalDist; d += distStep) {
        const x = xOf(d);
        ctx.fillStyle = '#666';
        ctx.font = '8px Arial';
        ctx.fillText(d + '', x, containerHeight - 1);
    }

    // Peak marker
    const peakPt = elevData.reduce((max, p) => p.elevFt > max.elevFt ? p : max);
    ctx.fillStyle = '#aaa';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('▲', xOf(peakPt.distNM), yOf(peakPt.elevFt) - 3);
    ctx.font = 'bold 9px Arial';
    ctx.fillText(peakPt.elevFt + ' ft', xOf(peakPt.distNM), yOf(peakPt.elevFt) - 13);

    // Border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // === POSITION MARKER (Magenta triangle + line) ===
    if (typeof vpPositionFraction === 'number' && vpPositionFraction >= 0) {
        const posDistNM = vpPositionFraction * totalDist;
        const posX = xOf(posDistNM);

        // Vertical magenta line
        ctx.beginPath();
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1.5;
        ctx.moveTo(posX, padTop);
        ctx.lineTo(posX, padTop + plotH);
        ctx.stroke();

        // Magenta triangle at bottom
        ctx.beginPath();
        ctx.moveTo(posX, padTop + plotH + 2);
        ctx.lineTo(posX - 5, padTop + plotH + 10);
        ctx.lineTo(posX + 5, padTop + plotH + 10);
        ctx.closePath();
        ctx.fillStyle = '#ff00ff';
        ctx.fill();
    }

    // === ALTITUDE WAYPOINTS (user markers on flight line) ===
    if (vpAltWaypoints.length > 0) {
        for (let i = 0; i < vpAltWaypoints.length; i++) {
            const wp = vpAltWaypoints[i];
            const wx = xOf(wp.distNM);
            const wy = yOf(wp.altFt);

            // Vertical dashed line from waypoint down to terrain
            ctx.beginPath();
            ctx.setLineDash([2, 3]);
            ctx.strokeStyle = 'rgba(255,0,255,0.3)';
            ctx.lineWidth = 1;
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx, padTop + plotH);
            ctx.stroke();
            ctx.setLineDash([]);

            // Diamond marker
            ctx.beginPath();
            ctx.moveTo(wx, wy - 7);
            ctx.lineTo(wx + 6, wy);
            ctx.lineTo(wx, wy + 7);
            ctx.lineTo(wx - 6, wy);
            ctx.closePath();
            ctx.fillStyle = '#ff00ff';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label: show altitude
            ctx.fillStyle = '#ff00ff';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(wp.altFt + ' ft', wx, wy - 11);
        }
    }
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

// Init resize when map table opens
const _origToggleMapTable = typeof toggleMapTable === 'function' ? toggleMapTable : null;
if (_origToggleMapTable) {
    const _origFn = toggleMapTable;
    toggleMapTable = function () {
        _origFn();
        setTimeout(() => {
            initProfileResize();
            if (vpMapProfileVisible && vpElevationData) renderMapProfile();
        }, 500);
    };
}

/* =========================================================
   POSITION MARKER (Magenta triangle + Leaflet marker sync)
   ========================================================= */
let vpPositionFraction = 0; // 0 = start of profile
let vpPositionLeafletMarker = null;

function vpUpdatePosition(fraction) {
    vpPositionFraction = fraction;
    renderMapProfile();

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
        const containerHeight = scrollContainer?.clientHeight || 100;
        const baseWidth = scrollContainer?.clientWidth || 600;
        const zoomFactor = 100 / vpZoomLevel;
        const canvasWidth = Math.round(baseWidth * zoomFactor);
        const totalDist = elevData[elevData.length - 1].distNM;
        const cruiseAlt = parseInt(document.getElementById('altSliderMap')?.value || document.getElementById('altSlider')?.value || 4500);
        const maxTerrain = Math.max(...elevData.map(p => p.elevFt));
        const maxAlt = Math.max(cruiseAlt + 500, maxTerrain + 1500);
        const padLeft = 33, padRight = 16, padTop = 12, padBottom = 22;
        const plotW = canvasWidth - padLeft - padRight;
        const plotH = containerHeight - padTop - padBottom;
        const scaleX = canvasWidth / rect.width;
        const scaleY = containerHeight / rect.height;
        return { elevData, rect, containerHeight, baseWidth, zoomFactor, canvasWidth, totalDist, cruiseAlt, maxTerrain, maxAlt, padLeft, padRight, padTop, padBottom, plotW, plotH, scaleX, scaleY };
    }

    function vpClientToCanvas(clientX, clientY, m) {
        return { mx: (clientX - m.rect.left) * m.scaleX, my: (clientY - m.rect.top) * m.scaleY };
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
            renderMapProfile();
            if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
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
        renderMapProfile();
        if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
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
            const scaleX = m.canvasWidth / m.rect.width;
            const deltaX = (clientX - dragStartX) * scaleX;
            const distChange = (deltaX / m.plotW) * m.totalDist;
            let newDist = dragOrigWP.distNM + distChange;
            newDist = Math.max(0, Math.min(m.totalDist, newDist));
            let newAlt = Math.round((dragOrigWP.altFt + altChange) / 100) * 100;
            newAlt = Math.max(0, Math.min(m.maxAlt, newAlt));
            vpAltWaypoints[vpDraggingWP].distNM = newDist;
            vpAltWaypoints[vpDraggingWP].altFt = newAlt;
            renderMapProfile();
        } else if (vpDraggingSegment) {
            const seg = vpDraggingSegment;
            const newAlt = Math.max(0, Math.round((seg.origAlt + altChange) / 100) * 100);
            if (seg.segIdx >= 0 && seg.segIdx < vpSegmentAlts.length) {
                vpSegmentAlts[seg.segIdx] = newAlt;
                renderMapProfile();
                if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
            } else if (seg.segIdx === -1) {
                const newGlobalAlt = Math.max(500, Math.round((seg.origCruiseAlt + altChange) / 500) * 500);
                const altMap = document.getElementById('altSliderMap');
                const altMain = document.getElementById('altSlider');
                if (altMap && altMap.value != newGlobalAlt) {
                    altMap.value = newGlobalAlt;
                    if (typeof handleSliderChange === 'function') handleSliderChange('alt', newGlobalAlt);
                } else if (altMain && altMain.value != newGlobalAlt) {
                    altMain.value = newGlobalAlt;
                    if (typeof handleSliderChange === 'function') handleSliderChange('alt', newGlobalAlt);
                }
            } else if (seg.segIdx === -2 || seg.segIdx === -3) {
                if (vpAltWaypoints.length > 0) {
                    vpAltWaypoints[0].altFt = newAlt;
                    renderMapProfile();
                    if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
                }
            } else if (seg.segIdx === -4) {
                if (vpAltWaypoints.length > 0) {
                    vpAltWaypoints[vpAltWaypoints.length - 1].altFt = newAlt;
                    renderMapProfile();
                    if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
                }
            }
        } else if (vpDraggingMagenta) {
            const { mx } = vpClientToCanvas(clientX, clientY, m);
            let frac = (mx - m.padLeft) / m.plotW;
            frac = Math.max(0, Math.min(1, frac));
            vpUpdatePosition(frac);
            const posSlider = document.getElementById('vpPosSlider');
            if (posSlider) posSlider.value = Math.round(frac * 1000);
        }
    }

    function vpHandleDragEnd() {
        if (vpDraggingWP >= 0 || vpDraggingSegment || vpDraggingMagenta) {
            const needsSave = vpDraggingWP >= 0 || !!vpDraggingSegment; // Magenta = nur Position, keine Höhendaten
            if (vpDraggingWP >= 0) {
                vpAltWaypoints.sort((a, b) => a.distNM - b.distNM);
            }
            vpDraggingWP = -1;
            vpDraggingSegment = null;
            vpDraggingMagenta = false;
            dragOrigWP = null;
            renderMapProfile();
            if (typeof renderVerticalProfile === 'function') renderVerticalProfile('verticalProfileCanvas');
            if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
            if (needsSave) setTimeout(() => saveMissionState(), 200);
        }
    }

    // === STATE ===
    let vpWasDragging = false;
    let vpDraggingMagenta = false;
    let dragStartY = 0, dragStartX = 0, dragOrigWP = null;
    let lastTapTime = 0;
    let vpIsPanning = false;
    let vpPanStartScrollLeft = 0;
    let vpPanStartX = 0;

    // === DOUBLE CLICK: remove/add waypoint ===
    canvas.addEventListener('dblclick', (e) => {
        const m = vpGetCanvasMetrics();
        if (!m) return;
        const { mx, my } = vpClientToCanvas(e.clientX, e.clientY, m);
        if (vpHandleDoubleHit(mx, my, m)) setTimeout(() => saveMissionState(), 200);
    });

    // === CLICK: no more single-click creation ===
    canvas.addEventListener('click', (e) => {
        // Logic removed to prevent accidental creation on iPhone
    });

    // === HOVER CURSOR ===
    canvas.addEventListener('mousemove', (e) => {
        if (vpDraggingWP >= 0 || vpDraggingSegment || vpDraggingMagenta) return;
        const m = vpGetCanvasMetrics();
        if (!m) return;
        const { mx, my } = vpClientToCanvas(e.clientX, e.clientY, m);
        let cursor = 'default';
        if (vpHitTestMagenta(mx, m)) cursor = 'ew-resize';
        else if (vpHitTestWaypoint(mx, my, m) >= 0) cursor = 'move';
        else if (vpHitTestFlightLine(mx, my, m) !== null) cursor = 'ns-resize';
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

        // Priority 1: Magenta marker drag
        if (vpHitTestMagenta(mx, m)) {
            vpDraggingMagenta = true;
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
        // Priority 3: Flight line segment drag
        const mouseDistNM = vpHitTestFlightLine(mx, my, m);
        if (mouseDistNM !== null) {
            const segIdx = vpFindSegmentIdx(mouseDistNM);
            const origSegAlt = (segIdx >= 0 && segIdx < vpSegmentAlts.length) ? vpSegmentAlts[segIdx] : m.cruiseAlt;
            vpDraggingSegment = { segIdx, origAlt: origSegAlt, origCruiseAlt: m.cruiseAlt };
            e.preventDefault(); e.stopPropagation();
        }
    });

    // === MOUSEMOVE: drag ===
    document.addEventListener('mousemove', (e) => {
        if (vpDraggingWP < 0 && !vpDraggingSegment && !vpDraggingMagenta) return;
        if (Math.abs(e.clientX - dragStartX) > 2 || Math.abs(e.clientY - dragStartY) > 2) vpWasDragging = true;
        vpHandleDragMove(e.clientX, e.clientY, dragStartX, dragStartY, dragOrigWP);
    });

    // === MOUSEUP: end drag ===
    document.addEventListener('mouseup', () => vpHandleDragEnd());

    // === TOUCH EVENTS ===
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        vpWasDragging = false;
        vpIsPanning = false;
        const m = vpGetCanvasMetrics();
        if (!m) return;
        const { mx, my } = vpClientToCanvas(touch.clientX, touch.clientY, m);
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;

        // Double-tap detection (300ms window)
        const now = Date.now();
        if (now - lastTapTime < 300) {
            e.preventDefault();
            if (vpHandleDoubleHit(mx, my, m)) setTimeout(() => saveMissionState(), 200);
            lastTapTime = 0;
            return;
        }
        lastTapTime = now;

        // Priority 1: Magenta marker drag
        if (vpHitTestMagenta(mx, m)) {
            e.preventDefault();
            vpDraggingMagenta = true;
            return;
        }
        // Priority 2: Waypoint drag
        const wpIdx = vpHitTestWaypoint(mx, my, m);
        if (wpIdx >= 0) {
            e.preventDefault();
            vpDraggingWP = wpIdx;
            dragOrigWP = { ...vpAltWaypoints[wpIdx] };
            return;
        }
        // Priority 3: Flight line segment drag
        const mouseDistNM = vpHitTestFlightLine(mx, my, m);
        if (mouseDistNM !== null) {
            e.preventDefault();
            const segIdx = vpFindSegmentIdx(mouseDistNM);
            const origSegAlt = (segIdx >= 0 && segIdx < vpSegmentAlts.length) ? vpSegmentAlts[segIdx] : m.cruiseAlt;
            vpDraggingSegment = { segIdx, origAlt: origSegAlt, origCruiseAlt: m.cruiseAlt };
            return;
        }
        // Priority 4: Pan when zoomed in
        if (vpZoomLevel < 100) {
            e.preventDefault();
            vpIsPanning = true;
            const scrollContainer = document.getElementById('mapProfileScroll');
            vpPanStartScrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
            vpPanStartX = touch.clientX;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (vpIsPanning) {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = vpPanStartX - touch.clientX;
            const scrollContainer = document.getElementById('mapProfileScroll');
            if (scrollContainer) scrollContainer.scrollLeft = vpPanStartScrollLeft + deltaX;
            return;
        }
        if (vpDraggingWP < 0 && !vpDraggingSegment && !vpDraggingMagenta) return;
        e.preventDefault();
        const touch = e.touches[0];
        if (Math.abs(touch.clientX - dragStartX) > 3 || Math.abs(touch.clientY - dragStartY) > 3) vpWasDragging = true;
        vpHandleDragMove(touch.clientX, touch.clientY, dragStartX, dragStartY, dragOrigWP);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (vpIsPanning) {
            vpIsPanning = false;
            return;
        }
        // Single tap without drag: Logic removed to prevent accidental creation
        if (vpDraggingWP >= 0 || vpDraggingSegment || vpDraggingMagenta) {
            vpHandleDragEnd();
        }
    });
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
    // If destination is a POI (not an airport), keep cruise altitude — no descent to ground
    if (typeof currentMissionData !== 'undefined' && currentMissionData && currentMissionData.poiName) {
        destElevFt = cruiseAltFt;
    }
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

/* =========================================================
   CLOUD SYNC LOGIC (Adaptive, Diffing, Debounce & Toggle)
   ========================================================= */
const SYNC_URL = 'https://ga-proxy.einherjer.workers.dev/api/sync/';
let localSyncTime = localStorage.getItem('ga_sync_time') ? parseInt(localStorage.getItem('ga_sync_time')) : 0;
let syncSaveTimeout = null;
let lastSyncedPayloadStr = "";
function saveSyncToggle() {
    const t = document.getElementById('syncToggle');
    if (t) localStorage.setItem('ga_sync_enabled', t.checked);
    if (t && t.checked) silentSyncLoad();
}
function getSyncId() {
    return document.getElementById('syncIdInput')?.value.trim() || localStorage.getItem('ga_sync_id') || "";
}
function saveSyncId() {
    const id = document.getElementById('syncIdInput').value.trim();
    const oldId = localStorage.getItem('ga_sync_id');
    if (id !== oldId) {
        localSyncTime = 0;
        localStorage.setItem('ga_sync_time', 0);
    }
    localStorage.setItem('ga_sync_id', id);
    if (id) silentSyncLoad();
}
function generateSyncId() {
    const words = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "Xray", "Yankee", "Zulu"];
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    const newId = `${w1}-${w2}-${num}`;
    document.getElementById('syncIdInput').value = newId;
    localSyncTime = 0;
    localStorage.setItem('ga_sync_time', 0);
    localStorage.setItem('ga_sync_id', newId);
    const t = document.getElementById('syncToggle');
    if (t) { t.checked = true; localStorage.setItem('ga_sync_enabled', 'true'); }
    updateSyncStatus("Neue ID generiert. Speichere...");
    triggerCloudSave(true);
}
function updateSyncStatus(msg, isError = false) {
    const el = document.getElementById('syncStatus');
    if (el) {
        el.innerText = msg;
        el.style.color = isError ? "var(--red)" : "var(--green)";
        setTimeout(() => { if(el.innerText === msg) el.style.color = "#888"; }, 4000);
    }
}
function flashSyncIndicator(direction) {
    const ind = document.getElementById('syncTrafficIndicator');
    if (!ind) return;
    ind.innerText = direction === 'up' ? '⬆️' : '⬇️';
    ind.style.opacity = '1';
    setTimeout(() => { ind.style.opacity = '0'; }, 800);
}
function setLastSyncedPayload() {
    const payloadToCompare = {
        pinboard: JSON.parse(localStorage.getItem('ga_pinboard') || '[]'),
        logbook: JSON.parse(localStorage.getItem('ga_logbook') || '[]'),
        activeMission: JSON.parse(localStorage.getItem('ga_active_mission') || 'null'),
        groupName: getGroupName(),
        groupNick: getGroupNick(),
        knownNotes: JSON.parse(localStorage.getItem('ga_known_group_notes') || '[]'),
        newBadges: JSON.parse(localStorage.getItem('ga_group_new') || '[]')
    };
    lastSyncedPayloadStr = JSON.stringify(payloadToCompare);
}
async function triggerCloudSave(immediate = false) {
    const id = getSyncId();
    const t = document.getElementById('syncToggle');
    if (!id) return;
    if (immediate !== 'manual' && t && !t.checked) return;
    if (immediate === 'manual') {
        if (!confirm("⬆️ CLOUD UPLOAD\nMöchtest du deinen aktuellen, lokalen Stand hochladen und das bisherige Cloud-Backup überschreiben?")) return;
        setNavComLed('navcomSaveBtn', 'syncing');
    }
    if (!immediate) {
        updateSyncStatus("Warte auf Abschluss...");
        if (syncSaveTimeout) clearTimeout(syncSaveTimeout);
        syncSaveTimeout = setTimeout(() => triggerCloudSave(true), 25000);
        return;
    }
    localSyncTime = Date.now();
    const payloadToCompare = {
        pinboard: JSON.parse(localStorage.getItem('ga_pinboard') || '[]'),
        logbook: JSON.parse(localStorage.getItem('ga_logbook') || '[]'),
        activeMission: JSON.parse(localStorage.getItem('ga_active_mission') || 'null'),
        groupName: getGroupName(),
        groupNick: getGroupNick(),
        knownNotes: JSON.parse(localStorage.getItem('ga_known_group_notes') || '[]'),
        newBadges: JSON.parse(localStorage.getItem('ga_group_new') || '[]')
    };

    const currentPayloadStr = JSON.stringify(payloadToCompare);
    if (currentPayloadStr === lastSyncedPayloadStr && immediate !== 'manual') {
        updateSyncStatus("Cloud: Aktuell ✅");
        return;
    }
    updateSyncStatus("Speichere in Cloud...");
    localStorage.setItem('ga_sync_time', localSyncTime);
    const payload = { ...payloadToCompare, lastModified: localSyncTime };
    try {
        const res = await fetch(SYNC_URL + id, { method: 'POST', body: JSON.stringify(payload), keepalive: true });
        if (res.ok) {
            lastSyncedPayloadStr = currentPayloadStr;
            updateSyncStatus("Cloud: Gespeichert ✅");
            flashSyncIndicator('up');
            if (immediate === 'manual') {
                setNavComLed('navcomSaveBtn', 'success');
                setTimeout(() => setNavComLed('navcomSaveBtn', 'off'), 3000);
            }
        } else {
            throw new Error("Server Error");
        }
    } catch (e) {
        updateSyncStatus("Cloud: Speicher-Fehler", true);
        if (immediate === 'manual') {
            setNavComLed('navcomSaveBtn', 'error');
            setTimeout(() => setNavComLed('navcomSaveBtn', 'off'), 3000);
        }
    }
}
async function forceSyncLoad() {
    if (!confirm("⬇️ CLOUD DOWNLOAD\nMöchtest du deinen Spielstand aus der Cloud laden? Alle lokalen Änderungen (die nicht hochgeladen wurden) gehen dabei verloren!")) return;
    const id = getSyncId();
    if (!id) { alert("Bitte zuerst eine Pilot-ID eingeben oder generieren (🎲)."); return; }

    setNavComLed('navcomLoadBtn', 'syncing');
    updateSyncStatus("Lade Daten...");

    try {
        const res = await fetch(SYNC_URL + id);
        if (res.status === 404) {
            alert("Zu dieser ID wurden keine Daten gefunden.");
            updateSyncStatus("Nicht gefunden", true);
            setNavComLed('navcomLoadBtn', 'error');
            setTimeout(() => setNavComLed('navcomLoadBtn', 'off'), 3000);
            return;
        }
        if (!res.ok) throw new Error("Netzwerkfehler");
        const data = await res.json();

        if (data.lastModified) {
            localSyncTime = data.lastModified;
            localStorage.setItem('ga_sync_time', localSyncTime);
        }
        if (data.pinboard) localStorage.setItem('ga_pinboard', JSON.stringify(data.pinboard));
        if (data.logbook) localStorage.setItem('ga_logbook', JSON.stringify(data.logbook));
        if (data.activeMission) {
            localStorage.setItem('ga_active_mission', JSON.stringify(data.activeMission));
            restoreMissionState(data.activeMission);
        } else {
            localStorage.removeItem('ga_active_mission');
            document.getElementById("briefingBox").style.display = "none";
        }
        if (data.knownNotes) localStorage.setItem('ga_known_group_notes', JSON.stringify(data.knownNotes));
        if (data.newBadges) localStorage.setItem('ga_group_new', JSON.stringify(data.newBadges));

        if (data.groupName !== undefined) {
            updateGroupUIFromSync(data.groupName, data.groupNick);
        }
        setLastSyncedPayload();
        updateGroupBadgeUI();
        updateSyncStatus("Cloud: Geladen ✅");
        flashSyncIndicator('down');

        setNavComLed('navcomLoadBtn', 'success');
        setTimeout(() => setNavComLed('navcomLoadBtn', 'off'), 3000);
        if (document.getElementById('pinboardOverlay').classList.contains('active')) renderNotes();
        renderLog();
    } catch (e) {
        updateSyncStatus("Cloud: Lade-Fehler", true);
        alert("Fehler beim Laden aus der Cloud.");
        setNavComLed('navcomLoadBtn', 'error');
        setTimeout(() => setNavComLed('navcomLoadBtn', 'off'), 3000);
    }
}
async function silentSyncLoad() {
    const id = getSyncId();
    const t = document.getElementById('syncToggle');
    if (!id || (t && !t.checked)) return;
    try {
        const res = await fetch(SYNC_URL + id);
        if (!res.ok) return;
        const data = await res.json();
        if (data.lastModified && data.lastModified > localSyncTime) {
            localSyncTime = data.lastModified;
            localStorage.setItem('ga_sync_time', localSyncTime);
            if (data.pinboard) localStorage.setItem('ga_pinboard', JSON.stringify(data.pinboard));
            if (data.logbook) localStorage.setItem('ga_logbook', JSON.stringify(data.logbook));
            if (data.activeMission) {
                localStorage.setItem('ga_active_mission', JSON.stringify(data.activeMission));
                restoreMissionState(data.activeMission);
            } else {
                localStorage.removeItem('ga_active_mission');
                document.getElementById("briefingBox").style.display = "none";
            }
            if (data.knownNotes) localStorage.setItem('ga_known_group_notes', JSON.stringify(data.knownNotes));
            if (data.newBadges) localStorage.setItem('ga_group_new', JSON.stringify(data.newBadges));

            if (data.groupName !== undefined) {
                updateGroupUIFromSync(data.groupName, data.groupNick);
            }

            setLastSyncedPayload();
            updateGroupBadgeUI();
            if (document.getElementById('pinboardOverlay').classList.contains('active')) renderNotes();
            renderLog();
            updateSyncStatus("Auto-Sync: Aktualisiert 🔄");
            flashSyncIndicator('down');
        }
    } catch (e) {}
}
// === GROUP SYNC LOGIC ===
let groupSyncTime = 0;
let isGroupSyncing = false;
async function silentGroupSync() {
    const gName = getGroupName();
    const gNick = getGroupNick();
    if(!gName || isGroupSyncing) return;

    try {
        const res = await fetch(SYNC_URL + "GROUP_" + gName);
        if (!res.ok) return;
        const data = await res.json();

        if (data.lastModified && data.lastModified > groupSyncTime) {
            groupSyncTime = data.lastModified;
            let knownNotes = JSON.parse(localStorage.getItem('ga_known_group_notes')) || [];
            let newBadges = JSON.parse(localStorage.getItem('ga_group_new')) || [];
            let changed = false;
            if (data.kicked && data.kicked.includes(gNick)) {
                alert("❌ Du wurdest vom Admin aus der Crew entfernt.");
                leaveGroup(true);
                return;
            }
            const downloadedNotes = data.notes || [];
            const activeNoteIds = downloadedNotes.map(n => n.id);

            // Ghost-Badge Fix: Entferne alte Badges von Zetteln, die gelöscht wurden
            const originalBadgeCount = newBadges.length;
            newBadges = newBadges.filter(id => activeNoteIds.includes(id));
            if (originalBadgeCount !== newBadges.length) changed = true;
            downloadedNotes.forEach(dn => {
                if(!knownNotes.includes(dn.id)) {
                    knownNotes.push(dn.id);
                    if (dn.author !== gNick) {
                        newBadges.push(dn.id);
                    }
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem('ga_known_group_notes', JSON.stringify(knownNotes));
                localStorage.setItem('ga_group_new', JSON.stringify(newBadges));
                triggerCloudSave(true); // Ins Profil sichern
            }
            groupDataCache = data;
            updateGroupBadgeUI();
            if (document.getElementById('pinboardOverlay').classList.contains('active') && currentBoardMode === 'group') {
                renderNotes();
            }
        }
    } catch(e) {}
}
async function triggerGroupSave(immediate = false) {
    const gName = getGroupName();
    const gNick = getGroupNick();
    if(!gName) return;

    isGroupSyncing = true;
    try {
        const res = await fetch(SYNC_URL + "GROUP_" + gName);
        let latestData = { members: [], notes: [] };
        if (res.ok) latestData = await res.json();

        let members = latestData.members || [];
        // Veraltete Mitglieder (außer Admin) herausfiltern
        members = members.filter(m => {
            const timeoutMs = m.isAdmin ? (365 * 24 * 60 * 60 * 1000) : (28 * 24 * 60 * 60 * 1000);
            return (Date.now() - m.lastSeen) < timeoutMs && m.nick !== gNick;
        });

        let amIAdmin = false;
        const existingMe = (latestData.members || []).find(m => m.nick === gNick);
        if (existingMe && existingMe.isAdmin) amIAdmin = true;
        if (members.length === 0) amIAdmin = true; // Wer die Gruppe belebt, wird Admin
        members.push({ nick: gNick, lastSeen: Date.now(), pin: getGroupPin(), isAdmin: amIAdmin });

        // Max 10 Mitglieder (älteste Nicht-Admins fliegen zuerst)
        if(members.length > 10) {
            members.sort((a,b) => b.lastSeen - a.lastSeen); // Neueste zuerst
            members = members.slice(0, 10);
        }

        // Kicked-Liste behalten
        const kickedList = latestData.kicked || [];

        let cloudNotes = latestData.notes || [];
        let localNotes = groupDataCache.notes || [];

        const myLocalNotes = localNotes.filter(n => n.author === gNick);
        const theirCloudNotes = cloudNotes.filter(n => n.author !== gNick);
        let mergedNotes = [...myLocalNotes, ...theirCloudNotes];

        const payload = { members: members, notes: mergedNotes, kicked: kickedList, lastModified: Date.now() };

        groupDataCache = payload;
        groupSyncTime = payload.lastModified;
        await fetch(SYNC_URL + "GROUP_" + gName, { method: 'POST', body: JSON.stringify(payload), keepalive: true });
    } catch(e) {}
    isGroupSyncing = false;
}
async function forceGroupSync() {
    await triggerGroupSave(true);
    await silentGroupSync();
}
// === Auto-Sync Trigger (Adaptive Polling: 10s / 30s / Sleep) ===
let syncLastActivityTime = Date.now();
let syncLastFetchTime = Date.now();
let syncIsSleeping = false;
function resetSyncTimer() {
    const now = Date.now();
    syncLastActivityTime = now;
    if (syncIsSleeping) {
        syncIsSleeping = false;
        if (document.visibilityState === 'visible') silentSyncLoad();
        syncLastFetchTime = now;
    }
}
['click', 'touchstart', 'scroll', 'keydown'].forEach(evt => {
    document.addEventListener(evt, resetSyncTimer, { passive: true, capture: true });
});
// Wenn der Tab in den Vordergrund/Hintergrund wechselt
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'visible') {
        resetSyncTimer();
        silentSyncLoad();
    } else if (document.visibilityState === 'hidden') {
        // App wird in den Hintergrund gewischt oder geschlossen
        if (syncSaveTimeout) {
            clearTimeout(syncSaveTimeout);
            syncSaveTimeout = null;
            triggerCloudSave(true); // Sofort pushen!
        }
    }
});
window.addEventListener("focus", () => { resetSyncTimer(); silentSyncLoad(); });
// Fallback für alte iOS-Versionen oder explizites Tab-Schließen
window.addEventListener("pagehide", () => {
    if (syncSaveTimeout) {
        clearTimeout(syncSaveTimeout);
        syncSaveTimeout = null;
        triggerCloudSave(true);
    }
});
setTimeout(setLastSyncedPayload, 1000);
setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const t = document.getElementById('syncToggle');
    const personalSyncActive = getSyncId() && t && t.checked;
    const groupSyncActive = !!getGroupName();
    // Loop abbrechen, wenn weder Personal noch Group Sync an sind
    if (!personalSyncActive && !groupSyncActive) return;
    const now = Date.now();
    const idleTime = now - syncLastActivityTime;

    if (idleTime < 60000) {
        // Phase 1: Aktiv (Letzte Aktivität vor < 60 Sekunden) -> Alle 10s
        if (personalSyncActive) silentSyncLoad();
        if (groupSyncActive) silentGroupSync();
        syncLastFetchTime = now;
    } else if (idleTime < 180000) {
        // Phase 2: Halbschlaf (1 bis 3 Minuten) -> Alle 30s
        if (now - syncLastFetchTime >= 30000) {
            if (personalSyncActive) silentSyncLoad();
            if (groupSyncActive) silentGroupSync();
            syncLastFetchTime = now;
        }
    } else {
        // Phase 3: Tiefschlaf (> 3 Minuten) -> Sync stoppen
        syncIsSleeping = true;
    }
}, 10000);
setTimeout(() => initAltWaypoints(), 2000);