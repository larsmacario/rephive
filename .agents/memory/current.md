# Aktueller Stand

## Letzte Änderungen
- **4-Bausteine-System live:** Migration `20260607120000_plan_training_blocks.sql` (remote), Edge Function `generate-training-plan` deployed (`blocks[]`, Altersbänder, `birthDate`).
- **TrackScreen (Plan):** Scroll-Fix (innerer Wrapper, kein Flex-Shrink), Bausteine einklappbar (Default: nur erster Block offen), Fortschritts-Badge wie bei Übungen, Übungen pro Baustein hinzufügen, Session-Skip unverändert.
- **UI PlanBlockSection:** Keine linken Akzent-Ränder; `BLOCK_GUIDE_HINTS` statt Minutenangaben.
- **Coaching entfernt** (später neu): Migration `20260608120000_remove_coaching.sql`, Edge `send-coaching-invite` weg.

## Fokus
- TestFlight / manueller E2E: KI-Plan mit 4 Bausteinen, Block-Skip beim Finish, Block-Editor, Tracking-Flow.

## Nächste Schritte
- End-to-End in der App verifizieren (bestehender Plan unter „Kraft“, neuer KI-Plan mit Blocks).
- Coaching später neu planen und implementieren.

## Offene Punkte
- UI: keine colored left borders (`.agents/claude.md`).
- `exercises_backup_20260605` ohne RLS (Backup-Tabelle).
