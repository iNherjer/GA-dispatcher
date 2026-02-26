/* =========================================================
   1. THEME TOGGLE LOGIK (Modern vs Analog)
   ========================================================= */
function toggleTheme() {
    const toggle = document.getElementById('themeToggle');
    if(toggle.checked) {
        document.body.classList.add('theme-retro');
        localStorage.setItem('ga_theme', 'retro');
    } else {
        document.body.classList.remove('theme-retro');
        localStorage.setItem('ga_theme', 'classic');
    }
    updateDynamicColors();
    refreshAllDrums();
}

function updateDynamicColors() {
    const isRetro = document.body.classList.contains('theme-retro');
    
    const primColor = isRetro ? 'var(--piper-white)' : 'var(--blue)';
    const titleColor = isRetro ? 'var(--piper-white)' : 'var(--blue)';
    const hlColor = isRetro ? 'var(--piper-yellow)' : 'var(--green)';
    
    // Im Retro Mode kümmert sich das CSS der Handschrift um die Farbe
    document.getElementById('mainTitle').style.color = isRetro ? '' : titleColor;
    
    document.querySelectorAll('.theme-color-text').forEach(el => el.style.color = isRetro ? '' : primColor);
    document.querySelectorAll('.theme-green-text').forEach(el => el.style.color = hlColor);
}

/* =========================================================
   2. GLOBALE VARIABLEN & INITIALISIERUNG
   ========================================================= */
let map, polyline, markers = [], currentStartICAO, currentDestICAO, currentMissionData = null, selectedAC = "PA-24";
let globalAirports = null;
let runwayCache = {};

window.onload = () => {
    const savedTheme = localStorage.getItem('ga_theme');
    if (savedTheme === 'retro') {
        document.body.classList.add('theme-retro');
        document.getElementById('themeToggle').checked = true;
    }
    updateDynamicColors();

    const lastDest = localStorage.getItem('last_icao_dest');
    if (lastDest) document.getElementById('startLoc').value = lastDest;
    renderLog();

    setDrumCounter('tasDrum', 160);
    setDrumCounter('gphDrum', 14);
};

/* =========================================================
   3. HELPER-FUNKTIONEN (UI & Mathe)
   ========================================================= */
function setDrumCounter(elementId, valueStr) {
    const container = document.getElementById(elementId);
    if (!container) return;

    // Im Modern Mode: Einfach Text anzeigen
    if (!document.body.classList.contains('theme-retro')) {
        container.innerHTML = `<span class="theme-color-text" style="font-weight:bold;">${valueStr}</span>`;
        updateDynamicColors(); 
        return;
    }

    // Im Retro Mode: Flache, saubere Trommel-Animation bauen
    let numericValue = valueStr.toString().replace(/[^0-9]/g, '');
    if (numericValue === "") numericValue = "0"; 
    
    const digits = numericValue.split('');
    const digitHeight = 22; // Muss zur CSS-Höhe passen

    let windowEl = container.querySelector('.drum-window');
    if (!windowEl) {
        container.innerHTML = '<div class="drum-window"></div>';
        windowEl = container.querySelector('.drum-window');
    }

    const existingStrips = windowEl.querySelectorAll('.drum-strip');
    const neededStrips = digits.length;

    // Streifen hinzufügen
    if (existingStrips.length < neededStrips) {
        for (let i = 0; i < (neededStrips - existingStrips.length); i++) {
            const strip = document.createElement('div');
            strip.className = 'drum-strip';
            strip.innerHTML = [0,1,2,3,4,5,6,7,8,9].map(d => `<div class="drum-digit">${d}</div>`).join('');
            windowEl.appendChild(strip);
        }
    } 
    // Streifen entfernen
    else if (existingStrips.length > neededStrips) {
        for (let i = neededStrips; i < existingStrips.length; i++) {
            windowEl.removeChild(existingStrips[i]);
        }
    }

    // Positionen animieren
    const finalStrips = windowEl.querySelectorAll('.drum-strip');
    digits.forEach((digit, index) => {
        const targetDigit = parseInt(digit);
        const translateY = -(targetDigit * digitHeight);
        finalStrips[index].style.transform = `translateY(${translateY}px)`;
    });
}

// Reagiert auf Slider-Änderungen live
function handleSliderChange(type, val) {
    setDrumCounter(type + 'Drum', val);
    recalculatePerformance(); 
}

