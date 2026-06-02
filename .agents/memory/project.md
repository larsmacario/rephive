# Projekt: rephive

## Ziel
Workout-Tracker für Gym-/Bodybuilding-Nutzer: Workouts planen, live tracken, Interval-Timer.
Mobile-first; soll später ohne Rewrite zur nativen App (Capacitor) werden.

## Tech-Stack
- Vite + React 18 + TypeScript
- Supabase (Auth + PostgreSQL, RLS)
- Inline-Style-Theme (kein CSS-Framework), Google Fonts: Saira Condensed (Display), Archivo (Body)
- PWA-Manifest vorhanden; `vite.config.ts` nutzt `base: "./"` für Capacitor

## Architektur
- `src/theme.ts` — Design-Tokens `M` + Helfer (mKind, mMini)
- `src/lib/responsive.tsx` — Breakpoint-Context (`mobile` / `tablet` / `desktop`), `useBreakpoint()`, `contentMaxWidth()`, `CONTENT_HORIZONTAL_PADDING` (22px)
- `src/lib/supabase.ts` — typisierter Browser-Client
- `src/lib/auth.tsx` — AuthProvider, Session, Profile, Konto-Updates (Name/E-Mail/Passwort)
- `src/lib/preferences.ts` + `preferences.tsx` — User-Defaults, `PreferencesProvider`, Supabase-Persistenz
- `src/lib/exerciseCatalog.ts` — Muskelgruppen, Equipment, `ExerciseMetric` (`reps` | `time`), Dauer-Formatierung
- `src/lib/exerciseSets.ts` — Sätze-Logik (Gleich/Individuell, KG_STEP 1.25, formatSetSummary; Zeit-Sätze ohne KG)
- `src/lib/superset.ts` — Supersatz-Blöcke, Verknüpfen/Lösen, `shouldStartRestAfterSet` (flexible Satzanzahl pro Übung)
- `src/lib/oneRepMax.ts` — 1RM-Formeln und Prozent-Generierung
- `src/lib/db.ts` — DB-Queries + Hooks (useWorkouts, useSessions, usePlans, useActivePlan, session_exercises, …)
- `src/lib/engine.ts` — Timer-Engine (`useTimer`, `elapsedSec`) + Tracking-State (`useWorkout`, verzögerte Pause bei Supersätzen)
- `src/lib/timerSession.ts` — Timer-Session-Payload + Verlauf/Detail-Formatierung (Tag `Timer`)
- `src/lib/timerSounds.ts` — Web-Audio-Beep-Engine (`playTimerCue`: tick/go/rest/done)
- `src/lib/useTimerSounds.ts` — React-Hooks für Interval- und Pausen-Timer-Signale
- `src/lib/activeTimer.tsx` — Context: aktiver Timer-Status für Nav + Tab-Leave-Warnung
- `src/lib/activeWorkout.ts` — pausierter Trainings-Entwurf in localStorage (`hejcoach:activeWorkout:${userId}`)
- `src/data.ts` — Typen, `startSession`, `startCustomSession`, `normalizeWorkout` (Legacy-Entwürfe)
- `src/components/ExerciseSetConfigurator.tsx` + `SetValueStepper.tsx` — gemeinsame Satz-/KG-UI
- `src/components/SupersetBlock.tsx` — visuelle Supersatz-Gruppierung (Akzent + Label)
- `src/components/WorkoutFinishSheet.tsx` — Beenden-Dialog (Speichern / Verwerfen / Abbrechen) für Track + Home
- `src/components/TimerLeaveSheet.tsx` — Bottom-Sheet: Timer stoppen (Tab-Wechsel, Modus, Reset)
- `src/components/DeleteConfirmDialog.tsx` — zentriertes Lösch-Modal (1 Schritt: Übungen/Körperwerte; 2 Schritte: Plan/Workout/Session)
- `src/components/ConfirmSheet.tsx` — Bottom-Sheet für Nicht-Lösch-Bestätigungen (z. B. Workout überspringen, Entwurf verwerfen)
- `src/components/AlertSheet.tsx` — Bottom-Sheet: Hinweise/Fehler mit einem OK-Button (kein `window.alert`)
- `src/screens/auth/` — Login, Signup, Passwort-Reset (Token)
- `src/screens/` — Home, Plans, PlanDetail, WorkoutsHub, Library, ExercisesScreen, WorkoutDetail, Timer, History, SessionDetail, SessionEdit, Track, Builder, PlanBuilder, Settings, Profile, Calculator, BodyTracker, OnboardingWizard
- `src/components/ExerciseFormSheet.tsx` + `ExercisePickerSheet.tsx` — Übungs-CRUD-Formular und gemeinsamer Bibliotheks-Picker
- `src/PhoneApp.tsx` — Tab-/Push-Router (tracking, builder, workoutDetail, planDetail, sessionDetail, sessionEdit, planBuilder, settings, profile, calculator, bodyTracker)

