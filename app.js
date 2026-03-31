/* =========================================================
   GLOBAL HELPERS
   ========================================================= */
if (!document.getElementById('vp-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'vp-pulse-style';
    style.innerHTML = `@keyframes vpPulse { 0% {opacity:1; transform:scale(1);} 50% {opacity:0.4; transform:scale(0.85);} 100% {opacity:1; transform:scale(1);} } .vp-loading-pulse { animation: vpPulse 1.2s infinite; pointer-events: none; }`;
    document.head.appendChild(style);
}

window.formatAsLimit = function(lim) {
    if (!lim) return '?';
    if (lim.referenceDatum === 0 && lim.value === 0) return 'GND';
    if (lim.unit === 6) return `FL ${lim.value}`;
    let u = lim.unit === 1 ? 'FT' : 'M';
    let r = lim.referenceDatum === 1 ? ' MSL' : (lim.referenceDatum === 0 ? ' AGL' : '');
    return `${lim.value} ${u}${r}`;
};

// V77: Globale Flag – true, solange der Nutzer irgendeinen Slider/Knob berührt
window.vpUIInteractionActive = false;
document.addEventListener('DOMContentLoaded', () => {
    // Erkennt, wenn der Nutzer an einem klassischen Slider zieht
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('mousedown', () => window.vpUIInteractionActive = true);
        slider.addEventListener('touchstart', () => window.vpUIInteractionActive = true, {passive: true});
        const onEnd = () => {
            window.vpUIInteractionActive = false;
            if (slider.id === 'altSlider' || slider.id === 'rateSlider') {
                if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
                if (typeof vpDrawClouds === 'function' && document.getElementById('verticalProfileCanvas')) {
                    renderMapProfile(); renderVerticalProfile('verticalProfileCanvas');
                }
            }
        };
        slider.addEventListener('mouseup', onEnd);
        slider.addEventListener('touchend', onEnd);
        slider.addEventListener('touchcancel', onEnd); // Verhindert Einfrieren beim Scrollen
    });
});

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

    // --- NEU: Wetter-Widgets beim Theme-Wechsel sofort neu rendern ---
    if (typeof currentStartICAO !== 'undefined' && currentStartICAO) {
        const depP = routeWaypoints && routeWaypoints.length > 0 ? routeWaypoints[0] : null;
        loadMetarWidget(currentStartICAO, 'metarContainerDep', depP?.lat, depP?.lng || depP?.lon);
    }
    if (typeof currentDestICAO !== 'undefined' && currentDestICAO) {
        const isPOI = document.getElementById("destRwyContainer")?.style.display === "none";
        const destP = routeWaypoints && routeWaypoints.length > 1 ? routeWaypoints[routeWaypoints.length - 1] : null;
        loadMetarWidget(isPOI ? null : currentDestICAO, 'metarContainerDest', destP?.lat, destP?.lng || destP?.lon);
    }
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
    // Wenn wir auf einen Link, Button oder ein Pin-Icon klicken, umblättern hart blockieren
    if (event && event.target && (
        event.target.tagName === 'A' ||
        event.target.tagName === 'BUTTON' ||
        event.target.classList.contains('briefing-save-pin') ||
        event.target.classList.contains('briefing-export-pin') ||
        event.target.classList.contains('briefing-pdf-pin')
    )) return;

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
let currentDepElev = null;
let currentDestElev = null;
let globalAirports = null, runwayCache = {}, freqCache = {};
window.drumCache = {};

/* =========================================================
   PWA UPDATE TRIGGER & SOFT AUTO SYNC EVENTS
   ========================================================= */
let isRefreshing = false;
if ('serviceWorker' in navigator) {
    // Erzwingt einen automatischen Reload, sobald ein Update (neue sw.js Version) installiert wurde
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!isRefreshing) { isRefreshing = true; window.location.reload(); }
    });
}
// SOFT AUTO SYNC: Lädt beim Öffnen, Speichert beim Schließen (oder in den Hintergrund wischen)
window.addEventListener('visibilitychange', () => {
    const t = document.getElementById('syncToggle');
    if (t && t.checked && getSyncId()) {
        if (document.visibilityState === 'hidden') {
            triggerCloudSave(true); // Push in die Cloud (nur wenn sich Daten wirklich geändert haben)
        } else if (document.visibilityState === 'visible') {
            silentSyncLoad(); // Pull aus der Cloud
        }
    }
});
window.addEventListener('pagehide', () => {
    const t = document.getElementById('syncToggle');
    if (t && t.checked && getSyncId()) {
        triggerCloudSave(true); // Letzter Rettungs-Push beim Schließen des Tabs
    }
});
/* ========================================================= */

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
        window.vpUIInteractionActive = true;
        isDragging = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        startX = e.touches ? e.touches[0].clientX : e.clientX;

        if (type === 'alt' && navcomAltMode === 'rate') {
            startVal = vpClimbRate || 500;
        } else {
            startVal = parseInt(slider.value) || min;
        }
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
        // Listener NUR WÄHREND des Drags aktivieren
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', onEnd);
    }

    function onMove(e) {
        if (!isDragging) return;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

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
        if (!isDragging) return;
        window.vpUIInteractionActive = false;
        isDragging = false;
        document.body.style.cursor = 'default';
        knob.style.transition = 'transform 0.3s ease';
        knob.style.transform = `rotate(0deg)`;
        setTimeout(() => knob.style.transition = '', 300);

        if (type === 'alt' || (type === 'alt' && typeof navcomAltMode !== 'undefined' && navcomAltMode === 'rate')) {
            if (typeof renderVerticalProfile === 'function') renderVerticalProfile('verticalProfileCanvas');
            if (typeof renderMapProfile === 'function') renderMapProfile();
            if (typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
        }
        // Listener nach dem Drag wieder entfernen, um Konflikte zu vermeiden
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchend', onEnd);
        document.removeEventListener('touchcancel', onEnd);
    }

    knob.addEventListener('mousedown', onStart);
    knob.addEventListener('touchstart', onStart, { passive: false });
}