// Berechnet Zeit und Sprit neu, falls eine Mission aktiv ist
function recalculatePerformance() {
    if (!currentMissionData) return;
    
    const tas = parseInt(document.getElementById("tasSlider").value);
    const gph = parseInt(document.getElementById("gphSlider").value);
    const dist = currentMissionData.dist;
    
    const fuel = Math.ceil((dist / tas * gph) + (0.75 * gph));
    const totalMinutes = Math.round((dist / tas) * 60);
    
    setDrumCounter('timeDrum', totalMinutes);
    setDrumCounter('fuelDrum', fuel);
}

function refreshAllDrums() {
    const tas = document.getElementById('tasSlider').value;
    const gph = document.getElementById('gphSlider').value;
    setDrumCounter('tasDrum', tas);
    setDrumCounter('gphDrum', gph);
    
    if(currentMissionData) {
       setDrumCounter('headingDrum', currentMissionData.heading);
       setDrumCounter('distDrum', currentMissionData.dist);
       recalculatePerformance();
    }
}

function applyPreset(t, g, s, n) { 
    document.getElementById('tasSlider').value=t; 
    document.getElementById('gphSlider').value=g; 
    document.getElementById('maxSeats').value=s; selectedAC=n;
    
    handleSliderChange('tas', t);
    handleSliderChange('gph', g);
}

function copyCoords(elementId) {
    const txt = document.getElementById(elementId).innerText;
    if(txt && txt !== "-") {
        navigator.clipboard.writeText(txt).then(() => {
            alert("Koordinaten kopiert:\n" + txt + "\n\n(Einfach im MSFS Suchfeld mit STRG+V einfügen)");
        });
    }
}

function getArrow(b) {
    if(b >= 337.5 || b < 22.5) return '⬆️';
    if(b >= 22.5 && b < 67.5) return '↗️';
    if(b >= 67.5 && b < 112.5) return '➡️';
    if(b >= 112.5 && b < 157.5) return '↘️';
    if(b >= 157.5 && b < 202.5) return '⬇️';
    if(b >= 202.5 && b < 247.5) return '↙️';
    if(b >= 247.5 && b < 292.5) return '⬅️';
    if(b >= 292.5 && b < 337.5) return '↖️';
    return '';
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
    btn.disabled = false;
    btn.innerText = "Auftrag generieren";
}

function calcNav(lat1, lon1, lat2, lon2) {
    const R = 3440, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    const dist = Math.round(R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    const y = Math.sin(dLon)*Math.cos(lat2*Math.PI/180), x = Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180)-Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLon);
    return { dist, brng: Math.round((Math.atan2(y, x)*180/Math.PI + 360)%360) };
}

function getDestinationPoint(lat, lon, distNM, bearing) {
    const R = 3440.065; 
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;
    const brng = bearing * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distNM / R) +
                         Math.cos(lat1) * Math.sin(distNM / R) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distNM / R) * Math.cos(lat1),
                                 Math.cos(distNM / R) - Math.sin(lat1) * Math.sin(lat2));

    return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
}

/* =========================================================
   4. DATEN-FETCHING (APIs)
   ========================================================= */
async function loadGlobalAirports() {
    if (globalAirports) return;
    document.getElementById('searchIndicator').innerText = "Lade weltweite Airport-Datenbank...";
    try {
        const res = await fetch('https://raw.githubusercontent.com/mwgg/Airports/master/airports.json');
        globalAirports = await res.json();
    } catch (e) {
        console.error("Fehler beim Laden der Airports via GitHub", e);
        globalAirports = {}; 
    }
}

