# Aktueller Stand

## Letzte Änderungen
- **KI-Einwilligung (Apple 5.1.2(i)):** `aiConsent` in `profiles.preferences`, Wizard-Schritt Consent, Gates Client (`db.ts`) + Edge Function `requireAiConsent`; Widerruf/Re-Consent in Einstellungen; Datenschutz-Landingpage (Anthropic-Abschnitt).
- **Edge Function:** `generate-training-plan` v19 deployed (`verify_jwt=true`, Consent-Gate live).
- **Deploy-Scripts:** MCP-Artefakte entfernt; `scripts/deploy-training-plan.sh` + `deploy-delete-account.sh` nur noch CLI (Token-Fallback `~/.supabase/access-token`).
- **App Store P1:** Home HILFE nur Support; iOS Info.plist Foto-Strings + ATS ohne `NSAllowsArbitraryLoads`.

## Fokus
- App-Store-Submit: KI-Consent-Flow + Body-Tracker-Foto + Legal-Links auf Gerät testen.
- `npm run build` wieder grün bekommen (`BuilderItem.category` in BuilderScreen/PlanBuilderScreen).

## Nächste Schritte
- TestFlight: Consent → Plan generieren; Widerruf in Einstellungen; 403 ohne Consent prüfen.
- `npm run build` fixen, dann `npx cap sync ios` vor Release.
- App Store Connect Privacy Labels (Fitness-Daten an Anthropic) manuell prüfen.

## Offene Punkte
- TS-Build-Fehler `BuilderItem.category` (vorbestehend).
- KI-Katalog-Upsert: bestehende `exercises` bei Metric-Wechsel ggf. aktualisieren.
- IAP/StoreKit für KI-Checkout v1.1 geplant (Wizard-Checkout aktuell simuliert).
