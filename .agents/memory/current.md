# Aktueller Stand

## Letzte Änderungen
- **TurboTrack Voice (Labs):** Push-to-talk in `FrictionTurboView` (`usePushToTalk` + `useVoiceSetLog`); native iOS via `@capgo/capacitor-speech-recognition`, Web-Fallback `webkitSpeechRecognition`; Bereinigung STT-Fehler (`voiceTranscriptCleanup`: Kino→Kilo, €→Kilo); Parser mit DE-Zahlwörtern, `20x10`, `mal`-Notation (`voiceSetParser`).
- **Voice-UX:** Preview-Box oben für erkannten Text; kein Text/Fehler unter Voice-Button; kein Auto-Pilot-Fallback für kg/reps (nur echte Parser-Werte).

## Fokus
- TurboTrack Voice auf echtem iPhone verifizieren (Hold → Preview → Übernehmen).
- Optional: weitere STT-Homophone in `voiceTranscriptCleanup` ergänzen.

## Nächste Schritte
- Manuell: verschiedene Formulierungen testen („80 Kilo 8“, „Zehn Kilo 20 Wiederholung“, `20x10`).
- Nach Web-Changes: `npm run build && npx cap sync ios`.

## Offene Punkte
- iPhone-Simulator: Speech oft ohne Mikro-Signal — echtes Gerät für Voice-Tests.
- YouTube offline nicht gecacht (v1 online-only).
- Ausstehende Sessions erst nach Sync in History (kein „Ausstehend"-Badge v1).
- `exercises_backup_20260605` ohne RLS (Backup-Tabelle).
