package com.pintu.offline.service

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.util.Log
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.*

class BluetoothServiceImpl(private val context: Context) : BluetoothService {

    companion object {
        private const val TAG = "BluetoothService"
        // Standard Pintu RFCOMM UUID for offline peer messaging
        val PINTU_SERVICE_UUID: UUID = UUID.fromString("6d7a5b3d-1a8b-4b21-8207-6f8d07d9b56f")
        private const val SDP_RECORD_NAME = "PintuOfflineMesh"
    }

    private val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager?.adapter

    private val _isBluetoothEnabled = MutableStateFlow(bluetoothAdapter?.isEnabled == true)
    override val isBluetoothEnabled: StateFlow<Boolean> = _isBluetoothEnabled

    private val _isAdvertising = MutableStateFlow(false)
    override val isAdvertising: StateFlow<Boolean> = _isAdvertising

    private var advertiseCallback: AdvertiseCallback? = null
    private var discoveryReceiver: BroadcastReceiver? = null
    private var pairingReceiver: BroadcastReceiver? = null

    private var serverSocket: BluetoothServerSocket? = null
    private var activeSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private var inputStream: InputStream? = null
    private var dataReceivedListener: ((ByteArray) -> Unit)? = null

    private val scope = CoroutineScope(Dispatchers.IO)

    private fun hasPermission(permission: String): Boolean {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }

    private fun canScan(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            hasPermission(android.Manifest.permission.BLUETOOTH_SCAN)
        } else {
            hasPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    private fun canConnect(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            hasPermission(android.Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            hasPermission(android.Manifest.permission.BLUETOOTH)
        }
    }

    @SuppressLint("MissingPermission")
    override fun enableBluetooth(context: Context) {
        if (bluetoothAdapter != null && !bluetoothAdapter.isEnabled) {
            _isBluetoothEnabled.value = true
            Log.d(TAG, "Bluetooth status checked and enabled.")
        }
    }

    @SuppressLint("MissingPermission")
    override fun startBleAdvertising(deviceName: String, customPin: String) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            Log.e(TAG, "Bluetooth not active or unsupported.")
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasPermission(android.Manifest.permission.BLUETOOTH_ADVERTISE)) {
            Log.e(TAG, "Missing BLUETOOTH_ADVERTISE permission on Android 12+.")
            return
        }

        val advertiser = bluetoothAdapter.bluetoothLeAdvertiser
        if (advertiser == null) {
            Log.e(TAG, "BLE Advertising unsupported on this device hardware.")
            return
        }

        try {
            if (canConnect()) {
                bluetoothAdapter.name = deviceName
            }

            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .build()

            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .addServiceUuid(ParcelUuid(PINTU_SERVICE_UUID))
                .build()

            advertiseCallback = object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
                    super.onStartSuccess(settingsInEffect)
                    _isAdvertising.value = true
                    Log.i(TAG, "BLE Advertisement successfully broadcasting with PIN link.")
                }

