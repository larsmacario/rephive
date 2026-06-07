# Projekt: rephive

## Ziel
Workout-Tracker für Gym-/Bodybuilding-Nutzer: Workouts planen, live tracken, Interval-Timer.
Mobile-first; iOS über Capacitor (gleiche React-App).

## Tech-Stack
- **Web-App**: Vite + React 18 + TypeScript, Supabase (Auth + PostgreSQL + Storage + Edge Functions, RLS), Inline-Style-Theme (kein CSS-Framework); `react-easy-crop` für Profilbild-Crop.
- **Landingpage** (`rephive-landingpage`): Next.js 16 App Router, Deployment **rephive.app**; Marketing + Legal; USP **Auto-Pilot** (Hero-Mock `AutopilotTrackBody`, Feature #01, SEO).
- **iOS-App**: Capacitor 8 (WKWebView) — dieselbe Vite/React-App aus `dist/`; Xcode-Projekt unter `ios/`; nach Web-Changes: `npm run build && npx cap sync ios`. `ios/App/App/Info.plist`: Foto-Privacy-Strings für Body Tracker; **Mikrofon + Speech Recognition** für Turbo-Voice (Labs); kein `NSAllowsArbitraryLoads` (Standard-ATS für Supabase, rephive.app, YouTube).
- Google Fonts: Saira Condensed (Display), Archivo (Body).
- PWA-Manifest vorhanden; `vite.config.ts` nutzt `base: "./"` für Capacitor.
- **Offline:** `dexie` (IndexedDB), `@capacitor/network`; kein Service Worker (Phase 5 optional).

## Architektur
- **Web-App-Struktur**: `src/theme.ts` (Design-Tokens `M`, Button-Press-Tokens), `src/lib/db.ts` (DB-Queries), `src/PhoneApp.tsx` (Tab-/Push-Router).
- `src/components/MButton.tsx` — zentrale Button-Komponente (primary/secondary/ghost/danger); visuelles Press-Feedback + Release-Glow; Haptik nur Primary via `src/lib/haptics.ts` (Capacitor + Web-Fallback).
- **iOS/Capacitor**: `capacitor.config.ts` (`webDir: dist`), `ios/App/`; keine separate Swift-UI-Codebase.
- `src/lib/responsive.tsx` — Breakpoint-Context (`mobile` / `tablet` / `desktop`), `useBreakpoint()`, `contentMaxWidth()`, `CONTENT_HORIZONTAL_PADDING` (22px)
- `src/lib/supabase.ts` — typisierter Browser-Client
- `src/lib/auth.tsx` — AuthProvider, Session, Profile, Konto-Updates (Name/E-Mail/Passwort, **Profilbild**)
- `src/lib/roles.ts` — `isAppOwner` (globale Übungen-Admin)
- `src/lib/preferences.ts` + `preferences.tsx` — User-Defaults, `PreferencesProvider`, Supabase-Persistenz
- `src/lib/musclePriorities.ts` — Wizard-Prioritäten (1–5) für alle `MUSCLE_GROUPS`, Defaults + Normalisierung
- `src/lib/exerciseCatalog.ts` — Muskelgruppen, Equipment (inkl. `Cardiogerät`), `ExerciseMetric`, Cardio-Heuristiken (`inferCardioMetric`), Dauer-/Distanz-Formatierung
- `src/lib/youtube.ts` — YouTube-URL parsen/validieren, Embed-URL, `resolveExerciseVideoUrl` (Track-Lookup)
- `src/lib/exerciseSets.ts` — Sätze-Logik (Gleich/Individuell, KG_STEP 1.25, `warmUp` auf S1, `setSetWarmUp`, formatSetSummary; Cardio-/Zeit-Sätze)
- `src/lib/superset.ts` — Supersatz-Blöcke, Verknüpfen/Lösen, `shouldStartRestAfterSet` (flexible Satzanzahl pro Übung)
- `src/lib/oneRepMax.ts` — 1RM-Formeln, Prozent-Tabelle, `getOneRmPrefillFromExercise` (Track-Sheet-Vorausfüllung)
- `src/lib/db.ts` — DB-Queries + Hooks (`usePlans`, `useActivePlan`, `useExercises` via `useCachedAsync`); Remote-Wrapper + Sync-Queue; KI-Invoke mit 150 s Timeout
- `src/lib/offline/` — Local-First: `localDb` (Dexie), `planStore`/`exerciseStore`, `syncQueue`/`syncEngine`, `networkStatus`, `useCachedAsync`, `planBuilder`
- `src/components/OfflineBanner.tsx` + `SyncStatusSheet.tsx` — Offline-/Sync-Status in der App
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
- `src/components/BottomSheet.tsx` — gemeinsame Sheet-Hülle (Backdrop-Tap, Wisch-nach-unten, Framer-Motion Open/Close, `AnimatePresence`, max. 95 % Viewport, Default `fitContent` = Auto-Höhe)
- `src/components/OneRmCalculatorBody.tsx` + `OneRmCalculatorSheet.tsx` — 1RM-Rechner-Kern (Stepper, Epley, %-Tabelle); Sheet im Track, Vollbild weiter über `CalculatorScreen`
- `src/components/MusclePrioritySliderRow.tsx` — Slider-Zeile für Muskelgruppen-Priorität im KI-Wizard
- `src/components/MuscleGroupSelect.tsx` + `EquipmentSelect.tsx` + `catalogSelectStyle.ts` — Dropdowns für Muskelgruppe/Gerät (Filter + Formular)
- `src/lib/planBlocks.ts` — 4 Bausteine (warmup/skill/strength/metcon): Labels, Guide-Hints, Gruppierung, Session-Filter, `disabledBlocks`, `BlockFormat`, `inferBlockFormatForExercises`; warmup = „Warm-up“ (Cardio-Fokus, keine Mobilität in UI/Prompt); **`BUILDER_DEFAULT_ENABLED_BLOCKS`** (ohne metcon) vs. `DEFAULT_ENABLED_BLOCKS` (Tracking/KI)
- `src/lib/metcon.ts` + `src/lib/metconTimer.ts` — MetCon-Config, Badge, Legacy-Note-Parsing, `normalizeMetconExercise` (kein 1RM), `metconConfigToBlockInput`, Timer-Hooks (AMRAP/EMOM/Circuit)
- `src/components/track/MetconBlockView.tsx` + `src/components/MetconConfigSheet.tsx` — MetCon-UI im Track bzw. manueller Plan-Builder
- `src/lib/progressionEngine.ts` — Auto-Pilot: Mirror/Pre-Fill, Double Progression, Plateau/Deload, Trend, PR, Format-Regeln
- `src/lib/useAutopilotPrefill.ts` — lädt Historie, berechnet Satz-Vorschläge für Track
- `src/lib/db.ts` — `fetchExercisePerformanceByRef` (ein Roundtrip für Last + History)
- `src/components/track/TrackAutopilotBootOverlay.tsx` — Ladezustand vor erstem Tracking
- `src/components/ExerciseListRow.tsx` + `EXERCISE_ROW` in `theme.ts` — einheitliche 56px-Listenzeilen
- `src/screens/TurboTrackingSetupScreen.tsx` + `src/lib/turboTracking.ts` — TurboTracking-Wizard (Quelle → Sätze → Track)
- `src/components/track/FrictionTurboView.tsx` — Turbo-Tracking-UI (primärer Track-Modus); **Voice PTT** (Labs): Halten → Sprechen → Preview → Übernehmen
- `src/hooks/useVoiceSetLog.ts` + `src/hooks/usePushToTalk.ts` — Speech (Capacitor native / Web API), Hold-to-talk-Geste
- `src/lib/voiceSetParser.ts` + `src/lib/voiceTranscriptCleanup.ts` — DE-Gym-Utterances parsen, STT-Fehler bereinigen (Kino/€)
- `@capgo/capacitor-speech-recognition` — natives iOS Speech (SPM in `ios/App/CapApp-SPM/Package.swift`)
- `src/components/PlanBlockSection.tsx` — Baustein-Karte (neutral, optional collapsible, Fortschritts-Badge im Track)
- `src/components/PlanDayAccordion.tsx` — Plan-Tage mit Block-Gruppierung; Builder-Modus (Baustein hinzufügen/entfernen)
- `src/components/HorizontalSlidePager.tsx` — horizontale Plan-Navigation (Stack: nur aktive Folie, Swipe/‹›/Punkte)
- `src/components/PlanDaySlide.tsx` — Tagesfolie für Builder/Detail (Header + scrollbare Übungsliste, `flat`-Karten)
- `src/components/PlanAdviceCollapsible.tsx` — KI-Tipps im Plan-Detail (default zugeklappt)
- `src/components/WorkoutFinishSheet.tsx` — Beenden-Dialog (Speichern / Verwerfen / Abbrechen) für Track + Home
- `src/components/ExerciseHistorySheet.tsx` — Übungsverlauf pro Übung
- `src/components/MetricCategorySheet.tsx` — Kategorie-Auswahl (`ExerciseMetric`)
- `src/components/TimerLeaveSheet.tsx` — Timer stoppen (Tab-Wechsel, Modus, Reset)
- `src/components/DeleteConfirmDialog.tsx` — Lösch-Bestätigung als Bottom-Sheet (Auto-Höhe, max. 95 %); 1 Schritt: Übungen/Körperwerte; 2 Schritte: Plan/Workout/Session
- `src/components/ConfirmSheet.tsx` — Nicht-Lösch-Bestätigungen (z. B. Workout überspringen, Entwurf verwerfen)
- `src/components/AlertSheet.tsx` — Hinweise/Fehler mit einem OK-Button (kein `window.alert`)
- `src/lib/avatar.ts` + `src/components/UserAvatar.tsx` + `AvatarCropSheet.tsx` + `AvatarActionSheet.tsx` — Profilbild (Upload, Crop, Entfernen); Anzeige Profil + Home
- `src/components/SplitImageSlider.tsx` — interaktiver Wisch-Slider für den visuellen Vorher/Nachher Foto-Vergleich
- `src/screens/auth/` — Login, Signup, Passwort-Reset (Token)
- `src/screens/` — Home, Plans, PlanDetail, WorkoutsHub, …
- `src/components/ExerciseFormSheet.tsx` + `ExercisePickerSheet.tsx` — Übungs-CRUD, optionaler YouTube-Link, Löschen im Edit-Sheet
- `src/components/ExerciseVideoSheet.tsx` — YouTube-Embed im Bottom-Sheet (aktives Workout)
- `src/components/CatalogStandardLock.tsx` — Schloss-Icon für nicht löschbare Standard-Workouts/Übungen
- `src/components/MuscleGroupSelect.tsx` — Muskelgruppen-Dropdown (Filter + Formular); `MuscleGroupFilterChips` entfernt
- `src/PhoneApp.tsx` — Tab-/Push-Router (tracking, builder, workoutDetail, planDetail, sessionDetail, sessionEdit, planBuilder, settings, profile, calculator, bodyTracker)

- `src/components/FloatNav.tsx` — 5-Slot-Glas-Nav (Start · KI Plan · Plus/TurboTracking · Pläne · Profil): unten Mobile/Tablet, links Desktop; zentraler FAB startet TurboTracking-Setup; `FloatNavContentFade` dimmt scrollenden Content; `floatNavContentInset()` / `FLOAT_NAV_FAB_OVERHANG` (FAB_SIZE − LIFT) für Scroll-Clearance; `FLOAT_NAV_BOTTOM_OFFSET_CSS` iOS-synchron halten
- `src/components/PhoneShell.tsx` — App-Shell mit Safe-Area; `reserveBottomSafeArea` wenn Bottom-Nav aktiv
- `src/App.tsx` — Auth-Gate + ResponsiveProvider

## Entscheidungen & Constraints
- Quelle ist ein Claude-Design-Bundle (urspr. Richtung „A · MOMENTUM"); UI pixel-genau übernommen. App-Name: **rephive**.
- MButton-Tast-Feedback: visuell-first (`buttonPressStyle` in `theme.ts`); native Vibration nur Primary-CTAs; `prefers-reduced-motion` ohne Transform/Glow-Pulse.
- Bewusst KEIN Phone-Mockup — nur das App-UI.
- Keine Browser-Dialogs (`alert`/`confirm`): Löschen über `DeleteConfirmDialog` (Bottom-Sheet, 1–2 Schritte); sonstige Bestätigungen über `ConfirmSheet`; Hinweise/Fehler über `AlertSheet`.
- Breakpoints: Mobil <768, Tablet 768–1023, Desktop ≥1024; Nav: FloatNav unten (Mobile/Tablet) bzw. links (Desktop). Haupttabs: home, plans, profile (+ timer/history programmatisch); Verlauf über Home-Menü; TurboTracking über Nav-FAB (nicht mehr Home-Karte).
- Übungs-Katalog: Tabelle `exercises` (globale Seeds + eigene). Erreichbar über Sidepanel „Übungen“. Plan-Übungen in `plan_day_exercises` mit optionalem `catalog_exercise_id`.
- 1RM-Rechner: Home → Route `calculator` / `CalculatorScreen`; aktives Workout → Icon oben rechts → `OneRmCalculatorSheet` mit Prefill aus offener Übung.
- Übungs-Messung: `metric_type` u.a. `weight_reps`, `time`, `distance_time` (Cardio: ZEIT / M·km); Volumen nur bei Kraft-Metrics; KI setzt Cardiogeräte auf `time`/`distance_time`, Kraft auf `weight_reps`.
- Satz-JSON: `{ reps, kg, done?, durationSec?, distanceM?, warmUp?, perceivedEffort? }` — `warmUp` nur S1, optional, rein visuell (zählt ins Volumen); `perceivedEffort` (Leicht/Passt/Schwer) gespeichert, Engine-Nutzung noch offen.
- **Auto-Pilot:** Beim Tracken werden Sätze aus letzter Session vorgeschlagen (bestätigen/anpassen); Progression über `progressionEngine`; Gewichtssprünge in Settings (Ober-/Unterkörper). Boot-Overlay in TrackScreen bis Prefills angewendet.
- **TurboTracking:** Standard-Track für eligible Workouts (Setup-Wizard → Turbo-View); kein Wechsel klassisch/Turbo mehr in der UI. **Voice-Logging (Labs):** Owner-Labs-Toggle; PTT-Button; Werte nur aus Parser (kein Auto-Pilot-Fallback).
- Passwort-Reset per E-Mail-Token (OTP), nicht per Link.
- Nutzer-Preferences in `profiles.preferences` (JSONB); u.a. `timerSounds`, `restSeconds`, `autoRest`, Timer-Defaults; **Profil** als FloatNav-Tab; Settings/Stats/Verlauf/Übungen weiter über Home-Sidepanel (Push-Routes). Rechtliches im Panel: externe Links zu rephive.app (`/impressum`, `/datenschutz`, `/agb`); Über rephive und Support als In-App-Routes. Hilfe-Menü v1: nur Support (kein FAQ/Feature-Anfrage-Platzhalter).
- Legal/Support-URLs Web-App: `VITE_LEGAL_BASE_URL` (Default `https://rephive.app`).
- Timer-Signale: Web Audio API (keine Sound-Dateien), abschaltbar via `timerSounds`; Countdown-Ticks nur bei runterzählenden Phasen (nicht For-Time-Lauf).
- Aktiver Timer: `ActiveTimerProvider` in `PhoneApp`; Leave-Sheet bei Tab-Wechsel; Modus/Reset-Warnung in `TimerScreen`; Timer über Home-Schnellzugriff (Tab `timer`, nicht in FloatNav).
- Trainingspläne: `plans` + `plan_days` mit **`enabled_blocks`** (aktive Bausteine) + Übungen in `plan_day_exercises` inkl. **`block_type`** + **`block_id`** → **`plan_day_blocks`** (Format, Timer: AMRAP/EMOM/Circuit). Manueller Builder: MetCon opt-in per Textlink + `MetconConfigSheet`. Keine Workout-Vorlagen mehr.
- Sessions: aggregierte Stats in `sessions` + Satz-Snapshot in `session_exercises` (inkl. **`block_type`**); optional `plan_day_id`; **`skipped_blocks`**; **`metcon_results`** (jsonb, AMRAP-Runden o. ä.).
- Pausiertes Tracking: Entwurf clientseitig (localStorage), Dauer aus `startedAt` läuft weiter; Speichern erst über FinishSheet → `sessions` + `session_exercises`.
- **Local-First:** Pläne + Übungskatalog in IndexedDB (cache-first); Mutationen offline in Outbox-Queue, Sync bei Online/App-Start; KI-Plan-Generierung bleibt online-only.
- Individuelle Sessions: ohne `plan_day_id`, Tag „Individuell“; Übungen nur im Session-Snapshot.
- Supersätze: `superset_id` auf `plan_day_exercises` + `session_exercises`; Pause (`autoRest`) erst nach letzter Übung der Runde.
- Onboarding-Prozess: Wird bei unvollständigem Onboarding (`preferences.onboarded === false`) über `PhoneAppInner` verpflichtend eingeblendet und blockiert die normale Navigation. Erfasst grundlegende Anamnese-Daten und legt ggf. ein Gewicht in `body_measurements` an.
- iOS WKWebView: Flex-Kinder in scrollbaren Flex-Columns nicht schrumpfen lassen (`flexShrink: 0` auf Karten); bei expandierten Track-Karten `overflow: visible`, sonst `hidden` für Border-Radius.
- Vorher/Nachher Bilder: Fotos werden im Supabase Storage-Bucket `body-photos` unter `{userId}/{filename}` mit RLS abgesichert (öffentlicher Bucket). Nativer HTML5 Dateiupload für Capacitor/Web-Parität.
- **Profilbild:** Bucket `avatars`, Pfad `{userId}/avatar.webp`, Spalte `profiles.avatar_path`; Crop → WebP (~512px); Bearbeitung nur auf Profil-Screen; Anzeige auch Home-Menü-Button.
- KI-Trainingspläne: Wizard → `generate-training-plan` liefert pro Tag **`blocks[]`** (warmup/skill/strength/metcon) + `enabledBlocks` + MetCon **`config`**; warmup-Baustein nur leichtes Cardio (kein Mobilitäts-Block im Prompt); Client mappt in `db.ts`. Deploy: `./scripts/deploy-training-plan.sh`.
- Rollen: `profiles.role` enum `athlet` | `coach` | `owner`; nur `isAppOwner` für globale Übungen. **Coaching** bewusst zurückgestellt (wird später neu gebaut).
