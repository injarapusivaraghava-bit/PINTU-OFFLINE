package com.pintu.offline

import android.app.Activity
import android.content.Intent
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast
import com.pintu.offline.service.NearbyDeviceService

/**
 * NativeBridge acts as the Javascript Interface for the hybrid WebView.
 * Coordinates with MainActivity to trigger physical offline sockets,
 * Nearby connections, and Android system intents like the share sheet.
 */
class NativeBridge(
    private val activity: Activity
) {

    companion object {
        private const val TAG = "NativeBridge"
    }

    @JavascriptInterface
    fun startDiscovery() {
        Log.d(TAG, "startDiscovery requested by JS")
        if (activity is MainActivity) {
            activity.startDeviceScanning()
        }
    }

    @JavascriptInterface
    fun stopDiscovery() {
        Log.d(TAG, "stopDiscovery requested by JS")
        if (activity is MainActivity) {
            activity.stopDeviceScanning()
        }
    }

    @JavascriptInterface
    fun connectToDevice(deviceId: String) {
        Log.d(TAG, "connectToDevice requested by JS for: $deviceId")
        if (activity is MainActivity) {
            activity.connectToPeerById(deviceId)
        }
    }

    @JavascriptInterface
    fun pairDevice(deviceId: String) {
        Log.d(TAG, "pairDevice requested by JS for: $deviceId")
        if (activity is MainActivity) {
            activity.pairDeviceById(deviceId)
        }
    }

    @JavascriptInterface
    fun sendTextMessage(peerId: String, text: String) {
        Log.d(TAG, "sendTextMessage requested by JS for peer: $peerId")
        if (activity is MainActivity) {
            activity.sendOfflineMessage(peerId, text)
        }
    }

    @JavascriptInterface
    fun sendMessage(message: String) {
        Log.d(TAG, "Sending message to active connected peer: $message")
        if (activity is MainActivity) {
            val peers = activity.getDiscoveredDevices()
            val connectedPeer = peers.find { it.connectionState == NearbyDeviceService.ConnectionState.CONNECTED }
            if (connectedPeer != null) {
                activity.sendOfflineMessage(connectedPeer.deviceId, message)
            } else {
                Log.w(TAG, "No connected peer found over Bluetooth or Wi-Fi Direct.")
                activity.runOnUiThread {
                    Toast.makeText(activity, "Pintu: Connect to a nearby peer first to send offline messages!", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    /**
     * Requirement 8: Opens Android share sheet supporting WhatsApp and other apps
     * to share the public app download URL.
     */
    @JavascriptInterface
    fun shareApp(shareText: String) {
        Log.d(TAG, "Opening Android system share sheet with message: $shareText")
        activity.runOnUiThread {
            try {
                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TEXT, shareText)
                    type = "text/plain"
                }
                val chooser = Intent.createChooser(sendIntent, "Share Pintu Offline")
                activity.startActivity(chooser)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch Android share intent", e)
                Toast.makeText(activity, "Unable to launch share sheet", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
