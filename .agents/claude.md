# Projekt: rephive

## Sprache
Antworte auf Deutsch.

## Was das ist
Mobile-first Workout-Tracker im MOMENTUM-Design (dark, Lime-Akzent). Workouts erstellen,
live tracken und Interval-Timer (EMOM / AMRAP / TABATA / For Time). Spätere native App via Capacitor geplant.

## Wichtige Befehle
- Dev: `npm run dev`
- Build: `npm run build`
- Lint / Typecheck: `npm run lint`

## Konventionen
- Stack: Vite + React 18 + TypeScript, reine Client-App (`base: "./"` für Capacitor-Wrapping).
- Styling: Inline-Styles über das Theme-Objekt `M` (`src/theme.ts`) — pixel-genau zum Design.
- Variablen/Code Englisch, UI-Texte Deutsch.
- Kein Geräte-Mockup (Status-Bar/Notch) — nur das echte App-UI plus Safe-Area-Insets.
- Keine Browser-Dialogs (`alert`/`confirm`): Bestätigungen → `ConfirmSheet`, Hinweise/Fehler → `AlertSheet`.

## Memory
Lies zu Beginn jeder Session `.agents/memory/project.md` und `.agents/memory/current.md`.
Bei `update memory`: aktualisiere `current.md`, `project.md` nur bei Architektur-Änderungen.
