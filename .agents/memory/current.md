# Aktueller Stand

## Letzte Änderungen
- **Lösch-Dialog UI vereinheitlicht**: Gemeinsame Komponente `DeleteConfirmDialog` — zentriertes, kompaktes Modal (max. 340px, Abbrechen + Aktion nebeneinander). **1 Schritt** (rotes „Löschen“): Körperwerte, Übungen. **2 Schritte** („Weiter“ → „Löschen“): Plan, Workout, Session. Kein großes grünes Bottom-Sheet mehr beim Löschen.
- **Sheets getrennt**: `ConfirmSheet` nur noch für Nicht-Lösch (z. B. Workout überspringen, Entwurf verwerfen). `AlertSheet` für Hinweise/Fehler. Kein `window.alert` / `window.confirm`.
- **Statistik – Zeiträume**: Statistik-Screen mit **7 / 30 / 90 Tagen** und **Gesamt** (rollierend); Körperwert-Charts folgen dem gewählten Zeitraum; Volumen als Recharts-Line-Chart.
- **Line Charts Statistik & Körperwerte**: Recharts-`TrendLineChart` für Workout-Volumen und Körpermetriken im Statistik-Screen sowie Gewichtsverlauf im Körperdaten-Screen.
- **Onboarding & Anamnese-Prozess**: Ein geführter, 4-stufiger Onboarding-Wizard (`OnboardingWizard.tsx`) blockiert nach dem Login den App-Zugang, bis er vollständig abgeschlossen wurde. Er erfasst den Anzeigenamen, Geschlecht, Fitnessziel, Trainingserfahrung, wöchentliche Trainingstage sowie Körpergröße und optionales Gewicht (wird direkt in der `body_measurements`-Tabelle persistiert).
- **Workout überspringen**: Auf dem Homescreen unter „Heute geplant“ wurde bei aktiven Workouts ein Button „WORKOUT ÜBERSPRINGEN“ hinzugefügt. Nach einer Sicherheitsabfrage über ein projekt-eigenes Bottom-Sheet (`ConfirmSheet`) wird das geplante Workout übersprungen und der Trainingsplan schreitet zum nächsten Tag voran (analog zum Ruhetag).
- **Zusätzliche Übungen während des Trainings**: Es wurde ein dezenter Outline-Button „WEITERE ÜBUNG HINZUFÜGEN“ direkt über dem „WORKOUT BEENDEN“-Button / Pause-Block eingeführt. Damit können spontan neue Übungen in jedes laufende Workout (auch solche nach Plan) integriert werden.
- **Flexible Satzanzahl in allen Workouts**: Die Buttons „SATZ HINZUFÜGEN“ und der Minus-Button zum Löschen von Sätzen sind nun im `TrackScreen.tsx` für alle Workouts (nicht mehr nur für Custom-Workouts) sichtbar. Damit können Benutzer flexibel auf Plan-Vorgaben reagieren und Sätze hinzufügen oder entfernen.
- **Übungsverlauf per Klick**: Dem Benutzer wird nun ermöglicht, durch Klicken auf das neue History-Icon neben einem Übungsnamen im aktiven Training (`TrackScreen.tsx`) oder in der Workout-Vorschau (`WorkoutDetailScreen.tsx`) direkt den Verlauf dieser Übung anzusehen. Hierzu öffnet sich ein formatiertes Bottom-Sheet (`ExerciseHistorySheet.tsx`), das die Sätze und Gewichte der letzten 10 Ausführungen sortiert nach Datum darstellt.
- **Layout-Abstände und Buttonausrichtung im HomeScreen korrigiert**: Die Abstände (Margins) im `HomeScreen.tsx` bei der Sektion STATISTIK, dem Volumen-Diagramm und über „ALS NÄCHSTES IM PLAN“ wurden an die 14px-Referenz aus dem `HistoryScreen.tsx` (Verlauf) angepasst und vereinheitlicht. Zudem wurde auf Desktop die rechte Button-Spalte mittels der neuen Überschrift „SCHNELLZUGRIFF“ und Umstellung auf ein Standard-Div exakt an der Höhe der linken „Heute geplant“-Box ausgerichtet und doppelte Margins entfernt.
- **Dynamische Statistik-Diagramme**: In den Statistiken (`StatsScreen.tsx`) werden nun alle Körperwert-Diagramme (Gewicht, KFA, Hüfte, Taille, Muskelmasse etc.) vollautomatisch und dynamisch gerendert. Es erscheinen nur Diagramme für Metriken, für die der Benutzer auch mindestens einen Eintrag erfasst hat.
- **Dynamische Körperdaten-Erfassung**: Standardmäßig wird das kompakte Formular angezeigt. Über ein Dropdown-Menü (+ Wert hinzufügen) können weitere Körpermaße dynamisch hinzugefügt und über ein Lösch-Symbol (✕) wieder entfernt werden (`BodyTrackerScreen.tsx`).
- **Hüft-Taille-Verhältnis (WHR)**: Live-Berechnung und WHO-Auswertung im Körperdaten-Tracker.
- **Geschlechts-Preferences**: Speicherung des gewählten Geschlechts (`gender: "male" | "female" | "other" | null`) in der Datenbank. Standardmäßig ist nichts ausgewählt (`null`) und das Feld ist als Pflichtfeld deklariert.
- **Erweitung um Divers**: Option "Divers" (⚧) hinzugefügt, inklusive angepasster WHO-Mittelwert-Klassifikation.
- **Historie-Erweiterung**: Farbiges WHR-Auswertungsbadge in den Verlaufskarten, falls Hüfte und Taille ausgefüllt wurden.

## Fokus
- Erfassung von Nutzer-Feedback zum neuen Onboarding- und Anamnese-Flow im Produktivbetrieb.

## Nächste Schritte
- Supabase Dashboard: „Confirm email“ deaktivieren; Reset-Password-Vorlage auf `{{ .Token }}`.

## Offene Punkte
- Timer stoppt beim Tab-Wechsel (Unmount).
- PR-Flag (`is_pr`) wird noch nicht automatisch berechnet.
- iOS: AudioContext erst nach Nutzer-Geste.
- Supersätze: keine automatische Satz-Synchronisation; PlanBuilder ohne eigene Supersatz-UI.
- Zeit-Übungen: keine separate `duration_sec`-Spalte — Sekunden liegen im Satz-JSON-Feld `reps`.
