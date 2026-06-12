# Aktueller Stand

## Letzte Änderungen
- **TurboTracking → ExpressTracking:** Vollständige Umbenennung (Domain, UI, Routes, FAB); neuer Session-Tag `ExpressTracking`, Legacy `TurboTracking` + `Individuell` weiter erkannt.
- **Voice pausiert:** PTT-UI aus `ExpressTrackingView` entfernt; Code (`useVoiceSetLog`, Parser, Tests) bleibt; Re-Enable über `EXPRESS_VOICE_ENABLED` in `expressTracking.ts`.

## Fokus
- ExpressTracking-Flow manuell testen (FAB → Setup → Track → Confirm ohne Voice).
- Alte TurboTracking-Sessions in Setup „Wiederholen“-Liste prüfen.

## Nächste Schritte
- Nach Web-Changes: `npm run build && npx cap sync ios`.
- Voice erst reaktivieren, wenn STT auf echtem iPhone/AirPods zuverlässig (aktuell fehlerhaft).

## Offene Punkte
- Voice-Logging: iPhone + AirPods-Test fehlgeschlagen — Feature bewusst aus UI.
- YouTube offline nicht gecacht (v1 online-only).
- Ausstehende Sessions erst nach Sync in History (kein „Ausstehend"-Badge v1).
- `exercises_backup_20260605` ohne RLS (Backup-Tabelle).
