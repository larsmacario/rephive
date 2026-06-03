# Aktueller Stand

## Letzte Änderungen
- **Übungen/Workouts UI:** Muskelgruppen-Filter als Dropdown (`MuscleGroupSelect`); linker Akzent-Rand an Karten entfernt; Schloss-Icon (`CatalogStandardLock`) bei Standard-Einträgen; Löschen im Bearbeiten-Sheet (Trash neben Speichern).
- **YouTube bei eigenen Übungen:** `exercises.youtube_url`, `workout_exercises.catalog_exercise_id`; Formular-Feld + `ExerciseVideoSheet` (Embed) im Track-Screen; `src/lib/youtube.ts`.

## Fokus
- YouTube-Flow auf Gerät testen (Embed-Limits auf iOS beachten).
- Bestehende Workouts ohne `catalog_exercise_id` nutzen Namens-Fallback für Videos.

## Nächste Schritte
- Optional: Video-Button auch in `WorkoutDetailScreen` vor dem Start.
- `supabase functions deploy generate-training-plan`, falls KI-Split noch nicht live.

## Offene Punkte
- `ANTHROPIC_API_KEY` für echte KI-Pläne; manche YouTube-Videos blockieren Embedding.
- PR-Flag (`is_pr`) bei Sessions; Landingpage Cookies-Link Platzhalter.
