---
tags: [training, app, anleitung]
erstellt: 2026-10-22
---

# Trainingslog-App einrichten (iPhone, eigenständig)

Die App läuft ohne Claude und ohne Claude-Leiste. Sie besteht aus zwei Teilen:

| Teil | Wo | Aufgabe |
|---|---|---|
| **Schnittstelle** (`Api.gs`) | Zusätzliche Datei im Apps Script deines Sheets (neben deinem `Code.gs`) | Liest Plan und Log, schreibt Sätze ins Blatt „Trainingslog“ |
| **App** (`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`) | GitHub Pages | Oberfläche auf dem iPhone, funktioniert auch offline |

Dauer: ca. 15–20 Minuten, einmalig. Steht am besten am Rechner, Schritt 4 dann am iPhone.

---

## 1. Schnittstelle im Sheet anlegen

> [!important] Dein bestehender Code bleibt
> Die Schnittstelle kommt in eine **zusätzliche Datei** `Api.gs`. Dein vorhandenes `Code.gs` (Button „neues Training“) wird nicht verändert.

1. Sheet **Trainingslog** öffnen → **Erweiterungen → Apps Script**. Du siehst dein bestehendes `Code.gs`.
2. *(Geprüft: Dein `workoutEintragen()` und `Api.gs` vertragen sich, es gibt keine Namenskonflikte.)*
3. Links bei **Dateien** auf **+** → **Script** → Name `Api` (Apps Script hängt `.gs` selbst an).
4. Den Platzhalter-Inhalt der neuen Datei löschen und den kompletten Inhalt der mitgelieferten `Api.gs` einfügen. Speichern (⌘S).
5. In der Funktionsauswahl oben **`setupKey`** wählen (die Datei `Api.gs` muss dafür geöffnet sein) → **Ausführen**.
6. Google fragt eventuell nach zusätzlichen Berechtigungen:
   - **Berechtigungen prüfen** → dein Konto wählen.
   - Bei „Google hat diese App nicht überprüft“: **Erweitert** → **Zu … wechseln (unsicher)** → **Zulassen**. Das ist normal bei eigenen Scripts.
7. Unten im **Ausführungsprotokoll** steht: `Dein App-Schlüssel: …` → diesen Schlüssel kopieren.
8. Kurz testen, ob dein Button im Sheet noch wie gewohnt funktioniert.

> [!warning] Schlüssel = Passwort
> Wer Schlüssel und URL kennt, kann dein Trainingslog lesen und beschreiben. Nicht öffentlich ablegen. Wenn er doch mal irgendwo landet: `setupKey` erneut ausführen und den neuen Schlüssel in der App eintragen.

## 2. Schnittstelle bereitstellen

1. Rechts oben **Bereitstellen → Neue Bereitstellung**.
2. Zahnrad neben „Typ auswählen“ → **Web-App**.
3. Einstellungen:
   - Beschreibung: `v1`
   - **Ausführen als: Ich**
   - **Zugriff: Jeder** *(nötig, damit die App ohne Google-Anmeldung zugreifen kann; geschützt wird über den Schlüssel)*
4. **Bereitstellen** → die **Web-App-URL** kopieren (endet auf `/exec`).

**Test im Browser:** `DEINE_URL?action=ping&key=DEIN_SCHLÜSSEL` öffnen → es muss `{"ok":true}` erscheinen.

Schlüssel und URL z. B. in einer privaten Apple-Notiz ablegen. Die brauchst du gleich auf dem iPhone.

## 3. App auf GitHub Pages veröffentlichen

1. Auf github.com → **New repository**
   - Name: `trainingslog`
   - **Public** (GitHub Pages ist im kostenlosen Plan nur für öffentliche Repos verfügbar. Im Repo liegen keine Daten, keine URL und kein Schlüssel, nur die App-Oberfläche.)
   - **Create repository**
2. Auf der leeren Repo-Seite: **uploading an existing file** anklicken.
3. Den **Inhalt** des Ordners `trainingslog-app` hineinziehen (also `index.html`, `sw.js`, `manifest.webmanifest` und den Ordner `icons`, nicht den Ordner `trainingslog-app` selbst) → **Commit changes**.
4. **Settings → Pages** → Source: **Deploy from a branch** → Branch **main**, Ordner **/ (root)** → **Save**.
5. Nach 1–2 Minuten ist die App erreichbar unter
   `https://DEIN-GITHUB-NAME.github.io/trainingslog/`

> [!tip] Schneller Weg
> Leg nur das leere Repo `trainingslog` an und sag Claude Bescheid. Dann kann Claude die Dateien direkt hochladen, falls du den Zugriff erlaubst.

## 4. Auf dem iPhone installieren

1. Die GitHub-Pages-URL in **Safari** öffnen.
2. **Teilen-Symbol** → **Zum Home-Bildschirm** → Name „Training“ → **Hinzufügen**.
3. Die App **über das neue Icon** starten (wichtig: nicht in Safari einrichten, das installierte Icon hat einen eigenen Speicher).
4. Web-App-URL und Schlüssel aus der Notiz einfügen → **Verbinden**.

Fertig. Die App öffnet sich als Vollbild ohne Browser- oder Claude-Leiste.

## 5. Erster Test

