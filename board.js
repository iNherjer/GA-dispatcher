/* === PINNBOARD & PDF EXPORT LOGIC (v220) === */
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
function getGroupNick() { return localStorage.getItem('ga_group_nick') || getSyncId() || "Pilot"; }

async function joinGroup() {
    const gName = document.getElementById('groupNameInput').value.trim().toUpperCase();
    let gNick = document.getElementById('groupNickInput').value.trim();
    
    // Authentifizierung via Pilot-ID
    const syncId = getSyncId();
    const syncPin = getSyncPin();

    if(!gName) { alert("Bitte einen Gruppen-Code (z.B. EDTK) eingeben!"); return; }
    if(!syncId || !syncPin) { 
        alert("🔒 Zugriff verweigert: Bitte lege zuerst oben im Sync-Bereich eine Pilot-ID und einen PIN fest!"); 
        return; 
    }
    
    // Fallback: Falls kein Nickname eingegeben wurde, nutze die Pilot-ID (oder einen Teil davon)
    if (!gNick) gNick = syncId;

    document.getElementById('groupStatus').innerText = "Verbinde...";

    try {
        // Wir fragen die Gruppe ab. Die Berechtigung wird über die Pilot-ID + PIN geprüft.
        // Der Server muss prüfen: Ist diese SyncId+Pin Kombination valide?
        const res = await fetch(SYNC_URL + "GROUP_" + gName + "?pin=" + syncPin + "&syncId=" + syncId, {
            headers: { 'X-Pilot-PIN': syncPin, 'X-Pilot-ID': syncId }
        });

        if (res.status === 401) {
            alert("❌ Authentifizierungs-Fehler!\n\nDeine Pilot-ID oder dein PIN ist falsch. Bitte prüfe die Eingaben oben im Sync-Bereich.");
            document.getElementById('groupStatus').innerText = "Auth-Fehler";
            return;
        }

        let data = { members: [], kicked: [] };
        if (res.ok) data = await res.json();
        
        // Kick-Prüfung (jetzt über die Pilot-ID, nicht nur über den Nick!)
        if (data.kicked && data.kicked.includes(syncId)) {
            alert("Diese Pilot-ID wurde aus der Crew gebannt!");
            document.getElementById('groupStatus').innerText = "Gebannt";
            return;
        }

        // Zugang gewährt: Wir speichern den Gruppen-Namen und den Anzeigenamen
        localStorage.setItem('ga_group_name', gName);
        localStorage.setItem('ga_group_nick', gNick);
        
        document.getElementById('groupStatus').innerText = "Verbunden als " + gNick;
        document.getElementById('groupStatus').style.color = "var(--green)";

        forceGroupSync();
        triggerCloudSave(true);
        alert("🤝 Du bist der Crew '" + gName + "' beigetreten!");
    } catch(e) {
        alert("Verbindungsfehler zum Crew-Server.");
        document.getElementById('groupStatus').innerText = "Offline";
    }
}
async function removeSelfFromGroup(gName, gNick) {
    const syncId = getSyncId();
    try {
        const res = await fetch(SYNC_URL + "GROUP_" + gName, {
            headers: { 'X-Pilot-PIN': getSyncPin(), 'X-Pilot-ID': syncId }
        });
        if (!res.ok) return;
        let data = await res.json();
        if (data.members) {
            const me = data.members.find(m => m.syncId === syncId);
            data.members = data.members.filter(m => m.syncId !== syncId);

            // Admin-Rechte weitergeben, falls Admin geht
            if (me && me.isAdmin && data.members.length > 0) {
                data.members.sort((a,b) => a.lastSeen - b.lastSeen);
                data.members[0].isAdmin = true;
            }

            data.lastModified = Date.now();
            await fetch(SYNC_URL + "GROUP_" + gName, { 
                method: 'POST', 
                headers: { 'X-Pilot-PIN': getSyncPin(), 'X-Pilot-ID': syncId },
                body: JSON.stringify(data), 
                keepalive: true 
            });
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
async function kickGroupUser(targetSyncId) {
    if(!confirm(`Möchtest du dieses Mitglied wirklich aus der Crew kicken?`)) return;
    const gName = getGroupName();
    try {
        const res = await fetch(SYNC_URL + "GROUP_" + gName, {
            headers: { 'X-Pilot-PIN': getSyncPin(), 'X-Pilot-ID': getSyncId() }
        });
        if (!res.ok) return;
        let data = await res.json();
        data.members = (data.members || []).filter(m => m.syncId !== targetSyncId);
        data.kicked = data.kicked || [];
        data.kicked.push(targetSyncId);
        data.lastModified = Date.now();
        await fetch(SYNC_URL + "GROUP_" + gName, { 
            method: 'POST', 
            headers: { 'X-Pilot-PIN': getSyncPin(), 'X-Pilot-ID': getSyncId() },
            body: JSON.stringify(data) 
        });
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
        
        const amIAdmin = (groupDataCache.members || []).find(m => m.syncId === getSyncId())?.isAdmin;
        let membersHtml = (groupDataCache.members || []).map(m => {
            const isMe = m.syncId === getSyncId();
            const timeoutMs = m.isAdmin ? (365 * 24 * 60 * 60 * 1000) : (28 * 24 * 60 * 60 * 1000); // Admin=12Mon, Normal=28Tage
            const isStale = (Date.now() - m.lastSeen) > timeoutMs;
            if(isStale) return '';

            const displayName = m.nick || m.syncId;
            const adminIcon = m.isAdmin ? '<span title="Admin">👑 </span>' : '';
            const kickBtn = (amIAdmin && !isMe) ? `<span onclick="kickGroupUser('${m.syncId}')" style="cursor:pointer; font-size:1cqw; margin-left:6px; transition:transform 0.2s;" title="Mitglied kicken">👢</span>` : '';

            return `<div class="roster-item"><span style="font-weight:${isMe?'bold':'normal'}">${adminIcon}${displayName}</span><span class="roster-status" style="display:flex; align-items:center;">${isMe?'Online':'Aktiv'}${kickBtn}</span></div>`;
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


// =========================================================
// V80: MISSION EXPORT / IMPORT / PDF-BRIEFING
// =========================================================
window.exportMission = function() {
    const data = localStorage.getItem('ga_active_mission');
    if (!data) { alert("Kein aktiver Flug zum Exportieren."); return; }
    const code = btoa(encodeURIComponent(data));
    navigator.clipboard.writeText(code).then(() => {
        alert("🔗 Flug-Code kopiert!\n\nDu kannst ihn nun im Chat teilen oder über 'Code laden' (Pinnwand) auf einem anderen Gerät importieren.");
    }).catch(() => alert("Fehler beim Kopieren."));
};

window.importMission = function() {
    const code = prompt("Füge hier den kopierten Flug-Code ein:");
    if (!code) return;
    try {
        const decoded = decodeURIComponent(atob(code));
        const state = JSON.parse(decoded);
        localStorage.setItem('ga_active_mission', JSON.stringify(state));
        restoreMissionState(state);
        alert("✅ Flug erfolgreich geladen!");
    } catch(e) {
        alert("❌ Ungültiger oder beschädigter Code.");
    }
};

// ==========================================
// V86: PDF BRIEFING PACK EXPORT (VECTOR)
// ==========================================
function loadTileImage(url) {
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        // Cache-Buster erzwingt frische CORS-Header für Safari
        img.src = url + (url.includes('?') ? '&' : '?') + 'safari_cb=' + Date.now();
    });
}

function gatherBriefingData() {
    const tas = parseInt(document.getElementById('tasSlider').value) || 115;
    const gph = parseInt(document.getElementById('gphSlider').value) || 9;
    const dist = currentMissionData.dist;
    const totalMinutes = Math.round((dist / tas) * 60);
    const hrs = Math.floor(totalMinutes / 60), mins = totalMinutes % 60;
    return {
        title: document.getElementById('mTitle').innerText,
        story: document.getElementById('mStory').innerText,
        payload: document.getElementById('mPay').innerText,
        cargo: document.getElementById('mWeight').innerText,
        distance: document.getElementById('mDistNote').innerText,
        heading: document.getElementById('mHeadingNote').innerText,
        ete: document.getElementById('mETENote').innerText,
        aircraft: selectedAC,
        tas: tas,
        gph: gph,
        depICAO: document.getElementById('mDepICAO').innerText,
        depName: document.getElementById('mDepName').innerText,
        depCoords: document.getElementById('mDepCoords').innerText,
        depRwy: document.getElementById('mDepRwy').innerText,
        destICAO: currentMissionData?.poiName ? 'POI' : document.getElementById('mDestICAO').innerText,
        destName: document.getElementById('mDestName').innerText,
        destCoords: document.getElementById('mDestCoords').innerText,
        destRwy: document.getElementById('mDestRwy').innerText,
        depDesc: document.getElementById('wikiDepDescText')?.innerText || '',
        destDesc: document.getElementById('wikiDestDescText')?.innerText || '',
        depRwyText: document.getElementById('wikiDepRwyText')?.innerText || '',
        destRwyText: document.getElementById('wikiDestRwyText')?.innerText || '',
        depFreq: document.getElementById('wikiDepFreqText')?.innerText || '',
        destFreq: document.getElementById('wikiDestFreqText')?.innerText || '',
        isPOI: document.getElementById('destRwyContainer')?.style.display === 'none',
        date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        totalDist: Math.round(dist),
        totalTime: totalMinutes,
        totalTimeStr: hrs > 0 ? `${hrs}h ${mins}m` : `${mins} Min`,
        totalFuel: Math.ceil((dist / tas * gph) + (0.75 * gph)),
        reserveFuel: Math.ceil(0.75 * gph)
    };
}

function computeLegs() {
    const legs = [];
    const tas = parseInt(document.getElementById('tasSlider').value) || 115;
    const gph = parseInt(document.getElementById('gphSlider').value) || 9;

    for (let i = 0; i < routeWaypoints.length - 1; i++) {
        const p1 = routeWaypoints[i], p2 = routeWaypoints[i + 1];
        const nav = calcNav(p1.lat, p1.lng || p1.lon, p2.lat, p2.lng || p2.lon);

        let n1 = (i === 0) ? currentSName : (routeWaypoints[i].name || `WP ${i}`);
        let n2 = (i === routeWaypoints.length - 2) ? currentDName : (routeWaypoints[i + 1].name || `WP ${i + 1}`);

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
    } catch (e) { return null; }
}

function stripEmojis(text) {
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
}

async function captureMapForPDF() {
    if (routeWaypoints.length < 2) return null;

    const W = 900, H = 600;
    const bounds = L.latLngBounds(routeWaypoints);

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

    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 5; ctx.setLineDash([10, 8]);
    ctx.beginPath();
    routeWaypoints.forEach((wp, i) => {
        const px = latLngToPixel(wp.lat, wp.lng || wp.lon, zoom);
        const x = px.x - (centerPx.x - W / 2), y = px.y - (centerPx.y - H / 2);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke(); ctx.setLineDash([]);

    routeWaypoints.forEach((wp, i) => {
        const px = latLngToPixel(wp.lat, wp.lng || wp.lon, zoom);
        const x = px.x - (centerPx.x - W / 2), y = px.y - (centerPx.y - H / 2);
        const isStart = (i === 0), isDest = (i === routeWaypoints.length - 1);
        const r = (isStart || isDest) ? 9 : 7;
        const fill = isStart ? '#44ff44' : isDest ? '#ff4444' : '#fdfd86';

        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();

        let label = isStart ? currentSName : isDest ? currentDName : (wp.name || `WP${i}`);
        if (isStart && currentDepFreq) { label += ` (${currentDepFreq.split(',')[0].trim()})`; }
        else if (isDest && currentDestFreq) { label += ` (${currentDestFreq.split(',')[0].trim()})`; }
        if (!isStart && !isDest) {
            label = label.replace(/^RPP\s+/i, '').replace(/^APT\s+/i, '');
            const idM = label.match(/\[([^\]]+)\]/);
            if (idM) { const frM = label.match(/\(([^)]+)\)/); label = frM ? `${idM[1]} (${frM[1]})` : idM[1]; }
        }
        ctx.font = 'bold 11px Helvetica, Arial, sans-serif'; ctx.fillStyle = '#111';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeText(label, x + 12, y + 4); ctx.fillText(label, x + 12, y + 4);
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
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(0, 0, W, H);

    const tileSize = 256; const subdomains = ['a', 'b', 'c']; const tilePromises = [];
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
    ctx.fillStyle = '#ff4444'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

    return canvas.toDataURL('image/jpeg', 0.92);
}

function latLngToPixel(lat, lng, zoom) {
    const x = ((lng + 180) / 360) * Math.pow(2, zoom) * 256;
    const latRad = lat * Math.PI / 180;
    const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom) * 256;
    return { x, y };
}

function drawNotebookBackground(doc, pageNum, totalPages) {
    const W = 210, H = 297;
    doc.setFillColor(253, 245, 230); doc.rect(0, 0, W, H, 'F');
    doc.setDrawColor(180, 200, 215); doc.setLineWidth(0.15);
    for (let y = 21; y < H - 10; y += 7) doc.line(12, y, W - 12, y);
    doc.setDrawColor(210, 70, 70); doc.setLineWidth(0.35); doc.line(28, 0, 28, H);
    doc.setDrawColor(180, 175, 160); doc.setLineWidth(0.3);
    [55, H / 2, H - 55].forEach(y => doc.circle(9, y, 3.5));
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 115, 100);
    doc.text(`Seite ${pageNum} / ${totalPages}`, W - 15, H - 12, { align: 'right' });
    doc.setFontSize(7); doc.setTextColor(170, 165, 150);
    doc.text('VFR Multitool \u2013 Briefing Pack', W / 2, H - 6, { align: 'center' });
}

function pdfWrappedText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line, i) => doc.text(line, x, y + (i * lineHeight)));
    return y + (lines.length * lineHeight);
}

function drawMissionBriefingPage(doc, data, mapImage) {
    let y = 30;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(11, 31, 101);
    const cleanTitle = stripEmojis(data.title);
    const titleLines = doc.splitTextToSize(cleanTitle, 155);
    titleLines.forEach((line, i) => doc.text(line, 32, y + (i * 8)));
    y += titleLines.length * 8 + 3;

    doc.setDrawColor(11, 31, 101); doc.setLineWidth(0.5); doc.line(32, y, 190, y); y += 10;

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(80, 80, 80);
    const routeStr = data.isPOI ? `${data.depICAO} > ${data.destName} (Rundflug)` : `${data.depICAO} (${data.depName}) > ${data.destICAO} (${data.destName})`;
    const routeLines = doc.splitTextToSize(routeStr, 155);
    routeLines.forEach((line, i) => doc.text(line, 32, y + (i * 6)));
    y += routeLines.length * 6 + 6;

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    y = pdfWrappedText(doc, stripEmojis(data.story), 32, y, 155, 5.5); y += 8;

    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0); y += 10;

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(217, 56, 41); doc.text('PAYLOAD:', 32, y);
    doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(data.payload, 62, y); y += 7;

    doc.setFont('Helvetica', 'bold'); doc.setTextColor(217, 56, 41); doc.text('FRACHT:', 32, y);
    doc.setTextColor(40, 40, 40); doc.setFont('Helvetica', 'normal'); doc.text(data.cargo, 62, y); y += 14;

    doc.setDrawColor(180, 175, 160); doc.setFillColor(248, 243, 228); doc.setLineWidth(0.3);
    doc.roundedRect(32, y - 4, 158, 50, 2, 2, 'FD'); y += 4;
    
    const col1 = 38, col2 = 110;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(217, 56, 41); doc.text('STRECKE:', col1, y);
    doc.setTextColor(40, 40, 40); doc.text(data.distance, col1 + 35, y);
    doc.setTextColor(217, 56, 41); doc.text('KURS:', col2, y);
    doc.setTextColor(40, 40, 40); doc.text(data.heading, col2 + 25, y); y += 8;
    doc.setTextColor(217, 56, 41); doc.text('ETE CA:', col1, y);
    doc.setTextColor(40, 40, 40); doc.text(data.totalTimeStr, col1 + 35, y);
    doc.setTextColor(217, 56, 41); doc.text('FUEL:', col2, y);
    doc.setTextColor(40, 40, 40); doc.text(`${data.totalFuel} Gal`, col2 + 25, y); y += 8;
    doc.setTextColor(217, 56, 41); doc.text('AIRCRAFT:', col1, y);
    doc.setTextColor(40, 40, 40); doc.text(data.aircraft, col1 + 35, y);
    doc.setTextColor(217, 56, 41); doc.text('TAS:', col2, y);
    doc.setTextColor(40, 40, 40); doc.text(`${data.tas} kts`, col2 + 25, y); y += 8;
    doc.setTextColor(217, 56, 41); doc.text('GPH:', col1, y);
    doc.setTextColor(40, 40, 40); doc.text(`${data.gph} gal/h`, col1 + 35, y);
    doc.setTextColor(217, 56, 41); doc.text('DATUM:', col2, y);
    doc.setTextColor(40, 40, 40); doc.text(`${data.date} ${data.time}`, col2 + 25, y); y += 24;

    if (mapImage) {
        doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 31, 101); doc.text('ROUTE MAP', 32, y); y += 4;
        const maxW = 158; const maxH = Math.min(100, 280 - y); const ratio = mapImage.width / mapImage.height;
        let imgW, imgH; if (ratio > maxW / maxH) { imgW = maxW; imgH = maxW / ratio; } else { imgH = maxH; imgW = maxH * ratio; }
        const imgX = 32 + (maxW - imgW) / 2;
        doc.setFillColor(230, 225, 210); doc.rect(imgX - 2, y - 2, imgW + 4, imgH + 4, 'F');
        doc.setDrawColor(160, 155, 140); doc.setLineWidth(0.5); doc.rect(imgX - 2, y - 2, imgW + 4, imgH + 4, 'S');
        doc.addImage(mapImage.data, 'JPEG', imgX, y, imgW, imgH);
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function drawRouteNavigationPage(doc, data, legs) {
    let y = 30;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(11, 31, 101); doc.text('ROUTE & NAVIGATION', 32, y); y += 4;
    doc.setDrawColor(11, 31, 101); doc.setLineWidth(0.5); doc.line(32, y, 190, y); y += 10;

    doc.setFont('Helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    const wpNames = [data.depICAO || currentStartICAO];
    for (let i = 1; i < routeWaypoints.length - 1; i++) wpNames.push(`WP${i}`);
    if (routeWaypoints.length > 1) wpNames.push(data.isPOI ? 'POI' : (data.destICAO || currentDestICAO));
    doc.text(wpNames.join(' -> '), 32, y); y += 8;

    const tableX = 32, colWidths = [10, 42, 16, 16, 16, 16, 16];
    const tableW = colWidths.reduce((a, b) => a + b, 0), rowH = 10;

    doc.setFillColor(220, 215, 200); doc.rect(tableX, y, tableW, 7, 'F');
    doc.setDrawColor(160, 155, 140); doc.rect(tableX, y, tableW, 7, 'S');

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
    doc.text('LEG', tableX + 2, y + 5); doc.text('ROUTE', tableX + colWidths[0] + 2, y + 5); doc.text('FREQ', tableX + colWidths[0] + colWidths[1] + 2, y + 5);
    doc.text('HDG', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5); doc.text('DIST', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 5);
    doc.text('TIME', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, y + 5); doc.text('FUEL', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2, y + 5);
    y += 7;

    doc.setFont('Helvetica', 'normal');
    let totalTime = 0, totalFuel = 0;
    legs.forEach((leg, i) => {
        totalTime += leg.time; totalFuel += parseFloat(leg.fuel);
        if (i % 2 === 0) { doc.setFillColor(250, 246, 235); doc.rect(tableX, y, tableW, rowH, 'F'); }
        doc.setDrawColor(200, 195, 180); doc.rect(tableX, y, tableW, rowH, 'S');

        doc.setTextColor(40, 40, 40); doc.setFontSize(8); doc.text(`${i + 1}`, tableX + 3, y + 6);
        doc.text(`${leg.from}`, tableX + colWidths[0] + 2, y + 4); doc.text(`-> ${leg.to}`, tableX + colWidths[0] + 2, y + 8.5);

        doc.setFontSize(7); doc.setTextColor(11, 31, 101);
        if (leg.f1) doc.text(leg.f1, tableX + colWidths[0] + colWidths[1] + 2, y + 4);
        if (leg.f2) doc.text(leg.f2, tableX + colWidths[0] + colWidths[1] + 2, y + 8.5);

        doc.setFontSize(8); doc.setTextColor(40, 40, 40);
        doc.text(`${leg.heading}\u00B0`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 6);
        doc.text(`${leg.dist} NM`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 6);
        doc.text(`${leg.time} m`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, y + 6);
        doc.text(`${leg.fuel} G`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2, y + 6);
        y += rowH;
    });

    doc.setFillColor(210, 205, 190); doc.rect(tableX, y, tableW, 7, 'F');
    doc.setDrawColor(160, 155, 140); doc.rect(tableX, y, tableW, 7, 'S');
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(11, 31, 101);
    doc.text('TOTAL', tableX + colWidths[0] + 2, y + 5);
    doc.text(`${data.totalDist} NM`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, y + 5);
    doc.text(`${totalTime} m`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, y + 5);
    doc.text(`${totalFuel.toFixed(1)} G`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2, y + 5);
    y += 13;

    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0); y += 6;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 31, 101); doc.text('PERFORMANCE', 32, y); y += 8;

    doc.setFontSize(9); const pc = [34, 66, 98, 130, 162];
    const items = [ ['AC', data.aircraft], ['TAS', `${data.tas} kts`], ['GPH', `${data.gph} gal/h`], ['ETE', data.totalTimeStr], ['FUEL', `${data.totalFuel} Gal`] ];
    items.forEach((item, i) => {
        doc.setFont('Helvetica', 'bold'); doc.setTextColor(217, 56, 41); doc.text(item[0], pc[i], y);
        doc.setFont('Helvetica', 'normal'); doc.setTextColor(40, 40, 40); doc.text(item[1], pc[i], y + 5);
    });

    const vpCanvas = document.getElementById('verticalProfileCanvas');
    if (vpCanvas && vpCanvas.width > 0 && vpCanvas.height > 0) {
        try {
            const vpDataUrl = vpCanvas.toDataURL('image/png', 1.0);
            const vpW = 158; const vpH = (vpCanvas.height / vpCanvas.width) * vpW; y += 12;
            doc.addImage(vpDataUrl, 'PNG', 32, y, vpW, vpH);
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(32, y, vpW, vpH); y += vpH;
        } catch (e) { }
    }
    y += 14;

    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0); y += 6;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 31, 101); doc.text('AIRSPACE WARNINGS', 32, y); y += 8;

    let finalAirspaces = activeAirspaces || [];
    if (finalAirspaces.length === 0) {
        doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 140, 40); doc.text('Route frei - keine Konflikte erkannt.', 34, y);
    } else {
        for (let i = 0; i < finalAirspaces.length; i++) {
            if (y > 278) { doc.setFont('Helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120, 120, 120); doc.text(`... und ${finalAirspaces.length - i} weitere`, 38, y); break; }
            const a = finalAirspaces[i]; const style = getAirspaceStyle(a); const displayName = getAirspaceDisplayName(a);
            const rgb = hexToRgb(style.color);
            if (rgb) { doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.circle(35, y - 1.2, 1.2, 'F'); }
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
            const catTag = `[${style.category}]`; doc.text(catTag, 38, y);
            doc.setFont('Helvetica', 'normal'); doc.text(displayName, 38 + doc.getTextWidth(catTag) + 1, y);
            if (a.lowerLimit && a.upperLimit) {
                const fmtLmt = (lim) => {
                    if (!lim) return '?'; if (lim.referenceDatum === 0 && lim.value === 0) return 'GND';
                    if (lim.unit === 6) return `FL ${lim.value}`;
                    return `${lim.value} ${lim.unit === 1 ? 'FT' : 'M'}${lim.referenceDatum === 1 ? ' MSL' : (lim.referenceDatum === 0 ? ' AGL' : '')}`;
                };
                doc.setFontSize(7); doc.setTextColor(100, 100, 100); doc.text(`${fmtLmt(a.lowerLimit)} - ${fmtLmt(a.upperLimit)}`, 190, y, { align: 'right' });
            }
            if (a.frequencies && a.frequencies.length > 0) {
                const primary = a.frequencies.find(f => f.primary) || a.frequencies[0];
                if (primary && primary.value) { y += 3.5; doc.setFontSize(7); doc.setTextColor(11, 31, 101); doc.setFont('Helvetica', 'bold'); doc.text(`${primary.name || 'FREQ'}: ${primary.value}`, 38, y); }
            }
            y += 5;
        }
    }
}

function drawAirportInfoPage(doc, type, data, photo, detailMap, metarImg) {
    let y = 30; const isDep = (type === 'dep'); const isPOI = (!isDep && data.isPOI);
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(11, 31, 101); doc.text(isPOI ? 'ZIELPUNKT INFO' : (isDep ? 'DEPARTURE AIRPORT' : 'DESTINATION AIRPORT'), 32, y); y += 4;
    doc.setDrawColor(11, 31, 101); doc.setLineWidth(0.5); doc.line(32, y, 190, y); y += 14;

    const photoYStart = y - 2;
    if (photo) { try { doc.addImage(photo, 'JPEG', 152, photoYStart, 38, 28); doc.setDrawColor(200, 195, 180); doc.setLineWidth(0.4); doc.rect(151, photoYStart - 1, 40, 34); } catch (e) { } }

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(11, 31, 101); doc.text(isDep ? data.depICAO : data.destICAO, 32, y); y += 7;
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(60, 60, 60); doc.text(isDep ? data.depName : data.destName, 32, y); y += 7;
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text(`Coords: ${isDep ? data.depCoords : data.destCoords}`, 32, y);
    y = photo ? Math.max(y + 6, photoYStart + 36) : y + 6;
    doc.setDrawColor(100, 100, 100); doc.setLineWidth(0.3); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0); y += 8;

    if (!isPOI) {
        let blockY = y;
        doc.setFont('Helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(217, 56, 41); doc.text('RUNWAYS', 32, blockY); doc.text('FREQUENZEN', 115, blockY);
        let rwyY = blockY + 7, freqY = blockY + 7;
        const rwy = isDep ? data.depRwy : data.destRwy, freq = isDep ? data.depFreq : data.destFreq;
        doc.setFont('Helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
        if (rwy && rwy !== 'Sucht Pisten-Infos...' && rwy !== 'Keine Daten gefunden') { rwy.split(/\s*(?:\||\n|<br\s*\/?>)\s*/i).filter(r => r.trim()).forEach(r => { doc.text(stripEmojis(r.trim()), 34, rwyY); rwyY += 6; }); }
        else { doc.setTextColor(120, 120, 120); doc.text('Keine Pistendaten verfuegbar.', 34, rwyY); rwyY += 6; }
        doc.setTextColor(11, 31, 101);
        if (freq && !freq.includes('Sucht Frequenz') && freq.trim() !== '') { stripEmojis(freq).split('\n').filter(l => l.trim()).forEach(line => { doc.text(line.trim(), 117, freqY); freqY += 6; }); }
        else { doc.setTextColor(120, 120, 120); doc.text('Keine Frequenzdaten verfuegbar.', 117, freqY); freqY += 6; }
        y = Math.max(rwyY, freqY) + 4;
        doc.setDrawColor(100, 100, 100); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0); y += 8;
    }

    doc.setFont('Helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(11, 31, 101); doc.text(isPOI ? 'INFO' : 'AIRPORT INFO', 32, y); y += 7;
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 50, 50);
    const desc = isDep ? data.depDesc : data.destDesc;
    if (desc && desc !== 'Warte auf Daten...') { const trimmedDesc = desc.length > 600 ? desc.substring(0, 600) + '...' : desc; y = pdfWrappedText(doc, trimmedDesc, 32, y, 155, 5.5); }
    else { doc.text('Keine weiteren Informationen verfuegbar.', 32, y); y += 6; }

    if (detailMap || metarImg) {
        y = Math.max(y + 6, 170); doc.setDrawColor(100, 100, 100); doc.setLineDashPattern([2, 2], 0); doc.line(32, y, 190, y); doc.setLineDashPattern([], 0); y += 6;
        const hasMetar = metarImg && metarImg.data && !isPOI; const mapAvailW = hasMetar ? 95 : 155; const maxH = Math.min(100, 280 - y);
        if (detailMap) {
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 31, 101); doc.text(isPOI ? 'KARTE' : `PLATZKARTE`, 32, y); const mapLabelY = y; y += 5;
            const mapRatio = 700 / 360; let mapW, mapH; if (mapAvailW / maxH < mapRatio) { mapW = mapAvailW; mapH = mapW / mapRatio; } else { mapH = maxH; mapW = mapH * mapRatio; }
            doc.setFillColor(230, 225, 210); doc.rect(31, y - 1, mapW + 2, mapH + 2, 'F'); doc.setDrawColor(160, 155, 140); doc.setLineWidth(0.4); doc.rect(31, y - 1, mapW + 2, mapH + 2, 'S'); doc.addImage(detailMap, 'JPEG', 32, y, mapW, mapH);
            if (hasMetar) {
                const metarX = 32 + mapAvailW + 4; const metarAvailW = 190 - metarX;
                doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 31, 101); doc.text('METAR', metarX, mapLabelY);
                const metarRatio = metarImg.ratio || 1.5; let metarW = metarAvailW; let metarH = metarW / metarRatio; if (metarH > mapH) { metarH = mapH; metarW = metarH * metarRatio; }
                doc.setFillColor(240, 236, 224); doc.rect(metarX - 1, y - 1, metarW + 2, metarH + 2, 'F'); doc.setDrawColor(160, 155, 140); doc.setLineWidth(0.4); doc.rect(metarX - 1, y - 1, metarW + 2, metarH + 2, 'S');
                try { doc.addImage(metarImg.data, 'PNG', metarX, y, metarW, metarH); } catch (e) { }
            }
        } else if (hasMetar) {
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(11, 31, 101); doc.text('METAR', 32, y); y += 5;
            const metarRatio = metarImg.ratio || 1.5; let metarW = 155; let metarH = metarW / metarRatio; if (metarH > maxH) { metarH = maxH; metarW = metarH * metarRatio; }
            doc.setFillColor(240, 236, 224); doc.rect(31, y - 1, metarW + 2, metarH + 2, 'F'); doc.setDrawColor(160, 155, 140); doc.setLineWidth(0.4); doc.rect(31, y - 1, metarW + 2, metarH + 2, 'S');
            try { doc.addImage(metarImg.data, 'PNG', 32, y, metarW, metarH); } catch (e) { }
        }
    }
}

