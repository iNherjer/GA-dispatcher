// missions.js - Zuständig für die Generierung der Einsatz-Texte

function generateDynamicPOIMission(poiName, maxSeats) {
    const nameLower = poiName.toLowerCase();
    const maxPax = Math.max(1, maxSeats - 1); 
    const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const paxVIP = `${maxPax} PAX (VIPs)`;
    const paxMedia = `1-2 PAX (Filmcrew)`;
    const paxGov = `1 PAX (Beobachter)`;
    const paxNone = `0 PAX (Nur Fracht/Sensoren)`;
    
    const cargoMedia = rnd(["Kamera-Gimbal (120 lbs)", "Drohnen & Akkus (80 lbs)", "Teleobjektive (40 lbs)"]);
    const cargoVIP = rnd(["Champagner & Kaviar (15 lbs)", "Luxus-Reisegepäck (100 lbs)", "Picknick-Korb (20 lbs)"]);
    const cargoUtility = rnd(["Lidar-Scanner (180 lbs)", "Wetter-Sensoren (50 lbs)", "Messgeräte (90 lbs)", "Vermessungs-Laser (110 lbs)"]);

    let templates = [];

    if (nameLower.includes("brücke") || nameLower.includes("viadukt") || nameLower.includes("aquädukt") || nameLower.includes("steg")) {
        templates = [
            { i: "🌉", t: `Struktur-Prüfung: ${poiName}`, s: `Das Verkehrsministerium beauftragt dich mit einer Riss- und Statikprüfung der Pfeiler von ${poiName}. Fliege mehrere langsame Pässe.`, p: paxGov, w: cargoUtility },
            { i: "🚄", t: `Verkehrs-Studie: ${poiName}`, s: `Ein Ingenieurbüro plant eine Erweiterung der Verkehrswege bei ${poiName}. Dokumentiere den Verkehrsfluss zur Hauptverkehrszeit aus der Luft.`, p: paxGov, w: "Kamera-Gimbal (120 lbs)" },
            { i: "🎬", t: `Action-Dreh: ${poiName}`, s: `Eine Filmcrew dreht eine Verfolgungsjagd über ${poiName}. Du lieferst die dynamischen Luftaufnahmen für den Blockbuster.`, p: paxMedia, w: cargoMedia },
            { i: "🚁", t: `Instandhaltung: ${poiName}`, s: `Wartungstrupps benötigen einen Überblick über die schwer zugänglichen Stahlseile und Bögen von ${poiName}.`, p: "1 PAX (Ingenieur)", w: cargoUtility }
        ];
    }
    else if (nameLower.includes("autobahn") || nameLower.includes("kreuz") || nameLower.includes("dreieck") || nameLower.includes("straße") || nameLower.includes("highway") || nameLower.includes("tunnel")) {
        templates = [
            { i: "🚗", t: `Stau-Report: ${poiName}`, s: `Verkehrschaos zur Rush-Hour! Fliege den Bereich um ${poiName} ab und melde Rückstaus live an den lokalen Radiosender.`, p: paxMedia, w: "Funktechnik & Reporter (190 lbs)" },
            { i: "🛣️", t: `Trassen-Inspektion: ${poiName}`, s: `Das Straßenbauamt bittet um einen 10 km langen Abflug der Fahrbahn entlang ${poiName}. Dokumentiere massive Frostschäden.`, p: paxGov, w: cargoUtility },
            { i: "🚓", t: `Polizei-Support: ${poiName}`, s: `Schwerer LKW-Unfall gemeldet. Die Polizei benötigt dringend hochauflösende Luftaufnahmen zur Rekonstruktion des Hergangs nahe ${poiName}.`, p: "1 PAX (Polizeifotograf)", w: "Kamera-Equipment (30 lbs)" },
            { i: "🚚", t: `Schwerlast-Eskorte: ${poiName}`, s: `Ein extremer Schwertransport blockiert die Route bei ${poiName}. Das Planungsbüro braucht ein Auge in der Luft für Engstellen.`, p: paxGov, w: "Live-Link Antennen (50 lbs)" }
        ];
    }
    else if (nameLower.includes("industrie") || nameLower.includes("werk") || nameLower.includes("fabrik") || nameLower.includes("kraftwerk") || nameLower.includes("anlage") || nameLower.includes("mine") || nameLower.includes("tagebau")) {
        templates = [
            { i: "🏭", t: `Industrie-Inspektion: ${poiName}`, s: `Die Werksleitung von ${poiName} benötigt detaillierte Wärmebildaufnahmen der Kühltürme und Schornsteine. Halte dich genau an die freigegebene Höhe!`, p: paxGov, w: "Infrarot-Scanner (80 lbs)" },
            { i: "☢️", t: `Emissions-Messung: ${poiName}`, s: `Das Umweltamt will die Abgaswerte über ${poiName} überprüfen. Fliege mit den montierten Sensoren mehrfach quer durch die Abluftfahne.`, p: paxNone, w: "Luft-Sniffer & Sensoren (120 lbs)" },
            { i: "📸", t: `PR-Flug: ${poiName}`, s: `Der Konzern braucht neue, dynamische Aufnahmen des riesigen Geländes von ${poiName} für den nächsten Jahresbericht.`, p: paxMedia, w: cargoMedia },
            { i: "🏗️", t: `Baufortschritt: ${poiName}`, s: `Eine gigantische neue Produktionshalle entsteht bei ${poiName}. Dokumentiere den Fortschritt von oben für die Großinvestoren.`, p: paxVIP, w: "Laptops & Pläne (40 lbs)" },
            { i: "🔥", t: `Gefahren-Abwehr: ${poiName}`, s: `Es gab eine Verpuffung in einem der Silos bei ${poiName}. Der Einsatzleiter der Feuerwehr ist an Bord und verschafft sich einen Überblick.`, p: "1 PAX (Einsatzleiter)", w: "Funk-Relais (50 lbs)" }
        ];
    }
    else if (nameLower.includes("burg") || nameLower.includes("schloss") || nameLower.includes("ruine") || nameLower.includes("festung") || nameLower.includes("kloster") || nameLower.includes("dom") || nameLower.includes("monument") || nameLower.includes("denkmal")) {
        templates = [
            { i: "🏰", t: `Historik-Flug: ${poiName}`, s: `Ein Historiker benötigt hochauflösende Luftaufnahmen von ${poiName}, um alte Mauerstrukturen im Umland zu erkennen. Kreise mehrmals in ruhiger Höhe.`, p: paxGov, w: cargoMedia },
            { i: "🥂", t: `Hochzeits-Tour: ${poiName}`, s: `Ein frisch vermähltes Paar hat einen exklusiven Rundflug gebucht. Zeige ihnen ${poiName} von seiner romantischsten Seite.`, p: paxVIP, w: cargoVIP },
            { i: "🎬", t: `Location Scout: ${poiName}`, s: `Ein Regisseur aus Hollywood sucht nach Drehorten für einen neuen Mittelalter-Blockbuster. Er will prüfen, ob sich ${poiName} als Kulisse eignet.`, p: paxMedia, w: cargoMedia },
            { i: "🛠️", t: `Denkmalschutz: ${poiName}`, s: `Nach einem schweren Sturm befürchtet das Amt für Denkmalschutz Dachschäden an ${poiName}. Führe einen langsamen Inspektionsflug durch.`, p: paxGov, w: cargoUtility },
            { i: "👻", t: `Mystery-Flug: ${poiName}`, s: `Ein reicher Fan von Mythen und Legenden hat dich gebucht. Er glaubt fest daran, dass es bei ${poiName} spukt und will den Ort aus der Luft beobachten.`, p: paxVIP, w: "Ferngläser & EMF-Meter (10 lbs)" }
        ];
    } 
    else if (nameLower.includes("fluss") || nameLower.includes("strom") || nameLower.includes("kanal") || nameLower.includes("see") || nameLower.includes("talsperre") || nameLower.includes("teich") || nameLower.includes("insel") || nameLower.includes("weiher") || nameLower.includes("küste") || nameLower.includes("hafen")) {
        templates = [
            { i: "💧", t: `Pegel-Messung: ${poiName}`, s: `Die Wasserbehörde muss den aktuellen Wasserstand und mögliche Ufer-Erosionen bei ${poiName} dokumentieren.`, p: paxNone, w: cargoUtility },
            { i: "🚢", t: `Schifffahrts-Kontrolle: ${poiName}`, s: `Die Flusswacht benötigt ein Update über die aktuelle Schiffsdichte und mögliche Blockaden bei ${poiName}.`, p: paxGov, w: cargoUtility },
            { i: "🌊", t: `Hochwasser-Schutz: ${poiName}`, s: `Nach starken Regenfällen müssen Dämme und Uferbefestigungen entlang ${poiName} dringend auf Schwachstellen geprüft werden.`, p: paxGov, w: "Infrarot-Scanner (80 lbs)" },
            { i: "🦆", t: `Natur-Beobachtung: ${poiName}`, s: `Ein Biologe möchte Wasservögel zählen, die momentan im Gebiet rund um ${poiName} rasten. Halte genug Abstand, um die Tiere nicht zu erschrecken!`, p: paxGov, w: "Teleobjektive (40 lbs)" },
            { i: "🛶", t: `Werbedreh: ${poiName}`, s: `Der Tourismusverband will neue, dynamische Aufnahmen von Wassersportlern bei ${poiName}. Fliege tief und ruhig für die Kameracrew.`, p: paxMedia, w: cargoMedia }
        ];
    } 
    else if (nameLower.includes("berg") || nameLower.includes("spitze") || nameLower.includes("horn") || nameLower.includes("gipfel") || nameLower.includes("kogel") || nameLower.includes("wald") || nameLower.includes("tal") || nameLower.includes("schlucht")) {
        templates = [
            { i: "⛰️", t: `Topo-Scan: ${poiName}`, s: `Das Landesvermessungsamt aktualisiert die 3D-Karten der Region. Fliege ein präzises Raster über ${poiName} ab, damit der Laser scannen kann.`, p: paxNone, w: cargoUtility },
            { i: "🌲", t: `Forst-Patrouille: ${poiName}`, s: `Wegen starker Trockenheit ist die Waldbrandgefahr extrem hoch. Patrouilliere das Gebiet um ${poiName} und halte Ausschau nach Rauchentwicklung.`, p: paxGov, w: "Infrarot-Kamera (60 lbs)" },
            { i: "🧗", t: `Extremsport-Support: ${poiName}`, s: `Ein Red-Bull-Athlet plant einen waghalsigen Stunt bei ${poiName}. Sein Team muss das Terrain vorher aus der Luft genau studieren.`, p: paxMedia, w: cargoMedia },
            { i: "❄️", t: `Lawinen-Check: ${poiName}`, s: `Die Bergwacht befürchtet, dass Hänge rund um ${poiName} instabil sein könnten. Führe einen vorsichtigen Sichtflug durch, um Schneemassen zu bewerten.`, p: paxGov, w: "Avalanche-Beacons (20 lbs)" },
            { i: "📸", t: `Kalender-Shooting: ${poiName}`, s: `Ein bekannter Naturfotograf braucht das perfekte Bild von ${poiName} für das Cover seines neuen Alpen-Kalenders.`, p: paxMedia, w: cargoMedia }
        ];
    } 
    else if (nameLower.includes("stadt") || nameLower.includes("turm") || nameLower.includes("park") || nameLower.includes("stadion") || nameLower.includes("arena") || nameLower.includes("zentrum")) {
        templates = [
            { i: "🏙️", t: `City-Panorama: ${poiName}`, s: `Eine Reisegruppe aus Übersee hat eine VIP-Städtetour gebucht. Das Highlight der Route ist ganz klar ${poiName}.`, p: `${maxPax} PAX (Touristen)`, w: cargoVIP },
            { i: "🏗️", t: `Bauaufsicht: ${poiName}`, s: `Das Ingenieurbüro verlangt hochauflösende Aufnahmen von der Statik und dem Zustand der Anlagen bei ${poiName}.`, p: paxGov, w: cargoUtility },
            { i: "🚗", t: `Verkehrs-Überwachung`, s: `Es ist Rush-Hour. Ein local Radiosender hat dich gemietet, um das Verkehrschaos rund um ${poiName} live von oben zu reportieren.`, p: "1 PAX (Radiomoderator)", w: "Funktechnik (40 lbs)" },
            { i: "🎆", t: `Event-Vorbereitung: ${poiName}`, s: `Ein Mega-Event steht an. Die Organisatoren wollen das Gelände rund um ${poiName} aus der Luft begutachten, um Fluchtwege zu planen.`, p: "2 PAX (Security)", w: "Pläne & Laptops (30 lbs)" },
            { i: "🏢", t: `Immobilien-Flug: ${poiName}`, s: `Ein Großinvestor überlegt, Ländereien nahe ${poiName} zu kaufen. Zeige ihm, wie sich die Infrastruktur von oben präsentiert.`, p: paxVIP, w: cargoVIP }
        ];
    } 
    else {
        templates = [
            { i: "✈️", t: `Panoramaflug: ${poiName}`, s: `Ein klassischer Ausflugsflug zum Zielort: ${poiName}. Die Fluggäste freuen sich auf einen ruhigen Flug und tolle Ausblicke!`, p: `${maxPax} PAX`, w: "Reisegepäck (30 lbs)" },
            { i: "📸", t: `Foto-Tour: ${poiName}`, s: `Du wurdest gebucht, um die Sehenswürdigkeit ${poiName} im perfekten Licht aus der Luft abzulichten.`, p: paxMedia, w: cargoMedia },
            { i: "🎁", t: `Überraschungsflug: ${poiName}`, s: `Jemand hat diesen Flug nach ${poiName} zum Geburtstag geschenkt bekommen. Mache es zu einem unvergesslichen Erlebnis!`, p: `${maxPax} PAX`, w: cargoVIP },
            { i: "🎓", t: `Nav-Übung: ${poiName}`, s: `Heute kein Charter-Kunde! Du zeigst einem Flugschüler, wie er sauber nach VFR nach ${poiName} navigiert.`, p: "1 PAX (Flugschüler)", w: "Flugtaschen (20 lbs)" },
            { i: "📡", t: `Funk-Relais: ${poiName}`, s: `Kreise über ${poiName}, um als fliegendes Kommunikationsrelais für ein lokales Event zu fungieren.`, p: paxNone, w: "Zusatz-Antennen (80 lbs)" },
            { i: "🛩️", t: `Luftraum-Check: ${poiName}`, s: `ATC hat unidentifizierte VFR-Aktivitäten bei ${poiName} gemeldet. Fliege hin und überprüfe die Lage visuell.`, p: "0 PAX", w: "Standard-Ausrüstung" }
        ];
    }

    // =========================================
    // SHUFFLE-BAG SYSTEM FÜR POIS 
    // =========================================
    let history = JSON.parse(localStorage.getItem('ga_poi_history')) || [];
    
    // Sortiere Missionstypen aus, die kürzlich schon dran waren (Wir extrahieren "Topo-Scan" aus "Topo-Scan: Zugspitze")
    let freshTemplates = templates.filter(tmpl => !history.includes(tmpl.t.split(':')[0]));
    
    // Wenn alle aus dieser Kategorie schon in der History sind, wird neu gemischt!
    if (freshTemplates.length === 0) { 
        freshTemplates = templates; 
        history = []; 
    }
    
    // Zufällige Auswahl aus dem verbleibenden frischen Stapel
    const selected = rnd(freshTemplates);

    // Missionsart merken (max 6 Stück im Gedächtnis, damit Kategorien mit 4 Items rotieren können)
    history.push(selected.t.split(':')[0]);
    if(history.length > 6) history.shift();
    localStorage.setItem('ga_poi_history', JSON.stringify(history));

    return { 
        i: selected.i, 
        t: selected.t, 
        s: selected.s, 
        cat: "poi", 
        payloadText: selected.p, 
        cargoText: selected.w 
    };
}