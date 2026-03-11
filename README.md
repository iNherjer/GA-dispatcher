# GA-Dispatcher-stable

https://inherjer.github.io/GA-dispatcher/

# GA-Dispatcher-Beta

https://inherjer.github.io/GA-Dispatcher-beta/

# 🛩️ GA Dispatcher

Der **GA Dispatcher** ist ein interaktiver, webbasierter Flugdienstleiter für General Aviation (GA) Piloten in Flugsimulatoren (MSFS, X-Plane, etc.). Wenn du mal wieder nicht weißt, wohin du fliegen sollst, generiert dir dieses Tool realistische, abwechslungsreiche und immersive Flugaufträge.

## ✨ Kernfunktionen

* **Dynamischer Missions-Generator:** Generiert zufällige A-nach-B Flüge oder Sightseeing-Rundflüge (POIs) basierend auf deinen Vorgaben (Distanz, Region, Himmelsrichtung).
* **Gemini KI-Integration (Dual-AI):** Verbindet echte geografische Wikipedia-Daten mit modernsten Gemini-Modellen (Gemini 3.0 Flash, 2.5 Flash & Lite), um einzigartige, kreative Briefings zu schreiben (inklusive Passagiere, Fracht und lokaler Storys).
* **☁️ Cloud Sync & Multiplayer (Crew Board):** Synchronisiere dein Logbuch und deine Pinnwand geräteübergreifend (PC/iPad) dank smarter Idle-Konflikterkennung. Gründe eine Crew und teile Flugaufträge in Echtzeit auf dem Multiplayer-Brett mit deinen Freunden.
* **📊 Vertikales Profil & Lufträume:** Berechnet ein interaktives Höhenprofil inklusive Terrain (TOC/TOD) und warnt live vor VFR-Lufträumen (OpenAIP) auf deiner Route. Setze eigene Höhen-Wegpunkte, um Sektoren präzise zu unterfliegen.
* **🌤️ Visual METAR Widgets:** Ruft aktuelles Flugwetter ab und visualisiert es mit animierten Wind-Instrumenten und Pisten-Ausrichtung direkt im Briefing.
* **Drei interaktive Cockpit-Themes:**
  * **Modern:** Cleanes, schnelles UI.
  * **Analog:** Authentisches 60er-Jahre Retro-Feeling mit mechanischen Trommelzählwerken.
  * **NavCom:** Eine vollständige Bendix/King Radio-Stack Simulation (inklusive voll funktionsfähigem KLN 90B GPS-Display, KMA Audio-Panel und Drag-Drehreglern).
* **Interaktiver Kartentisch (Map Table) & OpenAIP Snapping:** * VFR-Overlay (Lufträume) und verschiedene Basiskarten (Topografie, Satellit).
  * Wegpunkte lassen sich per Drag & Drop auf der Route hinzufügen.
  * **🧲 Magnetisches Snapping:** Wegpunkte rasten automatisch an echten VORs, Pflichtmeldepunkten (Reporting Points) und Flugplätzen ein.
  * Integriertes Messwerkzeug (Zirkel) für Distanzen und Kurse.
* **📄 PDF Briefing Pack Export:** Generiere mit einem Klick ein komplettes, mehrseitiges Kniebrett-PDF für deinen Flug – inklusive detailliertem Nav-Log, Spritberechnung, Profil und Pisten-Infos.
* **Hangar-Pinnwand:** Ein visuelles schwarzes Brett, um sich Notizen zu machen oder generierte Flüge für später zu speichern.

---

## 🚀 Kurzanleitung / Bedienung

### 1. Flugzeug & Startplatz vorbereiten
1. Gib oben links unter **Start / DEP** deinen aktuellen ICAO-Code (z.B. `EDTW`) ein. 
2. Das Feld **Ziel / DEST** kannst du leer lassen (für einen komplett zufälligen Flug) oder einen konkreten Platz eingeben, wenn du nur die Routen- und KI-Briefing-Funktion nutzen willst.
3. Wähle ein **Flugzeug-Preset** (C172, PA24, AERO) oder stelle deine Reise-Geschwindigkeit (TAS) und den Verbrauch (GPH) manuell über die Slider (bzw. die Drehknöpfe im NavCom-Theme) ein.

