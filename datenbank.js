// ==========================================
// GA DISPATCHER - DATENBANK V42
// ==========================================

// 1. CORE AIRPORTS (Fallback & Deutschland/Europa-Fokus)
const coreDB = { 
    "EDTW": { icao: "EDTW", n: "Winzeln", lat: 48.279, lon: 8.428 }, 
    "EDTF": { icao: "EDTF", n: "Freiburg", lat: 48.023, lon: 7.828 },
    "EDNY": { icao: "EDNY", n: "Friedrichshafen", lat: 47.671, lon: 9.511 }, 
    "EDDS": { icao: "EDDS", n: "Stuttgart", lat: 48.689, lon: 9.221 },
    "EDMA": { icao: "EDMA", n: "Augsburg", lat: 48.42, lon: 10.93 }, 
    "EDJA": { icao: "EDJA", n: "Memmingen", lat: 47.98, lon: 10.23 },
    "EDTD": { icao: "EDTD", n: "Donaueschingen", lat: 47.97, lon: 8.52 }, 
    "EDTY": { icao: "EDTY", n: "Schwäbisch Hall", lat: 49.11, lon: 9.77 },
    "EDRK": { icao: "EDRK", n: "Koblenz", lat: 50.32, lon: 7.52 }, 
    "EDKB": { icao: "EDKB", n: "Bonn-Hangelar", lat: 50.76, lon: 7.16 },
    "EDLN": { icao: "EDLN", n: "Mönchengladbach", lat: 51.23, lon: 6.50 }, 
    "EDLP": { icao: "EDLP", n: "Paderborn", lat: 51.61, lon: 8.61 },
    "EDVE": { icao: "EDVE", n: "Braunschweig", lat: 52.31, lon: 10.55 }, 
    "EDDB": { icao: "EDDB", n: "Berlin-Brand.", lat: 52.36, lon: 13.50 },
    "EDDH": { icao: "EDDH", n: "Hamburg", lat: 53.63, lon: 9.98 }, 
    "EDDW": { icao: "EDDW", n: "Bremen", lat: 53.04, lon: 8.78 },
    "EDXW": { icao: "EDXW", n: "Sylt", lat: 54.91, lon: 8.34 }, 
    "EDHL": { icao: "EDHL", n: "Lübeck", lat: 53.80, lon: 10.71 },
    "LOWI": { icao: "LOWI", n: "Innsbruck", lat: 47.26, lon: 11.34 }, 
    "LOWS": { icao: "LOWS", n: "Salzburg", lat: 47.79, lon: 13.00 },
    "LOWK": { icao: "LOWK", n: "Klagenfurt", lat: 46.64, lon: 14.33 }, 
    "LOWG": { icao: "LOWG", n: "Graz", lat: 46.99, lon: 15.43 },
    "LSZH": { icao: "LSZH", n: "Zürich", lat: 47.46, lon: 8.54 }, 
    "LSGG": { icao: "LSGG", n: "Genf", lat: 46.23, lon: 6.10 },
    "LFSB": { icao: "LFSB", n: "Basel", lat: 47.59, lon: 7.52 }, 
    "LFMN": { icao: "LFMN", n: "Nizza", lat: 43.66, lon: 7.21 },
    "LFML": { icao: "LFML", n: "Marseille", lat: 43.43, lon: 5.21 }, 
    "LFPB": { icao: "LFPB", n: "Paris-Le Bourget", lat: 48.96, lon: 2.44 },
    "LIML": { icao: "LIML", n: "Mailand-Linate", lat: 45.44, lon: 9.27 }, 
    "LIPZ": { icao: "LIPZ", n: "Venedig", lat: 45.50, lon: 12.35 },
    "EDMO": { icao: "EDMO", n: "Oberpfaffenhofen", lat: 48.08, lon: 11.28 }, 
    "EDDM": { icao: "EDDM", n: "München", lat: 48.35, lon: 11.78 }
};

