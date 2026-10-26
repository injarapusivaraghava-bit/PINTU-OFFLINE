package com.pintu.offline.service

import kotlinx.coroutines.flow.StateFlow

/**
 * Interface definition for scanning, discovering, and tracking nearby direct-mesh devices.
 * Bridges Bluetooth LE scanning and Wi-Fi Direct peer discovery.
 */
interface NearbyDeviceService {
    
    /**
     * Connection state enum representing peer handshake stages
     */
    enum class ConnectionState {
        DISCONNECTED,
        SCANNING,
        AVAILABLE,
        CONNECTING,
        CONNECTED
    }

    /**
     * Data class representing a discovered local physical peer device
     */
    data class NearbyPeer(
        val deviceId: String,
        val displayName: String,
        val deviceAddress: String, // MAC Address
        val distanceMeters: Double,
        val signalStrengthDbm: Int,
        val isPaired: Boolean,
        val isConnectedWifiDirect: Boolean,
        val connectionState: ConnectionState
    )

    /**
     * Live flow of currently active discovered peers
     */
    val discoveredDevices: StateFlow<List<NearbyPeer>>

    /**
     * Live flow of the global discovery state
     */
    val currentDiscoveryState: StateFlow<ConnectionState>

    /**
     * Start scanning for local nodes using Bluetooth and Wi-Fi Direct transceivers
     */
    fun startNearbyScanning()

    /**
     * Stop transceivers scan to preserve battery
     */
    fun stopNearbyScanning()

    /**
     * Request connection handshake to a specific discovered peer
     */
    fun connectToPeer(device: NearbyPeer)

    /**
     * Disconnect active channels from a specific peer
     */
    fun disconnectFromPeer(device: NearbyPeer)
}