- `src/components/FloatNav.tsx` — Icon-only-Nav als Overlay: unten Mobile/Tablet (align mit Content-Boxen), links fixed Desktop; `floatNavContentInset()` für Scroll-Padding
- `src/components/PhoneShell.tsx` — App-Shell mit Safe-Area; `reserveBottomSafeArea` wenn Bottom-Nav aktiv
- `src/App.tsx` — Auth-Gate + ResponsiveProvider

## Entscheidungen & Constraints
- Quelle ist ein Claude-Design-Bundle (urspr. Richtung „A · MOMENTUM"); UI pixel-genau übernommen. App-Name: **rephive**.
- Bewusst KEIN Phone-Mockup — nur das App-UI.
- Keine Browser-Dialogs (`alert`/`confirm`): Löschen über `DeleteConfirmDialog`; sonstige Bestätigungen über `ConfirmSheet`; Hinweise/Fehler über `AlertSheet`.
- Breakpoints: Mobil <768, Tablet 768–1023, Desktop ≥1024; Nav: FloatNav unten (Mobile/Tablet) bzw. links (Desktop), kein SideNav/BottomNav mehr.
- Globale Workouts/Übungen (user_id NULL) für alle sichtbar; eigene Workouts und Übungen pro User (CRUD nur eigene).
- Übungs-Katalog: Tabelle `exercises` (12 globale Seeds); Workouts-Tab „Workouts | Übungen“; CRUD nur eigene Übungen; `ExercisePickerSheet` in Builder, Track, PlanBuilder, Session-Edit.
- Übungs-Messung: `metric_type` = `reps` (Wdh. + optional kg) oder `time` (Sekunden im Satz-JSON-Feld `reps`, kg=0); Volumen-Berechnung ignoriert Zeit-Übungen; Standard beim Anlegen aus Bibliothek.
- Passwort-Reset per E-Mail-Token (OTP), nicht per Link.
- Nutzer-Preferences in `profiles.preferences` (JSONB); u.a. `timerSounds`, `restSeconds`, `autoRest`, Timer-Defaults; Profil/Settings über Avatar-Menü (Push-Routes, kein extra Tab).
- Timer-Signale: Web Audio API (keine Sound-Dateien), abschaltbar via `timerSounds`; Countdown-Ticks nur bei runterzählenden Phasen (nicht For-Time-Lauf).
- Aktiver Timer: `ActiveTimerProvider` in `PhoneApp`; Leave-Sheet bei Tab-Wechsel; Modus/Reset-Warnung in `TimerScreen`; Live-Indikator am Nav-Tab „Timer“.
- Trainingspläne: `plans` + `plan_days` (Workout oder Ruhetag pro Tag); ein aktiver Plan steuert Home-Screen sequenziell.
- Sessions: aggregierte Stats in `sessions` + Satz-Snapshot in `session_exercises`; Timer-Läufe ebenfalls in `sessions` (Tags `Timer` + Modus, `volume_kg=0`, ohne Übungen).
- Workout-Sätze: gleiches JSON-Format in `workout_exercises.sets`; UI unterscheidet Gleich vs. Individuell ohne extra DB-Feld (Modus wird aus Werten abgeleitet).
- Pausiertes Tracking: Entwurf clientseitig (localStorage), Dauer aus `startedAt` läuft weiter; Speichern erst über FinishSheet → `sessions` + `session_exercises`.
- Individuelle Sessions: ohne `workout_id`, Tag „Individuell“; Übungen nur im Session-Snapshot.
- Supersätze: `superset_id` (uuid) auf `workout_exercises` + `session_exercises`; nur zusammenhängende Übungen mit gleicher ID = Block; Pause (`autoRest`) erst nach letzter Übung der Runde; Verknüpfung im Builder und bei Custom-Tracking; flexible Satzanzahl pro Übung im Block.
- Onboarding-Prozess: Wird bei unvollständigem Onboarding (`preferences.onboarded === false`) über `PhoneAppInner` verpflichtend eingeblendet und blockiert die normale Navigation. Erfasst grundlegende Anamnese-Daten und legt ggf. ein Gewicht in `body_measurements` an.
