package com.pintu.offline.service

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.NetworkInfo
import android.net.wifi.p2p.*
import android.net.wifi.p2p.WifiP2pManager.ActionListener
import android.net.wifi.p2p.WifiP2pManager.PeerListListener
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.net.InetAddress
import java.net.NetworkInterface
import java.util.*

class WifiDirectServiceImpl(private val context: Context) : WifiDirectService {

    companion object {
        private const val TAG = "WifiDirectService"
    }

    private var wifiP2pManager = context.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
    private var channel: WifiP2pManager.Channel? = null
    private var receiver: BroadcastReceiver? = null

    private val _connectionInfo = MutableStateFlow(
        WifiDirectService.WifiDirectConnectionInfo(
            isGroupOwner = false,
            groupOwnerAddress = "",
            isConnected = false,
            localIpAddress = ""
        )
    )
    override val connectionInfo: StateFlow<WifiDirectService.WifiDirectConnectionInfo> = _connectionInfo

    private val _discoveredP2pDevices = MutableStateFlow<List<WifiP2pDevice>>(emptyList())
    override val discoveredP2pDevices: StateFlow<List<WifiP2pDevice>> = _discoveredP2pDevices

    override fun initializeWifiDirect() {
        if (wifiP2pManager == null) {
            Log.e(TAG, "Wi-Fi Direct is not supported by the hardware.")
            return
        }

        channel = wifiP2pManager?.initialize(context, context.mainLooper, null)
        registerReceiver()
        Log.d(TAG, "Wi-Fi Direct initialized and receiver bound.")
    }

    @SuppressLint("MissingPermission")
    override fun discoverWifiDirectPeers() {
        if (wifiP2pManager == null || channel == null) return

        wifiP2pManager?.discoverPeers(channel, object : ActionListener {
            override fun onSuccess() {
                Log.d(TAG, "Wi-Fi P2P peer discovery initiated.")
            }

            override fun onFailure(reason: Int) {
                Log.e(TAG, "Wi-Fi P2P discovery initiation failed: $reason")
            }
        })
    }

    @SuppressLint("MissingPermission")
    override fun createDirectGroup(onGroupCreated: (group: WifiP2pGroup?) -> Unit) {
        if (wifiP2pManager == null || channel == null) {
            onGroupCreated(null)
            return
        }

        wifiP2pManager?.createGroup(channel, object : ActionListener {
            override fun onSuccess() {
                Log.d(TAG, "Wi-Fi Direct group owner server initialized.")
                wifiP2pManager?.requestGroupInfo(channel) { group ->
                    onGroupCreated(group)
                }
            }

            override fun onFailure(reason: Int) {
                Log.e(TAG, "Group owner server initialization failed: $reason")
                onGroupCreated(null)
            }
        })
    }

    @SuppressLint("MissingPermission")
    override fun connectToDevice(deviceAddress: String, onSuccess: () -> Unit, onFailure: (reason: Int) -> Unit) {
        if (wifiP2pManager == null || channel == null) {
            onFailure(-1)
            return
        }

        val config = WifiP2pConfig().apply {
            this.deviceAddress = deviceAddress
            wps.setup = android.net.wifi.WpsInfo.PBC
        }

        wifiP2pManager?.connect(channel, config, object : ActionListener {
            override fun onSuccess() {
                Log.i(TAG, "Initiated P2P Wi-Fi Direct connection link with $deviceAddress")
                onSuccess()
            }

            override fun onFailure(reason: Int) {
                Log.e(TAG, "Wi-Fi P2P connection handshake failed: $reason")
                onFailure(reason)
            }
        })
    }

    override fun removeGroup() {
        if (wifiP2pManager == null || channel == null) return

        wifiP2pManager?.removeGroup(channel, object : ActionListener {
            override fun onSuccess() {
                Log.d(TAG, "Wi-Fi P2P group dismantled. Port bindings freed.")
                _connectionInfo.value = WifiDirectService.WifiDirectConnectionInfo(
                    isGroupOwner = false,
                    groupOwnerAddress = "",
                    isConnected = false,
                    localIpAddress = ""
                )
            }

            override fun onFailure(reason: Int) {
                Log.e(TAG, "Failed to dismantle group: $reason")
            }
        })
    }

    @SuppressLint("MissingPermission")
    private fun registerReceiver() {
        if (receiver != null) return

        val filter = IntentFilter().apply {
            addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION)
        }

        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                when (intent.action) {
                    WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> {
                        // Request peer list when peers changed
                        wifiP2pManager?.requestPeers(channel) { peerList ->
                            val peers = peerList.deviceList.toList()
                            _discoveredP2pDevices.value = peers
                            Log.i(TAG, "Wi-Fi Direct discovered ${peers.size} peer(s).")
                        }
                    }
                    WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> {
                        val wifiP2pInfo = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_INFO, WifiP2pInfo::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_INFO)
                        }

                        val networkInfo = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO, NetworkInfo::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(WifiP2pManager.EXTRA_NETWORK_INFO)
                        }

                        if (networkInfo?.isConnected == true && wifiP2pInfo != null) {
                            val hostAddress = wifiP2pInfo.groupOwnerAddress?.hostAddress ?: ""
                            val localIp = getLocalIpAddress()
                            _connectionInfo.value = WifiDirectService.WifiDirectConnectionInfo(
                                isGroupOwner = wifiP2pInfo.isGroupOwner,
                                groupOwnerAddress = hostAddress,
                                isConnected = true,
                                localIpAddress = localIp
                            )
                            Log.i(TAG, "Wi-Fi Direct Connected. IsOwner: ${wifiP2pInfo.isGroupOwner}, Host: $hostAddress, LocalIp: $localIp")
                        } else {
                            _connectionInfo.value = WifiDirectService.WifiDirectConnectionInfo(
                                isGroupOwner = false,
                                groupOwnerAddress = "",
                                isConnected = false,
                                localIpAddress = ""
                            )
                        }
                    }
                }
            }
        }
        try {
            context.registerReceiver(receiver, filter)
        } catch (e: Exception) {
            Log.e(TAG, "Failed registering Wi-Fi Direct receiver", e)
        }
    }

    private fun getLocalIpAddress(): String {
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress) {
                        val sAddr = addr.hostAddress ?: ""
                        val isIPv4 = sAddr.indexOf(':') < 0
                        if (isIPv4 && sAddr.startsWith("192.168.")) {
                            return sAddr
                        }
                    }
                }
            }
        } catch (ex: Exception) {
            Log.e(TAG, "Error resolving IP Address in P2P subnet", ex)
        }
        return ""
    }
}
