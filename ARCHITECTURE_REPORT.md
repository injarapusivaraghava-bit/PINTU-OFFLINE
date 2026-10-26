# Pintu Offline - Android Native Integration & Architecture Report
*Authoritative Audit and Transition Plan to Native Kotlin & Jetpack Compose*

This technical audit report identifies why the current web-based simulator does not establish physical radio communication and outlines the precise architecture, files, and Android SDK APIs required to achieve true **real phone-to-phone offline communication** inside Android Studio.

---

## 1. Audit: Why Communication is Currently Simulated
The current application runs inside a standard web browser sandbox (React / Vite). Browser environments have strict security policies that prevent low-level hardware radio access:

1. **Bluetooth Classic / BLE Sockets (`BluetoothService`)**:
   - Web browsers do not expose access to the low-level `BluetoothSocket` or RFCOMM sockets required for master-slave serial channels without pairing prompts.
2. **Wi-Fi Direct (`WifiDirectService`)**:
   - The Web platform has absolutely zero APIs to interface with Wi-Fi Peer-to-Peer (`WifiP2pManager`). Devices cannot broadcast local service packets or negotiate direct IP allocations without an external router.
3. **P2P Audio/Video Handshakes (`VoiceCallService` / `VideoCallService`)**:
   - WebRTC requires a signaling channel (normally a WebSocket or HTTP server). In a physical offline mesh, there is no centralized signaling channel. The signaling packets *must* be sent over low-level raw TCP/UDP Bluetooth RFCOMM sockets, which is impossible from standard client-side browser JS.
4. **Local Messaging Database (`LocalMessageService`)**:
   - Web uses transient memory states or simple `localStorage`/`sessionStorage`. Physical devices require persistent SQLite databases via Android's **Room Database** to guarantee ACID-compliant storage across crashes.

---

## 2. Pintu Offline Architecture: 7-Layer Service Flow
To transition from Web UI to Android Studio, you must implement the following unified architectural hierarchy:

```
[7. VideoCallService]    ➔ Streams H.264 camera frames matching DB Dbm signals
         ↓
[6. VoiceCallService]    ➔ Compresses & transmits WebRTC Opus low-latency UDP streams
         ↓
[5. FileTransferService] ➔ Chunks binary stream payloads over localized TCP Server/Sockets
         ↓
[4. LocalMessageService] ➔ Delivers end-to-end AES-256 encrypted messages via Room SQL
         ↓
[3. ConnectionManager]   ➔ Handles heartbeats, routing tables, and master/slave sockets
         ↓
[2. NearbyDeviceService] ➔ Scans/tracks peer identifiers over Wi-Fi P2P and BLE
         ↓
[1. BluetoothService]    ➔ Requests system power-on, BluetoothAdapter permissions & RFCOMM
```

---

## 3. Transition Implementation Blueprint

### Phase 1 Priority: Text Messaging & Device Discovery
Before writing any voice/video calling code, you must achieve a stable, error-free text channel.

#### Layer 1: Bluetooth & Wi-Fi Direct Services
* **Target Android Files**: `com.pintu.offline.service.BluetoothService.kt` and `com.pintu.offline.service.WifiDirectService.kt`
* **Required Android APIs**: 
  - `android.bluetooth.BluetoothAdapter`, `BluetoothServerSocket`, `BluetoothSocket`
  - `android.net.wifi.p2p.WifiP2pManager`, `WifiP2pConfig`, `WifiP2pGroup`
* **Key Implementation Details**:
  - One device starts BLE Advertising as a Pintu Peer containing its short Pintu ID in the custom Service UUID advertisement.
  - The other device scans for matching Service UUID beacons.
  - Upon discovery, devices launch a Wi-Fi Direct connection negotiation using a secure, custom numerical PIN to prevent unauthorized intercepts.

