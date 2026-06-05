# Projekt: rephive

## Ziel
Workout-Tracker für Gym-/Bodybuilding-Nutzer: Workouts planen, live tracken, Interval-Timer.
Mobile-first; iOS über Capacitor (gleiche React-App).

## Tech-Stack
- **Web-App**: Vite + React 18 + TypeScript, Supabase (Auth + PostgreSQL + Storage + Edge Functions, RLS), Inline-Style-Theme (kein CSS-Framework).
- **Landingpage** (`rephive-landingpage`): Next.js 16 App Router, Deployment **rephive.app** (Root-`app/`, nicht `src/app/`); Marketing + Legal-Seiten.
- **iOS-App**: Capacitor 8 (WKWebView) — dieselbe Vite/React-App aus `dist/`; Xcode-Projekt unter `ios/`; nach Web-Changes: `npm run build && npx cap sync ios`.
- Google Fonts: Saira Condensed (Display), Archivo (Body).
- PWA-Manifest vorhanden; `vite.config.ts` nutzt `base: "./"` für Capacitor.

## Architektur
- **Web-App-Struktur**: `src/theme.ts` (Design-Tokens `M`), `src/lib/db.ts` (DB-Queries), `src/PhoneApp.tsx` (Tab-/Push-Router).
- **iOS/Capacitor**: `capacitor.config.ts` (`webDir: dist`), `ios/App/`; keine separate Swift-UI-Codebase.
- `src/lib/responsive.tsx` — Breakpoint-Context (`mobile` / `tablet` / `desktop`), `useBreakpoint()`, `contentMaxWidth()`, `CONTENT_HORIZONTAL_PADDING` (22px)
- `src/lib/supabase.ts` — typisierter Browser-Client
- `src/lib/auth.tsx` — AuthProvider, Session, Profile, Konto-Updates (Name/E-Mail/Passwort)
- `src/lib/preferences.ts` + `preferences.tsx` — User-Defaults, `PreferencesProvider`, Supabase-Persistenz
- `src/lib/exerciseCatalog.ts` — Muskelgruppen, Equipment (inkl. `Cardiogerät`), `ExerciseMetric`, Cardio-Heuristiken (`inferCardioMetric`), Dauer-/Distanz-Formatierung
- `src/lib/youtube.ts` — YouTube-URL parsen/validieren, Embed-URL, `resolveExerciseVideoUrl` (Track-Lookup)
- `src/lib/exerciseSets.ts` — Sätze-Logik (Gleich/Individuell, KG_STEP 1.25, `warmUp` auf S1, `setSetWarmUp`, formatSetSummary; Cardio-/Zeit-Sätze)
- `src/lib/superset.ts` — Supersatz-Blöcke, Verknüpfen/Lösen, `shouldStartRestAfterSet` (flexible Satzanzahl pro Übung)
- `src/lib/oneRepMax.ts` — 1RM-Formeln, Prozent-Tabelle, `getOneRmPrefillFromExercise` (Track-Sheet-Vorausfüllung)
- `src/lib/db.ts` — DB-Queries + Hooks (useWorkouts, useSessions, usePlans, useActivePlan, session_exercises, …); KI-Invoke mit 150 s Timeout
- `src/lib/ai-plan-volume.ts` — `exerciseCountBounds` / Hinweistext für Wizard (Logik spiegelt Edge Function)
- `src/lib/engine.ts` — Timer-Engine (`useTimer`, `elapsedSec`) + Tracking-State (`useWorkout`, verzögerte Pause bei Supersätzen)
- `src/lib/timerSession.ts` — Timer-Session-Payload + Verlauf/Detail-Formatierung (Tag `Timer`)
- `src/lib/timerSounds.ts` — Web-Audio-Beep-Engine (`playTimerCue`: tick/go/rest/done)
- `src/lib/useTimerSounds.ts` — React-Hooks für Interval- und Pausen-Timer-Signale
- `src/lib/activeTimer.tsx` — Context: aktiver Timer-Status für Nav + Tab-Leave-Warnung
- `src/lib/activeWorkout.ts` — pausierter Trainings-Entwurf in localStorage (`hejcoach:activeWorkout:${userId}`)
- `src/data.ts` — Typen, `startSession`, `startCustomSession`, `normalizeWorkout` (Legacy-Entwürfe)
- `src/components/ExerciseSetConfigurator.tsx` + `SetValueStepper.tsx` + `WarmUpSetToggle.tsx` — gemeinsame Satz-/KG-UI inkl. optionaler S1-Warm-up-Markierung (Spalte W-UP)
- `src/components/SupersetBlock.tsx` — visuelle Supersatz-Gruppierung (Akzent + Label)
- `src/components/BottomSheet.tsx` — gemeinsame Sheet-Hülle (Backdrop-Tap, Wisch-nach-unten am Griff via Framer Motion, max. 90 % Viewport-Höhe)
- `src/components/OneRmCalculatorBody.tsx` + `OneRmCalculatorSheet.tsx` — 1RM-Rechner-Kern (Stepper, Epley, %-Tabelle); Sheet im Track, Vollbild weiter über `CalculatorScreen`
- `src/components/MuscleGroupSelect.tsx` + `EquipmentSelect.tsx` + `catalogSelectStyle.ts` — Dropdowns für Muskelgruppe/Gerät (Filter + Formular)
- `src/components/PlanDayAccordion.tsx` — aufklappbare Plan-Tage mit `WorkoutExercisePreview`
- `src/components/PlanAdviceCollapsible.tsx` — KI-Tipps im Plan-Detail (default zugeklappt)
- `src/components/WorkoutFinishSheet.tsx` — Beenden-Dialog (Speichern / Verwerfen / Abbrechen) für Track + Home
- `src/components/ExerciseHistorySheet.tsx` — Übungsverlauf pro Übung
- `src/components/MetricCategorySheet.tsx` — Kategorie-Auswahl (`ExerciseMetric`)
- `src/components/TimerLeaveSheet.tsx` — Timer stoppen (Tab-Wechsel, Modus, Reset)
- `src/components/DeleteConfirmDialog.tsx` — Lösch-Bestätigung als Bottom-Sheet (Auto-Höhe, max. 90 %); 1 Schritt: Übungen/Körperwerte; 2 Schritte: Plan/Workout/Session
- `src/components/ConfirmSheet.tsx` — Nicht-Lösch-Bestätigungen (z. B. Workout überspringen, Entwurf verwerfen)
- `src/components/AlertSheet.tsx` — Hinweise/Fehler mit einem OK-Button (kein `window.alert`)
- `src/components/SplitImageSlider.tsx` — interaktiver Wisch-Slider für den visuellen Vorher/Nachher Foto-Vergleich
- `src/screens/auth/` — Login, Signup, Passwort-Reset (Token)
- `src/screens/` — Home, Plans, PlanDetail, WorkoutsHub, Library, ExercisesScreen, WorkoutDetail, Timer, History, SessionDetail, SessionEdit, Track, Builder, PlanBuilder, Settings, Profile, Calculator, BodyTracker, OnboardingWizard, AITrainingPlanWizard, AboutScreen, SupportScreen
- `src/components/ExerciseFormSheet.tsx` + `ExercisePickerSheet.tsx` — Übungs-CRUD, optionaler YouTube-Link, Löschen im Edit-Sheet
- `src/components/ExerciseVideoSheet.tsx` — YouTube-Embed im Bottom-Sheet (aktives Workout)
- `src/components/CatalogStandardLock.tsx` — Schloss-Icon für nicht löschbare Standard-Workouts/Übungen
- `src/components/MuscleGroupSelect.tsx` — Muskelgruppen-Dropdown (Filter + Formular); `MuscleGroupFilterChips` entfernt
- `src/PhoneApp.tsx` — Tab-/Push-Router (tracking, builder, workoutDetail, planDetail, sessionDetail, sessionEdit, planBuilder, settings, profile, calculator, bodyTracker)