async function captureMetarWidget(containerId) {
    if (!window.html2canvas) return null;
    try {
        const container = document.getElementById(containerId);
        if (!container || container.style.display === 'none' || !container.innerHTML.trim()) return null;
        if (container.innerHTML.includes('Sucht lokales') || container.innerHTML.includes('Fehler')) return null;
        const ratio = container.offsetWidth / container.offsetHeight;
        // Metar-Widgets dürfen html2canvas nutzen, da sie nur lokales HTML ohne externe/vergiftete Bilder enthalten!
        const canvas = await html2canvas(container, { backgroundColor: '#f0eada', scale: 2, useCORS: true, logging: false });
        return { data: canvas.toDataURL('image/png'), ratio: ratio };
    } catch (e) { return null; }
}

window.generateBriefingPDF = async function() {
    if (!currentMissionData || document.getElementById("briefingBox").style.display !== "block") {
        alert('Kein aktives Briefing vorhanden.'); return;
    }
    if (!window.jspdf) {
        alert('PDF-Bibliothek nicht geladen. Bitte Seite neu laden.'); return;
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
        const depMetarPromise = captureMetarWidget('metarContainerDep');
        const destMetarPromise = isPOI ? Promise.resolve(null) : captureMetarWidget('metarContainerDest');

        const [depPhoto, destPhoto, depDetail, destDetail, depMetar, destMetar] = await Promise.all([
            depPhotoUrl ? getImageAsBase64(depPhotoUrl) : Promise.resolve(null),
            destPhotoUrl ? getImageAsBase64(destPhotoUrl) : Promise.resolve(null),
            depDetailPromise,
            destDetailPromise,
            depMetarPromise,
            destMetarPromise
        ]);

        const mapImage = await mapImagePromise;

        doc.setProperties({ title: `Briefing Pack - ${data.depICAO} to ${isPOI ? 'POI' : data.destICAO}` });

        drawNotebookBackground(doc, 1, totalPages); drawMissionBriefingPage(doc, data, mapImage);
        doc.addPage();
        drawNotebookBackground(doc, 2, totalPages); drawRouteNavigationPage(doc, data, legs);
        doc.addPage();
        drawNotebookBackground(doc, 3, totalPages); drawAirportInfoPage(doc, 'dep', data, depPhoto, depDetail, depMetar);
        
        if (!isPOI) {
            doc.addPage();
            drawNotebookBackground(doc, 4, totalPages); drawAirportInfoPage(doc, 'dest', data, destPhoto, destDetail, destMetar);
        }

        const filename = `Briefing_${data.depICAO}_${isPOI ? 'Rundflug' : data.destICAO}_${data.date.replace(/\./g, '')}.pdf`;
        doc.save(filename);

        if (indicator) indicator.innerText = '\uD83D\uDCC4 Briefing Pack PDF erstellt!';
        setTimeout(() => { if (indicator) indicator.innerText = 'System bereit.'; }, 4000);
    } catch (e) {
        console.error('PDF generation failed:', e);
        if (indicator) indicator.innerText = '\u274C PDF-Erstellung fehlgeschlagen.';
        alert('PDF konnte nicht erstellt werden: ' + e.message);
    }
};