1. Eine Übung mit einem Satz eintragen → **Speichern**.
2. Im Sheet prüfen: Neue Zeile unten im Blatt „Trainingslog“, Datum als `TT.MM.JJJJ`, Zahlen als Zahlen.
3. Den Satz in der App ändern und erneut speichern → im Sheet wird dieselbe Zeile aktualisiert, keine neue angehängt.

---

## So funktioniert die App

- **Zusammen mit dem Button:** Legst du ein Training per Button im Sheet an, erkennt die App die leeren Zeilen und füllt genau diese aus, statt neue anzuhängen. Leere, nie ausgefüllte Button-Zeilen zählen nicht als „letztes Mal“.

- **Eintragen:** Datum ist heute, Workout A/B wird automatisch im Wechsel vorgeschlagen. Übungen kommen aus dem Blatt „Trainingsplan“.
- **Speichern** legt den Eintrag sofort auf dem iPhone ab und überträgt ihn dann ins Sheet. Ohne Netz wartet er und wird automatisch gesendet, sobald wieder Verbindung besteht. Status steht unter dem Header („Synchron“ / „1 Einheit wartet“).
- **Keine Duplikate:** Gibt es für Datum + Workout + Übung schon eine Zeile, wird sie überschrieben.
- **Aktualisieren** holt den neuesten Stand aus dem Sheet, z. B. nach Änderungen am Rechner.
- **Verlauf** zeigt die letzten 30 Einheiten. Noch nicht übertragene Einträge sind mit „wartet“ markiert.
- **Verbindung ändern** (unten auf der Seite) für neue URL oder neuen Schlüssel.

Die Artifact-Version in Claude funktioniert parallel weiter. Beide schreiben in dasselbe Sheet.

## Update auf V2 (Auswahlräder + Statistik)

Am Apps Script (`Api.gs`) ändert sich nichts. Nur die App-Dateien auf GitHub tauschen:

1. Im Repo `trainingslog` auf **Add file → Upload files**.
2. `index.html` und `sw.js` aus dem Ordner `trainingslog-app` hochladen (vorhandene werden ersetzt) → **Commit changes**.
3. 1–2 Minuten warten, dann die App auf dem iPhone **zweimal** öffnen: Beim ersten Öffnen lädt sie die neue Version im Hintergrund, beim zweiten ist sie aktiv. Notfalls die App im App-Umschalter schließen und neu starten.

**Neu in V2**
- **Auswahlräder** für Gewicht und Wiederholungen. Das Rad öffnet beim „–“ direkt vor deinem Wert vom letzten Mal: ein Wisch, fertig. Die Gewichtsschritte richten sich nach deiner Historie je Übung (z. B. 5 kg am Kabelzug, 0,5 kg beim Seitheben). Ganz unten: **„Anderer Wert …“** für freie Eingabe.
- **„Werte vom … übernehmen“** füllt Gewichte *und* Wiederholungen vom letzten Mal in alle leeren Sätze.
- **Statistik-Tab** wie dein Sheet-Dashboard: Workouts, Gesamtvolumen, letzte 4 Wochen im Vergleich, Volumen pro Einheit (A/B), Volumen pro Woche oder Monat, Kraftentwicklung je Übung (schwerster Satz). Antippen oder wischen zeigt die Werte.

## Updates

**App-Oberfläche ändern:** Geänderte Datei im GitHub-Repo ersetzen und in `sw.js` die Zeile `VERSION = "trainingslog-v1"` hochzählen (`v2` …). Die App lädt die neue Version beim nächsten Öffnen mit Netz. Notfalls App einmal schließen und neu starten.

**Apps Script ändern:** Inhalt von `Api.gs` ersetzen, speichern, dann **Bereitstellen → Bereitstellungen verwalten → Bearbeiten (Stift) → Version: Neue Version → Bereitstellen**. So bleibt die URL gleich. Eine *neue* Bereitstellung würde eine neue URL erzeugen.

## Fehlerbehebung

| Meldung / Problem | Ursache | Lösung |
|---|---|---|
| „Der Schlüssel passt nicht“ | Tippfehler oder `setupKey` erneut ausgeführt | Schlüssel aus dem Protokoll neu eintragen |
| „Unter dieser URL antwortet kein Trainingslog-Script“ | Falsche URL (z. B. Editor-URL statt `/exec`) | URL aus *Bereitstellungen verwalten* kopieren |
| „Google ist gerade nicht erreichbar“, dauerhaft | Bereitstellung steht nicht auf „Zugriff: Jeder“ | Bereitstellung bearbeiten, Zugriff auf „Jeder“ |
| „Im Apps Script fehlt noch der Schlüssel“ | `setupKey` nie ausgeführt | Schritt 1.5 nachholen |
| Speichern dauert 1–3 Sekunden | Normal bei Apps Script | Der Eintrag ist sofort lokal gesichert |
| Neue Übung erscheint nicht | Fehlt im Blatt „Trainingsplan“ | Übung dort ergänzen, in der App „Aktualisieren“ |
| Fehler „Identifier has already been declared“ beim Speichern | Name kommt in deinem `Code.gs` schon vor | Claude Bescheid geben |
| App zeigt alte Version | Cache | `VERSION` in `sw.js` hochzählen, App neu starten |
