# Aktueller Stand

## Letzte Änderungen
- **Edge Function `generate-training-plan` deployed:** CLI-Deploy auf Supabase-Projekt `jnspiqnlwbsobqctmfnk` (v3, ACTIVE, `verify_jwt: true`). Vollständiger Quellcode live (Feedback, Sessions, Adapt-Modus, Anthropic + Mock, globale `exercises`-Anlage).
- **Repo-Deploy-Hilfen:** `supabase/config.toml` (project_id), `scripts/deploy-training-plan.sh` für künftige Deploys.
- **KI-Lernen & Feedback-System:** Bewertungen im `WorkoutFinishSheet` → `profiles.preferences.exerciseFeedback`; letzte 10 Sessions + aktiver Plan an Edge Function; Checkout-Wizard mit Neuerstellung (9,99 €) vs. Anpassung (4,99 €).

## Fokus
- End-to-End-Test des KI-Wizards in der App (neu + Plan anpassen).
- Optional: `ANTHROPIC_API_KEY` als Edge-Function-Secret setzen (sonst Mock-Fallback).
- iOS-App (Capacitor) stabil für App-Store-Vorbereitung; Web- und iOS-Parität.

## Nächste Schritte
- Secret `ANTHROPIC_API_KEY` in Supabase Dashboard setzen (echte KI-Pläne).
- KI-Plan-Generierung auf echten Mobilgeräten testen.
- `npm run build && npx cap sync ios` für iOS-Parität.

## Offene Punkte
- PR-Flag (`is_pr`) bei Sessions.
- Landingpage: Cookies-Link im Footer noch Platzhalter.
- Trainings-Historie leer, solange Nutzer keine Sessions speichern (Progression/Feedback wirkt erst mit Daten).