// ==========================================
// V87: MSFS .PLN EXPORT / IMPORT & TRANSFER HUB
// ==========================================
window.openTransferModal = function() {
    document.getElementById('transferModalOverlay').style.display = 'flex';
};

window.closeTransferModal = function() {
    document.getElementById('transferModalOverlay').style.display = 'none';
};

function formatMSFSCoords(lat, lon) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    lat = Math.abs(lat); lon = Math.abs(lon);
    const latDeg = Math.floor(lat), latMin = Math.floor((lat - latDeg) * 60), latSec = ((lat - latDeg - latMin/60) * 3600).toFixed(2);
    const lonDeg = Math.floor(lon), lonMin = Math.floor((lon - lonDeg) * 60), lonSec = ((lon - lonDeg - lonMin/60) * 3600).toFixed(2);
    return `${latDir}${latDeg}° ${latMin}' ${String(latSec).padStart(5, '0')}", ${lonDir}${String(lonDeg).padStart(3, '0')}° ${lonMin}' ${String(lonSec).padStart(5, '0')}"`;
}

function parseMSFSCoords(coordStr) {
    const regex = /([NS])\s*(\d+)°\s*(\d+)'\s*([\d.]+)"?,\s*([EW])\s*(\d+)°\s*(\d+)'\s*([\d.]+)"?/i;
    const match = coordStr.match(regex);
    if (!match) return null;
    let lat = parseInt(match[2]) + parseInt(match[3])/60 + parseFloat(match[4])/3600;
    if (match[1].toUpperCase() === 'S') lat = -lat;
    let lon = parseInt(match[6]) + parseInt(match[7])/60 + parseFloat(match[8])/3600;
    if (match[5].toUpperCase() === 'W') lon = -lon;
    return { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lon.toFixed(6)) };
}

