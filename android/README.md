# Pintu Offline - Android Native Build Guide

**Platform:** Native Android (Kotlin)  
**Target SDK:** 35 (Android 15)  
**Minimum SDK:** 26 (Android 8.0 Oreo)  
**Package:** `com.pintu.offline`

---

## 1. Prerequisites
- **JDK:** OpenJDK 17 or Oracle JDK 17 (`java -version` should show 17.x)
- **Android SDK:** Platforms `android-35`, Build Tools `35.0.0`
- **Gradle:** 8.2 (configured via wrapper or standalone)

---

## 2. Compiling Web Assets
Before building the native APK, build the web client bundle so it is packaged into the app's assets:
```bash
# In the project root directory:
npm run build
```
The Gradle task `copyWebAppToAssets` in `app/build.gradle` automatically copies `dist/` into `app/src/main/assets/dist/` for offline execution inside `MainActivity`'s WebView.

---

## 3. Building Debug APK (Testing)
To generate an installable debug APK for local testing on two Android devices:
```bash
cd android
./gradlew assembleDebug
```
**Output Artifact:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**Install via ADB:**
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Building Signed Release APK (Distribution)
To generate an optimized release APK:
```bash
cd android
./gradlew assembleRelease
```
**Output Artifact:**
```
android/app/build/outputs/apk/release/app-release.apk
```

### Optional: Custom Keystore Signing
To sign with your production keystore, provide environment variables:
```bash
export RELEASE_STORE_FILE="/path/to/my-release-key.jks"
export RELEASE_STORE_PASSWORD="your-keystore-password"
export RELEASE_KEY_ALIAS="my-key-alias"
export RELEASE_KEY_PASSWORD="your-key-password"

./gradlew assembleRelease
```

---

## 5. Building Android App Bundle (AAB) for Google Play Store
Google Play requires `.aab` format for publishing:
```bash
cd android
./gradlew bundleRelease
```
**Output Artifact:**
```
android/app/build/outputs/bundle/release/app-release.aab
```
Upload `app-release.aab` directly to the Google Play Console under **Production** or **Internal Testing**.

---

## 6. Real Offline Hardware Testing Setup (Phone A & Phone B)
1. Install `app-debug.apk` on two Android devices (Phone A and Phone B).
2. Enable Bluetooth and Location permissions on both devices.
3. On Phone A, open **Nearby** and tap **SCAN NEARBY**.
4. Phone B will appear via Bluetooth Classic RFCOMM discovery.
5. Tap **PAIR / CONNECT** to establish the RFCOMM socket.
6. Open **Chat** to exchange end-to-end encrypted messages offline with real delivery receipts.