- `src/components/FloatNav.tsx` — Icon-only-Nav als Overlay: unten Mobile/Tablet, links fixed Desktop; `FLOAT_NAV_BOTTOM_OFFSET_CSS` + `floatNavContentInset()` müssen identisch sein (iOS); `FLOAT_NAV_SCROLL_BOTTOM_GAP` für Tab-Scroll-Padding; symmetrisches Nav-Padding (kein Tab-abhängiges Shift)
- `src/components/PhoneShell.tsx` — App-Shell mit Safe-Area; `reserveBottomSafeArea` wenn Bottom-Nav aktiv
- `src/App.tsx` — Auth-Gate + ResponsiveProvider

## Entscheidungen & Constraints
- Quelle ist ein Claude-Design-Bundle (urspr. Richtung „A · MOMENTUM"); UI pixel-genau übernommen. App-Name: **rephive**.
- Bewusst KEIN Phone-Mockup — nur das App-UI.
- Keine Browser-Dialogs (`alert`/`confirm`): Löschen über `DeleteConfirmDialog` (Bottom-Sheet, 1–2 Schritte); sonstige Bestätigungen über `ConfirmSheet`; Hinweise/Fehler über `AlertSheet`.
- Breakpoints: Mobil <768, Tablet 768–1023, Desktop ≥1024; Nav: FloatNav unten (Mobile/Tablet) bzw. links (Desktop), kein SideNav/BottomNav mehr.
- Globale Workouts/Übungen (user_id NULL) für alle sichtbar; eigene Workouts und Übungen pro User (CRUD nur eigene).
- Übungs-Katalog: Tabelle `exercises` (globale Seeds + eigene); optional `youtube_url` (nur eigene). Workouts-Tab „Workouts | Übungen“; Filter Übungen per `MuscleGroupSelect`. `workout_exercises.catalog_exercise_id` verknüpft Workout-Zeilen mit Katalog (Video auch nach Umbenennung). Video im Track per Play-Button → `ExerciseVideoSheet` (iframe, ohne App-Verlassen).
- 1RM-Rechner: Home → Route `calculator` / `CalculatorScreen`; aktives Workout → Icon oben rechts → `OneRmCalculatorSheet` mit Prefill aus offener Übung.
- Übungs-Messung: `metric_type` u.a. `weight_reps`, `time`, `distance_time` (Cardio: ZEIT / M·km); Volumen nur bei Kraft-Metrics; KI setzt Cardiogeräte auf `time`/`distance_time`, Kraft auf `weight_reps`.
- Satz-JSON: `{ reps, kg, done?, durationSec?, distanceM?, warmUp? }` — `warmUp` nur S1, optional, rein visuell (zählt ins Volumen).
- Passwort-Reset per E-Mail-Token (OTP), nicht per Link.
- Nutzer-Preferences in `profiles.preferences` (JSONB); u.a. `timerSounds`, `restSeconds`, `autoRest`, Timer-Defaults; Profil/Settings/Stats über Avatar-Trigger im Home-Screen als rechtes Sidepanel (Push-Routes, kein extra Tab). Rechtliches im Panel: externe Links zu rephive.app (`/impressum`, `/datenschutz`, `/agb`); Über mich und Support als In-App-Routes.
- Legal/Support-URLs Web-App: `VITE_LEGAL_BASE_URL` (Default `https://rephive.app`).
- Timer-Signale: Web Audio API (keine Sound-Dateien), abschaltbar via `timerSounds`; Countdown-Ticks nur bei runterzählenden Phasen (nicht For-Time-Lauf).
- Aktiver Timer: `ActiveTimerProvider` in `PhoneApp`; Leave-Sheet bei Tab-Wechsel; Modus/Reset-Warnung in `TimerScreen`; Live-Indikator am Nav-Tab „Timer“.
- Trainingspläne: `plans` + `plan_days` (Workout oder Ruhetag pro Tag); ein aktiver Plan steuert Home-Screen sequenziell.
- Sessions: aggregierte Stats in `sessions` + Satz-Snapshot in `session_exercises`; Timer-Läufe ebenfalls in `sessions` (Tags `Timer` + Modus, `volume_kg=0`, ohne Übungen).
- Workout-Sätze: gleiches JSON-Format in `workout_exercises.sets`; UI unterscheidet Gleich vs. Individuell ohne extra DB-Feld (Modus wird aus Werten abgeleitet).
- Pausiertes Tracking: Entwurf clientseitig (localStorage), Dauer aus `startedAt` läuft weiter; Speichern erst über FinishSheet → `sessions` + `session_exercises`.
- Individuelle Sessions: ohne `workout_id`, Tag „Individuell“; Übungen nur im Session-Snapshot.
- Supersätze: `superset_id` (uuid) auf `workout_exercises` + `session_exercises`; nur zusammenhängende Übungen mit gleicher ID = Block; Pause (`autoRest`) erst nach letzter Übung der Runde; Verknüpfung im Builder und bei Custom-Tracking; flexible Satzanzahl pro Übung im Block.
- Onboarding-Prozess: Wird bei unvollständigem Onboarding (`preferences.onboarded === false`) über `PhoneAppInner` verpflichtend eingeblendet und blockiert die normale Navigation. Erfasst grundlegende Anamnese-Daten und legt ggf. ein Gewicht in `body_measurements` an.
- iOS WKWebView: Flex-Kinder in scrollbaren Flex-Columns nicht schrumpfen lassen (`flexShrink: 0` auf Karten); bei expandierten Track-Karten `overflow: visible`, sonst `hidden` für Border-Radius.
- Vorher/Nachher Bilder: Fotos werden im Supabase Storage-Bucket `body-photos` unter `{userId}/{filename}` mit RLS abgesichert. Es wird ein nativer HTML5 Dateiupload verwendet, um maximale Capacitor/Web-Parität und Stabilität zu garantieren.
- KI-Trainingspläne: Wizard (`AITrainingPlanWizard.tsx`, 12 Steps) + simulierter Checkout → `generate-training-plan` (JWT); Übungsanzahl via `exerciseCountBounds` (Minuten + Erfahrung + Ziel, max. 8 Kraftübungen); Cardio-Warm-up zählt nicht mit. Katalog-Sync nach Generierung im Hintergrund (`EdgeRuntime.waitUntil`). Client-Timeout 150 s. Deploy: `scripts/deploy-training-plan.sh`.

