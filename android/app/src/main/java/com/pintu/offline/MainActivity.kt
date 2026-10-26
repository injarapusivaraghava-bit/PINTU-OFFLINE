package com.pintu.offline

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.SurfaceView
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.room.Room
import com.pintu.offline.db.PintuDatabase
import com.pintu.offline.security.EncryptionManager
import com.pintu.offline.security.KeyManager
import com.pintu.offline.service.*
import com.pintu.offline.webrtc.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
        private const val PERMISSIONS_REQUEST_CODE = 101
    }

    private lateinit var webView: WebView
    
    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    // Services
    private lateinit var database: PintuDatabase
    private lateinit var bluetoothService: BluetoothService
    private lateinit var wifiDirectService: WifiDirectService
    private lateinit var nearbyDeviceService: NearbyDeviceService
    private lateinit var connectionManager: ConnectionManager
    private lateinit var localMessageService: LocalMessageService
    private lateinit var fileTransferService: FileTransferService
    private lateinit var voiceCallService: VoiceCallService
    private lateinit var videoCallService: VideoCallService
    private lateinit var callManager: CallManager
    private lateinit var nearbyManager: NearbyManager
    private lateinit var chatManager: ChatManager
    private lateinit var fileTransferManager: FileTransferManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Full screen WebView layout for Pintu Offline interface
        webView = WebView(this)
        setContentView(webView)

        initializeServices()
        configureWebView()
        requestAppPermissions()
        startNativeEventSync()
    }

    override fun onDestroy() {
        super.onDestroy()
        mainScope.cancel()
    }

    private fun initializeServices() {
        // Initialize Room DB
        database = Room.databaseBuilder(
            applicationContext,
            PintuDatabase::class.java,
            "pintu_offline_secure_db"
        ).fallbackToDestructiveMigration().build()

        val keyManager = KeyManager()
        val encryptionManager = EncryptionManager(keyManager)

        // Instantiate hardware implementations
        bluetoothService = BluetoothServiceImpl(this)
        wifiDirectService = WifiDirectServiceImpl(this)
        nearbyDeviceService = NearbyDeviceServiceImpl(this, bluetoothService, wifiDirectService)
        connectionManager = ConnectionManagerImpl()
        localMessageService = LocalMessageServiceImpl(database.pintuDao(), encryptionManager, bluetoothService)
        fileTransferService = FileTransferServiceImpl()
        voiceCallService = VoiceCallServiceImpl(this)
        videoCallService = VideoCallServiceImpl(this)
        callManager = CallManager(this, voiceCallService, videoCallService)
        nearbyManager = NearbyManager(this, nearbyDeviceService)
        chatManager = ChatManager(this, localMessageService)
        fileTransferManager = FileTransferManager(this, fileTransferService)

        Log.i(TAG, "All Pintu Offline Local Hardware Services initialized successfully.")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Synchronize native connection status with React app
                notifyWebViewOfSystemState()
            }
        }

        // Add JS Native interface bridges
        webView.addJavascriptInterface(PintuNativeBridge(), "PintuNative")
        webView.addJavascriptInterface(NativeBridge(this), "AndroidNative")

        // Load the React static client compiled output
        // In physical Android builds, this is placed in assets/dist/index.html
        webView.loadUrl("file:///android_asset/dist/index.html")
    }

    private fun requestAppPermissions() {
        val list = mutableListOf<String>()
        val required = bluetoothService.requiredBluetoothPermissions.toMutableList()
        
        required.add(android.Manifest.permission.ACCESS_FINE_LOCATION)
        required.add(android.Manifest.permission.ACCESS_COARSE_LOCATION)
        required.add(android.Manifest.permission.RECORD_AUDIO)
        required.add(android.Manifest.permission.CAMERA)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            required.add(android.Manifest.permission.NEARBY_WIFI_DEVICES)
        }

        for (permission in required) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                list.add(permission)
            }
        }

        if (list.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, list.toTypedArray(), PERMISSIONS_REQUEST_CODE)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSIONS_REQUEST_CODE) {
            var grantedAll = true
            for (res in grantResults) {
                if (res != PackageManager.PERMISSION_GRANTED) grantedAll = false
            }
            if (grantedAll) {
                Log.d(TAG, "All local hardware permissions successfully granted.")
            } else {
                Toast.makeText(this, "Permissions required for offline Bluetooth/Wi-Fi Direct mesh", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun notifyWebViewOfSystemState() {
        runOnUiThread {
            val isBtEnabled = bluetoothService.isBluetoothEnabled.value
            val isWifiConnected = wifiDirectService.connectionInfo.value.isConnected
            
            val json = JSONObject().apply {
                put("bluetoothEnabled", isBtEnabled)
                put("wifiDirectConnected", isWifiConnected)
                put("deviceNativeMode", true)
            }

            webView.evaluateJavascript("if(window.onPintuNativeStateUpdate) { window.onPintuNativeStateUpdate('$json'); }", null)
        }
    }

    inner class PintuNativeBridge {

        @JavascriptInterface
        fun startDiscovery() {
            Log.d(TAG, "JS requested nearby scanning")
            nearbyDeviceService.startNearbyScanning()
        }

        @JavascriptInterface
        fun stopDiscovery() {
            Log.d(TAG, "JS requested stop scanning")
            nearbyDeviceService.stopNearbyScanning()
        }

        @JavascriptInterface
        fun connectToDevice(deviceId: String) {
            connectToPeerById(deviceId)
        }

        @JavascriptInterface
        fun pairDevice(deviceId: String) {
            pairDeviceById(deviceId)
        }

        @JavascriptInterface
        fun sendTextMessage(recipientId: String, text: String) {
            localMessageService.sendOfflineMessage(recipientId, text) { msg ->
                runOnUiThread {
                    webView.evaluateJavascript("if(window.onMessageStatusUpdated) { window.onMessageStatusUpdated('${msg.messageId}', '${msg.status}'); }", null)
                }
            }
        }

        @JavascriptInterface
        fun shareApp(shareText: String) {
            runOnUiThread {
                try {
                    val sendIntent = Intent().apply {
                        action = Intent.ACTION_SEND
                        putExtra(Intent.EXTRA_TEXT, shareText)
                        type = "text/plain"
                    }
                    val chooser = Intent.createChooser(sendIntent, "Share Pintu Offline")
                    startActivity(chooser)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed launching share intent", e)
                }
            }
        }

        @JavascriptInterface
        fun startVoiceCall(peerIp: String, port: Int) {
            // Check microphone permission first
            if (ContextCompat.checkSelfPermission(this@MainActivity, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Microphone permission required for offline voice calls", Toast.LENGTH_LONG).show()
                    webView.evaluateJavascript("if(window.onCallStatusUpdated) { window.onCallStatusUpdated('failed', 'Microphone permission denied'); }", null)
                }
                return
            }
            callManager.startVoiceCall(peerIp, port)
        }

        @JavascriptInterface
        fun endVoiceCall() {
            callManager.endActiveCall()
        }

        @JavascriptInterface
        fun startVideoCall(peerIp: String) {
            // Check camera and microphone permissions first
            if (ContextCompat.checkSelfPermission(this@MainActivity, android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this@MainActivity, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Camera and Microphone permissions required for offline video calls", Toast.LENGTH_LONG).show()
                    webView.evaluateJavascript("if(window.onCallStatusUpdated) { window.onCallStatusUpdated('failed', 'Camera/Mic permission denied'); }", null)
                }
                return
            }
            val dummyLocalView = SurfaceView(this@MainActivity)
            val dummyRemoteView = SurfaceView(this@MainActivity)
            callManager.startVideoCall(peerIp, dummyLocalView, dummyRemoteView)
        }

        @JavascriptInterface
        fun endVideoCall() {
            callManager.endActiveCall()
        }

        @JavascriptInterface
        fun toggleMicrophone(enabled: Boolean) {
            callManager.toggleMicrophone(!enabled)
        }

        @JavascriptInterface
        fun toggleSpeaker(enabled: Boolean) {
            callManager.setSpeakerphoneEnabled(enabled)
        }

        @JavascriptInterface
        fun sendFile(peerIp: String, filePath: String) {
            val file = File(filePath)
            if (file.exists()) {
                fileTransferService.sendFilePacket(peerIp, 8888, file) { payload ->
                    runOnUiThread {
                        webView.evaluateJavascript("if(window.onFileProgress) { window.onFileProgress('${payload.transferId}', ${payload.bytesTransferred}, ${payload.fileSize}, '${payload.status}'); }", null)
                    }
                }
            } else {
                Log.e(TAG, "File not found at $filePath")
            }
        }
    }

    fun getDiscoveredDevices(): List<NearbyDeviceService.NearbyPeer> {
        return nearbyDeviceService.discoveredDevices.value
    }

    fun sendOfflineMessage(recipientId: String, textContent: String) {
        localMessageService.sendOfflineMessage(recipientId, textContent) { msg ->
            Log.d(TAG, "Sent message via NativeBridge: ${msg.messageId} - ${msg.status}")
        }
    }

    private fun startNativeEventSync() {
        mainScope.launch {
            nearbyDeviceService.discoveredDevices.collect { peers ->
                val jsonArray = JSONArray()
                peers.forEach { peer ->
                    val obj = JSONObject().apply {
                        put("id", peer.deviceId)
                        put("name", peer.displayName)
                        put("mac", peer.deviceAddress)
                        put("distance", "${peer.distanceMeters}m")
                        put("state", peer.connectionState.name.lowercase())
                    }
                    jsonArray.put(obj)
                }
                runOnUiThread {
                    webView.evaluateJavascript("if(window.onDevicesDiscovered) { window.onDevicesDiscovered('$jsonArray'); }", null)
                }
            }
        }

        mainScope.launch {
            localMessageService.messageHistory.collect { messages ->
                val jsonArray = JSONArray()
                messages.forEach { msg ->
                    val obj = JSONObject().apply {
                        put("id", msg.messageId)
                        put("senderId", msg.senderId)
                        put("recipientId", msg.recipientId)
                        put("text", msg.textContent)
                        put("timestamp", msg.timestamp)
                        put("status", msg.status.name.lowercase())
                    }
                    jsonArray.put(obj)
                }
                runOnUiThread {
                    webView.evaluateJavascript("if(window.onMessageHistoryUpdate) { window.onMessageHistoryUpdate('$jsonArray'); }", null)
                }
            }
        }
    }

    fun startDeviceScanning() {
        nearbyDeviceService.startNearbyScanning()
    }

    fun stopDeviceScanning() {
        nearbyDeviceService.stopNearbyScanning()
    }

    fun connectToPeerById(deviceId: String) {
        val device = nearbyDeviceService.discoveredDevices.value.find { it.deviceId == deviceId }
        if (device != null) {
            nearbyDeviceService.connectToPeer(device)
        } else {
            Log.e(TAG, "Device with ID $deviceId not found in discovered list")
        }
    }

    fun pairDeviceById(deviceId: String) {
        val device = nearbyDeviceService.discoveredDevices.value.find { it.deviceId == deviceId }
        if (device != null) {
            bluetoothService.pairDevice(device.deviceAddress) { success ->
                Log.i(TAG, "Pairing result for ${device.displayName}: $success")
                runOnUiThread {
                    val message = if (success) "Paired with ${device.displayName}" else "Failed to pair with ${device.displayName}"
                    Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