async function getAirportData(icao) {
    if (typeof coreDB !== 'undefined' && coreDB[icao]) return coreDB[icao]; 
    
    await loadGlobalAirports(); 
    if (globalAirports[icao]) {
        return {
            icao: icao,
            n: globalAirports[icao].name || globalAirports[icao].city,
            lat: globalAirports[icao].lat,
            lon: globalAirports[icao].lon
        };
    }

    const indicator = document.getElementById('searchIndicator');
    indicator.innerText = `Lade Standortdaten: ${icao}...`;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${icao}+airport`);
        const data = await res.json();
        if (data && data.length > 0) return { icao: icao, n: data[0].display_name.split(',')[0], lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (e) {} return null;
}

async function findGithubAirport(lat, lon, minNM, maxNM, dirPref, regionPref) {
    await loadGlobalAirports();
    const indicator = document.getElementById('searchIndicator');
    indicator.innerText = `Suche passenden Flughafen (${minNM}-${maxNM} NM)...`;

    let validAirports = [];
    for (const key in globalAirports) {
        const apt = globalAirports[key];
        if(apt.icao === currentStartICAO) continue;

        const isDE = apt.icao.startsWith('ED') || apt.icao.startsWith('ET');
        if (regionPref === "de" && !isDE) continue;
        if (regionPref === "int" && isDE) continue;

        const navCalc = calcNav(lat, lon, apt.lat, apt.lon);
        if (navCalc.dist >= minNM && navCalc.dist <= maxNM) {
            if (checkBearing(navCalc.brng, dirPref)) {
                validAirports.push({
                    icao: apt.icao,
                    n: apt.name || apt.city || "Unbekannt",
                    lat: apt.lat,
                    lon: apt.lon
                });
            }
        }
    }

    if (validAirports.length > 0) {
        return validAirports[Math.floor(Math.random() * validAirports.length)];
    }
    return null;
}

async function findWikipediaPOI(lat, lon, minNM, maxNM, dirPref) {
    const indicator = document.getElementById('searchIndicator');
    indicator.innerText = `Scanne Wikipedia nach Sehenswürdigkeiten...`;

    const dist = Math.floor(Math.random() * (maxNM - minNM + 1)) + minNM;
    let minB = 0, maxB = 360;
    if (dirPref === 'N') { minB = 315; maxB = 405; }
    else if (dirPref === 'E') { minB = 45; maxB = 135; }
    else if (dirPref === 'S') { minB = 135; maxB = 225; }
    else if (dirPref === 'W') { minB = 225; maxB = 315; }

    let bearing = Math.floor(Math.random() * (maxB - minB + 1)) + minB;
    bearing = bearing % 360;

    const target = getDestinationPoint(lat, lon, dist, bearing);
    const url = `https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${target.lat}|${target.lon}&gsradius=10000&gslimit=30&format=json&origin=*`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.query && data.query.geosearch && data.query.geosearch.length > 0) {
            const poi = data.query.geosearch[Math.floor(Math.random() * data.query.geosearch.length)];
            return {
                icao: "POI",
                n: poi.title, 
                lat: poi.lat,
                lon: poi.lon
            };
        }
    } catch(e) { console.error("Wiki API Fehler", e); }
    
    return null;
}

async function fetchAreaDescription(lat, lon, elementId, exactTitle = null) {
    try {
        let titleToFetch = exactTitle;

        if (!titleToFetch) {
            const geoUrl = `https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=1&format=json&origin=*`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();
            
            if (geoData && geoData.query && geoData.query.geosearch && geoData.query.geosearch.length > 0) {
                titleToFetch = geoData.query.geosearch[0].title;
            } else {
                document.getElementById(elementId).innerText = "Sehr abgelegenes Gebiet. Keine regionalen Wikipedia-Daten im 10km Umkreis gefunden.";
                return;
            }
        }

        if (titleToFetch) {
            const extractUrl = `https://de.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&exsentences=3&titles=${encodeURIComponent(titleToFetch)}&format=json&origin=*`;
            const extRes = await fetch(extractUrl);
            const extData = await extRes.json();
            
            if (extData && extData.query && extData.query.pages) {
                const pages = extData.query.pages;
                const pageId = Object.keys(pages)[0];
                
                if (pageId !== "-1" && pages[pageId].extract) {
                    const isRetro = document.body.classList.contains('theme-retro');
                    const hColor = isRetro ? 'var(--piper-yellow)' : 'var(--blue)';
                    let prefix = exactTitle ? "" : `<b style="color:${hColor}">Region (${titleToFetch}):</b> `;
                    document.getElementById(elementId).innerHTML = prefix + pages[pageId].extract;
                    return;
                }
            }
        }
        document.getElementById(elementId).innerText = "Der Artikel konnte nicht von Wikipedia abgerufen werden.";
    } catch(e) {
        console.error("Wiki Fetch Fehler:", e);
        document.getElementById(elementId).innerText = "Wiki-Daten konnten nicht geladen werden (Verbindungsfehler).";
    }
}

