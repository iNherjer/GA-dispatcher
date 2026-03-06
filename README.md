# GA-Dispatcher-stable

https://inherjer.github.io/GA-dispatcher/

# GA-Dispatcher-Beta

https://inherjer.github.io/GA-Dispatcher-beta/

# 🛩️ GA Dispatcher

Der **GA Dispatcher** ist ein interaktiver, webbasierter Flugdienstleiter für General Aviation (GA) Piloten in Flugsimulatoren (MSFS, X-Plane, etc.). Wenn du mal wieder nicht weißt, wohin du fliegen sollst, generiert dir dieses Tool realistische, abwechslungsreiche und immersive Flugaufträge.

## ✨ Kernfunktionen

* **Dynamischer Missions-Generator:** Generiert zufällige A-nach-B Flüge oder Sightseeing-Rundflüge (POIs) basierend auf deinen Vorgaben (Distanz, Region, Himmelsrichtung).
* **Gemini KI-Integration:** Verbindet echte geografische Wikipedia-Daten mit der Gemini KI, um einzigartige, kreative Briefings zu schreiben (inklusive Passagiere, Fracht und lokaler Storys).
* **Drei interaktive Cockpit-Themes:**
  * **Modern:** Cleanes, schnelles UI.
  * **Analog:** Authentisches 60er-Jahre Retro-Feeling mit mechanischen Trommelzählwerken.
  * **NavCom:** Eine vollständige Bendix/King Radio-Stack Simulation (inklusive voll funktionsfähigem KLN 90B GPS-Display, Audio-Panel und interaktiven Drehreglern).
* **Interaktiver Kartentisch (Map Table):** * VFR-Overlay (Lufträume) und verschiedene Basiskarten (Topografie, Satellit).
  * Wegpunkte lassen sich per Drag & Drop auf der Route hinzufügen.
  * Integriertes Messwerkzeug (Zirkel) für Distanzen und Kurse.
* **Hangar-Pinnwand:** Ein visuelles schwarzes Brett, um sich Notizen zu machen oder coole Flugaufträge als Post-Its (inklusive Polaroid-Minimap) für später zu speichern.
* **Community-Export:** Teile spannende generierte Missionen über einen Code direkt mit deinen Freunden oder im Discord.
* **Logbuch:** Ein integriertes Flugbuch speichert deine absolvierten Flüge und setzt deinen neuen Startplatz automatisch auf das letzte Ziel.

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
* Ruft Wikipedia-Daten für das Ziel ab.
* Kontaktiert (falls aktiviert) die Gemini KI für ein authentisches Briefing.
* Präsentiert dir auf dem Klemmbrett (bzw. dem GPS-Display) alle Routendaten, Funkfeuer-Kurse, Spritberechnungen und Wetter-Links (METAR/AIP).

### 4. Flugplanung am Kartentisch
Klicke auf **🗺️ Kartentisch**, um deine Route auf der VFR-Karte zu sehen.
* Klicke irgendwo auf die rote Routen-Linie, um einen neuen **Wegpunkt** zu erstellen.
* Ziehe den Wegpunkt mit der Maus an die gewünschte Stelle (z.B. um Lufträume zu umfliegen). Die Distanzen und Spritberechnungen aktualisieren sich live im Hintergrund.
* Nutze das **Messwerkzeug (📏)**, um schnell Distanzen und Kurse (Headings) zwischen zwei Orten auf der Karte auszumessen.

### 5. Loggen & Speichern
* Keine Zeit den Flug jetzt zu fliegen? Klicke auf der Briefing-Seite auf die Stecknadel (📌), um ihn an die **Pinnwand** zu heften.
* Flug absolviert? Klicke unten auf **✈️ Flug loggen & Startplatz setzen**. Dein Flug landet im Logbuch und dein Startplatz für die nächste Session ist nun dein aktueller Standort.

---

## 🤖 KI-Feature aktivieren (Gemini API)
Um die volle Magie der dynamischen Briefings zu nutzen, kannst du dir kostenlos einen API Key von Google holen:
1. Gehe zu [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Erstelle einen API Key.
3. Füge diesen Key im GA Dispatcher ganz unten in das Feld **"KI-Dispatcher (Gemini API)"** ein.
*Hinweis: Der Key wird ausschließlich lokal in deinem eigenen Browser gespeichert.* Das "Fuel-Meter" unten links zeigt dir an, wie viel deiner täglichen kostenlosen KI-Quota du bereits verbraucht hast.
