# Aktueller Stand

## Letzte Änderungen
- **KI-Übungsanzahl:** `exerciseCountBounds` in `generate-training-plan` — skaliert nach Minuten, Erfahrung (Profi +2), Ziel (Muskelaufbau +1, Kraft −1), Stress/Schlaf; cap 8 Kraftübungen; Prompt Regel 2 dynamisch.
- **Wizard:** `src/lib/ai-plan-volume.ts` + Hinweis unter Trainingsdauer (Schritt 7).
- **Stabilität:** Client-Timeout 150 s bei `functions.invoke`; Katalog-Upsert per `EdgeRuntime.waitUntil` im Hintergrund; klarere Fehlermeldungen bei Verbindungsabbruch.
- Edge Function deployed (v16+).

## Fokus
- KI-Plan-Generierung stabil und mit realistischem Volumen für Profi-Nutzer testen.

## Nächste Schritte
- Neuen KI-Plan (Profi + 60 Min) generieren und Übungsanzahl prüfen; App während Generierung geöffnet lassen.
- Bei iOS-Problemen: Timeout/Netzwerk in Capacitor-WKWebView beobachten.

## Offene Punkte
- 4-Bausteine-Philosophie nur als Doku, nicht im Code.
- Katalog-Upsert: bestehende `exercises` bei Metric-Wechsel ggf. aktualisieren (nicht nur Insert).
