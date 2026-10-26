package com.pintu.offline

import android.content.Context
import android.util.Log
import com.pintu.offline.service.NearbyDeviceService
import com.pintu.offline.service.NearbyDeviceService.NearbyPeer
import com.pintu.offline.service.NearbyDeviceService.ConnectionState
import kotlinx.coroutines.flow.StateFlow

/**
 * NearbyManager coordinates BLE and Wi-Fi Direct peer discovery and network handshakes.
 * It provides high-level APIs to start/stop scans, track available mesh nodes, and establish stable links.
 */
class NearbyManager(
    private val context: Context,
    private val nearbyDeviceService: NearbyDeviceService
) {

    companion object {
        private const val TAG = "NearbyManager"
    }

    /**
     * Observable flow of available mesh peers discovered over Bluetooth LE or Wi-Fi Direct
     */
    val discoveredDevices: StateFlow<List<NearbyPeer>> = nearbyDeviceService.discoveredDevices

    /**
     * Observable current discovery state of the hardware transceivers
     */
    val currentDiscoveryState: StateFlow<ConnectionState> = nearbyDeviceService.currentDiscoveryState

    /**
     * Begin background discovery of other Pintu Offline nodes
     */
    fun startScanning() {
        Log.i(TAG, "Starting transceivers scan for nearby Pintu nodes...")
        nearbyDeviceService.startNearbyScanning()
    }

    /**
     * Stop background scans to optimize power and thermal footprint
     */
    fun stopScanning() {
        Log.i(TAG, "Stopping transceivers scan.")
        nearbyDeviceService.stopNearbyScanning()
    }

    /**
     * Establish a direct physical link with a selected peer
     */
    fun connectToDevice(peer: NearbyPeer) {
        Log.i(TAG, "Requesting physical socket link with ${peer.displayName} (${peer.deviceAddress})")
        nearbyDeviceService.connectToPeer(peer)
    }

    /**
     * Terminate the physical mesh link with the peer
     */
    fun disconnectFromDevice(peer: NearbyPeer) {
        Log.i(TAG, "Terminating physical links with ${peer.displayName}")
        nearbyDeviceService.disconnectFromPeer(peer)
    }
}
