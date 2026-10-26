package com.pintu.offline.service

import java.io.File
import kotlinx.coroutines.flow.StateFlow

/**
 * Interface definition for sending and receiving offline files over Wi-Fi Direct sockets.
 * Prepares proper chunked file streaming with progress callback updates.
 */
interface FileTransferService {

    /**
     * File transfer direction and progress state
     */
    enum class TransferStatus {
        PREPARING,
        TRANSFERRING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    /**
     * Data class tracking progress values of current file transactions
     */
    data class FilePayload(
        val transferId: String,
        val fileName: String,
        val fileSize: Long,
        val bytesTransferred: Long,
        val currentSpeedMbs: Double,
        val status: TransferStatus,
        val filePath: String,
        val isSender: Boolean
    )

    /**
     * Live stream of currently active transfers
     */
    val activeTransfers: StateFlow<List<FilePayload>>

    /**
     * Register a background Socket server on Port 8888 to listen for incoming Wi-Fi Direct file packets
     */
    fun startFileServerListener(port: Int, targetStorageDir: File)

    /**
     * Write and stream a local file over a client TCP socket connection to a specific peer IP
     */
    fun sendFilePacket(peerIpAddress: String, port: Int, file: File, onProgress: (progress: FilePayload) -> Unit)

    /**
     * Cancel an ongoing transfer using ID
     */
    fun cancelFileTransfer(transferId: String)
}
