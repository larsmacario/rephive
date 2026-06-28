# Recovery Beta — Erfolgskriterien

7-Tage-Test mit 5 Nutzern vor Ausbau (Text-KI, Favoriten, Korrelationen).

## Setup

- Feature: Sidepanel **Recovery** + Post-Workout-Chips im Finish-Dialog
- Dauer: 7 Kalendertage
- Tester: 5 Personen aus der breiten Zielgruppe (nicht nur Bodybuilder)

## Primäre Metriken

| Metrik | Weiter | Stopp |
|--------|--------|-------|
| Log-Rate | ≥3 von 5 Testern loggen an ≥5 von 7 Tagen | <2 von 5 Testern |
| Post-Workout-Chip | ≥40 % der Workout-Saves mit mindestens 1 Chip-Tap | <20 % |

## Sekundäre Beobachtung

- Qualitatives Feedback: „Nach dem Training erinnert mich das — und war easy“
- Keine Beschwerden über falsche Protein-Schätzungen (v1 = manuelle/quick Presets)

## Messung

- **Log-Rate:** Supabase `protein_logs` pro `user_id`, distinct Tage mit Eintrag
- **Chip-Rate:** `protein_logs.source = 'post_workout'` / gespeicherte Sessions in derselben Woche

## No-Go nach Beta

- Foto-KI
- Lebensmittel-Datenbank
- Kalorien-/Makro-Tracking außerhalb des Plan-Details
- FloatNav-Tab oder Push-Notifications