                override fun onStartFailure(errorCode: Int) {
                    super.onStartFailure(errorCode)
                    _isAdvertising.value = false
                    Log.e(TAG, "BLE Advertisement failed with error code: $errorCode")
                }
            }

            advertiser.startAdvertising(settings, data, advertiseCallback)
            startServerListening()
        } catch (e: Exception) {
            Log.e(TAG, "Error starting BLE advertising", e)
        }
    }

    @SuppressLint("MissingPermission")
    override fun stopBleAdvertising() {
        try {
            if (advertiseCallback != null) {
                bluetoothAdapter?.bluetoothLeAdvertiser?.stopAdvertising(advertiseCallback)
                advertiseCallback = null
            }
            _isAdvertising.value = false
            closeSockets()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping BLE advertising", e)
        }
    }

    @SuppressLint("MissingPermission")
    override fun startClassicDiscovery(
        onDeviceFound: (device: BluetoothDevice, rssi: Short) -> Unit,
        onFinished: () -> Unit
    ) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            Log.e(TAG, "Bluetooth adapter is off or unavailable.")
            onFinished()
            return
        }

        if (!canScan()) {
            Log.e(TAG, "Required Bluetooth scan permissions not granted.")
            onFinished()
            return
        }

        stopClassicDiscovery()

        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
        }

        discoveryReceiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                when (intent.action) {
                    BluetoothDevice.ACTION_FOUND -> {
                        val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                        }
                        val rssi = intent.getShortExtra(BluetoothDevice.EXTRA_RSSI, Short.MIN_VALUE)
                        if (device != null) {
                            onDeviceFound(device, rssi)
                        }
                    }
                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                        Log.d(TAG, "Bluetooth Classic discovery finished.")
                        onFinished()
                    }
                }
            }
        }

        try {
            context.registerReceiver(discoveryReceiver, filter)
            if (bluetoothAdapter.isDiscovering) {
                bluetoothAdapter.cancelDiscovery()
            }
            val started = bluetoothAdapter.startDiscovery()
            Log.i(TAG, "Bluetooth Classic RFCOMM discovery started: $started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed starting Bluetooth classic discovery", e)
            onFinished()
        }
    }

    @SuppressLint("MissingPermission")
    override fun stopClassicDiscovery() {
        try {
            if (canScan() && bluetoothAdapter?.isDiscovering == true) {
                bluetoothAdapter.cancelDiscovery()
            }
            if (discoveryReceiver != null) {
                context.unregisterReceiver(discoveryReceiver)
                discoveryReceiver = null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping discovery", e)
        }
    }

    @SuppressLint("MissingPermission")
    override fun pairDevice(deviceMacAddress: String, onResult: (Boolean) -> Unit) {
        if (bluetoothAdapter == null || !canConnect()) {
            Log.e(TAG, "Bluetooth connect permission denied or adapter missing.")
            onResult(false)
            return
        }

        try {
            val device = bluetoothAdapter.getRemoteDevice(deviceMacAddress)
            if (device.bondState == BluetoothDevice.BOND_BONDED) {
                Log.i(TAG, "Device $deviceMacAddress already paired/bonded.")
                onResult(true)
                return
            }

            val filter = IntentFilter(BluetoothDevice.ACTION_BOND_STATE_CHANGED)
            pairingReceiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context, intent: Intent) {
                    val bondedDevice = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }

                    if (bondedDevice?.address == deviceMacAddress) {
                        val state = intent.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR)
                        if (state == BluetoothDevice.BOND_BONDED) {
                            Log.i(TAG, "Successfully paired with $deviceMacAddress")
                            try {
                                context.unregisterReceiver(this)
                            } catch (_: Exception) {}
                            pairingReceiver = null
                            onResult(true)
                        } else if (state == BluetoothDevice.BOND_NONE) {
                            Log.w(TAG, "Pairing cancelled or failed with $deviceMacAddress")
                            try {
                                context.unregisterReceiver(this)
                            } catch (_: Exception) {}
                            pairingReceiver = null
                            onResult(false)
                        }
                    }
                }
            }
            context.registerReceiver(pairingReceiver, filter)
            val initiated = device.createBond()
            Log.i(TAG, "createBond initiated for $deviceMacAddress: $initiated")
            if (!initiated) {
                try {
                    context.unregisterReceiver(pairingReceiver)
                } catch (_: Exception) {}
                pairingReceiver = null
                onResult(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed initiating bond pairing", e)
            onResult(false)
        }
    }

    @SuppressLint("MissingPermission")
    override fun getBondedDevices(): Set<BluetoothDevice> {
        return if (canConnect()) {
            bluetoothAdapter?.bondedDevices ?: emptySet()
        } else {
            emptySet()
        }
    }

    @SuppressLint("MissingPermission")
    private fun startServerListening() {
        scope.launch {
            try {
                serverSocket = bluetoothAdapter?.listenUsingInsecureRfcommWithServiceRecord(
                    SDP_RECORD_NAME,
                    PINTU_SERVICE_UUID
                )
                Log.d(TAG, "Listening for incoming RFCOMM socket connections on SDP: $SDP_RECORD_NAME")
                val socket = serverSocket?.accept()
                handleConnectedSocket(socket)
            } catch (e: IOException) {
                Log.e(TAG, "Inbound RFCOMM socket server listening failed", e)
            }
        }
    }

    @SuppressLint("MissingPermission")
    override fun establishRfcommSocket(deviceMacAddress: String, onConnect: (isSuccess: Boolean) -> Unit) {
        scope.launch {
            try {
                if (canScan() && bluetoothAdapter?.isDiscovering == true) {
                    bluetoothAdapter.cancelDiscovery()
                }

                val remoteDevice = bluetoothAdapter?.getRemoteDevice(deviceMacAddress)
                val socket = remoteDevice?.createInsecureRfcommSocketToServiceRecord(PINTU_SERVICE_UUID)
                
                socket?.connect()
                handleConnectedSocket(socket)
                onConnect(true)
            } catch (e: IOException) {
                Log.e(TAG, "Failed to connect RFCOMM socket with remote peer $deviceMacAddress", e)
                onConnect(false)
            }
        }
    }

    private fun handleConnectedSocket(socket: BluetoothSocket?) {
        if (socket == null) return
        activeSocket = socket
        outputStream = socket.outputStream
        inputStream = socket.inputStream
        Log.i(TAG, "RFCOMM direct channel successfully bound and active. Stream ready.")

        // Background reader loop for receiving incoming bytes from peer
        scope.launch {
            val buffer = ByteArray(4096)
            try {
                while (isActive && activeSocket?.isConnected == true) {
                    val bytesRead = inputStream?.read(buffer) ?: -1
                    if (bytesRead > 0) {
                        val packet = buffer.copyOf(bytesRead)
                        Log.d(TAG, "Received $bytesRead bytes over RFCOMM socket.")
                        dataReceivedListener?.invoke(packet)
                    } else if (bytesRead == -1) {
                        break
                    }
                }
            } catch (e: IOException) {
                Log.d(TAG, "RFCOMM socket stream disconnected: ${e.message}")
            }
        }
    }

    override fun writeData(bytes: ByteArray): Boolean {
        return try {
            outputStream?.write(bytes)
            outputStream?.flush()
            true
        } catch (e: IOException) {
            Log.e(TAG, "Failed writing byte packets to RFCOMM stream", e)
            false
        }
    }

    override fun setOnDataReceivedListener(listener: (ByteArray) -> Unit) {
        this.dataReceivedListener = listener
    }

    private fun closeSockets() {
        try {
            inputStream?.close()
            outputStream?.close()
            activeSocket?.close()
            serverSocket?.close()
        } catch (e: IOException) {
            Log.e(TAG, "Error closing connection stream resources", e)
        }
    }
}
