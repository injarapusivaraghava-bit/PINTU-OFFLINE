package com.pintu.offline.service

import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap

class ConnectionManagerImpl : ConnectionManager {

    companion object {
        private const val TAG = "ConnectionManager"
        private const val HEARTBEAT_INTERVAL_MS = 5000L
    }

    private val _connectionState = MutableStateFlow(ConnectionManager.ConnectionState.DISCONNECTED)
    override val connectionState: StateFlow<ConnectionManager.ConnectionState> = _connectionState

    private val _connectedPeerIds = MutableStateFlow<Set<String>>(emptySet())
    override val connectedPeerIds: StateFlow<Set<String>> = _connectedPeerIds

    private val routingTable = ConcurrentHashMap<String, String>() // peerId -> IP
    private val activeSockets = ConcurrentHashMap<String, Socket>()
    private val printWriters = ConcurrentHashMap<String, PrintWriter>()

    private var serverSocket: ServerSocket? = null
    private var isRunning = false
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var heartbeatJob: Job? = null

    override fun startConnectionManager(port: Int) {
        if (isRunning) return
        isRunning = true
        _connectionState.value = ConnectionManager.ConnectionState.CONNECTING

        scope.launch {
            try {
                serverSocket = ServerSocket(port)
                _connectionState.value = ConnectionManager.ConnectionState.CONNECTED
                Log.d(TAG, "TCP Connection Manager server running on port $port. Ready for peer handshake sockets...")

                startHeartbeatLoop()

                while (isRunning) {
                    val socket = serverSocket?.accept() ?: break
                    handleIncomingSocket(socket)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Connection Manager socket listener crashed", e)
                _connectionState.value = ConnectionManager.ConnectionState.DISCONNECTED
            }
        }
    }

    override fun stopConnectionManager() {
        isRunning = false
        heartbeatJob?.cancel()
        _connectionState.value = ConnectionManager.ConnectionState.DISCONNECTED

        scope.launch {
            try {
                serverSocket?.close()
                for (socket in activeSockets.values) {
                    socket.close()
                }
                activeSockets.clear()
                printWriters.clear()
                _connectedPeerIds.value = emptySet()
                Log.i(TAG, "Connection Manager successfully stopped. Closed all open peer sockets.")
            } catch (e: Exception) {
                Log.e(TAG, "Error cleaning socket handles", e)
            }
        }
    }

    private fun handleIncomingSocket(socket: Socket) {
        scope.launch {
            try {
                val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
                val writer = PrintWriter(socket.getOutputStream(), true)
                
                // Read peer identity handshake package (Expect format: "HANDSHAKE:peerId")
                val handshakeLine = reader.readLine() ?: ""
                if (handshakeLine.startsWith("HANDSHAKE:")) {
                    val peerId = handshakeLine.substringAfter("HANDSHAKE:")
                    activeSockets[peerId] = socket
                    printWriters[peerId] = writer
                    
                    routingTable[peerId] = socket.inetAddress.hostAddress ?: ""
                    updateConnectedPeers()

                    Log.i(TAG, "Handshake verified with Peer: $peerId, Host Address: ${socket.inetAddress}")

                    // Read subsequent control messages on socket
                    while (isRunning) {
                        val packet = reader.readLine() ?: break
                        if (packet == "HEARTBEAT") {
                            Log.v(TAG, "Received heartbeat ping from $peerId")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Socket read/write exception with peer", e)
            } finally {
                socket.close()
            }
        }
    }

    private fun startHeartbeatLoop() {
        heartbeatJob = scope.launch {
            while (isRunning) {
                delay(HEARTBEAT_INTERVAL_MS)
                for (peerId in activeSockets.keys) {
                    sendHeartbeat(peerId)
                }
            }
        }
    }

    override fun sendHeartbeat(peerId: String) {
        scope.launch {
            try {
                val writer = printWriters[peerId]
                if (writer != null) {
                    writer.println("HEARTBEAT")
                    Log.v(TAG, "Sent heartbeat packet to $peerId")
                } else {
                    handleDisconnect(peerId)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send heartbeat to $peerId", e)
                handleDisconnect(peerId)
            }
        }
    }

    private fun handleDisconnect(peerId: String) {
        activeSockets[peerId]?.close()
        activeSockets.remove(peerId)
        printWriters.remove(peerId)
        updateConnectedPeers()
        Log.w(TAG, "Peer $peerId disconnected from mesh topology.")
    }

    private fun updateConnectedPeers() {
        _connectedPeerIds.value = activeSockets.keys.toSet()
    }

    override fun updateRoutingTable(peerId: String, routeIp: String) {
        routingTable[peerId] = routeIp
        Log.d(TAG, "Routing table updated: $peerId -> $routeIp")
    }
}