window.exportMSFS = function() {
    if (!currentMissionData || routeWaypoints.length < 2) { alert("Kein aktiver Flugplan!"); return; }
    const activeData = localStorage.getItem('ga_active_mission');
    const secretBackup = activeData ? btoa(encodeURIComponent(activeData)) : "";
    const cruiseAlt = document.getElementById('altSlider')?.value || 4500;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<SimBase.Document Type="AceXML" version="1,0">\n  <Descr>AceXML Document</Descr>\n  <FlightPlan.FlightPlan>\n    <Title>${currentStartICAO} to ${currentDestICAO}</Title>\n    <FPType>VFR</FPType>\n    <CruisingAlt>${cruiseAlt}</CruisingAlt>\n    <DepartureID>${currentStartICAO}</DepartureID>\n    <DepartureLLA>${formatMSFSCoords(routeWaypoints[0].lat, routeWaypoints[0].lng || routeWaypoints[0].lon)}, +000000.00</DepartureLLA>\n    <DestinationID>${currentDestICAO}</DestinationID>\n    <DestinationLLA>${formatMSFSCoords(routeWaypoints[routeWaypoints.length-1].lat, routeWaypoints[routeWaypoints.length-1].lng || routeWaypoints[routeWaypoints.length-1].lon)}, +000000.00</DestinationLLA>\n    <Descr>${currentMissionData.mission} - GA_DISPATCHER_BACKUP[${secretBackup}]</Descr>\n    <AppVersion>\n      <AppVersionMajor>11</AppVersionMajor>\n      <AppVersionBuild>282174</AppVersionBuild>\n    </AppVersion>\n`;
    
    routeWaypoints.forEach((wp, i) => {
        let wpName = wp.name ? wp.name.replace(/[^a-zA-Z0-9 ]/g, '').substring(0,10).trim() : `WP${i}`;
        if(i===0) wpName = currentStartICAO;
        if(i===routeWaypoints.length-1) wpName = currentDestICAO;
        let alt = typeof vpAltWaypoints !== 'undefined' && vpAltWaypoints && vpAltWaypoints[i] ? vpAltWaypoints[i].altFt : cruiseAlt;
        xml += `    <ATCWaypoint id="${wpName}">\n      <ATCWaypointType>User</ATCWaypointType>\n      <WorldPosition>${formatMSFSCoords(wp.lat, wp.lng || wp.lon)}, +${String(alt).padStart(6, '0')}.00</WorldPosition>\n    </ATCWaypoint>\n`;
    });
    xml += `  </FlightPlan.FlightPlan>\n</SimBase.Document>`;
    
    const blob = new Blob([xml], { type: 'text/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VFR_${currentStartICAO}_to_${currentDestICAO}.pln`;
    a.click();
    closeTransferModal();
};

