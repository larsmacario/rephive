# Rephive → Apple App Store: Schritt-für-Schritt-Anleitung

## Voraussetzungen

- **Mac** mit macOS 13+ (Xcode läuft nur auf Mac)
- **Xcode** (kostenlos im Mac App Store) — Version 15+
- **Apple Developer Account** → https://developer.apple.com (99 €/Jahr)
- **Node.js** (bereits vorhanden, da Vite-Projekt)

---

## Schritt 1: Capacitor installieren

```bash
cd /Users/larsmacario/Desktop/My\ Projects/rephive

npm install @capacitor/core @capacitor/cli @capacitor/ios
```

---

## Schritt 2: Capacitor initialisieren

```bash
npx cap init
```

Du wirst nach folgenden Infos gefragt:
- **App Name**: `Rephive` (oder wie die App heißen soll)
- **App ID**: `com.rephive.app` (umgekehrte Domain — muss einzigartig sein, z.B. `com.larsmacario.rephive`)

Danach `capacitor.config.ts` prüfen/anpassen:

```ts
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rephive.app',
  appName: 'Rephive',
  webDir: 'dist',           // Vite baut nach /dist — passt bereits
  bundledWebRuntime: false
};

export default config;
```

---

## Schritt 3: iOS-Plattform hinzufügen

```bash
npx cap add ios
```

Das erstellt einen `/ios`-Ordner mit dem Xcode-Projekt.

---

## Schritt 4: App bauen und in Xcode übertragen

```bash
# 1. Web-App bauen
npm run build

# 2. Build in iOS-Projekt kopieren
npx cap sync ios

# 3. Xcode öffnen
npx cap open ios
```

---

## Schritt 5: In Xcode konfigurieren

1. **Bundle Identifier** setzen: muss exakt mit der App ID aus Schritt 2 übereinstimmen
2. **Signing & Capabilities** → Team auswählen (dein Apple Developer Account)
3. **Version & Build Number** setzen (z.B. Version `1.0.0`, Build `1`)
4. **App Icons** hinzufügen (1024×1024 px PNG ohne Transparenz für App Store)
5. **Splash Screen** optional (via `@capacitor/splash-screen`)

---

## Schritt 6: App auf echtem Gerät testen

1. iPhone per USB anschließen
2. In Xcode: Zielgerät auswählen → ▶ Play drücken
3. Auf dem iPhone: Einstellungen → Allgemein → VPN & Geräteverwaltung → Deinem Entwickler-Zertifikat vertrauen

---

## Schritt 7: App Store Connect vorbereiten

1. Gehe zu https://appstoreconnect.apple.com
2. **Neue App** anlegen:
   - Plattform: iOS
   - Bundle ID: dieselbe wie in Schritt 2
   - SKU: beliebige interne ID (z.B. `rephive-001`)
3. **Screenshots** hochladen (mind. 6,5" iPhone-Format)
4. **App-Beschreibung**, Keywords, Kategorie ausfüllen
5. **Datenschutz-URL** angeben (Pflicht)
6. **Altersfreigabe** festlegen

---

## Schritt 8: Archive erstellen & hochladen

In Xcode:

1. Menü: **Product → Destination → Any iOS Device (arm64)** wählen
2. Menü: **Product → Archive**
3. Im Archiv-Fenster: **Distribute App** → **App Store Connect** → **Upload**
4. Xcode lädt das Build automatisch hoch

---

## Schritt 9: Build in App Store Connect einreichen

1. In App Store Connect unter **TestFlight** erscheint das Build nach ~15 Min.
2. Optionaler Zwischenschritt: **TestFlight**-Beta-Test mit externen Testern
3. Dann: **Submit for Review** → Apple prüft die App (1–3 Werktage)

---

## Häufige Stolperfallen

| Problem | Lösung |
|---|---|
| „No signing certificate" | In Xcode Signing → Automatically manage signing aktivieren |
| App ID bereits vergeben | Andere App ID wählen (z.B. `com.larsmacario.rephive`) |
| Icons fehlen | 1024×1024 PNG ohne alpha-Kanal in Assets.xcassets |
| Web-APIs nicht verfügbar | HTTPS-URLs verwenden; `localhost` funktioniert nur im Dev-Modus |
| Supabase-URL hardcoded | Env-Variablen prüfen — im Vite-Build müssen VITE_-Variablen im Build stecken |

---

## Nützliche Befehle im Überblick

```bash
npm run build          # Web-App bauen
npx cap sync ios       # Build ins iOS-Projekt übertragen
npx cap open ios       # Xcode öffnen
npx cap run ios        # Direkt auf verbundenem iPhone starten
```

---

## Zeitplan (realistisch)

- Setup + erster Build: **1–2 Stunden**
- App Store Connect ausfüllen + Screenshots: **1–2 Stunden**
- Apple Review: **1–3 Werktage**
