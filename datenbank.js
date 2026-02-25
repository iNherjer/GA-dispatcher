// ==========================================
// GA DISPATCHER - DATENBANK V46.1 (CLUB & LEISURE UPDATE)
// ==========================================

// 1. CORE AIRPORTS (Fallback & Europa-Fokus)
const coreDB = { 
    "EDTW": { icao: "EDTW", n: "Winzeln-Schramberg", lat: 48.279, lon: 8.428 }, 
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

// 2. STANDARD MISSIONEN (A nach B - Flugplätze)
const missions = [
    // === VEREINS- UND PRIVATFLIEGEREI (NEU!) ===
    { t: "$100 Hamburger", i: "🍔", cat: "std", s: "Zeit für den klassischen Burger-Run! Das Flugplatz-Restaurant am Ziel soll fantastisch sein." },
    { t: "Tagesausflug", i: "🎒", cat: "std", s: "Einfach mal raus! Schnapp dir Freunde oder Familie für einen entspannten Tag am Zielort." },
    { t: "Städtetrip", i: "🏙️", cat: "std", s: "Ein Wochenende in der Stadt. Parke die Maschine am GAT, bestell ein Taxi und ab ins Hotel." },
    { t: "Flugplatzfest-Logistik", i: "🎉", cat: "std", s: "Unser Vereinsfest steht an! Du musst dringend noch Banner, Biertischgarnituren und Equipment vom Nachbarverein holen." },
    { t: "Teile für die Vereinsmaschine", i: "⚙️", cat: "std", s: "Die Vereins-Cessna hat einen defekten Magnetos. Hol das neue Bauteil beim Avionik-Shop am Zielplatz ab." },
    { t: "Kollegen-Hilfe", i: "🔑", cat: "std", s: "Ein Vereinsmitglied musste die Maschine wegen Schlechtwetter stehen lassen. Flieg hin und bring sie heim!" },
    { t: "Piloten-Stammtisch", i: "🍻", cat: "std", s: "Treffen mit befreundeten Piloten aus der Region am Zielplatz. Alkoholfreies Bier für den Rückflug ist gebongt!" },
    { t: "Fly-In Event", i: "🎪", cat: "std", s: "Großes GA-Treffen (Fly-In) am Zielort. Mach dich auf viel Traffic in der Platzrunde gefasst und halte die Augen offen!" },
    { t: "Kuchen-Express", i: "🍰", cat: "std", s: "Die legendäre Schwarzwälder Kirschtorte vom Flugplatzcafé am Zielort ruft. Ein reiner Genussflug!" },
    
    // === BUSINESS & LOGISTIK ===
    { t: "Business Charter", i: "🧑‍💼", cat: "std", s: "Ein lokaler Unternehmer muss zu einem Meeting. Pünktlichkeit zählt!" },
    { t: "Organtransport", i: "🚑", cat: "std", s: "HÖCHSTE PRIORITÄT: Ein Spenderorgan muss sofort geliefert werden." },
    { t: "AOG Ersatzteil", i: "🔧", cat: "std", s: "Technik-Support: Ein großes Bauteil für einen gestrandeten Airliner am Zielort liefern." },
    { t: "VIP Transfer", i: "🍾", cat: "std", s: "Ein VIP möchte diskret reisen. Achte auf sanfte Manöver und maximalen Komfort." },
    { t: "Uhren-Logistik", i: "⌚", cat: "std", s: "Wertvolle Luxusuhren an Bord. Die Versicherung verlangt eine butterweiche Landung." },
    { t: "Hunderettung", i: "🐾", cat: "std", s: "Tiere aus dem Tierschutz zu neuen Besitzern fliegen. Vermeide starke Turbulenzen." },
    { t: "Labor-Kurier", i: "🧪", cat: "std", s: "Zeitkritische biologische Proben. Die Kühlkette ist aktiv, beeil dich." },
    { t: "Horse-Vet", i: "🐎", cat: "std", s: "Ein spezialisierter Tierarzt muss zu einem dringenden Notfall auf einem Gestüt." },
    { t: "Urgent Mail", i: "📂", cat: "std", s: "Vertrauliche Verträge müssen vor Geschäftsschluss persönlich übergeben werden." },
    { t: "Music Producer", i: "🎧", cat: "std", s: "Ein Produzent muss mitsamt empfindlichem Equipment dringend zum Studio." },
    { t: "Medicine Emergency", i: "💊", cat: "std", s: "Spezialmedikamente für eine abgelegene Klinik. Jede Minute zählt." },
    { t: "Archive Transport", i: "📜", cat: "std", s: "Alte, wertvolle historische Dokumente müssen in ein neues Archiv umziehen." },
    { t: "Flower Delivery", i: "🌹", cat: "std", s: "Frische exotische Blumen für eine große Hochzeit. Heizung im Cockpit anpassen!" },
    { t: "Relocation Flight", i: "📦", cat: "std", s: "Jemand zieht in eine andere Stadt und hat sein wichtigstes Hab und Gut dabei." },
    { t: "Skydiver Drop", i: "🪂", cat: "std", s: "Bringe ein Team von Fallschirmspringern zum Zielplatz für einen Event-Sprung." },
    { t: "Art Transfer", i: "🖼️", cat: "std", s: "Ein wertvolles Gemälde wird zu einer Galerie geflogen. Vermeide G-Kräfte." },
    { t: "Ferry Flight", i: "🛠️", cat: "std", s: "Die Maschine muss zur großen Jahresnachprüfung (JNP) in die Werft." },
    { t: "Casino Run", i: "🎰", cat: "std", s: "High-Roller wollen einen Abend im Casino verbringen. Geld spielt keine Rolle." },
    { t: "VFR Night Flight", i: "🌃", cat: "std", s: "Plane eine Landung bei Nacht am Zielort ein (NVFR)." },
    { t: "Glider Tow Pilot", i: "🪂", cat: "std", s: "Überführung eines Schleppflugzeugs zu einem Segelflugplatz für die Saison." },

    // === TRAININGS-MISSIONEN (nur < 50 NM) ===
    { t: "Training: Stall Practice", i: "🎓", cat: "trn", s: "Übe Power-Off und Power-On Stalls inklusive Recovery auf dem Weg." },
    { t: "Training: Steep Turns", i: "🔄", cat: "trn", s: "Führe Steilkurven mit 45° Bankwinkel durch, halte die Höhe!" },
    { t: "Training: Engine Out", i: "🔥", cat: "trn", s: "Simuliere einen Triebwerksausfall und eine Notlandung im Feld." },
    { t: "Training: Slow Flight", i: "🐢", cat: "trn", s: "Bringe die Maschine in den Bereich minimaler Steuerbarkeit (MCA)." },
    { t: "Training: Pattern Work", i: "🛫", cat: "trn", s: "Absolviere am Zielort drei saubere Touch-and-Go Platzrunden." },
    { t: "Training: Dead Reckoning", i: "🧭", cat: "trn", s: "Navigiere nur mit Stoppuhr, Karte und Kompass zum Ziel. GPS aus!" },
    { t: "Training: Lazy Eights", i: "♾️", cat: "trn", s: "Perfektioniere deine Ruder-Koordination mit Lazy Eights." },
    { t: "Training: No-Flap Landing", i: "🚫", cat: "trn", s: "Simuliere einen Ausfall der Klappen. Lande am Zielort ohne Flaps." },
    { t: "Training: Crosswind Mastery", i: "💨", cat: "trn", s: "Übe den Wing-Low Anflug für ein sauberes Aufsetzen auf einem Rad." },
    { t: "Training: Emergency Descent", i: "📉", cat: "trn", s: "Simuliere einen Kabinenbrand. Leite sofort einen Notabstieg ein." },
    { t: "Training: Diversion", i: "↪️", cat: "trn", s: "Simuliere schlechtes Wetter am Ziel. Plane im Flug spontan auf einen Alternate um." },
    { t: "Training: Avionics Failure", i: "📟", cat: "trn", s: "Decke das GPS ab. Fliege den Anflug nur nach Sicht, Karte und Kompass." },
    { t: "Flight Review (BFR)", i: "📝", cat: "trn", s: "Ein Fluglehrer ist an Bord. Fliege sauber, halte deine Höhen und Kurse exakt." }
];

// 3. POI MISSIONEN (Rundflüge & Landmarks)
const poiMissions = [
    { t: "Foto-Tour", i: "📸", cat: "poi", s: "Ein Fotograf an Bord braucht die perfekte Perspektive auf das Ziel. Fliege ruhige Kreise." },
    { t: "VIP-Sightseeing", i: "🍾", cat: "poi", s: "Fluggäste haben einen exklusiven Rundflug gebucht, um das Wahrzeichen von oben zu sehen." },
    { t: "Naturwacht", i: "🚁", cat: "poi", s: "Kreise über dem Zielgebiet und dokumentiere Waldschäden für das Forstamt." },
    { t: "Luftvermessung", i: "📏", cat: "poi", s: "Fliege in präziser, konstanter Höhe über das Objekt für topografische Lidar-Scans." },
    { t: "Wildlife Research", i: "🦌", cat: "poi", s: "Biologen müssen Wildbestände zählen. Überfliege das Zielgebiet in 1000ft AGL." },
    { t: "Castle Tour", i: "🏰", cat: "poi", s: "Touristen wollen die historische Anlage von oben bewundern. Bereite eine schöne Ansicht vor." },
    { t: "Pipeline Patrol", i: "🛢️", cat: "poi", s: "Überprüfe die Trasse nahe des Ziels auf Lecks oder illegale Bauarbeiten." },
    { t: "Traffic Reporting", i: "📻", cat: "poi", s: "Ein Radiosender braucht einen Verkehrsbericht von den Straßen rund um das Zielgebiet." },
    { t: "Real Estate Survey", i: "🏡", cat: "poi", s: "Ein Immobilienmakler möchte Luftaufnahmen vom Gebiet für ein großes Portfolio." },
    { t: "Police Support", i: "🚓", cat: "poi", s: "Die Polizei sucht eine vermisste Person in der Nähe des POIs. Unterstütze aus der Luft." }
];

// 4. FALLBACK POIs (Fokus D-A-CH & Schwarzwald)
const fallbackPOIs = [
    // === LOKAL: Schwarzwald & BaWü ===
    { n: "Triberger Wasserfälle", lat: 48.127, lon: 8.227 },
    { n: "Feldberg (Gipfel)", lat: 47.873, lon: 8.004 },
    { n: "Titisee", lat: 47.896, lon: 8.148 },
    { n: "Schluchsee", lat: 47.818, lon: 8.181 },
    { n: "Burg Hohengeroldseck", lat: 48.338, lon: 7.979 },
    { n: "Vogtsbauernhof (Gutach)", lat: 48.270, lon: 8.199 },
    { n: "Europapark Rust", lat: 48.266, lon: 7.721 },
    { n: "Burg Hohenzollern", lat: 48.323, lon: 8.967 },
    { n: "Schloss Sigmaringen", lat: 48.087, lon: 9.216 },
    { n: "Insel Mainau (Bodensee)", lat: 47.705, lon: 9.195 },
    { n: "Burg Meersburg", lat: 47.693, lon: 9.271 },
    { n: "Mummelsee (Schwarzwald)", lat: 48.597, lon: 8.200 },
    { n: "Schloss Heidelberg", lat: 49.410, lon: 8.715 },
    { n: "Burg Teck", lat: 48.588, lon: 9.470 },
    
    // === DEUTSCHLAND NATIONAL ===
    { n: "Schloss Neuschwanstein", lat: 47.557, lon: 10.750 },
    { n: "Zugspitze (Gipfel)", lat: 47.421, lon: 10.985 },
    { n: "Watzmann (Gipfel)", lat: 47.554, lon: 12.924 },
    { n: "Kölner Dom", lat: 50.941, lon: 6.958 },
    { n: "Berliner Fernsehturm", lat: 52.520, lon: 13.409 },
    { n: "Brandenburger Tor", lat: 52.516, lon: 13.377 },
    { n: "Brocken (Harz)", lat: 51.799, lon: 10.615 },
    { n: "Loreley (Rhein)", lat: 50.139, lon: 7.728 },
    { n: "Burg Eltz", lat: 50.205, lon: 7.336 },
    { n: "Basteibrücke (Elbsandstein)", lat: 50.961, lon: 14.073 },
    { n: "Frauenkirche Dresden", lat: 51.052, lon: 13.741 },
    { n: "Hermannsdenkmal", lat: 51.911, lon: 8.839 },
    { n: "Schweriner Schloss", lat: 53.624, lon: 11.419 },
    { n: "Externsteine", lat: 51.868, lon: 8.917 },
    { n: "Völkerschlachtdenkmal", lat: 51.312, lon: 12.413 },
    { n: "Kreidefelsen Rügen", lat: 54.573, lon: 13.664 },
    { n: "Elbphilharmonie Hamburg", lat: 53.541, lon: 9.984 },
    { n: "Walhalla (Regensburg)", lat: 49.031, lon: 12.212 },
    { n: "Zeche Zollverein", lat: 51.486, lon: 7.046 },

    // === SCHWEIZ & ÖSTERREICH (D-A-CH) ===
    { n: "Matterhorn (CH)", lat: 45.976, lon: 7.658 },
    { n: "Jungfraujoch (CH)", lat: 46.547, lon: 7.982 },
    { n: "Rheinfall (CH)", lat: 47.677, lon: 8.615 },
    { n: "Aletschgletscher (CH)", lat: 46.463, lon: 8.037 },
    { n: "Großglockner (AT)", lat: 47.074, lon: 12.693 },
    { n: "Schloss Schönbrunn (AT)", lat: 48.184, lon: 16.312 },
    { n: "Festung Hohensalzburg (AT)", lat: 47.795, lon: 13.047 },
    
    // === EUROPA ===
    { n: "Mont Blanc (FR)", lat: 45.832, lon: 6.865 },
    { n: "Eiffelturm (FR)", lat: 48.858, lon: 2.294 },
    { n: "Mont Saint-Michel (FR)", lat: 48.636, lon: -1.511 },
    { n: "Viaduc de Millau (FR)", lat: 44.077, lon: 3.022 },
    { n: "Colosseum Rom (IT)", lat: 41.890, lon: 12.492 },
    { n: "Vesuv (IT)", lat: 40.822, lon: 14.426 },
    { n: "Ätna (IT)", lat: 37.751, lon: 14.993 },
    { n: "Sagrada Familia (ES)", lat: 41.403, lon: 2.174 },
    { n: "Stonehenge (UK)", lat: 51.178, lon: -1.826 },
    { n: "Akropolis Athen (GR)", lat: 37.971, lon: 23.725 }
];