// 2. STANDARD MISSIONEN (A nach B)
const missions = [
    { t: "Business Charter", i: "🧑‍💼", cat: "std", s: "Ein lokaler Unternehmer muss zu einem Meeting. Pünktlichkeit zählt!" },
    { t: "Organtransport", i: "🚑", cat: "std", s: "HÖCHSTE PRIORITÄT: Ein Spenderorgan muss sofort geliefert werden." },
    { t: "AOG Ersatzteil", i: "🔧", cat: "std", s: "Technik-Support: Ein Bauteil für eine gestrandete Maschine am Zielort liefern." },
    { t: "VIP Transfer", i: "🍾", cat: "std", s: "Ein Gast möchte diskret reisen. Komfort einplanen." },
    { t: "Uhren-Logistik", i: "⌚", cat: "std", s: "Wertvolle Fracht. Die Versicherung verlangt eine sanfte Landung." },
    { t: "Hunderettung", i: "🐾", cat: "std", s: "Tiere aus dem Tierschutz zu neuen Besitzern fliegen." },
    { t: "Labor-Kurier", i: "🧪", cat: "std", s: "Zeitkritische biologische Proben. Die Kühlkette ist aktiv." },
    { t: "Horse-Vet", i: "🐎", cat: "std", s: "Ein spezialisierter Tierarzt muss zu einem Notfall auf einem Gestüt." },
    { t: "Gourmet-Trip", i: "🍽️", cat: "std", s: "Zwei Weinkenner fliegen zu einer Verkostung." },
    { t: "Foto-Mission", i: "📸", cat: "std", s: "Luftaufnahmen vom Zielgebiet werden benötigt." },
    { t: "Urgent Mail", i: "📂", cat: "std", s: "Wichtige Dokumente müssen vor Geschäftsschluss zugestellt werden." },
    { t: "Wildlife Research", i: "🦌", cat: "std", s: "Biologen müssen Wildbestände zählen." },
    { t: "Music Producer", i: "🎧", cat: "std", s: "Ein Produzent muss mitsamt Equipment zum Studio." },
    { t: "Castle Tour", i: "🏰", cat: "std", s: "Touristen wollen die berühmten Schlösser sehen." },
    { t: "Medicine Emergency", i: "💊", cat: "std", s: "Spezialmedikamente für eine abgelegene Klinik." },
    { t: "Unexpected Guest", i: "🙋", cat: "std", s: "Ein Überraschungsbesuch bei alten Freunden." },
    { t: "Archive Transport", i: "📜", cat: "std", s: "Alte, wertvolle Dokumente müssen in ein neues Archiv." },
    { t: "Flower Delivery", i: "🌹", cat: "std", s: "Frische Blumen für eine Hochzeit." },
    { t: "Relocation Flight", i: "📦", cat: "std", s: "Jemand zieht um und hat das wichtigste Hab und Gut dabei." },
    { t: "High Priority Courier", i: "📦", cat: "std", s: "Ein extrem wichtiges Paket muss noch heute zugestellt werden." },
    { t: "VFR Night Flight", i: "🌃", cat: "std", s: "Plane eine Landung bei Nacht am Zielort ein." },
    { t: "Glider Tow Pilot", i: "🪂", cat: "std", s: "Überführung eines Schleppflugzeugs zu einem Segelflugplatz." },
    { t: "Training: Stall Practice", i: "🎓", cat: "trn", s: "Übe Power-Off und Power-On Stalls inklusive Recovery." },
    { t: "Training: Steep Turns", i: "🔄", cat: "trn", s: "Führe Steilkurven mit 45° Bankwinkel durch." },
    { t: "Training: Engine Out", i: "🔥", cat: "trn", s: "Simuliere einen Triebwerksausfall und Notlandung." },
    { t: "Training: Slow Flight", i: "🐢", cat: "trn", s: "Bringe die Maschine in den Bereich minimaler Steuerbarkeit." },
    { t: "Training: Pattern Work", i: "🛫", cat: "trn", s: "Absolviere am Zielort drei Touch-and-Go Platzrunden." },
    { t: "Training: Dead Reckoning", i: "🧭", cat: "trn", s: "Navigiere nur mit Stoppuhr und Kompass zum Ziel." },
    { t: "Training: Lazy Eights", i: "♾️", cat: "trn", s: "Perfektioniere deine Koordination mit Lazy Eights." },
    { t: "Training: No-Flap Landing", i: "🚫", cat: "trn", s: "Simuliere Ausfall der Klappen. Lande ohne Flaps." },
    { t: "Training: Crosswind Mastery", i: "💨", cat: "trn", s: "Übe den Wing-Low Anflug für sauberes Aufsetzen." },
    { t: "Training: Emergency Descent", i: "📉", cat: "trn", s: "Simuliere Kabinenbrand. Leite Notabstieg ein." },
    { t: "Training: Radio Check", i: "📻", cat: "trn", s: "Fokus auf perfekte Phraseologie beim Anflug." },
    { t: "Training: Short Field", i: "🏁", cat: "trn", s: "Übe Short-Field-Technik beim Aufsetzen." },
    { t: "Training: Diversion", i: "↪️", cat: "trn", s: "Simuliere eine Streckenänderung kurz vor dem Ziel." },
    { t: "Training: Avionics Failure", i: "📟", cat: "trn", s: "Fliege den Anflug nur mit den Basis-Instrumenten." }
];