window.onload = () => {
    const savedTheme = localStorage.getItem('ga_theme') || 'retro';
    setTheme(savedTheme);
    applySavedPanelTheme();
    setTimeout(() => { loadGlobalAirports(); }, 2000);

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
    initDragKnob('altDragKnob', 'altRadioDisplay', 'altSlider', 1500, 13500, 'alt');
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
let saveMissionTimeout = null;
window.debouncedSaveMissionState = function() {
    if (saveMissionTimeout) clearTimeout(saveMissionTimeout);
    saveMissionTimeout = setTimeout(() => {
        saveMissionState();
    }, 800);
};

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
        currentDepElev: currentDepElev,
        currentDestElev: currentDestElev,
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
    currentDepElev = state.currentDepElev ?? null; currentDestElev = state.currentDestElev ?? null;
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
    vpElevationData = null; window.vpElevationData = null;
    window._lastVpRouteKey = null; window.vpBgNeedsUpdate = true;
    if (map) { routeMarkers.forEach(m => map.removeLayer(m)); if (polyline) { map.removeLayer(polyline); polyline = null; } if (window.hitBoxPolyline) { map.removeLayer(window.hitBoxPolyline); window.hitBoxPolyline = null; } clearAirspaceMapLayers(); if (typeof wxMapMarkers !== 'undefined') { wxMapMarkers.forEach(m => map.removeLayer(m)); wxMapMarkers = []; } }
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

    // Höhenband: Bereitschaftsstand (leeres Profil)
    if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
}
/* =========================================================
   4. HELPER-FUNKTIONEN (UI & Mathe)
   ========================================================= */