#### Layer 2: Connection Manager & Local Messaging
* **Target Android Files**: `com.pintu.offline.service.ConnectionManager.kt` and `com.pintu.offline.service.LocalMessageService.kt`
* **Required Android APIs**:
  - `java.net.ServerSocket`, `java.net.Socket` (used for localized TCP handshake and message parsing)
  - `androidx.room.Room`, `@Dao`, `androidx.room.Entity` (for secure offline storage)
* **Key Implementation Details**:
  - Establish a persistent socket on port `3000` (or another selected port).
  - Exchange cryptographic public keys via a simple DH-Exchange.
  - Encrypt all messages using `javax.crypto.Cipher` (AES-GCM-256).

---

## 4. Phase 2: Multimedia Sockets (Only After Text Works)
Once real text messaging is fully proven across physical devices, overlay these high-speed streams:

### A. FileTransferService
* **Target Android Files**: `com.pintu.offline.service.FileTransferService.kt`
* **Mechanism**: Runs a separate, high-priority background service (`android.app.Service`) with a custom TCP thread pool chunking files in 8KB packets to prevent memory heap overflow.

### B. VoiceCallService / VideoCallService
* **Target Android Files**: `com.pintu.offline.service.VoiceCallService.kt` and `com.pintu.offline.service.VideoCallService.kt`
* **Mechanism**: Uses `android.media.AudioRecord` and `android.media.AudioTrack` combined with local peer-to-peer UDP WebRTC instances. The local camera frames are encoded using Android's hardware accelerated `MediaCodec` and sent over UDP to achieve low latency (<50ms).

---

## 5. Summary of Files to Modify for Native Build
When integrating the React WebView into your native Android Studio project, you must:
1. Update `AndroidManifest.xml` to request:
   - `android.permission.BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `ACCESS_FINE_LOCATION`, `CHANGE_WIFI_STATE`, `RECORD_AUDIO`, `CAMERA`
2. Add a `WebViewJavaScriptInterface` class in Kotlin (e.g., `PintuNativeBridge.kt`) and bind it to the React application using:
   - `webView.addJavascriptInterface(PintuNativeBridge(this), "Android")`
3. Wire the Web interface calls (`window.Android.share(...)` and message dispatchers) directly to your unified Android Kotlin Service Stack.

---

## 6. Physical Two-Phone Testing Protocol (Phone A ➔ Phone B Verification)
To guarantee real offline communication before overlaying audio or video streams, your Android Studio test suite must strictly execute this baseline flow on **two physical devices**:

### Step 1: Device Configuration & Power-On
* **Phone A**: Enable Bluetooth & Wi-Fi radios. Launch the app and enter the discoverable beacon state (starts BLE advertising).
* **Phone B**: Enable Bluetooth & Wi-Fi radios. Select the "Nearby" tab to start discovery scanning.

### Step 2: Discovery Verification (Priority 1)
* Phone B scans and receives Phone A's Service UUID advertisements.
* Phone B displays Phone A's ID on screen with active rssi/signal levels.

### Step 3: Peer Handshake Link (Priority 2)
* Phone B initiates connection to Phone A.
* Sockets establish a mutual Wi-Fi Direct connection. Verify routing table is updated.

### Step 4: Text Packet Delivery (Priority 3) - Send "Hello"
* On Phone A, type `"Hello"` and hit send.
* Phone A encrypts payload using AES-GCM-256 and writes raw bytes to the persistent RFCOMM/TCP socket.
* Phone B receives raw bytes, decrypts payload, triggers an Android system notification, and inserts `"Hello"` into its local Room database.
* Phone B displays `"Hello"` in the active conversation chat bubble.

### Step 5: Advanced Media Pipelines (Priority 4, 5, & 6)
* Only after the text channel successfully delivers `"Hello"`, activate the high-speed transfer streams:
  1. **FileTransferService**: Streams raw file streams in chunked background packages.
  2. **VoiceCallService**: Compresses microphone inputs using WebRTC Opus codecs and fires UDP audio packets.
  3. **VideoCallService**: Hooks Camera2 API and feeds local camera frames onto active SurfaceViews.