// 3. POI MISSIONEN (Rundflüge)
const poiMissions = [
    { t: "Foto-Tour", i: "📸", cat: "poi", s: "Ein Fotograf an Bord braucht die perfekte Perspektive auf das Ziel." },
    { t: "VIP-Sightseeing", i: "🍾", cat: "poi", s: "Fluggäste haben einen Rundflug gebucht, um das Wahrzeichen von oben zu sehen." },
    { t: "Naturwacht", i: "🚁", cat: "poi", s: "Kreise über dem Zielgebiet und dokumentiere Auffälligkeiten für die Behörden." },
    { t: "Luftvermessung", i: "📏", cat: "poi", s: "Fliege in präziser Höhe über das Objekt für topografische Scans." }
];

// 4. FALLBACK POIs (Landmarks & Naturdenkmäler)
const fallbackPOIs = [
    // Deutschland
    { n: "Schloss Neuschwanstein", lat: 47.557, lon: 10.750 },
    { n: "Kölner Dom", lat: 50.941, lon: 6.958 },
    { n: "Berliner Fernsehturm", lat: 52.520, lon: 13.409 },
    { n: "Zugspitze (Gipfel)", lat: 47.421, lon: 10.985 },
    { n: "Burg Hohenzollern", lat: 48.323, lon: 8.967 },
    { n: "Brocken (Harz)", lat: 51.799, lon: 10.615 },
    { n: "Loreley (Rhein)", lat: 50.139, lon: 7.728 },
    { n: "Basteibrücke (Elbsandstein)", lat: 50.961, lon: 14.073 },
    { n: "Hermannsdenkmal", lat: 51.911, lon: 8.839 },
    { n: "Schloss Heidelberg", lat: 49.410, lon: 8.715 },
    { n: "Schweriner Schloss", lat: 53.624, lon: 11.419 },
    { n: "Watzmann (Gipfel)", lat: 47.554, lon: 12.924 },
    { n: "Externsteine", lat: 51.868, lon: 8.917 },
    { n: "Völkerschlachtdenkmal", lat: 51.312, lon: 12.413 },
    { n: "Mummelsee (Schwarzwald)", lat: 48.597, lon: 8.200 },
    { n: "Insel Mainau (Bodensee)", lat: 47.705, lon: 9.195 },
    { n: "Kreidefelsen Rügen", lat: 54.573, lon: 13.664 },
    // Europa
    { n: "Matterhorn (CH)", lat: 45.976, lon: 7.658 },
    { n: "Mont Blanc (FR)", lat: 45.832, lon: 6.865 },
    { n: "Großglockner (AT)", lat: 47.074, lon: 12.693 },
    { n: "Eiffelturm (FR)", lat: 48.858, lon: 2.294 },
    { n: "Mont Saint-Michel (FR)", lat: 48.636, lon: -1.511 },
    { n: "Colosseum Rom (IT)", lat: 41.890, lon: 12.492 },
    { n: "Jungfraujoch (CH)", lat: 46.547, lon: 7.982 },
    { n: "Schloss Schönbrunn (AT)", lat: 48.184, lon: 16.312 },
    { n: "Kreuzbergpass (IT/AT)", lat: 46.656, lon: 12.419 },
    { n: "Viaduc de Millau (FR)", lat: 44.077, lon: 3.022 },
    { n: "Sagrada Familia (ES)", lat: 41.403, lon: 2.174 },
    { n: "Stonehenge (UK)", lat: 51.178, lon: -1.826 },
    { n: "Akropolis Athen (GR)", lat: 37.971, lon: 23.725 }
];
