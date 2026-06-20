# Aktueller Stand

## Letzte Änderungen
- **Timer-Sound-Packs:** Prozedurale Sounds via `sonance` (4 Packs: Klassisch, Boxring, Pfeife, Sanft); wählbar in Einstellungen → INTERVAL-TIMER; Preference `timerSoundPack`.
- **Intervall-Timer HR (Compact):** `HeartRateTrend` in Schritt 3 — zonenfarbige Box bei verbundenem Sensor (kein Chart); größere Box (Padding 16×18, BPM 36px); Dev-Simulation entfernt.
- **Intervall-Timer Schritt 1:** „Weiter“-Button entfernt — Tipp auf Typ-Kachel springt direkt zu Einstellungen.
- **Intervall-Timer Schritt 3:** Ring vertikal zentriert und vergrößert (200/228/248 px).
- **Intervall-Timer Wizard:** 3 Schritte (type → settings → run), `useIntervalTimerSession`, Eintritt `TimerScreen` + `IntervalTimerSheet`.

## Fokus
- Timer-Sound-Packs auf echtem iPhone testen (native Wiedergabe, Stummschalter).
- Intervall-Timer-Wizard + HR auf echtem Gerät testen (BLE, Zonenfarben).
- Wochenplan-Flow + ExpressTracking ohne Voice.

## Nächste Schritte
- Nach Web-Changes: `npm run build && npx cap sync ios`.
- Voice erst reaktivieren, wenn STT auf echtem iPhone/AirPods zuverlässig.

## Offene Punkte
- **Supabase Schema-Drift behoben (2026-06-14):** `enabled_blocks`, `block_type`, `skipped_blocks` per CLI-Migration.
- Voice-Logging: iPhone + AirPods-Test fehlgeschlagen — Feature bewusst aus UI.
- YouTube offline nicht gecacht (v1 online-only).
- Ausstehende Sessions erst nach Sync in History (kein „Ausstehend"-Badge v1).
