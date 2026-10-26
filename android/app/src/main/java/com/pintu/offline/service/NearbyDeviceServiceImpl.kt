package com.pintu.offline.service

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.os.Build
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class NearbyDeviceServiceImpl(
    private val context: Context,
    private val bluetoothService: BluetoothService,
    private val wifiDirectService: WifiDirectService
) : NearbyDeviceService {

    companion object {
        private const val TAG = "NearbyDeviceService"
    }

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter
    private var bluetoothLeScanner = bluetoothAdapter?.bluetoothLeScanner

    private val _discoveredDevices = MutableStateFlow<List<NearbyDeviceService.NearbyPeer>>(emptyList())
    override val discoveredDevices: StateFlow<List<NearbyDeviceService.NearbyPeer>> = _discoveredDevices

    private val _currentDiscoveryState = MutableStateFlow(NearbyDeviceService.ConnectionState.DISCONNECTED)
    override val currentDiscoveryState: StateFlow<NearbyDeviceService.ConnectionState> = _currentDiscoveryState

    private var scanCallback: ScanCallback? = null
    private val scope = CoroutineScope(Dispatchers.Main)

    init {
        // Observe Wi-Fi Direct discovered peers
        scope.launch {
            wifiDirectService.discoveredP2pDevices.collect { p2pList ->
                val current = _discoveredDevices.value.toMutableList()
                p2pList.forEach { p2pDevice ->
                    val address = p2pDevice.deviceAddress ?: ""
                    val name = p2pDevice.deviceName ?: "Wi-Fi Direct Peer"
                    val existingIdx = current.indexOfFirst { it.deviceAddress.equals(address, ignoreCase = true) }
                    val peer = NearbyDeviceService.NearbyPeer(
                        deviceId = address.replace(":", ""),
                        displayName = name,
                        deviceAddress = address,
                        distanceMeters = 5.0,
                        signalStrengthDbm = -60,
                        isPaired = p2pDevice.status == android.net.wifi.p2p.WifiP2pDevice.CONNECTED,
                        isConnectedWifiDirect = p2pDevice.status == android.net.wifi.p2p.WifiP2pDevice.CONNECTED,
                        connectionState = if (p2pDevice.status == android.net.wifi.p2p.WifiP2pDevice.CONNECTED)
                            NearbyDeviceService.ConnectionState.CONNECTED
                        else
                            NearbyDeviceService.ConnectionState.AVAILABLE
                    )
                    if (existingIdx >= 0) {
                        current[existingIdx] = peer
                    } else {
                        current.add(peer)
                    }
                }
                _discoveredDevices.value = current
            }
        }
    }

    @SuppressLint("MissingPermission")
    override fun startNearbyScanning() {
        if (_currentDiscoveryState.value == NearbyDeviceService.ConnectionState.SCANNING) return
        _currentDiscoveryState.value = NearbyDeviceService.ConnectionState.SCANNING

        // 1. Add already bonded Bluetooth devices immediately
        val bonded = bluetoothService.getBondedDevices()
        val currentList = _discoveredDevices.value.toMutableList()
        bonded.forEach { dev ->
            val address = dev.address ?: ""
            val name = dev.name ?: "Paired Pintu Node"
            if (currentList.none { it.deviceAddress.equals(address, ignoreCase = true) }) {
                currentList.add(
                    NearbyDeviceService.NearbyPeer(
                        deviceId = address.replace(":", ""),
                        displayName = name,
                        deviceAddress = address,
                        distanceMeters = 2.0,
                        signalStrengthDbm = -55,
                        isPaired = true,
                        isConnectedWifiDirect = false,
                        connectionState = NearbyDeviceService.ConnectionState.AVAILABLE
                    )
                )
            }
        }
        _discoveredDevices.value = currentList

        // 2. Trigger Wi-Fi Direct Peer Discovery
        wifiDirectService.initializeWifiDirect()
        wifiDirectService.discoverWifiDirectPeers()

        // 3. Trigger Bluetooth Classic RFCOMM Discovery
        bluetoothService.startClassicDiscovery(
            onDeviceFound = { device, rssi ->
                val address = device.address ?: ""
                val name = device.name ?: "Bluetooth Node"
                val distance = if (rssi != Short.MIN_VALUE) {
                    Math.round(Math.pow(10.0, (-69.0 - rssi) / 20.0) * 10.0) / 10.0
                } else 10.0

                scope.launch {
                    val list = _discoveredDevices.value.toMutableList()
                    val idx = list.indexOfFirst { it.deviceAddress.equals(address, ignoreCase = true) }
                    val peer = NearbyDeviceService.NearbyPeer(
                        deviceId = address.replace(":", ""),
                        displayName = name,
                        deviceAddress = address,
                        distanceMeters = distance,
                        signalStrengthDbm = rssi.toInt(),
                        isPaired = device.bondState == BluetoothDevice.BOND_BONDED,
                        isConnectedWifiDirect = false,
                        connectionState = NearbyDeviceService.ConnectionState.AVAILABLE
                    )
                    if (idx >= 0) {
                        list[idx] = peer
                    } else {
                        list.add(peer)
                    }
                    _discoveredDevices.value = list
                }
            },
            onFinished = {
                Log.d(TAG, "Bluetooth Classic discovery sweep completed.")
            }
        )

        // 4. Trigger BLE Scan
        bluetoothLeScanner = bluetoothAdapter?.bluetoothLeScanner
        if (bluetoothLeScanner != null) {
            try {
                scanCallback = object : ScanCallback() {
                    override fun onScanResult(callbackType: Int, result: ScanResult) {
                        super.onScanResult(callbackType, result)
                        val device = result.device
                        val rssi = result.rssi
                        val name = result.scanRecord?.deviceName ?: device.name ?: "BLE Node"
                        val address = device.address ?: ""

                        val distance = Math.pow(10.0, (-69.0 - rssi) / (10.0 * 2.0))

                        scope.launch {
                            val list = _discoveredDevices.value.toMutableList()
                            val existingIndex = list.indexOfFirst { it.deviceAddress.equals(address, ignoreCase = true) }
                            val peer = NearbyDeviceService.NearbyPeer(
                                deviceId = address.replace(":", ""),
                                displayName = name,
                                deviceAddress = address,
                                distanceMeters = Math.round(distance * 10.0) / 10.0,
                                signalStrengthDbm = rssi,
                                isPaired = device.bondState == BluetoothDevice.BOND_BONDED,
                                isConnectedWifiDirect = false,
                                connectionState = NearbyDeviceService.ConnectionState.AVAILABLE
                            )

                            if (existingIndex >= 0) {
                                list[existingIndex] = peer
                            } else {
                                list.add(peer)
                            }
                            _discoveredDevices.value = list
                        }
                    }
                }
                bluetoothLeScanner?.startScan(scanCallback)
            } catch (e: Exception) {
                Log.e(TAG, "BLE Scanner startScan failed", e)
            }
        }
    }

    @SuppressLint("MissingPermission")
    override fun stopNearbyScanning() {
        if (_currentDiscoveryState.value != NearbyDeviceService.ConnectionState.SCANNING) return
        _currentDiscoveryState.value = NearbyDeviceService.ConnectionState.DISCONNECTED

        bluetoothService.stopClassicDiscovery()

        if (bluetoothLeScanner != null && scanCallback != null) {
            try {
                bluetoothLeScanner?.stopScan(scanCallback)
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping BLE scan", e)
            }
            scanCallback = null
        }
    }

    override fun connectToPeer(device: NearbyDeviceService.NearbyPeer) {
        _currentDiscoveryState.value = NearbyDeviceService.ConnectionState.CONNECTING
        Log.i(TAG, "Attempting connection handshake with ${device.displayName} via BT RFCOMM...")

        bluetoothService.establishRfcommSocket(device.deviceAddress) { isSuccess ->
            if (isSuccess) {
                _currentDiscoveryState.value = NearbyDeviceService.ConnectionState.CONNECTED
                Log.i(TAG, "Bluetooth RFCOMM link established with peer ${device.displayName}.")
            } else {
                Log.e(TAG, "RFCOMM Socket failed. Trying Wi-Fi Direct...")
                wifiDirectService.connectToDevice(device.deviceAddress, {
                    _currentDiscoveryState.value = NearbyDeviceService.ConnectionState.CONNECTED
                    Log.i(TAG, "Wi-Fi Direct link established with peer ${device.displayName}.")
                }, { errorReason ->
                    _currentDiscoveryState.value = NearbyDeviceService.ConnectionState.DISCONNECTED
                    Log.e(TAG, "All handshake transports failed to connect peer. Reason: $errorReason")
                })
            }
        }
    }

    override fun disconnectFromPeer(device: NearbyDeviceService.NearbyPeer) {
        wifiDirectService.removeGroup()
        _currentDiscoveryState.value = NearbyDeviceService.ConnectionState.DISCONNECTED
    }
}
