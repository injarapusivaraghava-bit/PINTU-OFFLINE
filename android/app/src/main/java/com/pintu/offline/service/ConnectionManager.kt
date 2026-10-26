package com.pintu.offline.service

import kotlinx.coroutines.flow.StateFlow

/**
 * Interface definition for ConnectionManager.
 * Manages raw TCP/UDP heartbeats, routing tables, and master/slave sockets for mesh network peers.
 */
interface ConnectionManager {

    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED,
        RECONNECTING
    }

    /**
     * Active connection state of the global mesh
     */
    val connectionState: StateFlow<ConnectionState>

    /**
     * Set of active TCP/UDP client connections by peer ID
     */
    val connectedPeerIds: StateFlow<Set<String>>

    /**
     * Initialize connection manager and start listening for inbound connection sockets
     */
    fun startConnectionManager(port: Int)

    /**
     * Terminate all listeners and active client sockets
     */
    fun stopConnectionManager()

    /**
     * Handle physical peer heartbeat to verify connection liveness
     */
    fun sendHeartbeat(peerId: String)

    /**
     * Update routing table entries for local mesh topology
     */
    fun updateRoutingTable(peerId: String, routeIp: String)
}