### 2. Auftrags-Parameter wählen (Optional)
* **Typ:** Wähle zwischen `Flugplatz (A ➔ B)` oder `POI (Rundflug)`. Bei einem POI landest du wieder am Startplatz.
* **Distanz:** Grenze ein, ob du nur einen kurzen Hüpfer (`Short`) oder einen langen Streckenflug (`Long`) machen willst.
* **Region & Richtung:** Bestimme, ob du in Deutschland bleibst, ins Ausland fliegst und in welche Himmelsrichtung der Dispatcher suchen soll.

### 3. Dispatch! (Auftrag generieren)
Klicke auf **Auftrag generieren** (oder `DISPATCH` im NavCom-Theme). Das System:
* Sucht einen passenden Flugplatz oder POI in der Datenbank.
* Ruft Wikipedia-Daten & METAR-Wetter für das Ziel ab.
* Kontaktiert (falls aktiviert) die Gemini KI für ein authentisches Briefing.
* Präsentiert dir auf dem Klemmbrett (bzw. dem GPS-Display) alle Routendaten, Funkfeuer-Kurse, Spritberechnungen und Wetter-Widgets.

### 4. Flugplanung am Kartentisch
Klicke auf **🗺️ Kartentisch**, um deine Route zu verfeinern:
* Nutze das **🧲 Snapping**, um Wegpunkte (durch Ziehen der roten Linie) magisch an reale VORs oder Flughäfen andocken zu lassen.
* Aktiviere das **📊 Profil**, um das Terrain zu analysieren. Klicke doppelt auf die Fluglinie im Profil, um **Höhen-Wegpunkte** zu erstellen und Lufträumen auszuweichen.

### 5. Exportieren, Loggen & Speichern
* **Drucken:** Klicke auf das Dokumenten-Symbol (📄) auf dem Klemmbrett, um dir dein **Briefing Pack als PDF** herunterzuladen.
* **Loggen:** Flug absolviert? Klicke unten auf **✈️ Flug loggen & Startplatz setzen**. Dein Flug landet im Logbuch und dein Startplatz für die nächste Session ist nun dein aktueller Standort.

### 6. ☁️ Cloud Sync & Multiplayer
* **Geräte synchronisieren:** Generiere dir unten in den Settings eine **Pilot-ID (🎲)**. Trage sie an all deinen Geräten ein. Die App gleicht deine Daten (Logbuch, aktiver Flug, private Zettel) automatisch ab. Eine intelligente Idle-Detection verhindert Datenverlust, falls du Tabs offen vergisst.
* **Crew Board:** Tritt einer Gruppe bei (z.B. Crew-Code `EDTK`) und vergib dir einen Rufnamen. Wenn du einen Flug ans Brett pinnst (📌), kannst du ihn ab sofort mit einem Klick live auf das Multiplayer-Brett deiner Freunde heften!

---

## 🤖 KI-Feature aktivieren (Gemini API)
Um die volle Magie der dynamischen Briefings zu nutzen, kannst du dir kostenlos einen API Key von Google holen:
1. Gehe zu [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Erstelle einen API Key.
3. Füge diesen Key im GA Dispatcher ganz unten in das Feld **"KI-Dispatcher (Gemini API)"** ein.

*Hinweis: Der Key wird extrem sicher und ausschließlich lokal in deinem eigenen Browser gespeichert.* Das "Fuel-Meter" unten links zeigt dir an, wie viel deiner täglichen KI-Quota du bereits verbraucht hast. Das System fällt automatisch auf leichtere Modelle oder die lokale Offline-Datenbank zurück, falls Limits erreicht werden.
