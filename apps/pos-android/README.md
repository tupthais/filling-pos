# Filling POS Android shell

Legacy-friendly Kotlin/Compose shell for POS hardware. The shared sync contract is `POST /api/sync/orders`.

## Build

The repository includes a Gradle wrapper. With `ANDROID_SDK_ROOT` pointing at the Android SDK:

```bash
./gradlew :app:assembleDebug
```

On Windows PowerShell:

```powershell
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat :app:assembleDebug
```

For a physical device on the same LAN as the development computer, pass the computer's LAN URL:

```powershell
.\gradlew.bat -PPOS_API_BASE_URL=http://192.168.1.105:3000 :app:assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`. Install on a connected Huawei Android/HarmonyOS device with:

```powershell
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

Enable Developer options and USB debugging on the Huawei device first. iPad cannot install this APK; use the web/PWA surfaces there.

The shell intentionally contains no credentials and no real payment or platform connector. It now includes a generic Bluetooth ESC/POS adapter for 58/80mm counter, kitchen, and bar printers plus the standard cash-drawer pulse command. Pairing, runtime Bluetooth permissions, printer MAC configuration, and certification on each physical model are still required before production use.
