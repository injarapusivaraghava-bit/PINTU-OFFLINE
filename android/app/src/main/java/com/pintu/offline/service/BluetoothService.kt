package com.pintu.offline.service

import android.Manifest
import android.bluetooth.BluetoothDevice
import android.content.Context
import android.os.Build
import kotlinx.coroutines.flow.StateFlow

/**
 * Interface definition for Bluetooth Classic and Low Energy (BLE) transmissions.
 * Handles modern Android (SDK 31, 32, 33, 34, 35) permission bundles, RFCOMM sockets,
 * Classic discovery, and device pairing.
 */
interface BluetoothService {

    /**
     * Set of permissions required for target SDK 35
     */
    val requiredBluetoothPermissions: Array<String>
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        } else {
            arrayOf(
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
        }

    /**
     * Track if Bluetooth radio is enabled on the device
     */
    val isBluetoothEnabled: StateFlow<Boolean>

    /**
     * Track active Bluetooth advertising state
     */
    val isAdvertising: StateFlow<Boolean>

    /**
     * Enable Bluetooth hardware programmatically
     */
    fun enableBluetooth(context: Context)

    /**
     * Start BLE advertising so other Pintu nodes can discover this device
     */
    fun startBleAdvertising(deviceName: String, customPin: String)

    /**
     * Stop advertising BLE beacon
     */
    fun stopBleAdvertising()

    /**
     * Bluetooth Classic RFCOMM Discovery
     */
    fun startClassicDiscovery(
        onDeviceFound: (device: BluetoothDevice, rssi: Short) -> Unit,
        onFinished: () -> Unit
    )

    /**
     * Stop Bluetooth Classic discovery
     */
    fun stopClassicDiscovery()

    /**
     * Request bonding / pairing with Bluetooth device
     */
    fun pairDevice(deviceMacAddress: String, onResult: (Boolean) -> Unit)

    /**
     * Retrieve currently bonded/paired Bluetooth devices
     */
    fun getBondedDevices(): Set<BluetoothDevice>

    /**
     * Initiate RFCOMM Bluetooth Socket connection with peer
     */
    fun establishRfcommSocket(deviceMacAddress: String, onConnect: (isSuccess: Boolean) -> Unit)

    /**
     * Write raw bytes directly over RFCOMM socket
     */
    fun writeData(bytes: ByteArray): Boolean

    /**
     * Register listener for incoming binary data received over RFCOMM socket
     */
    fun setOnDataReceivedListener(listener: (ByteArray) -> Unit)
}
