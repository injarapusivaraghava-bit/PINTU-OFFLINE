package com.pintu.offline.service

import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pGroup
import android.net.wifi.p2p.WifiP2pInfo
import kotlinx.coroutines.flow.StateFlow

/**
 * Interface definition for Wi-Fi Direct (P2P) high-speed local data transfer services.
 * Prepares appropriate Socket listeners, Group Owner checks, and local port bindings.
 */
interface WifiDirectService {

    /**
     * Connection state for Wi-Fi P2P network configuration
     */
    data class WifiDirectConnectionInfo(
        val isGroupOwner: Boolean,
        val groupOwnerAddress: String, // IP Address of the host
        val isConnected: Boolean,
        val localIpAddress: String
    )

    /**
     * Stream tracking active connection state and group parameters
     */
    val connectionInfo: StateFlow<WifiDirectConnectionInfo>

    /**
     * Stream tracking discovered Wi-Fi Direct P2P peers
     */
    val discoveredP2pDevices: StateFlow<List<WifiP2pDevice>>

    /**
     * Initialize Wi-Fi Direct transceivers
     */
    fun initializeWifiDirect()

    /**
     * Start peer discovery for surrounding high-bandwidth channels
     */
    fun discoverWifiDirectPeers()

    /**
     * Create a secure Wi-Fi P2P Direct Group (Forces this device as Group Owner)
     */
    fun createDirectGroup(onGroupCreated: (group: WifiP2pGroup?) -> Unit)

    /**
     * Connect to an existing group owner device
     */
    fun connectToDevice(deviceAddress: String, onSuccess: () -> Unit, onFailure: (reason: Int) -> Unit)

    /**
     * Disconnect active Direct Link group
     */
    fun removeGroup()
}
