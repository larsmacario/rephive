# rephive

Mobile-first Workout-Tracker (dark, Lime-Akzent). Workouts planen,
live tracken und Interval-Timer (EMOM · AMRAP · TABATA · For Time).

## Stack

- **Vite + React 18 + TypeScript** — reine Client-App
- Inline-Style-Theme (`src/theme.ts`), Fonts: _Saira Condensed_ (Display) + _Archivo_ (Body)
- PWA-Manifest, `base: "./"` → später per **Capacitor** als native iOS/Android-App wrappbar

## Befehle

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Dev-Server (http://localhost:5173)
npm run build    # Typecheck + Production-Build (dist/)
npm run preview  # Production-Build lokal ansehen
npm run lint     # nur Typecheck (tsc --noEmit)
```

## Struktur

```
src/
  theme.ts            Design-Tokens (M) + Helfer
  data.ts             Workouts, Verlauf, Übungs-Library (Mock)
  lib/engine.ts       Timer-Engine (useTimer) + Tracking (useWorkout)
  components/         Icon, Ring, PhoneShell, Widgets, BottomNav
  screens/            Home, Library, Timer, History, Track, Builder
  PhoneApp.tsx        Tab-/Push-Router der App
  DesktopBuilder.tsx  Breiter Workout-Builder (Desktop)
  App.tsx             Responsive Shell (mobil Vollbild · Desktop zentriert)
```

## Funktionen

- **Start** — Dashboard mit heutigem Workout, Wochen-Statistiken & Volumen-Chart; Link zu **Statistik**
- **Statistik** — Push-Ansicht mit Zeitraum (Woche/Monat/Gesamt), Volumen-Chart, Top-Übungen & PRs
- **Workouts** — Bibliothek; ▶ startet Live-Tracking, „+" öffnet den Builder
- **Timer** — EMOM / AMRAP / TABATA / For Time, live mit Vorbereitung & Runden-Anzeige
- **Verlauf** — vergangene Sessions mit Dauer, Volumen, Sätzen & PR-Badges
- **Live-Tracking** — Sätze abhaken (startet Pausen-Timer), Gewicht/Wdh anpassen
- **Desktop-Builder** — Übungsbibliothek mit Suche, Plan-Tabelle mit Steppern

> Hinweis: Daten sind aktuell statischer Mock (keine Persistenz). Siehe `.agents/memory/current.md` für nächste Schritte.