let pendingMSFSImport = null;

window.importMSFS = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        document.getElementById('msfsFileInput').value = ''; 
        
        const backupMatch = content.match(/GA_DISPATCHER_BACKUP\[(.*?)\]/);
        if (backupMatch && backupMatch[1]) {
            try {
                const decoded = decodeURIComponent(atob(backupMatch[1]));
                const state = JSON.parse(decoded);
                localStorage.setItem('ga_active_mission', JSON.stringify(state));
                restoreMissionState(state);
                closeTransferModal();
                alert("✅ Eigener Flugplan inkl. KI-Briefing erfolgreich wiederhergestellt!");
                setTimeout(() => {
                    if (typeof map !== 'undefined' && map && routeWaypoints.length >= 2) {
                        map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] });
                        updateMiniMap();
                    }
                }, 300);
                return;
            } catch(err) { console.warn("Backup Code fehlerhaft, parse regulär."); }
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const waypoints = xmlDoc.getElementsByTagName("ATCWaypoint");
        if (!waypoints || waypoints.length < 2) { alert("Keine gültigen Wegpunkte in dieser .pln gefunden."); return; }

        let newRoute = [];
        let startIcao = xmlDoc.getElementsByTagName("DepartureID")[0]?.textContent || "START";
        let destIcao = xmlDoc.getElementsByTagName("DestinationID")[0]?.textContent || "DEST";
        
        for (let i = 0; i < waypoints.length; i++) {
            const wp = waypoints[i];
            const wpId = wp.getAttribute("id") || `WP${i}`;
            const posTag = wp.getElementsByTagName("WorldPosition")[0];
            if (posTag) {
                const coords = parseMSFSCoords(posTag.textContent);
                if (coords) {
                    coords.name = wpId;
                    newRoute.push(coords);
                }
            }
        }

        if (newRoute.length < 2) { alert("Koordinaten konnten nicht gelesen werden."); return; }

        const cruiseAltTag = xmlDoc.getElementsByTagName("CruisingAlt")[0];
        let cruiseAlt = cruiseAltTag ? parseInt(cruiseAltTag.textContent) : 4500;
        if (isNaN(cruiseAlt) || cruiseAlt < 1000) cruiseAlt = 4500;

        pendingMSFSImport = { newRoute, startIcao, destIcao, cruiseAlt };
        
        closeTransferModal();
        document.getElementById('importActionText').innerText = `Externe Route (${newRoute.length} Wegpunkte) erkannt!\nWie möchtest du diesen Flugplan laden?`;
        document.getElementById('importActionModalOverlay').style.display = 'flex';
    };
    reader.readAsText(file);
};

