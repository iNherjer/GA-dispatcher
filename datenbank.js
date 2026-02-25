// ==========================================
// GA DISPATCHER - DATENBANK
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