async function fetchRunwayDetails(lat, lon, elementId, icaoCode) {
    const domEl = document.getElementById(elementId);
    const isRetro = document.body.classList.contains('theme-retro');
    const hColor = isRetro ? 'var(--piper-yellow)' : 'var(--warn)';

    if (icaoCode && runwayCache[icaoCode]) {
        domEl.innerText = runwayCache[icaoCode];
        domEl.style.color = hColor;
        return;
    }

    const query = `[out:json][timeout:5];way["aeroway"="runway"](around:2000,${lat},${lon});out tags;`;
    try {
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data && data.elements && data.elements.length > 0) {
            let rwyElement = data.elements.find(el => el.tags && el.tags.ref);
            if (!rwyElement) rwyElement = data.elements[0];

            const ref = rwyElement.tags.ref ? rwyElement.tags.ref : "???";
            let surface = rwyElement.tags.surface ? rwyElement.tags.surface.toLowerCase() : "unbekannt";
            
            const surfaceTranslations = {
                "asphalt": "Asphalt", "concrete": "Beton", "grass": "Gras", 
                "paved": "Befestigt", "unpaved": "Unbefestigt", "dirt": "Erde", "gravel": "Schotter"
            };
            const sfcText = surfaceTranslations[surface] || surface;
            const lengthText = rwyElement.tags.length ? ` (${rwyElement.tags.length}m)` : "";

            const finalString = `${ref} - ${sfcText}${lengthText}`;
            
            if (icaoCode && finalString !== "??? - unbekannt") {
                runwayCache[icaoCode] = finalString;
            }

            domEl.innerText = finalString;
            domEl.style.color = hColor;
            return;
        }
    } catch (e) {
        console.error("Runway fetch Fehler:", e);
    }
    
    domEl.innerText = "Keine Daten gefunden";
    domEl.style.color = "#888";
}

/* =========================================================
   5. HAUPT-LOGIK: AUFTRAG GENERIEREN
   ========================================================= */