window.cancelMSFSImport = function() {
    document.getElementById('importActionModalOverlay').style.display = 'none';
    pendingMSFSImport = null;
};

window.executeMSFSImport = async function(mode) {
    document.getElementById('importActionModalOverlay').style.display = 'none';
    if (!pendingMSFSImport) return;
    
    const { newRoute, startIcao, destIcao, cruiseAlt } = pendingMSFSImport;
    pendingMSFSImport = null;
    
    routeWaypoints = newRoute;
    currentStartICAO = startIcao;
    currentDestICAO = destIcao;
    
    const sData = await getAirportData(startIcao);
    const dData = await getAirportData(destIcao);
    currentSName = sData ? (sData.n || startIcao) : startIcao;
    currentDName = dData ? (dData.n || destIcao) : destIcao;
    
    const nav = calcNav(newRoute[0].lat, newRoute[0].lng, newRoute[newRoute.length-1].lat, newRoute[newRoute.length-1].lng);
    let totalDist = 0;
    for (let i = 0; i < newRoute.length - 1; i++) {
         totalDist += calcNav(newRoute[i].lat, newRoute[i].lng, newRoute[i+1].lat, newRoute[i+1].lng).dist;
    }
    
    document.getElementById('startLoc').value = startIcao;
    document.getElementById('destLoc').value = destIcao;
    if (document.getElementById('altSlider')) {
        document.getElementById('altSlider').value = cruiseAlt;
        handleSliderChange('alt', cruiseAlt);
    }

    if (mode === 'ki') {
        const maxSeats = parseInt(document.getElementById("maxSeats")?.value || 4);
        const paxText = `${Math.floor(Math.random() * Math.max(1, maxSeats - 1)) + 1} PAX`;
        const cargoText = `${Math.floor(Math.random() * 300) + 20} lbs`;
        
        document.getElementById('searchIndicator').innerText = "Kontaktiere KI-Dispatcher...";
        
        const isPOI = (startIcao === destIcao);
        let m = await fetchGeminiMission(currentSName, currentDName, totalDist, isPOI, paxText, cargoText);
        
        // Lokaler Fallback, falls Gemini aus ist oder abbricht
        if (!m) {
            const availM = typeof missions !== 'undefined' ? missions.filter(ms => (totalDist < 50 || ms.cat === "std")) : [{ t: "Privater Flugplan", s: "Standard Flug nach Instrumenten oder Sicht." }];
            let history = JSON.parse(localStorage.getItem('ga_std_history')) || [];
            let freshM = availM.filter(ms => !history.includes(ms.t));
            if (freshM.length === 0) { freshM = availM; history = []; }
            m = freshM[Math.floor(Math.random() * freshM.length)] || availM[0];
            history.push(m.t);
            if (history.length > 30) history.shift();
            localStorage.setItem('ga_std_history', JSON.stringify(history));
            if (m.cat === "trn" || m.cat === "cargo") { m.pax = "0 PAX"; }
            m.i = "📋";
        }
        
        let missionTitle = `${m.i ? m.i + ' ' : ''}${m.t}`;
        let missionStory = m.s;
        let finalPax = m.pax || paxText;
        let finalCargo = m.cargo || cargoText;
        
        currentMissionData = { start: startIcao, dest: destIcao, poiName: isPOI ? currentDName : null, mission: missionTitle, dist: totalDist, ac: typeof selectedAC !== 'undefined' ? selectedAC : "N/A", heading: nav.brng };
        populateBriefingUI(missionTitle, missionStory, finalPax, finalCargo, isPOI, newRoute, sData, dData);
        
    } else {
        const isPOI = (startIcao === destIcao);
        currentMissionData = { start: startIcao, dest: destIcao, poiName: isPOI ? currentDName : null, mission: "Privater Import-Flug", dist: totalDist, ac: typeof selectedAC !== 'undefined' ? selectedAC : "N/A", heading: nav.brng };
        populateBriefingUI("Privater Flugplan", "Externer Flugplan importiert aus Microsoft Flight Simulator.", "N/A", "N/A", isPOI, newRoute, sData, dData);
    }
};

