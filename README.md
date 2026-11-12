# Trainingslog-App

iPhone-Web-App (PWA) als Frontend für das Google Sheet **Trainingslog**. Läuft eigenständig über GitHub Pages, liest Trainingsplan und Log und schreibt Sätze direkt ins Sheet. Funktioniert auch offline.

## Aufbau

| Pfad | Zweck | Wo es läuft |
|---|---|---|
| `index.html` | Die komplette App (Oberfläche + Logik) | GitHub Pages |
| `sw.js` | Offline-Cache. **Bei jeder Änderung `VERSION` hochzählen** | GitHub Pages |
| `manifest.webmanifest`, `icons/` | Name und Icon auf dem Home-Bildschirm | GitHub Pages |
| `apps-script/Api.gs` | Schnittstelle zum Sheet (Lesen/Schreiben) | Apps Script im Sheet, **neben** dem bestehenden `Code.gs` |
| `docs/Einrichtung.md` | Ersteinrichtung Schritt für Schritt | – |
| `docs/APP-STANDARD.md` | Gemeinsamer Design- und Technik-Standard der drei Apps (hell/dunkel, Einstellungen, Versionen) | – |

Im Repo liegen **keine** Zugangsdaten. Web-App-URL und Schlüssel werden nur in der installierten App auf dem iPhone gespeichert.

## Update veröffentlichen

1. Dateien ändern.
2. In `sw.js` die Zeile `const VERSION = "trainingslog-vN"` um eins erhöhen.
3. Committen und pushen:
   ```bash
   git add -A
   git commit -m "Kurze Beschreibung"
   git push
   ```
4. Nach 1–2 Minuten ist die neue Version online. App auf dem iPhone **zweimal** öffnen.

**Änderungen an `apps-script/Api.gs`** landen nicht automatisch im Sheet: Inhalt im Apps-Script-Editor in die Datei `Api` kopieren, speichern, dann **Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Version: Neue Version → Bereitstellen** (URL bleibt gleich).

## Funktionen (Stand v9)

- **Eintragen:** Datum (heute), Workout A/B im Wechsel, Übungen aus dem Blatt „Trainingsplan“, gruppiert nach Supersätzen.
- **Auswahlräder** für Gewicht (fest 0,5-kg-Schritte) und Wiederholungen. Vorbelegt mit dem Wert vom letzten Mal (grau). Rad öffnen und schließen übernimmt ihn, „–“ ganz oben leert, „Anderer Wert …“ ganz unten für freie Eingabe.
- **Speichern** ist sofort lokal gesichert und wird ins Sheet übertragen, offline sobald wieder Netz da ist. Gleiches Datum + Workout + Übung überschreibt die vorhandene Zeile (auch vom Button angelegte), keine Duplikate.
- **Empfehlung fürs nächste Mal (v9):** Pro Übung ein Kasten „↑ Steigern / → Halten / ↓ Zurück: 3 × X kg“ mit Begründung. Die Räder sind mit der Empfehlung vorbelegt, „Empfehlung übernehmen“ füllt alle drei Sätze. Regeln (doppelte Progression, Wdh.-Bereich aus Spalte „Wdh.“ im Trainingsplan):
  - Gewertet werden nur die Sätze mit dem höchsten Gewicht der letzten Einheit (leichtere Sätze = Aufwärmen/Pyramide).
  - Alle diese Sätze an der Obergrenze → eine Stufe höher, als gerade Sätze. Seitheben und Reverse Flys erst, wenn alle 3 Sätze mit gleichem Gewicht an der Obergrenze lagen.
  - Im Bereich → halten. Unter der Untergrenze → halten (bei Pyramide zurück auf die vorige Stufe), zweimal in Folge → eine Stufe zurück.
  - Stufe je Gerät (Spalte „Gerät“ im Trainingsplan, sonst Übungsname): Station/Kabelzug 5 kg, SZ-Stange 2,5 kg, Smartlock 2 kg, einzelne Kurzhanteln 2,5 kg. Feste Stufen pro Übung über `STEP_OVERRIDE` in `index.html`.
- **Verlauf:** letzte 30 Einheiten.
- **Mobility:** Checkbox „Mobility-Routine gemacht“ am Ende von Workout A/B oder eigener Tab mit Schalter pro Tag und 14-Tage-Übersicht. Im Sheet als Zeile mit Workout „Mobility“, Spalte J = ✓.
- **Übungen:** Nachschlagewerk mit Strichfiguren (Start/Ende) und Ausführungshinweisen für alle Übungen aus Workout A, B und der Mobility-Routine. Statisch in `index.html` (`EXERCISES`), läuft offline.
- **Display an:** Schalter oben neben „Aktualisieren“. Hält den Bildschirm in den Reitern Eintragen, Mobility und Übungen wach (Screen Wake Lock, braucht iOS 18.4 oder neuer in der installierten App). In Verlauf und Statistik schaltet sich der Bildschirm normal aus. Einstellung wird gemerkt.
- **Statistik:** Workouts, Gesamtvolumen, letzte 4 Wochen vs. davor, Volumen pro Einheit (A/B), pro Woche/Monat, Kraftentwicklung je Übung. Volumen = Σ Gewicht × Wiederholungen (wie im Sheet-Dashboard).

## Versionen

- **v1** – Eintragen, Verlauf, Offline-Warteschlange
- **v2** – Auswahlräder, Statistik-Tab
- **v3** – Feste 0,5-kg-Schritte
- **v4** – Räder mit Wert vom letzten Mal vorbelegt
- **v5** – Mobility-Routine: Checkbox am Ende von Workout A/B und eigener Tab für separate Einträge (nur ob und wann, Spalte J „Gemacht“; braucht neue `Api.gs`)
- **v6** – Reiter „Übungen“ mit Schaubildern und Ausführungshinweisen
- **v7** – Checkbox „Mobility-Routine gemacht“ ohne „im Anschluss“, Mobility-Übung „L-Sit mit Rotation“ ergänzt
- **v8** – Schalter „Display an“ (Bildschirm bleibt beim Training an)
- **v12** – Seitheben / Reverse Flys: nächstes real verfügbares Gewicht (Smartlock 2er-Schritte + Einzelhanteln 2,5er), Kreuzheben fest SZ 2,5 kg
- **v11** – Feste 2,5-kg-Stufe für Rum. Kreuzheben, Reverse Flys, Seitheben
- **v10** – Gewichtsstufen fest je Gerät statt aus dem Verlauf abgeleitet
- **v9** – Automatische Empfehlung fürs nächste Training (Steigern/Halten/Zurück) mit vorbelegten Rädern