function setDrumCounter(elementId, valueStr) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!document.body.classList.contains('theme-retro')) {
        if (container.dataset.lastVal !== valueStr.toString()) {
            let span = container.querySelector('span');
            if (!span) {
                container.innerHTML = `<span class="theme-color-text" style="font-weight:bold;">${valueStr}</span>`;
                updateDynamicColors(); // Nur einmalig beim Erstellen formatieren!
            } else {
                span.textContent = valueStr;
            }
            container.dataset.lastVal = valueStr.toString();
        }
        return;
    }

    let numericValue = valueStr.toString().replace(/[^0-9]/g, '');
    if (numericValue === "") numericValue = "0";
    const digits = numericValue.split('');
    const digitHeight = 22;

    let cache = window.drumCache[elementId];
    
    // Wenn Element nicht im Cache ist oder der Container geleert wurde: Neu aufbauen
    if (!cache || !cache.windowEl || !container.contains(cache.windowEl)) {
        container.innerHTML = '<div class="drum-window"></div>';
        cache = {
            windowEl: container.querySelector('.drum-window'),
            strips: []
        };
        window.drumCache[elementId] = cache;
    }

    const neededStrips = digits.length;

    // Fehlende Streifen hinzufügen
    while (cache.strips.length < neededStrips) {
        const strip = document.createElement('div');
        strip.className = 'drum-strip';
        strip.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<div class="drum-digit">${d}</div>`).join('');
        cache.windowEl.appendChild(strip);
        cache.strips.push(strip);
    }

    // Überschüssige Streifen entfernen
    while (cache.strips.length > neededStrips) {
        const strip = cache.strips.pop();
        cache.windowEl.removeChild(strip);
    }

    // Werte (CSS Transform) aktualisieren
    digits.forEach((digit, index) => {
        const translateY = -(parseInt(digit) * digitHeight);
        const transformStr = `translateY(${translateY}px)`;
        if (cache.strips[index].style.transform !== transformStr) {
            cache.strips[index].style.transform = transformStr;
        }
    });
}
let vpRenderPending = false;
window.throttledRenderProfiles = function() {
    if (vpRenderPending) return;
    vpRenderPending = true;
    requestAnimationFrame(() => {
        // PERFORMANCE: Nur das aktive Profil rendern, nicht beide gleichzeitig!
        const mapTable = document.getElementById('mapTableOverlay');
        if (mapTable && mapTable.classList.contains('active')) {
            if (typeof renderMapProfile === 'function') renderMapProfile();
        } else {
            if (document.getElementById('verticalProfileCanvas')) renderVerticalProfile('verticalProfileCanvas');
        }
        vpRenderPending = false;
    });
};

window.vpIsFastRendering = false;
let vpFastRenderTimeout = null;
window.activateFastRender = function() {
    window.vpIsFastRendering = true;
    window.vpBgNeedsUpdate = true; // Zwingt Layer 1 zum Update
    if (vpFastRenderTimeout) clearTimeout(vpFastRenderTimeout);
    vpFastRenderTimeout = setTimeout(() => {
        window.vpIsFastRendering = false;
        window.vpBgNeedsUpdate = true; 
        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
    }, 350);
};

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
        const mInp = document.getElementById('altMapInput');
        if (mInp && mInp.innerText != val) mInp.innerText = val;

        // Direkter Render-Aufruf! KEIN 3-Sekunden triggerVerticalProfileUpdate() mehr!
        if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
        // Lufträume nur prüfen, wenn wir nicht gerade aktiv ziehen
        if (!window.vpUIInteractionActive && typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
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
    const rateMapInp = document.getElementById('rateMapInput');
    if (rateSlider) rateSlider.value = val;
    if (rateMapInp && rateMapInp.innerText != val) rateMapInp.innerText = val;
    // Sync NAVCOM if in rate mode
    if (typeof navcomAltMode !== 'undefined' && navcomAltMode === 'rate') {
        const altRadioDisplay = document.getElementById('altRadioDisplay');
        if (altRadioDisplay) altRadioDisplay.textContent = val;
    }
    // Re-render profiles
    if (typeof window.throttledRenderProfiles === 'function') window.throttledRenderProfiles();
    if (!window.vpUIInteractionActive && typeof renderAirspaceWarningsList === 'function') renderAirspaceWarningsList();
}

function recalculatePerformance() {
    if (!currentMissionData) return;
    const tas = parseInt(document.getElementById("tasSlider").value), gph = parseInt(document.getElementById("gphSlider").value), dist = currentMissionData.dist;
    setDrumCounter('timeDrum', Math.round((dist / tas) * 60)); setDrumCounter('fuelDrum', Math.ceil((dist / tas * gph) + (0.75 * gph)));
    if (gpsState.visible && gpsState.mode === 'FPL') renderGPS();
    window.debouncedSaveMissionState();
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

async function loadMetarWidget(icao, containerId, lat, lon, forceModern = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Zwingt das Widget ins "Modern"-Design, auch wenn das Retro-Theme aktiv ist (wichtig für Karten-Popups)
    const isRetro = !forceModern && document.body.classList.contains('theme-retro');
    if (isRetro) {
        container.style.boxShadow = 'none';
        container.style.background = 'transparent';
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#555; font-family: \'Caveat\', cursive; font-size:22px; transform: rotate(-1deg);">Sucht lokales Wetter...</div>';
    } else {
        container.style.boxShadow = '';
        container.style.background = '';
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#888; font-size:12px; background:#1a1a1a; border-radius:6px;">Sucht lokales Wetter...</div>';
    }

    if (!icao || icao === 'POI') {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';

    try {
        let metarDataList = [];
        let isFallback = false;
        let foundIcao = icao;

        // --- CACHE LOGIK: Bulk-Daten aus dem Profil nutzen oder Theme-Wechsel abfangen ---
        const cacheKey = icao + (lat ? `_${lat.toFixed(2)}` : '') + (lon ? `_${lon.toFixed(2)}` : '');
        const cachedEntry = gpsState.metarCache[cacheKey] || gpsState.metarCache[icao];
        if (cachedEntry) {
            metarDataList = cachedEntry.data;
            isFallback = cachedEntry.isFallback;
            foundIcao = cachedEntry.foundIcao;
        } else {

            async function safeFetch(urlObj, retries = 3) {
                for (let i = 0; i < retries; i++) {
                    try {
                        const r = await fetch(urlObj);
                        if (r.ok && r.status !== 204) return await r.text();
                    } catch (err) {
                        try {
                            const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(urlObj)}`;
                            const pr = await fetch(proxyUrl);
                            if (pr.ok && pr.status !== 204) return await pr.text();
                        } catch (pxErr) {
                            if (i === retries - 1) console.error("Metar Fetch endgültig gescheitert nach", retries, "Versuchen", pxErr);
                        }
                    }
                    if (i < retries - 1) await new Promise(res => setTimeout(res, 600));
                }
                return null;
            }

            const directUrl = `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json&t=${Date.now()}`;
            const mainText = await safeFetch(directUrl);
            if (mainText) {
                try { metarDataList = JSON.parse(mainText); } catch (e) { }
            }

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

            // Ergebnis in den Cache legen
            gpsState.metarCache[cacheKey] = { data: metarDataList, isFallback, foundIcao };

        } // Ende der Cache-Else-Bedingung

        if (!metarDataList || metarDataList.length === 0) {
            if (isRetro) {
                container.innerHTML = `
                    <div style="padding:15px; text-align:center; font-family: 'Caveat', cursive; transform: rotate(1deg);">
                        <div style="color:#d93829; font-weight:bold; font-size: 22px; margin-bottom:5px;">Kein METAR in der Nähe von ${icao}</div>
                        <div style="font-size:18px; color:#555; margin-bottom:12px;">Kein automatisches Wetter verfügbar.</div>
                        <a href="https://metar-taf.com/de/${icao}" target="_blank" style="display:inline-block; color:#0b1f65; font-size:20px; font-weight:bold; text-decoration:underline;">Manuell suchen ➔</a>
                    </div>`;
            } else {
                container.innerHTML = `
                    <div style="background:#1a1a1a; border-radius:6px; padding:15px; text-align:center; border: 1px solid #333;">
                        <div style="color:#d93829; font-weight:bold; margin-bottom:5px;">Kein METAR in der Nähe von ${icao}</div>
                        <div style="font-size:11px; color:#888; margin-bottom:12px;">Für diesen Bereich steht kein automatisches Wetter zur Verfügung.</div>
                        <a href="https://metar-taf.com/de/${icao}" target="_blank" style="display:inline-block; background:#4da6ff; color:#111; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:12px; font-weight:bold; transition: background 0.2s;">Manuell suchen ➔</a>
                    </div>`;
            }
            return;
        }

        const metar = metarDataList[0];
        const raw = metar.rawOb || "";
        const temp = metar.temp !== null ? metar.temp + '°C' : '--';
        const dewp = metar.dewp !== null ? metar.dewp + '°C' : '--';
        let catColor = "#fff";
        let catText = metar.fltCat || "N/A";
        if (catText === "VFR") catColor = "#33ff33";
        else if (catText === "MVFR") catColor = "#4da6ff";
        else if (catText === "IFR") catColor = "#ff3333";
        else if (catText === "LIFR") catColor = "#ff33ff";

        let cover = metar.cover || "--";
        if (cover === "Clear") cover = "CLR";

        let visib = metar.visib !== undefined && metar.visib !== null ? metar.visib + ' sm' : '--';
        const visMatch = raw.match(/\s(\d{4})\s/);
        if (raw.includes(' 9999 ')) visib = '> 10 km';
        else if (visMatch && !visMatch[1].startsWith('0000')) visib = parseInt(visMatch[1], 10) + ' m';
        let wx = metar.wxString ? metar.wxString.replace(/,/g, ' ') : 'NIL';

        let qnhStr = "--";
        const qMatch = raw.match ? raw.match(/Q(\d{4})/) : null;
        const aMatch = raw.match ? raw.match(/A(\d{4})/) : null;
        if (qMatch) qnhStr = qMatch[1] + ' hPa';
        else if (aMatch) qnhStr = Math.round((parseInt(aMatch[1]) / 100) * 33.8639) + ' hPa';

        let wdir = metar.wdir, wspd = metar.wspd || 0, wgst = metar.wgst ? `G${metar.wgst}` : '';
        let isVRB = raw.match ? /VRB\d{2,3}KT/.test(raw) : (wdir === "VRB");
        let windText = isVRB ? `VRB / ${wspd}${wgst} kt` : `${wdir}° / ${wspd}${wgst} kt`;
        if (wspd === 0) windText = "Calm (0 kt)";

        const isMini = containerId.startsWith('wxPopup');
        
        // Für Vollansicht: auf Pisten-Daten warten; für Mini-Popup direkt aus Cache lesen
        let retries = 0;
        if (!isMini) {
            while (!runwayCache[foundIcao] && !runwayCache[icao] && retries < 15) {
                await new Promise(r => setTimeout(r, 200));
                retries++;
            }
        }

        let rwyHdg = 0; let rwy1 = ""; let rwy2 = "";
        {
            const rData = runwayCache[foundIcao] || runwayCache[icao];
            if (rData && !rData.includes('Keine Daten')) {
                const match = rData.match(/(?:^|\s|\n|<br\s*\/?>)(0[1-9]|[12]\d|3[0-6])([LRC]?)\s*\/\s*((?:0[1-9]|[12]\d|3[0-6])[LRC]?)/);
                if (match) { rwyHdg = parseInt(match[1], 10) * 10; rwy1 = match[1] + match[2]; rwy2 = match[3]; }
            }
        }

        const headerText = isFallback ? `Nearest: ${foundIcao}` : `Station: ${icao}`;
        const modernHeaderText = isFallback ? `▶ NEAREST: ${foundIcao}` : `▶ STATION: ${icao}`;

        if (isRetro) {
            let svgTicks = `
                <circle cx="80" cy="80" r="70" stroke="#444" stroke-width="1.5" fill="none" stroke-dasharray="30.65 6" transform="rotate(2.45 80 80)"/>
                <circle cx="80" cy="80" r="3" fill="#444" />`;
            
            // Füge N, O, S, W und 30-Grad-Schritte rotierend hinzu
            for (let i = 0; i < 360; i += 30) {
                const angleRad = (i - 90) * Math.PI / 180;
                const radius = 61;
                const tx = 80 + radius * Math.cos(angleRad);
                const ty = 80 + radius * Math.sin(angleRad);
                
                // dx="-2" gleicht den kursiven Schwung (Slant) von Caveat aus, der sonst wie eine Rechtsrotation wirkt
                if (i % 90 === 0) {
                    let letter = i === 0 ? 'N' : (i === 90 ? 'O' : (i === 180 ? 'S' : 'W'));
                    svgTicks += `<text x="${tx}" y="${ty}" dx="-2" font-family="'Caveat', cursive" font-size="22" fill="#222" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(${i} ${tx} ${ty})">${letter}</text>`;
                } else {
                    svgTicks += `<text x="${tx}" y="${ty}" dx="-1.5" font-family="'Caveat', cursive" font-size="14" fill="#666" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(${i} ${tx} ${ty})">${i / 10}</text>`;
                }
            }
            
            let rwyHtml = '';
            if (rwy1 && rwy2) {
                // Piste wurde oben und unten gekürzt (y="29", height="102") um Abstand zu den Zahlen zu gewinnen
                rwyHtml = `
                    <g transform="translate(80,80) rotate(${rwyHdg}) translate(-80,-80)">
                        <rect x="68" y="29" width="24" height="102" fill="none" stroke="#222" stroke-width="1.5" stroke-dasharray="30 4 15 4"/>
                        <text x="80" y="43" font-family="'Caveat', cursive" font-size="14" fill="#111" font-weight="bold" text-anchor="middle" transform="rotate(180 80 39)">${rwy1}</text>
                        <text x="80" y="125" font-family="'Caveat', cursive" font-size="14" fill="#111" font-weight="bold" text-anchor="middle">${rwy2}</text>
                    </g>`;
            }

            let arrowHtml = '';
            if (!isVRB && wspd > 0 && wdir !== null && wdir !== "VRB") {
                arrowHtml = `
                <g transform="rotate(${wdir} 80 80)">
                    <path d="M 80 10 C 77 30, 83 50, 80 65" stroke="#1a73e8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
                    <path d="M 74 54 L 80 68 L 86 52" stroke="#1a73e8" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </g>`;
            }

            container.innerHTML = `
                <div style="font-family: 'Caveat', cursive; color: #222; padding: 5px; position:relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid rgba(0,0,0,0.5); padding-bottom: 2px; margin-bottom: 12px;">
                        <span style="font-size: 24px; font-weight: bold; color: #0b1f65; transform: rotate(-1deg); display: inline-block;">${headerText}</span>
                        <span style="font-size: 18px; font-weight: bold; color: ${catColor}; border: 2px solid ${catColor}; padding: 0 6px; border-radius: 3px; transform: rotate(2deg); display: inline-block; box-shadow: 1px 1px 0 rgba(0,0,0,0.1);">${catText}</span>
                    </div>
                    <div style="font-size: 17px; line-height: 1.25; margin-bottom: 15px; color: #333; padding-left: 12px; border-left: 2px solid rgba(0,0,0,0.2); transform: rotate(0.5deg);">
                        ${raw}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <div style="font-size: 20px; line-height: 1.3; display: flex; flex-direction: column; gap: 2px;">
                            <div><span style="color:#666; font-size: 16px;">Wind:</span> <b style="color:#1a73e8; font-size:22px;">${windText}</b></div>
                            <div><span style="color:#666; font-size: 16px;">Vis:</span> <b>${visib}</b> <span style="color:#666; font-size: 16px; margin-left:8px;">Wx:</span> <b>${wx}</b></div>
                            <div><span style="color:#666; font-size: 16px;">Temp:</span> <b>${temp}</b> <span style="color:#666; font-size: 16px; margin-left:8px;">Dew:</span> <b>${dewp}</b></div>
                            <div><span style="color:#666; font-size: 16px;">QNH:</span> <b>${qnhStr}</b> <span style="color:#666; font-size: 16px; margin-left:8px;">Cloud:</span> <b>${cover}</b></div>
                        </div>
                        <div style="position:relative; width: 130px; height: 130px; flex-shrink: 0;">
                            <svg viewBox="0 0 160 160" style="width:100%; height:100%; overflow:visible;">
                                ${svgTicks}${rwyHtml}${arrowHtml}
                            </svg>
                        </div>
                    </div>
                </div>`;
        } else {
            let svgTicks = '';
            for (let i = 0; i < 360; i += 5) {
                const isCard = i % 90 === 0, isLong = i % 10 === 0;
                const len = isCard ? 8 : (isLong ? 5 : 3), sw = isCard ? 2 : 1, col = isCard ? '#111' : '#888';
                svgTicks += `<line x1="80" y1="2" x2="80" y2="${2 + len}" stroke="${col}" stroke-width="${sw}" transform="rotate(${i} 80 80)" />`;
                if (i % 30 === 0 && !isCard) {
                    const angleRad = (i - 90) * Math.PI / 180, tx = 80 + 61 * Math.cos(angleRad), ty = 80 + 61 * Math.sin(angleRad);
                    svgTicks += `<text x="${tx}" y="${ty}" font-family="sans-serif" font-size="10" fill="#333" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(${i} ${tx} ${ty})">${i / 10}</text>`;
                } else if (isCard) {
                    const angleRad = (i - 90) * Math.PI / 180, tx = 80 + 61 * Math.cos(angleRad), ty = 80 + 61 * Math.sin(angleRad);
                    let letter = i === 0 ? 'N' : (i === 90 ? 'O' : (i === 180 ? 'S' : 'W'));
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

            let rwyHtmlModern = '';
            if (rwy1 && rwy2) {
                const rwyW = isMini ? '15px' : '26px';
                const rwyH = isMini ? '60px' : '105px';
                const rwyFSize = isMini ? '8px' : '10px';
                rwyHtmlModern = `
                <div style="position:absolute; top:50%; left:50%; width:${rwyW}; height:${rwyH}; background:#444; border:1px solid #111; border-radius: 3px; transform: translate(-50%, -50%) rotate(${rwyHdg}deg); transform-origin: center center; display:flex; flex-direction:column; align-items:center; justify-content:space-between; padding: 3px 0; box-sizing: border-box; z-index:5; box-shadow: 0 2px 4px rgba(0,0,0,0.4);">
                    <div style="width:100%; text-align:center; font-size:${rwyFSize}; line-height:1; color:#fff; font-weight:bold; transform: rotate(180deg); font-family: sans-serif;">${rwy1}</div>
                    <div style="width:2px; flex-grow:1; margin: 3px 0; background: repeating-linear-gradient(to bottom, #d4d4d4 0, #d4d4d4 6px, transparent 6px, transparent 12px);"></div>
                    <div style="width:100%; text-align:center; font-size:${rwyFSize}; line-height:1; color:#fff; font-weight:bold; font-family: sans-serif;">${rwy2}</div>
                </div>`;
            }

            let cSize = isMini ? 90 : 160;
            let gap = isMini ? 4 : 8;
            let fVal = isMini ? 12 : 15;
            let fLbl = isMini ? 9 : 10;
            let pPad = isMini ? '10px' : '15px 15px 20px 15px';

            container.innerHTML = `
                <div style="${isMini ? 'background:none; border:none; box-shadow:none; padding:4px 0;' : `background:#f0eada; border-radius:12px; padding:${pPad}; border: 3px solid #c2bba8; box-shadow: 0 4px 8px rgba(0,0,0,0.2), inset 0 2px 5px rgba(255,255,255,0.5);`} font-family: 'Arial', sans-serif; color: #333; position:relative; overflow:hidden;">

                    ${!isMini ? `
                    <div style="position:absolute; top:6px; left:6px; width:6px; height:6px; background:#ddd; border-radius:50%; box-shadow: inset 0 0 2px #555;"></div>
                    <div style="position:absolute; bottom:6px; right:6px; width:6px; height:6px; background:#ddd; border-radius:50%; box-shadow: inset 0 0 2px #555;"></div>
                    <div style="position:absolute; top:6px; right:6px; width:6px; height:6px; background:#ddd; border-radius:50%; box-shadow: inset 0 0 2px #555;"></div>
                    <div style="position:absolute; bottom:6px; left:6px; width:6px; height:6px; background:#ddd; border-radius:50%; box-shadow: inset 0 0 2px #555;"></div>
                    ` : ''}

                    <div style="color: #8a1a12; font-size: 14px; font-weight: bold; margin-bottom: ${isMini?6:12}px; ${isMini ? '' : 'border-bottom: 2px dashed #c2bba8;'} padding-bottom: ${isMini?0:8}px; font-family: 'Courier New', Courier, monospace; display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.5px;">
                        <span>${modernHeaderText}</span>
                        <span style="color:${catColor}; font-size:14px; padding: 2px 8px; border: 2px solid ${catColor}; border-radius: 4px; background: rgba(255,255,255,0.7); box-shadow: 0 1px 2px rgba(0,0,0,0.1);">${catText}</span>
                    </div>
                    ${!isMini ? `<div style="background:#e6e0ce; color:#333; font-family: 'Courier New', Courier, monospace; padding:10px; border-radius:4px; font-size:11.5px; margin-bottom:18px; border: 1px inset #c2bba8; line-height: 1.4; letter-spacing: 0.5px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">${raw}</div>` : ''}
                    <div style="display:flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="display:flex; flex-direction:column; gap:${gap}px; font-family: 'Courier New', Courier, monospace; flex-shrink: 1; min-width: 0;">
                            <div><div style="color:#666; font-size:${fLbl}px; font-weight:bold; letter-spacing:1px;">WIND</div><div style="color:#1a73e8; font-size:${fVal}px; font-weight:bold; white-space: nowrap;">${windText}</div></div>
                            ${!isMini ? `
                            <div style="display:flex; gap:12px;">
                                <div><div style="color:#666; font-size:${fLbl}px; font-weight:bold; letter-spacing:1px;">VIS</div><div style="color:#111; font-size:${fVal}px; font-weight:bold; white-space: nowrap;">${visib}</div></div>
                                <div><div style="color:#666; font-size:${fLbl}px; font-weight:bold; letter-spacing:1px;">WX</div><div style="color:#111; font-size:${fVal}px; font-weight:bold; white-space: nowrap;">${wx}</div></div>
                            </div>
                            <div style="display:flex; gap:12px;">
                                <div><div style="color:#666; font-size:${fLbl}px; font-weight:bold; letter-spacing:1px;">TEMP</div><div style="color:#111; font-size:${fVal}px; font-weight:bold; white-space: nowrap;">${temp}</div></div>
                                <div><div style="color:#666; font-size:${fLbl}px; font-weight:bold; letter-spacing:1px;">DEWP</div><div style="color:#111; font-size:${fVal}px; font-weight:bold; white-space: nowrap;">${dewp}</div></div>
                            </div>` : ''}
                            <div style="display:flex; gap:12px;">
                                <div><div style="color:#666; font-size:${fLbl}px; font-weight:bold; letter-spacing:1px;">QNH</div><div style="color:#111; font-size:${fVal}px; font-weight:bold; white-space: nowrap;">${qnhStr}</div></div>
                                ${!isMini ? `<div><div style="color:#666; font-size:${fLbl}px; font-weight:bold; letter-spacing:1px;">COVER</div><div style="color:#111; font-size:${fVal}px; font-weight:bold; white-space: nowrap;">${cover}</div></div>` : ''}
                            </div>
                        </div>
                        <div style="position:relative; width:${cSize}px; height:${cSize}px; flex-shrink: 0; ${isMini ? 'margin-left: auto;' : ''} border:4px solid #a8a291; border-radius:50%; background:#fcfaf5; box-shadow: inset 0 2px 8px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.2);">
                            <svg viewBox="0 0 160 160" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1; pointer-events:none;">
                                ${svgTicks}
                            </svg>
                            ${rwyHtmlModern}
                            ${arrowHtml}
                        </div>
                    </div>
                </div>`;
        }
    } catch (err) {
        console.error("METAR fetch error:", err);
        const isRetro = document.body.classList.contains('theme-retro');
        if (isRetro) {
            container.innerHTML = `<div style="padding:10px; text-align:center; color:#d93829; font-family: 'Caveat', cursive; font-size:20px; transform: rotate(-1deg);">Fehler beim Laden des METARs: <br/>${err.message || err}</div>`;
        } else {
            container.innerHTML = `<div style="padding:10px; text-align:center; color:#d93829; font-size:12px; background:#1a1a1a;">Fehler beim Laden des METARs: <br/>${err.message || err}</div>`;
        }
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
    try { const res = await fetch('./airports.json'); globalAirports = await res.json(); } catch (e) { globalAirports = {}; }
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

            // Elevation aus OpenAIP (unit 0 = Meter, 1 = Fuß)
            if (apt.elevation != null) {
                const ev = apt.elevation.value;
                const elevFt = apt.elevation.unit === 1 ? ev : Math.round(ev * 3.28084);
                if (type === 'dep')  { currentDepElev  = elevFt; }
                if (type === 'dest') { currentDestElev = elevFt; }
            }

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
    vpPulsePhase = 0.25; // Startet direkt mit voller Leuchtkraft

    function toggleBlink() {
        vpPulsePhase = (vpPulsePhase === 0.25) ? 0 : 0.25; // Wechselt zwischen 0 und 0.25 (an/aus)
        if (typeof renderMapProfile === 'function') renderMapProfile();
        if (document.getElementById('verticalProfileCanvas')) renderVerticalProfile('verticalProfileCanvas');
    }

    toggleBlink(); // Sofortiges erstes Rendern
    vpPulseAnimFrame = setInterval(toggleBlink, 700); // Alle 700ms entspannt umschalten statt 60x pro Sekunde
}

function vpStopHighlightPulse() {
    if (vpPulseAnimFrame) {
        clearInterval(vpPulseAnimFrame);
        vpPulseAnimFrame = null;
    }
    vpPulsePhase = 0;
}

function clearAirspaceMapLayers() {
    if (map) {
        airspaceMapLayers.forEach(l => map.removeLayer(l));
        airspaceMapLayers = [];
    }
    highlightedAirspaceIdx = -1;
    vpHighlightPulseIdx = -1;
    vpStopHighlightPulse();
    document.querySelectorAll('.as-row.as-active').forEach(el => el.classList.remove('as-active'));
    if (typeof renderMapProfile === 'function') renderMapProfile();
    if (document.getElementById('verticalProfileCanvas')) renderVerticalProfile('verticalProfileCanvas');
}

function toggleAirspaceHighlight(idx) {
    if (!activeAirspaces[idx]) return;

    // If same airspace is already highlighted, toggle it off
    if (highlightedAirspaceIdx === idx) {
        clearAirspaceMapLayers();
        return;
    }

    if (map) {
        airspaceMapLayers.forEach(l => map.removeLayer(l));
        airspaceMapLayers = [];
    }
    document.querySelectorAll('.as-row.as-active').forEach(el => el.classList.remove('as-active'));

    const airspace = activeAirspaces[idx];
    highlightedAirspaceIdx = idx;

    if (map) {
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
                color: info.mapColor || '#ff4444', weight: 3, fillColor: info.mapColor || '#ff4444',
                fillOpacity: 0.25, dashArray: '6,4', className: 'airspace-highlight-pulse'
            }).addTo(map);
            const displayName = getAirspaceDisplayName(airspace);
            layer.bindTooltip(`<b>${info.icon} ${displayName}</b>`, { sticky: true, className: 'airspace-tooltip' });
            airspaceMapLayers.push(layer);
        });
    }

    const row = document.querySelector(`.as-row[data-as-idx="${idx}"]`);
    if (row) row.classList.add('as-active');

    vpHighlightPulseIdx = idx;
    vpStartHighlightPulse();
}

function getAirspaceDisplayName(a) {
    const style = getAirspaceStyle(a);
    let name = a.name || 'Unbekannt';
    // Entferne überflüssige Begriffe, ABER behalte die Klassen-Buchstaben (wie C oder D) bei!
    name = name.replace(/\b(TMA|CTR|CTA|TMZ|RMZ|FIS)\b/ig, '');
    return `${name.trim()} [${style.category}]`;
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
    
    // CTRs (Kontrollzonen am Boden) bleiben gelb
    if (t === 4) return { color: '#f2c12e', icon: '⚠️', mapColor: '#f2c12e', category: `CTR${cls}` };
    
    // Class C und D (die keine CTR sind) als eigenständige Lufträume hervorheben (Blautöne)
    if (a.icaoClass === 2) return { color: '#0055ff', icon: '⚠️', mapColor: '#0055ff', category: 'Class C' };
    if (a.icaoClass === 3) return { color: '#1a73e8', icon: '⚠️', mapColor: '#1a73e8', category: 'Class D' };

    if (t === 7) return { color: '#4da6ff', icon: '⚠️', mapColor: '#4da6ff', category: `TMA${cls}` };
    if (t === 26) return { color: '#4da6ff', icon: '⚠️', mapColor: '#4da6ff', category: `CTA${cls}` };
    if (t === 5 || t === 27) return { color: '#9966ff', icon: '📡', mapColor: '#9966ff', category: 'TMZ' };
    if (t === 6 || t === 28) return { color: '#66cccc', icon: '📡', mapColor: '#66cccc', category: 'RMZ' };
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
            // Type 0: Class C (2) und Class D (3) explizit zulassen
            if (as.type === 0 && as.icaoClass !== 2 && as.icaoClass !== 3) continue;

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
            // ICAO Klasse in den Key aufnehmen, damit Class D nicht von gleichnamigen CTRs überschrieben wird
            const key = (as.name || as._id) + '_' + (as.icaoClass || as.type);
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
        // Performance-Fix: Keine schweren DOM-Updates während User-Scroll/Drag!
        if (window.vpIsFastRendering || window.vpUIInteractionActive) return;
        const listEl = document.getElementById('routeAirspacesList');
        if (!listEl) return;

        if (!activeAirspaces || activeAirspaces.length === 0) {
            listEl.innerHTML = '<span style="color:#33ff33;">✅ Route frei – keine Konflikte erkannt.</span>';
            return;
        }

        const filterCheckbox = document.getElementById('navLogAirspaceFilter');
        const filterActive = filterCheckbox && filterCheckbox.checked;

        // FIX: Wir müssen garantieren, dass wir dasselbe Array (Normal oder High-Res Zoom) nutzen wie das visuelle Profil!
        const elevDataToUse = (typeof vpZoomLevel !== 'undefined' && vpZoomLevel < 100 && typeof vpHighResData !== 'undefined' && vpHighResData) ? vpHighResData : vpElevationData;

        let fpResult = null;
        if (filterActive && elevDataToUse && elevDataToUse.length >= 2) {
            const cruiseAlt = parseInt(document.getElementById('altSliderMap')?.value || document.getElementById('altSlider')?.value || 4500);
            const tas = parseInt(document.getElementById('tasSlider')?.value || 115);
            fpResult = computeFlightProfile(elevDataToUse, cruiseAlt, vpClimbRate, vpDescentRate, tas);
        }

        let finalAirspaces = activeAirspaces;

        if (filterActive && fpResult && fpResult.profile) {
            // PERFORMANCE FIX: Kompletten Polygon-Check entfernt! Wir nutzen den bestehenden 2D-Schnittstellen-Cache.
            const totalDist = elevDataToUse[elevDataToUse.length - 1].distNM;
            const cachedAirspaces = getCachedAirspaceIntersections(elevDataToUse, totalDist);

        finalAirspaces = activeAirspaces.filter(a => {
            // 1. Ist der Luftraum überhaupt im 2D-Cache? (Wenn nicht, überfliegen wir ihn in 2D gar nicht)
            const cached = cachedAirspaces.find(ca => ca.as === a);
            if (!cached) return false; 

            // 2. Hat der Luftraum gültige Höhengrenzen?
            if (cached.lowerFt === null || cached.upperFt === null) return true;

            let intersects = false;
            
            // 3. Prüfe NUR die paar Wegpunkte, die in 2D bereits als "innerhalb des Luftraums" markiert wurden!
            for (const pt of cached.relevantPts) {
                // Finde die Flughöhe an diesem spezifischen Punkt
                const pp = fpResult.profile.find(profPt => profPt.distNM === pt.distNM);
                if (!pp) continue;
                
                const realLower = cached.isLowerAgl ? pt.elevFt + cached.lowerFt : cached.lowerFt;
                const realUpper = cached.isUpperAgl ? pt.elevFt + cached.upperFt : cached.upperFt;
                
                // Wenn unsere Flug-Linie zwischen Boden und Decke des Luftraums liegt -> Konflikt!
                if (pp.altFt >= realLower && pp.altFt <= realUpper) {
                    intersects = true; 
                    break;
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

    currentDepElev  = (globalAirports && globalAirports[currentStartICAO])  ? (globalAirports[currentStartICAO].elevation  ?? null) : null;
    currentDestElev = (globalAirports && globalAirports[currentDestICAO])   ? (globalAirports[currentDestICAO].elevation   ?? null) : null;

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

        window.debouncedSaveMissionState();
        refreshGPSAfterDispatch();
        // Position im Profil auf Start zurücksetzen
        vpUpdatePosition(0);
    }, 800);
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




// === FORCE UPDATE (V53) ===
window.forceAppUpdate = function() {
    if (confirm("Möchtest du ein Update erzwingen? Der Zwischenspeicher wird geleert und die App neu geladen.")) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) { registration.unregister(); }
                caches.keys().then(function(names) {
                    for (let name of names) caches.delete(name);
                    window.location.reload(true);
                });
            });
        } else {
            window.location.reload(true);
        }
    }
};


// === AUTO-RESIZE FÜR CANVAS & KARTE (z.B. bei Rotation in Landscape) ===
let vpWindowResizeTimeout = null;
window.addEventListener('resize', () => {
    if (vpWindowResizeTimeout) clearTimeout(vpWindowResizeTimeout);
    vpWindowResizeTimeout = setTimeout(() => {
        // 1. Leaflet Karte an neue Dimensionen anpassen
        if (typeof map !== 'undefined' && map) map.invalidateSize();
        
        // 2. Profile Canvas an neue Dimensionen anpassen (falls Kartentisch offen)
        const mapTableOverlay = document.getElementById('mapTableOverlay');
        if (mapTableOverlay && mapTableOverlay.classList.contains('active')) {
            if (typeof window.throttledRenderProfiles === 'function') {
                window.throttledRenderProfiles();
            }
        }
    }, 200); // 200ms warten, bis das mobile Gerät die Drehung visuell abgeschlossen hat
});

// Verstecke zielgenau die Zoom- und Y-Achsen-Steuerung inkl. Text-Labels auf mobilen Geräten
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 767) {
        const hideSpecificControls = (displayId, labelKeywords) => {
            const el = document.getElementById(displayId);
            if (!el) return;

            el.style.display = 'none';

            // 1. Rückwärts durch echte Elemente gehen (versteckt Buttons und Label-Spans/Divs)
            let prev = el.previousElementSibling;
            while (prev) {
                if (prev.tagName === 'BUTTON' || labelKeywords.some(kw => prev.textContent.toUpperCase().includes(kw))) {
                    prev.style.display = 'none';
                    prev = prev.previousElementSibling;
                } else {
                    break; // Stop, wenn ein völlig anderes Element (z.B. ein Toggle-Icon) erreicht wird
                }
            }

            // 2. Rückwärts durch alle Nodes gehen (erwischt "nackte" Text-Nodes ohne HTML-Tag)
            let prevNode = el.previousSibling;
            while (prevNode) {
                if (prevNode.nodeType === 3 && labelKeywords.some(kw => prevNode.textContent.toUpperCase().includes(kw))) {
                    prevNode.textContent = ''; // Rohen Text löschen
                }
                // Abbrechen, wenn wir ein echtes Element treffen, das weder Button noch gesuchtes Label ist
                if (prevNode.nodeType === 1 && prevNode.tagName !== 'BUTTON' && !labelKeywords.some(kw => prevNode.textContent.toUpperCase().includes(kw))) {
                    break; 
                }
                prevNode = prevNode.previousSibling;
            }

            // 3. Vorwärts gehen (versteckt nachfolgende Plus-Buttons)
            let next = el.nextElementSibling;
            while (next) {
                if (next.tagName === 'BUTTON') {
                    next.style.display = 'none';
                    next = next.nextElementSibling;
                } else {
                    break;
                }
            }
        };

        // Suche nach den Elementen und lösche auch die zugehörigen Texte/Labels davor
        hideSpecificControls('vpZoomDisplay', ['ZOOM']);
        hideSpecificControls('yAxisDisplay', ['MAX', 'FT', 'ALT']);
    }
});