async function generateMission() {
    const btn = document.getElementById('generateBtn'); 
    btn.disabled = true;
    btn.innerText = "Sucht Route & Daten...";
    document.getElementById("briefingBox").style.display = "none";
    
    document.getElementById("mDepRwy").innerText = "Sucht Pisten-Infos...";
    document.getElementById("mDepRwy").style.color = "#fff";
    document.getElementById("mDestRwy").innerText = "Sucht Pisten-Infos...";
    document.getElementById("mDestRwy").style.color = "#fff";
    document.getElementById("wikiDescText").innerText = "Lade Region-Info...";

    const indicator = document.getElementById('searchIndicator');
    
    // ==========================================
    // METER ANIMATION STARTEN (SUCHEN)
    // ==========================================
    const needle = document.getElementById('meterNeedle');
    const led = document.getElementById('meterLed');
    if (led) led.classList.remove('led-active'); // Lampe aus
    
    if (window.meterInterval) clearInterval(window.meterInterval);
    window.meterInterval = setInterval(() => {
        // Nadel zuckt wild zwischen -20° und +40° hin und her
        const randomAngle = Math.floor(Math.random() * 60) - 20; 
        if (needle) needle.style.transform = `translateX(-50%) rotate(${randomAngle}deg)`;
    }, 120);
    // ==========================================

    currentStartICAO = document.getElementById("startLoc").value.toUpperCase();
    const start = await getAirportData(currentStartICAO);
    
    if(!start) { 
        alert("Startplatz unbekannt!"); 
        resetBtn(btn); 
        if(window.meterInterval) clearInterval(window.meterInterval);
        if (needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`;
        return; 
    }
    
    const rangePref = document.getElementById("distRange").value;
    const regionPref = document.getElementById("regionFilter").value;
    const targetType = document.getElementById("targetType").value;
    const dirPref = document.getElementById("dirPref").value;
    const maxSeats = parseInt(document.getElementById("maxSeats").value);
    const selectedTas = document.getElementById("tasSlider").value;
    const selectedGph = document.getElementById("gphSlider").value;
    
    let targetDest = document.getElementById("destLoc").value.toUpperCase();
    let dataSource = targetDest ? "Manuell" : "Generiert";
    
    let minNM, maxNM;
    if(rangePref === "any") {
        const roll = Math.random();
        if (roll < 0.33) { minNM=10; maxNM=50; }
        else if (roll < 0.66) { minNM=50; maxNM=100; }
        else { minNM=100; maxNM=250; }
    } else {
        if(rangePref === "short") { minNM=10; maxNM=50; }
        if(rangePref === "medium") { minNM=50; maxNM=100; }
        if(rangePref === "long") { minNM=100; maxNM=250; }
    }

    let searchMin = targetType === "poi" ? minNM / 2 : minNM;
    let searchMax = targetType === "poi" ? maxNM / 2 : maxNM;

    let dest = null;
    
    if (targetDest) {
        dest = await getAirportData(targetDest);
    } else {
        if (targetType === "apt") {
            dest = await findGithubAirport(start.lat, start.lon, searchMin, searchMax, dirPref, regionPref);
        } else if (targetType === "poi") {
            dest = await findWikipediaPOI(start.lat, start.lon, searchMin, searchMax, dirPref);
        }
    }
    
    if(!dest && !targetDest && typeof coreDB !== 'undefined') {
        if (targetType === "apt") {
            dataSource = "Core DB (Fallback)";
            let keys = Object.keys(coreDB).filter(k => k !== currentStartICAO);
            if(regionPref === "de") keys = keys.filter(k => k.startsWith('ED') || k.startsWith('ET'));
            if(regionPref === "int") keys = keys.filter(k => !k.startsWith('ED') && !k.startsWith('ET'));
            
            let dirFilteredKeys = keys.filter(k => {
                const b = calcNav(start.lat, start.lon, coreDB[k].lat, coreDB[k].lon).brng;
                return checkBearing(b, dirPref);
            });
            if(dirFilteredKeys.length > 0) keys = dirFilteredKeys;
            if(keys.length === 0) keys = Object.keys(coreDB).filter(k => k !== currentStartICAO); 
            dest = coreDB[keys[Math.floor(Math.random()*keys.length)]];
        } else if (targetType === "poi" && typeof fallbackPOIs !== 'undefined') {
            dataSource = "Fallback POIs";
            let validPOIs = fallbackPOIs.filter(p => {
                const b = calcNav(start.lat, start.lon, p.lat, p.lon).brng;
                return checkBearing(b, dirPref);
            });
            if(validPOIs.length === 0) validPOIs = fallbackPOIs; 
            dest = validPOIs[Math.floor(Math.random() * validPOIs.length)];
            dest.icao = "POI";
        }
    }

    if(!dest) { 
        indicator.innerText = "Fehler: Kein passendes Ziel gefunden."; 
        resetBtn(btn); 
        if(window.meterInterval) clearInterval(window.meterInterval);
        if (needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`;
        return; 
    }
    
    const isPOI = (targetType === 'poi' && !targetDest);
    const nav = calcNav(start.lat, start.lon, dest.lat, dest.lon);
    
    let m, totalDist, distStr;
    let payloadText = "", cargoText = "";
    
    if (isPOI) {
        m = generateDynamicPOIMission(dest.n, maxSeats);
        totalDist = nav.dist * 2; 
        currentDestICAO = currentStartICAO; 
        dataSource = "Wikipedia GeoSearch";
        payloadText = m.payloadText;
        cargoText = m.cargoText;
    } else if (typeof missions !== 'undefined') {
        const availM = missions.filter(ms => (nav.dist < 50 || ms.cat === "std"));
        m = availM[Math.floor(Math.random()*availM.length)] || missions[0];
        totalDist = nav.dist;
        currentDestICAO = dest.icao;
        if(dataSource === "Generiert") dataSource = "GitHub Airport DB";
        
        // ==========================================
        // NEU: PAX LOGIK UPDATE (Keine 0 Passagiere mehr)
        // ==========================================
        if (m.cat === "trn" || m.cat === "cargo") {
            payloadText = "0 PAX";
        } else {
            // Garantiert mindestens 1 Passagier, maximal Sitzplätze minus Pilot
            const maxPax = Math.max(1, maxSeats - 1);
            const randomPax = Math.floor(Math.random() * maxPax) + 1;
            payloadText = `${randomPax} PAX`;
        }
        
        cargoText = `${Math.floor(Math.random()*300)+20} lbs`;
    }
    
    const fuel = Math.ceil((totalDist / selectedTas * selectedGph) + (0.75 * selectedGph));
    const totalMinutes = Math.round((totalDist / selectedTas) * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const timeString = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} Min`;

    currentMissionData = { 
        start: currentStartICAO, 
        dest: currentDestICAO, 
        poiName: isPOI ? dest.n : null,
        mission: m.t, 
        dist: totalDist, 
        ac: selectedAC,
        heading: nav.brng
    };
    
    document.getElementById("mTitle").innerHTML = `${m.i} ${m.t}`;
    document.getElementById("mStory").innerText = m.s;
    
    document.getElementById("mDepICAO").innerText = currentStartICAO;
    document.getElementById("mDepName").innerText = start.n;
    document.getElementById("mDepCoords").innerText = `${start.lat.toFixed(4)}, ${start.lon.toFixed(4)}`;
    
    setDrumCounter('headingDrum', nav.brng);
    setDrumCounter('distDrum', totalDist);
    document.getElementById('headingArrow').innerText = getArrow(nav.brng);
    
    recalculatePerformance();

    document.getElementById("destIcon").innerText = isPOI ? "🎯" : "🛬";
    document.getElementById("mDestICAO").innerText = isPOI ? "POI" : currentDestICAO;
    document.getElementById("mDestName").innerText = dest.n;
    document.getElementById("mDestCoords").innerText = `${dest.lat.toFixed(4)}, ${dest.lon.toFixed(4)}`;
    
    document.getElementById("mPay").innerText = payloadText;
    document.getElementById("mWeight").innerText = cargoText;
    
        document.getElementById("destRwyContainer").style.display = isPOI ? "none" : "block";
    document.getElementById("wikiDescContainer").style.display = "block"; 
    // NEU: Versteckt die Ziel-Schalterreihe, wenn es ein POI ist
    const destSwitchRow = document.getElementById("destSwitchRow");
    if(destSwitchRow) destSwitchRow.style.display = isPOI ? "none" : "flex";

    document.getElementById("briefingBox").style.display = "block";
    updateMap(start.lat, start.lon, dest.lat, dest.lon, currentStartICAO, dest.n);

    indicator.innerText = `Flugplan erstellt via ${dataSource}. Lade Infos...`;
    
    fetchRunwayDetails(start.lat, start.lon, 'mDepRwy', currentStartICAO);
    
    setTimeout(() => {
        if (!isPOI) {
            fetchRunwayDetails(dest.lat, dest.lon, 'mDestRwy', currentDestICAO);
        }
        fetchAreaDescription(dest.lat, dest.lon, 'wikiDescText', isPOI ? dest.n : null);
        
        indicator.innerText = `Briefing komplett.`;
        resetBtn(btn);
        
        // ==========================================
        // METER ANIMATION STOPPEN (ERFOLG)
        // ==========================================
        if(window.meterInterval) clearInterval(window.meterInterval);
        if(needle) needle.style.transform = `translateX(-50%) rotate(-45deg)`; // Fällt ganz nach links
        if(led) led.classList.add('led-active'); // Grünes Lämpchen AN
        // ==========================================

    }, 800); 
}

/* =========================================================
   6. KARTE (LEAFLET)
   ========================================================= */
function updateMap(lat1, lon1, lat2, lon2, s, d) {
    document.getElementById('map').style.display = 'block';
    
    if (!map) { 
        const aeroMap = L.tileLayer('https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest', { attribution: 'AeroData / Navigraph' });
        const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'CartoDB' });
        const topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'OpenTopoMap' });
        const satMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' });

        map = L.map('map', { layers: [aeroMap], attributionControl: false }); 
        
        const baseMaps = {
            "🛩️ VFR Lufträume (Aero)": aeroMap,
            "⛰️ Topografie (VFR)": topoMap,
            "🌑 Dark Mode (Clean)": darkMap,
            "🛰️ Satellit (Esri)": satMap
        };
        L.control.layers(baseMaps).addTo(map);

        const fsControl = L.control({position: 'topleft'});
        fsControl.onAdd = function() {
            const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
            btn.innerHTML = '⛶';
            btn.title = 'Vollbildmodus';
            btn.style.width = '30px'; btn.style.height = '30px';
            btn.style.lineHeight = '30px';
            btn.style.backgroundColor = '#fff';
            btn.style.border = '1px solid #ccc';
            btn.style.cursor = 'pointer'; btn.style.fontSize = '18px'; btn.style.fontWeight = 'bold';
            btn.style.textAlign = 'center'; btn.style.padding = '0';
            
            btn.onclick = function(e){
                e.preventDefault();
                const mapDiv = document.getElementById('map');
                
                if (mapDiv.classList.contains('map-fullscreen')) {
                    mapDiv.classList.remove('map-fullscreen');
                    document.body.classList.remove('fullscreen-active');
                    document.body.style.overflow = ''; 
                    btn.innerHTML = '⛶';
                } else {
                    mapDiv.classList.add('map-fullscreen');
                    document.body.classList.add('fullscreen-active');
                    document.body.style.overflow = 'hidden'; 
                    btn.innerHTML = '✖';
                }
                
                setTimeout(() => { if(map) map.invalidateSize(); }, 200);
            };
            return btn;
        };
        fsControl.addTo(map);
    }
    
    markers.forEach(m => map.removeLayer(m)); if (polyline) map.removeLayer(polyline);
    
    const startIcon = L.divIcon({
        className: 'custom-pin',
        html: '<div style="background-color: #44ff44;"></div>',
        iconSize: [22, 22], iconAnchor: [11, 11]
    });

    const destIcon = L.divIcon({
        className: 'custom-pin',
        html: '<div style="background-color: #ff4444;"></div>',
        iconSize: [22, 22], iconAnchor: [11, 11]
    });

    markers = [
        L.marker([lat1, lon1], {icon: startIcon}).addTo(map).bindPopup(`<b>DEP:</b> ${s}`), 
        L.marker([lat2, lon2], {icon: destIcon}).addTo(map).bindPopup(`<b>DEST:</b> ${d}`)
    ];
    
    polyline = L.polyline([[lat1, lon1], [lat2, lon2]], { color: '#ff4444', weight: 4, dashArray: '8,8' }).addTo(map);
    
    map.fitBounds(L.latLngBounds([lat1, lon1], [lat2, lon2]), { padding: [40, 40] });

    // UPDATE: Karte für Lufträume ranzoomen und zentrieren
    setTimeout(() => {
        if (map.getZoom() < 10) {
            map.setZoom(10);
            map.panTo([lat1, lon1]); 
        }
    }, 50);
}

/* =========================================================
   7. EXTERNE LINKS & LOGBUCH
   ========================================================= */
function openAIP(t) { window.open(`https://aip.aero/de/vfr/?${t==='dep'?currentStartICAO:currentDestICAO}`, '_blank'); }
function openMetar(t) { window.open(`https://metar-taf.com/de/${t==='dep'?currentStartICAO:currentDestICAO}`, '_blank'); }

function logCurrentFlight() {
    if(!currentMissionData) return;
    const log = JSON.parse(localStorage.getItem('ga_logbook')) || [];
    log.unshift({ ...currentMissionData, date: new Date().toLocaleString('de-DE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) });
    localStorage.setItem('ga_logbook', JSON.stringify(log.slice(0, 50)));
    localStorage.setItem('last_icao_dest', currentMissionData.dest);
    
    document.getElementById('startLoc').value = currentMissionData.dest;
    document.getElementById('destLoc').value = "";
    renderLog(); 
    alert(`Flug geloggt! Du bist in ${currentMissionData.dest}.`);
}

function renderLog() {
    const log = JSON.parse(localStorage.getItem('ga_logbook')) || [];
    const container = document.getElementById('logContent');
    container.innerHTML = log.length ? '' : '<div style="color:#888; font-size:11px;">Keine Einträge vorhanden.</div>';
    
    const isRetro = document.body.classList.contains('theme-retro');
    
    log.forEach(e => {
        const div = document.createElement('div'); div.className = 'log-entry';
        const routeStr = e.poiName ? `<b>${e.start} ➔ ${e.poiName} ➔ ${e.dest}</b>` : `<b>${e.start} ➔ ${e.dest}</b>`;
        
        const hlColor = isRetro ? 'var(--piper-yellow)' : 'var(--blue)';
        const subColor = isRetro ? '#aaa' : '#888';
        
        div.innerHTML = `<span style="color:${subColor};">${e.date} • ${e.ac}</span><br>${routeStr}<br><span style="color:${hlColor}">${e.mission} (${e.dist} NM)</span>`;
        container.appendChild(div);
    });
}

function clearLog() { 
    if(confirm("Gesamtes Logbuch löschen?")) { 
        localStorage.removeItem('ga_logbook'); 
        localStorage.removeItem('last_icao_dest'); 
        renderLog(); 
    } 
}
