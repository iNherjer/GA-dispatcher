/* === MAP, ROUTING & LEAFLET ENGINE === */
if (!document.getElementById('route-anim-style')) {
    const style = document.createElement('style');
    style.id = 'route-anim-style';
    // -20 lässt die Striche der Linie vorwärts (Richtung Ziel) fließen
    style.innerHTML = `@keyframes routeDashAnim { to { stroke-dashoffset: -20; } } .animated-route-line { animation: routeDashAnim 1.5s linear infinite; }`;
    document.head.appendChild(style);
}
/* =========================================================
   7. KARTE (LEAFLET, KARTENTISCH & MESS-WERKZEUG)
   ========================================================= */
const hitBoxHtml = (color) => `<div class="pin-hitbox"><div class="pin-dot" style="background-color: ${color};"></div></div>`;
const hitBoxIcon = (color) => L.divIcon({ className: 'custom-pin', html: hitBoxHtml(color), iconSize: [34, 34], iconAnchor: [17, 17] });

const startIcon = hitBoxIcon('#44ff44'), destIcon = hitBoxIcon('#ff4444');
const wpIcon = L.divIcon({ className: 'custom-pin', html: `<div class="pin-hitbox" style="cursor: move;"><div class="pin-dot" style="background-color: #fdfd86;"></div></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
const poiIcon = L.divIcon({ className: 'custom-pin', html: `<div class="pin-hitbox" style="cursor: move;"><div class="pin-dot" style="background-color: #b266ff; border: 2px solid #fff;"></div></div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
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
    routeMarkers.forEach(m => map.removeLayer(m));
    routeMarkers = [];

    if (routeWaypoints.length === 0) {
        if (polyline) { map.removeLayer(polyline); polyline = null; }
        if (window.hitBoxPolyline) { map.removeLayer(window.hitBoxPolyline); window.hitBoxPolyline = null; }
        return;
    }

    if (!polyline) {
        polyline = L.polyline(routeWaypoints, { color: '#ff4444', weight: 8, dashArray: '10,10', className: 'animated-route-line', interactive: false }).addTo(map);
    } else {
        polyline.setLatLngs(routeWaypoints);
    }

    if (!window.hitBoxPolyline) {
        window.hitBoxPolyline = L.polyline(routeWaypoints, { color: 'transparent', weight: 45, opacity: 0, className: 'interactive-route' }).addTo(map);
        window.hitBoxPolyline.on('click', function (e) {
            let bestIndex = 1, minDiff = Infinity;
            for (let i = 0; i < routeWaypoints.length - 1; i++) {
                let p1 = L.latLng(routeWaypoints[i].lat, routeWaypoints[i].lng || routeWaypoints[i].lon);
                let p2 = L.latLng(routeWaypoints[i + 1].lat, routeWaypoints[i + 1].lng || routeWaypoints[i + 1].lon);
                let d1 = map.distance(p1, e.latlng), d2 = map.distance(e.latlng, p2), d = map.distance(p1, p2), diff = d1 + d2 - d;
                if (diff < minDiff) { minDiff = diff; bestIndex = i + 1; }
            }
            routeWaypoints.splice(bestIndex, 0, e.latlng); renderMainRoute();
        });
    } else {
        window.hitBoxPolyline.setLatLngs(routeWaypoints);
    }

    routeWaypoints.forEach((latlng, index) => {
        let isStart = (index === 0), isDest = (index === routeWaypoints.length - 1 && routeWaypoints.length > 1);
        let isPOI = routeWaypoints[index].isPOI === true;
        
        let icon = isStart ? startIcon : (isDest ? destIcon : (isPOI ? poiIcon : wpIcon));
        // Wir erlauben das Draggen von POIs und Wegpunkten. Start/Dest bleiben fix.
        let draggable = (!isStart && !isDest);
        // POI Marker immer nach vorne holen (Z-Index), damit er nicht hinter der Linie verschwindet
        let marker = L.marker(latlng, { icon: icon, draggable: draggable, zIndexOffset: isPOI ? 1000 : 0 }).addTo(map);

        if (isStart) {
            marker.bindPopup(`<b>DEP:</b> ${currentSName}`);
        } else if (isDest) {
            // Bei einem Rundflug heißt das Ziel wieder so wie der Startplatz
            marker.bindPopup(`<b>DEST:</b> ${currentMissionData?.poiName ? currentSName : currentDName}`);
        } else if (isPOI) {
            // POIs bekommen ein spezielles lila Popup ohne Löschen-Button (da es das Missionsziel ist)
            marker.bindPopup(`<div style="text-align:center; color:#b266ff;"><b>${routeWaypoints[index].name}</b></div>`);
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

        marker.on('drag', function (e) {
            if (polyline) {
                const latlngs = polyline.getLatLngs();
                latlngs[index] = marker.getLatLng();
                polyline.setLatLngs(latlngs);
                if (typeof window.hitBoxPolyline !== 'undefined' && window.hitBoxPolyline) {
                    window.hitBoxPolyline.setLatLngs(latlngs);
                }
                if (typeof updateWeatherMarkerDodging === 'function') updateWeatherMarkerDodging();
            }
        });

            marker.on('dragend', function (e) {
                let dropLatLng = marker.getLatLng();
                const origLatLng = { lat: routeWaypoints[index].lat, lng: routeWaypoints[index].lng || routeWaypoints[index].lon };

                // === NEU: SPEZIELLE POI LOGIK (Auto-Name & Fallback) ===
                if (isPOI) {
                    if (confirm("Möchtest du das Ziel für den Rundflug an diese Position verschieben?")) {
                        
                        const mDestName = document.getElementById("mDestName");
                        if (mDestName) mDestName.innerText = "Ermittle Ort...";
                        
                        setTimeout(async () => {
                            let newName = "Neuer Wendepunkt";
                            
                            // 1. Ort via Wikipedia (Geosearch) ermitteln
                            try {
                                const geoRes = await fetch(`https://de.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${dropLatLng.lat}|${dropLatLng.lng}&gsradius=10000&gslimit=1&format=json&origin=*`);
                                const geoData = await geoRes.json();
                                if (geoData?.query?.geosearch?.length > 0) {
                                    newName = geoData.query.geosearch[0].title;
                                } else {
                                    // Fallback auf Nominatim (OSM) wenn kein Wiki-Artikel in der Nähe ist
                                    const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${dropLatLng.lat}&lon=${dropLatLng.lng}&zoom=10`);
                                    const nomData = await nomRes.json();
                                    if (nomData && nomData.name) newName = nomData.name;
                                }
                            } catch(e) {}
                            
                            // 2. POI aktualisieren
                            routeWaypoints[index].lat = dropLatLng.lat;
                            routeWaypoints[index].lng = dropLatLng.lng;
                            routeWaypoints[index].name = "🎯 " + newName;
                            
                            if (typeof currentMissionData !== 'undefined' && currentMissionData) {
                                currentMissionData.poiName = newName;
                            }
                            
                            // 3. Das dynamische Dreieck anpassen
                            const returnNav = calcNav(dropLatLng.lat, dropLatLng.lng, routeWaypoints[0].lat, routeWaypoints[0].lng || routeWaypoints[0].lon);
                            const offsetBearing = (returnNav.brng + 20) % 360;
                            const returnWp = getDestinationPoint(dropLatLng.lat, dropLatLng.lng, returnNav.dist * 0.45, offsetBearing);
                            
                            if (routeWaypoints.length > 2) {
                                routeWaypoints[2].lat = returnWp.lat;
                                routeWaypoints[2].lng = returnWp.lon;
                            }

                            // 4. UI aktualisieren
                            if (mDestName) mDestName.innerText = newName;
                            const wikiDestNameEl = document.getElementById('wikiDestNameDisplay');
                            if (wikiDestNameEl) wikiDestNameEl.innerText = `POI – ${newName}`;
                            
                            // 5. Wiki-Daten live laden
                            if (typeof fetchAreaDescription === 'function') {
                                const descEl = document.getElementById("wikiDestDescText");
                                if (descEl) descEl.innerText = "Lade neue Ziel-Info...";
                                fetchAreaDescription(dropLatLng.lat, dropLatLng.lng, 'wikiDestDescText', newName, null, 'wikiDestImageContainer', 'wikiDestImage');
                            }

                            // 6. KI-Briefing Story umschreiben (Live Dispatch)
                            renderMainRoute(); // Aktualisiert die Distanzen im Hintergrund
                            
                            const paxText = document.getElementById("mPay") ? document.getElementById("mPay").innerText : "0 PAX";
                            const cargoText = document.getElementById("mWeight") ? document.getElementById("mWeight").innerText : "0 lbs";
                            const totalDist = currentMissionData.dist;
                            
                            const titleEl = document.getElementById("mTitle");
                            const storyEl = document.getElementById("mStory");
                            
                            if (titleEl) titleEl.innerHTML = "🔄 Auftrag wird umgeschrieben...";
                            if (storyEl) storyEl.innerText = "Dispatcher passt die Story an das neue Ziel an...";
                            
                            // Die Gemini-Funktion gibt intern sofort 'null' zurück, wenn API aus/offline ist
                            let m = await fetchGeminiMission(currentSName, newName, totalDist, true, paxText, cargoText);
                            
                            if (m) {
                                if (titleEl) titleEl.innerHTML = `${m.i ? m.i + ' ' : ''}${m.t}`;
                                if (storyEl) storyEl.innerText = m.s;
                                currentMissionData.mission = m.t;
                            } else {
                                // Offline / Fallback Modus aus der lokalen Datenbank
                                let fallbackM;
                                if (typeof generateDynamicPOIMission === 'function') {
                                    const maxSeats = parseInt(document.getElementById("maxSeats")?.value || 4);
                                    fallbackM = generateDynamicPOIMission(newName, maxSeats);
                                    
                                    // Aktualisiert auch die Passagiere und Fracht passend zur Offline-Story
                                    if (document.getElementById("mPay")) document.getElementById("mPay").innerText = fallbackM.payloadText || paxText;
                                    if (document.getElementById("mWeight")) document.getElementById("mWeight").innerText = fallbackM.cargoText || cargoText;
                                } else if (typeof missions !== 'undefined') {
                                    fallbackM = missions[Math.floor(Math.random() * missions.length)];
                                } else {
                                    fallbackM = { t: "Privater Rundflug", s: `Umgeleiteter Flugpunkt: ${newName}`, i: "📋" };
                                }
                                
                                if (titleEl) titleEl.innerHTML = `${fallbackM.i ? fallbackM.i + ' ' : '📋 '}${fallbackM.t}`;
                                if (storyEl) storyEl.innerText = fallbackM.s;
                                currentMissionData.mission = fallbackM.t;
                            }
                            
                            window.debouncedSaveMissionState();
                        }, 50);

                        return;
                    } else {
                        // Abbruch: Marker schnipst an Original-Position zurück
                        routeWaypoints[index].lat = origLatLng.lat;
                        routeWaypoints[index].lng = origLatLng.lng;
                    }
                    renderMainRoute();
                    return;
                }
                // === ENDE POI LOGIK ===

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
    if (typeof updateWeatherMarkerDodging === 'function') updateWeatherMarkerDodging();
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
        
        let name2;
        if (isEnd) {
            // Bei einem Rundflug (POI-Mission) ist das Endziel der Startplatz
            name2 = (currentMissionData && currentMissionData.poiName) ? currentStartICAO : currentDestICAO;
        } else {
            name2 = routeWaypoints[i + 1].name || `WP ${i + 1}`;
        }

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

    window.debouncedSaveMissionState();
    if (gpsState.visible && gpsState.mode === 'FPL') renderGPS();
}

function initMapBase() {
    if (map) return;
    const radarActive = localStorage.getItem('ga_radar_active') === 'true';
    
    // Base Maps
    const topoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'OpenTopoMap' });
    const topoLightMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' });
    const satMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' });
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: 'CartoDB' });
    const lightMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: 'CartoDB' });
    
    // Overlays
    const aeroOverlay = L.tileLayer('https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest', {
        attribution: 'AeroData / Navigraph', opacity: 0.65, maxNativeZoom: 12
    });
    
    // NEU: Die offizielle DFS ICAO 1:500.000 Karte vom Secais Server
    const dfsIcaoOverlay = L.tileLayer('https://secais.dfs.de/static-maps/icao500/tiles/{z}/{x}/{y}.png', {
        attribution: '© DFS Deutsche Flugsicherung', maxNativeZoom: 11, opacity: 1.0
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
    
    const radarOverlay = L.layerGroup();
    fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(res => res.json())
        .then(data => {
            if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
                const latestRadar = data.radar.past[data.radar.past.length - 1].path;
                L.tileLayer(`https://tilecache.rainviewer.com${latestRadar}/256/{z}/{x}/{y}/2/1_1.png`, {
                    opacity: 0.65, transparent: true, maxNativeZoom: 7, attribution: 'Radar © RainViewer'
                }).addTo(radarOverlay); if (radarActive) radarOverlay.addTo(map);
            }
        }).catch(e => console.warn('RainViewer Fetch Fehler:', e));
        
    const overlayMaps = {
        "🗺️ DFS ICAO Karte 1:500k": dfsIcaoOverlay,
        "🛩️ VFR Lufträume (Overlay)": aeroOverlay,
        "🌧️ Wetterradar (Niederschlag)": radarOverlay
    };
    
    L.control.layers(baseMaps, overlayMaps).addTo(map);
    
    map.on('overlayadd', function (e) {
        // Schaltet DFS ab, wenn VFR-Lufträume aktiviert werden
        if (e.name === "🛩️ VFR Lufträume (Overlay)") {
            if (typeof dfsIcaoOverlay !== 'undefined' && map.hasLayer(dfsIcaoOverlay)) map.removeLayer(dfsIcaoOverlay);
            topoMap.setOpacity(0.5);
        }
        // Schaltet VFR-Lufträume ab, wenn DFS aktiviert wird
        if (e.name === "🗺️ DFS ICAO Karte 1:500k") {
            if (typeof aeroOverlay !== 'undefined' && map.hasLayer(aeroOverlay)) map.removeLayer(aeroOverlay);
            topoMap.setOpacity(1.0);
        }
        if (e.name === "🌧️ Wetterradar (Niederschlag)") localStorage.setItem('ga_radar_active', 'true');
    });
    
    map.on('overlayremove', function (e) {
        if (e.name === "🛩️ VFR Lufträume (Overlay)") {
            topoMap.setOpacity(1.0);
        }
        if (e.name === "🌧️ Wetterradar (Niederschlag)") localStorage.setItem('ga_radar_active', 'false');
    });
    
    let fetchTimeout = null;
    map.on('moveend', function () {
        if (snapMode) {
            clearTimeout(fetchTimeout);
            fetchTimeout = setTimeout(fetchOpenAIPData, 600);
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
    map.on('click', function (e) {
        if (freeflightMode) { handleFreeflightMapClick(e); return; }
        if (!measureMode) return; addMeasurePoint(e.latlng);
    });
}

function updateMap(lat1, lon1, lat2, lon2, s, d) {
    if (!map) initMapBase();
    currentSName = s || "Start"; currentDName = d || "Ziel";
    
    // POI-Check: Wenn poiName gesetzt ist, bauen wir ein Rundflug-Dreieck
    if (typeof currentMissionData !== 'undefined' && currentMissionData && currentMissionData.poiName) {
        // Berechnung des direkten Rückwegs (vom POI zurück zum Start)
        const returnNav = calcNav(lat2, lon2, lat1, lon1);
        // Wir biegen den Rückflug um 20 Grad ab und legen den Wegpunkt auf ~45% der Strecke
        const offsetBearing = (returnNav.brng + 20) % 360;
        const returnWp = getDestinationPoint(lat2, lon2, returnNav.dist * 0.45, offsetBearing);
        
        routeWaypoints = [
            { lat: lat1, lng: lon1 }, 
            { lat: lat2, lng: lon2, name: "🎯 " + currentMissionData.poiName, isPOI: true }, 
            { lat: returnWp.lat, lng: returnWp.lon, name: "Return Leg" }, 
            { lat: lat1, lng: lon1, name: currentSName } // HIER: Name explizit auf den Startplatz setzen
        ];
    } else {
        routeWaypoints = [{ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }];
    }
    
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
            if (typeof initProfileResize === 'function') initProfileResize();
            if (typeof vpMapProfileVisible !== 'undefined' && vpMapProfileVisible && typeof renderMapProfile === 'function') renderMapProfile();
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
            if (!miniRoutePolyline) {
                miniRoutePolyline = L.polyline(routeWaypoints, { color: '#d93829', weight: 4 }).addTo(miniMap);
            } else {
                miniRoutePolyline.setLatLngs(routeWaypoints);
            }
            miniMapMarkers.forEach(m => miniMap.removeLayer(m)); miniMapMarkers = [];

            const startMarker = L.circleMarker(routeWaypoints[0], { radius: 5, color: '#111', weight: 2, fillColor: '#44ff44', fillOpacity: 1 }).addTo(miniMap);
            const destMarker = L.circleMarker(routeWaypoints[routeWaypoints.length - 1], { radius: 5, color: '#111', weight: 2, fillColor: '#ff4444', fillOpacity: 1 }).addTo(miniMap);

            miniMapMarkers.push(startMarker, destMarker);
            setTimeout(() => { miniMap.invalidateSize(); miniMap.fitBounds(L.latLngBounds(routeWaypoints), { padding: [15, 15] }); }, 50);
        }
    }, 100); // Kurze Verzögerung vor dem Start
}

/* =========================================================
   19. OPENAIP SNAPPING (NAVAIDS & REP-POINTS)
   ========================================================= */
let snapMode = true;
let cachedNavData = [];

/* --- DIRECT TO STATE --- */
let freeflightMode = false;
let ffWaypoints = [];
let ffPolyline = null;
let ffMarkers = [];
let ffContextPopup = null;
let ffNeedsStart = false;

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
   WETTER MARKER AUF DER KARTE (VFR / IFR)
   ========================================================= */
window.vpShowMapMetar = localStorage.getItem('ga_show_map_metar') !== 'false';

window.toggleMapMetars = function() {
    window.vpShowMapMetar = !window.vpShowMapMetar;
    localStorage.setItem('ga_show_map_metar', window.vpShowMapMetar);
    const btn = document.getElementById('mapMetarBtn');
    if (btn) {
        btn.innerText = window.vpShowMapMetar ? '🌤️ METARs (An)' : '🌤️ METARs (Aus)';
        btn.style.background = window.vpShowMapMetar ? '#4da6ff' : '#444';
        btn.style.color = window.vpShowMapMetar ? '#111' : '#fff';
    }
    // API triggern falls Wetter gebraucht wird, ansonsten nur Marker neu rendern
    if (window.vpShowMapMetar && typeof window._lastVpRouteKey !== 'undefined') {
        if (typeof triggerVerticalProfileUpdate === 'function') triggerVerticalProfileUpdate();
    } else {
        if (typeof renderWeatherMarkers === 'function') renderWeatherMarkers();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('mapMetarBtn');
    if (btn) {
        btn.innerText = window.vpShowMapMetar ? '🌤️ METARs (An)' : '🌤️ METARs (Aus)';
        btn.style.background = window.vpShowMapMetar ? '#4da6ff' : '#444';
        btn.style.color = window.vpShowMapMetar ? '#111' : '#fff';
    }
});

let wxMapMarkers = [];

    window.updateWeatherMarkerDodging = function() {
        if (!map || typeof wxMapMarkers === 'undefined' || wxMapMarkers.length === 0) return;
        
        // FIX: Verhindere NaN, wenn die Karte versteckt ist (Leaflet liefert dann 0,0 für alles)
        const mapTable = document.getElementById('mapTableOverlay');
        if (!mapTable || !mapTable.classList.contains('active')) {
            wxMapMarkers.forEach(marker => {
                const wrap = marker._icon ? marker._icon.querySelector('.wx-marker-wrap') : null;
                if (wrap) wrap.style.transform = `translate(0px, 0px)`;
            });
            return;
        }

        // Echtzeit-Koordinaten direkt aus der sichtbaren roten Linie holen
        let pts = [];
    if (typeof polyline !== 'undefined' && polyline) {
        pts = polyline.getLatLngs().map(ll => map.latLngToLayerPoint(ll));
    } else if (typeof routeWaypoints !== 'undefined' && routeWaypoints && routeWaypoints.length >= 2) {
        pts = routeWaypoints.map(wp => map.latLngToLayerPoint([wp.lat, wp.lng || wp.lon]));
    } else return;
    
    wxMapMarkers.forEach(marker => {
        const wrap = marker._icon ? marker._icon.querySelector('.wx-marker-wrap') : null;
        if (!wrap) return;
        
        const mPx = map.latLngToLayerPoint(marker.getLatLng());
        let minDist = Infinity;
        let pushVec = { x: 0, y: 0 };
        
        // Abstand zu den Liniensegmenten
        for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i], p2 = pts[i+1];
            const l2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
            let t = 0;
            if (l2 > 0) t = Math.max(0, Math.min(1, ((mPx.x - p1.x) * (p2.x - p1.x) + (mPx.y - p1.y) * (p2.y - p1.y)) / l2));
            const projX = p1.x + t * (p2.x - p1.x);
            const projY = p1.y + t * (p2.y - p1.y);
            
            const dist = Math.sqrt(Math.pow(mPx.x - projX, 2) + Math.pow(mPx.y - projY, 2));
            if (dist < minDist) {
                minDist = dist;
                if (dist > 0) pushVec = { x: (mPx.x - projX) / dist, y: (mPx.y - projY) / dist };
                else pushVec = { x: 1, y: 1 };
            }
        }
        
        // Abstand zu den Wegpunkten selbst prüfen
        pts.forEach(p => {
            const dist = Math.sqrt(Math.pow(mPx.x - p.x, 2) + Math.pow(mPx.y - p.y, 2));
            if (dist < minDist) {
                minDist = dist;
                if (dist > 0) pushVec = { x: (mPx.x - p.x) / dist, y: (mPx.y - p.y) / dist };
                else pushVec = { x: 1, y: 1 };
            }
        });
        
        const THRESHOLD = 45; 
        if (minDist < THRESHOLD) {
            const force = THRESHOLD - minDist + 15; 
            wrap.style.transition = 'transform 0.1s linear';
            wrap.style.transform = `translate(${pushVec.x * force}px, ${pushVec.y * force}px)`;
        } else {
            wrap.style.transition = 'transform 0.2s ease-out';
            wrap.style.transform = `translate(0px, 0px)`;
        }
    });
};

window.renderWeatherMarkers = function() {
    if (!map) return;
    wxMapMarkers.forEach(m => map.removeLayer(m));
    wxMapMarkers = [];

    if (!window.vpShowMapMetar) return;
    if (typeof vpWeatherData === 'undefined' || !vpWeatherData || vpWeatherData.length === 0) return;

    let seenIcao = new Set();

    vpWeatherData.forEach(zone => {
        if (!zone.icao || !zone.stnLat || !zone.stnLon || seenIcao.has(zone.icao)) return;
        seenIcao.add(zone.icao);

        let catColor = "#fff";
        let catText = zone.fltCat || "VFR";
        if (catText === "VFR") catColor = "#33ff33";
        else if (catText === "MVFR") catColor = "#4da6ff";
        else if (catText === "IFR") catColor = "#ff4444";
        else if (catText === "LIFR") catColor = "#ff33ff";

        let windHtml = '';
        let wdir = zone.wdir;
        let wspd = zone.wspd || 0;
        
        if (wdir && wdir !== 'VRB' && wspd > 0) {
            let rotDir = (parseInt(wdir) + 180) % 360;
            windHtml = `
            <div style="margin-top: 4px; background: rgba(10,10,10,0.85); border: 1px solid #4da6ff; border-radius: 4px; padding: 2px 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                <svg width="12" height="12" viewBox="0 0 24 24" style="transform: rotate(${rotDir}deg); margin-right: 4px; overflow: visible;">
                    <path d="M12 2L12 22M12 2L5 9M12 2L19 9" stroke="#4da6ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span style="color:#4da6ff; font-family:monospace; font-size:11px; font-weight:bold;">${wspd}kt</span>
            </div>`;
        }

        const html = `
            <div class="wx-marker-wrap" style="position:relative; transition: transform 0.2s ease-out; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="background: rgba(10,10,10,0.85); border: 2px solid ${catColor}; border-radius: 4px; padding: 2px 5px; color: ${catColor}; font-family: monospace; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.6); position:relative; z-index:2;">
                    <span style="color:#fff; margin-right:4px;">${zone.icao}</span> ${catText}
                </div>
                ${windHtml}
            </div>
        `;

        const icon = L.divIcon({ className: 'custom-pin', html: html, iconSize: [80, 45], iconAnchor: [40, 15] });
        const marker = L.marker([zone.stnLat, zone.stnLon], { icon: icon, interactive: true }).addTo(map);
        
        // Kompaktes Popup-Container
        const popupId = `wxPopup_${zone.icao}`;
        marker.bindPopup(`<div id="${popupId}" style="width: 250px; min-height: 120px; display: flex; align-items: center; justify-content: center; color: #888; font-family: Arial, sans-serif; margin: -5px;">Lade METAR...</div>`, { maxWidth: 300 });
        
        // Rendert das moderne, kompakte Widget (forceModern=true) beim Klick
        marker.on('popupopen', () => {
            if (typeof loadMetarWidget === 'function') {
                loadMetarWidget(zone.icao, popupId, zone.stnLat, zone.stnLon, true);
            }
        });
        
        wxMapMarkers.push(marker);
    });

    if (!map._wxDodgingBound) {
        map.on('move zoom moveend zoomend mousemove', () => { if (typeof updateWeatherMarkerDodging === 'function') updateWeatherMarkerDodging(); });
        map._wxDodgingBound = true;
    }
    setTimeout(updateWeatherMarkerDodging, 50);
};

/* =========================================================
   DIRECT TO MODUS
   ========================================================= */

const ffStartIcon = hitBoxIcon('#00e5ff');
const ffDestIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-hitbox"><div class="pin-dot" style="background-color: #00e5ff; border: 2px solid #fff;"></div></div>`,
    iconSize: [34, 34], iconAnchor: [17, 17]
});

function isGpsLive() {
    if (!window.lastLiveGpsPos || (Date.now() - window.lastLiveGpsPos.t) > 4000) return false;
    const ind = document.getElementById('liveGpsIndicator');
    return ind && ind.innerHTML.includes('LIVE');
}

function toggleFreeflightMode() {
    freeflightMode = !freeflightMode;
    const btn = document.getElementById('freeflightBtn');
    if (freeflightMode) {
        btn.innerText = '✈️ Direct To (An)';
        btn.classList.add('active');
        if (measureMode) toggleMeasureMode();
        document.getElementById('map').style.cursor = 'crosshair';
        // GPS als Start?
        if (isGpsLive()) {
            const gps = window.lastLiveGpsPos;
            ffWaypoints = [{ lat: gps.lat, lng: gps.lon, name: 'GPS' }];
            showMapToast('GPS-Position als Start gesetzt');
        } else {
            ffNeedsStart = true;
            showMapToast('Tippe auf einen Flugplatz oder die Karte um den Startpunkt zu setzen');
        }
        // Missions-Route abdimmen
        if (polyline) polyline.setStyle({ opacity: 0.15 });
        routeMarkers.forEach(m => { if (m.getElement) { const el = m.getElement(); if (el) el.style.opacity = '0.15'; } });
    } else {
        btn.innerText = '✈️ Direct To (Aus)';
        btn.classList.remove('active');
        btn.style.background = '#444';
        btn.style.color = '#fff';
        document.getElementById('map').style.cursor = '';
        clearFreeflightRoute();
        ffWaypoints = [];
        ffNeedsStart = false;
        // Missions-Route wiederherstellen
        if (polyline) polyline.setStyle({ opacity: 1 });
        routeMarkers.forEach(m => { if (m.getElement) { const el = m.getElement(); if (el) el.style.opacity = '1'; } });
    }
}

function clearFreeflightRoute() {
    if (ffPolyline) { map.removeLayer(ffPolyline); ffPolyline = null; }
    ffMarkers.forEach(m => map.removeLayer(m));
    ffMarkers = [];
    if (ffContextPopup) { map.closePopup(ffContextPopup); ffContextPopup = null; }
}

function findNearestAirport(latlng, maxPixels) {
    if (typeof maxPixels === 'undefined') maxPixels = 60;
    if (!map) return null;
    const tapPx = map.latLngToLayerPoint(latlng);
    let best = null, bestDist = maxPixels + 1;

    // 1. cachedNavData (OpenAIP airports)
    cachedNavData.forEach(nav => {
        if (!nav.name.startsWith('APT ')) return;
        const navPx = map.latLngToLayerPoint([nav.lat, nav.lng]);
        const d = tapPx.distanceTo(navPx);
        if (d < bestDist) {
            bestDist = d;
            const parts = nav.name.replace('APT ', '').split(' (');
            best = { icao: parts[0].trim(), name: parts[0].trim(), lat: nav.lat, lon: nav.lng };
        }
    });
    if (best) return best;

    // 2. globalAirports Fallback
    if (typeof globalAirports === 'object' && globalAirports) {
        const latF = latlng.lat, lngF = latlng.lng;
        for (const icao in globalAirports) {
            const apt = globalAirports[icao];
            if (Math.abs(apt.lat - latF) > 0.5 || Math.abs(apt.lon - lngF) > 0.5) continue;
            const aptPx = map.latLngToLayerPoint([apt.lat, apt.lon]);
            const d = tapPx.distanceTo(aptPx);
            if (d < bestDist) {
                bestDist = d;
                best = { icao: apt.icao, name: apt.name, lat: apt.lat, lon: apt.lon };
            }
        }
    }
    return best;
}

function handleFreeflightMapClick(e) {
    if (ffContextPopup) { map.closePopup(ffContextPopup); ffContextPopup = null; }

    if (ffNeedsStart) {
        const apt = findNearestAirport(e.latlng);
        if (apt) {
            ffWaypoints = [{ lat: apt.lat, lng: apt.lon, name: apt.icao, icao: apt.icao }];
            showMapToast('Start: ' + apt.icao + (apt.name && apt.name !== apt.icao ? ' — ' + apt.name : ''));
        } else {
            ffWaypoints = [{ lat: e.latlng.lat, lng: e.latlng.lng, name: 'Start' }];
            showMapToast('Startpunkt gesetzt');
        }
        ffNeedsStart = false;
        renderFreeflightRoute();
        return;
    }

    if (ffWaypoints.length === 0) return;

    const apt = findNearestAirport(e.latlng);
    if (apt) {
        freeflightDirectTo(apt.icao, apt.lat, apt.lon);
    }
}

window.freeflightDirectTo = function(icao, lat, lon) {
    if (ffContextPopup) { map.closePopup(ffContextPopup); ffContextPopup = null; }
    // GPS-Start aktualisieren falls verfuegbar
    if (isGpsLive()) {
        const gps = window.lastLiveGpsPos;
        ffWaypoints[0] = { lat: gps.lat, lng: gps.lon, name: 'GPS' };
    }
    const startWp = ffWaypoints[0];
    const startName = startWp.icao || startWp.name || 'Start';

    // FF-Route in die Hauptroute uebertragen
    routeWaypoints = [
        { lat: startWp.lat, lng: startWp.lng },
        { lat: lat, lng: lon }
    ];
    currentSName = startName;
    currentDName = icao;
    if (typeof currentStartICAO !== 'undefined') currentStartICAO = startName;
    if (typeof currentDestICAO !== 'undefined') currentDestICAO = icao;

    // Freeflight-Modus sauber beenden (ohne Route wiederherzustellen)
    clearFreeflightRoute();
    ffWaypoints = [];
    ffNeedsStart = false;
    freeflightMode = false;
    const btn = document.getElementById('freeflightBtn');
    if (btn) { btn.innerText = '✈️ Direct To (Aus)'; btn.classList.remove('active'); btn.style.background = '#444'; btn.style.color = '#fff'; }
    document.getElementById('map').style.cursor = '';

    // Hauptroute rendern (regulaerer Bearbeitungsmodus)
    if (polyline) polyline.setStyle({ opacity: 1 });
    renderMainRoute();
    updateRoutePerformance();

    // Karte auf Route einpassen
    const bounds = L.latLngBounds(routeWaypoints.map(w => [w.lat, w.lng || w.lon]));
    map.fitBounds(bounds, { padding: [60, 60] });

    showMapToast('Direct to ' + icao);
};

function renderFreeflightRoute() {
    clearFreeflightRoute();
    if (ffWaypoints.length === 0) return;

    // Marker zeichnen
    ffWaypoints.forEach((wp, i) => {
        const icon = i === 0 ? ffStartIcon : ffDestIcon;
        const marker = L.marker([wp.lat, wp.lng], { icon: icon, interactive: false, zIndexOffset: 900 }).addTo(map);
        if (wp.name) marker.bindTooltip(wp.name, { permanent: true, direction: 'top', offset: [0, -12],
            className: 'ff-tooltip' });
        ffMarkers.push(marker);
    });

    // Polyline zeichnen
    if (ffWaypoints.length >= 2) {
        const coords = ffWaypoints.map(w => [w.lat, w.lng]);
        ffPolyline = L.polyline(coords, {
            color: '#00e5ff', weight: 6, dashArray: '12,8', opacity: 0.9, interactive: false
        }).addTo(map);

        // Nav-Info Tooltip am Mittelpunkt
        const p1 = ffWaypoints[0], p2 = ffWaypoints[1];
        const nav = calcNav(p1.lat, p1.lng, p2.lat, p2.lng);
        const midLat = (p1.lat + p2.lat) / 2, midLng = (p1.lng + p2.lng) / 2;
        const infoTooltip = L.tooltip({ permanent: true, direction: 'center', className: 'ff-nav-tooltip',
            offset: [0, -15] })
            .setLatLng([midLat, midLng])
            .setContent(`<b>${Math.round(nav.brng)}° / ${nav.dist.toFixed(1)} NM</b>`)
            .addTo(map);
        ffMarkers.push(infoTooltip);
    }
}

function showMapToast(message, durationMs) {
    if (!durationMs) durationMs = 3000;
    const container = document.getElementById('mapArea') || document.body;
    const toast = document.createElement('div');
    toast.className = 'ff-toast';
    toast.textContent = message;
    toast.style.animationDuration = durationMs + 'ms';
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, durationMs + 100);
}