function populateBriefingUI(mTitle, mStory, mPax, mCargo, isPOI, newRoute, sData, dData) {
    document.getElementById("mTitle").innerHTML = mTitle;
    document.getElementById("mStory").innerText = mStory;
    
    document.getElementById("mDepICAO").innerText = currentStartICAO;
    document.getElementById("mDepName").innerText = currentSName;
    document.getElementById("mDepCoords").innerText = sData ? `${sData.lat.toFixed(4)}, ${sData.lon.toFixed(4)}` : `${newRoute[0].lat.toFixed(4)}, ${newRoute[0].lng.toFixed(4)}`;
    
    const wikiDepNameEl = document.getElementById('wikiDepNameDisplay');
    if (wikiDepNameEl) wikiDepNameEl.innerText = `${currentStartICAO} – ${currentSName}`;

    document.getElementById("destIcon").innerText = isPOI ? "🎯" : "🛬";
    document.getElementById("mDestICAO").innerText = isPOI ? "POI" : currentDestICAO;
    document.getElementById("mDestName").innerText = currentDName;
    document.getElementById("mDestCoords").innerText = dData ? `${dData.lat.toFixed(4)}, ${dData.lon.toFixed(4)}` : `${newRoute[newRoute.length-1].lat.toFixed(4)}, ${newRoute[newRoute.length-1].lng.toFixed(4)}`;
    
    const wikiDestNameEl = document.getElementById('wikiDestNameDisplay');
    if (wikiDestNameEl) wikiDestNameEl.innerText = `${isPOI ? 'POI' : currentDestICAO} – ${currentDName}`;

    document.getElementById("mPay").innerText = mPax; 
    document.getElementById("mWeight").innerText = mCargo;
    
    document.getElementById("destRwyContainer").style.display = isPOI ? "none" : "block";
    if (document.getElementById("wikiDestRwyText")) document.getElementById("wikiDestRwyText").style.display = isPOI ? "none" : "block";
    const destSwitchRow = document.getElementById("destSwitchRow"); if (destSwitchRow) destSwitchRow.style.display = isPOI ? "none" : "flex";
    const destLinks = document.getElementById("wikiDestLinks"); if (destLinks) destLinks.style.display = isPOI ? "none" : "block";

    document.getElementById("briefingBox").style.display = "block";
    
    fetchRunwayDetails(newRoute[0].lat, newRoute[0].lng, 'mDepRwy', currentStartICAO);
    if (!isPOI) fetchRunwayDetails(newRoute[newRoute.length-1].lat, newRoute[newRoute.length-1].lng, 'mDestRwy', currentDestICAO);
    
    fetchAreaDescription(newRoute[0].lat, newRoute[0].lng, 'wikiDepDescText', null, currentStartICAO, 'wikiDepImageContainer', 'wikiDepImage');
    fetchAreaDescription(newRoute[newRoute.length-1].lat, newRoute[newRoute.length-1].lng, 'wikiDestDescText', isPOI ? currentDName : null, isPOI ? null : currentDestICAO, 'wikiDestImageContainer', 'wikiDestImage');

    currentDepFreq = ""; currentDestFreq = "";
    fetchAirportFreq(currentStartICAO, 'wikiDepFreqText', 'dep');
    if (!isPOI) fetchAirportFreq(currentDestICAO, 'wikiDestFreqText', 'dest');
    
    loadMetarWidget(currentStartICAO, 'metarContainerDep', newRoute[0].lat, newRoute[0].lng);
    loadMetarWidget(isPOI ? null : currentDestICAO, 'metarContainerDest', newRoute[newRoute.length-1].lat, newRoute[newRoute.length-1].lng);

    document.getElementById('searchIndicator').innerText = "Flugplan bereit.";
    
    // WICHTIG: renderMainRoute triggert das Vertical Profile (inkl. Wetter) sauber!
    renderMainRoute();
    map.fitBounds(L.latLngBounds(routeWaypoints), { padding: [40, 40] });
    
    setTimeout(() => { 
        updateMiniMap();
        // triggerVerticalProfileUpdate() hier entfernt, um Wetter-Abbruch zu verhindern
        window.debouncedSaveMissionState();
    }, 500);
}
