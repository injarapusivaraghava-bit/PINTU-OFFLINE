package com.pintu.offline

import android.content.Context
import android.util.Log
import com.pintu.offline.service.FileTransferService
import com.pintu.offline.service.FileTransferService.FilePayload
import com.pintu.offline.service.FileTransferService.TransferStatus
import kotlinx.coroutines.flow.StateFlow
import java.io.File

/**
 * FileTransferManager coordinates the complete transfer cycle of physical local files.
 * Handled Flow:
 * [Phone A] selects a local file -> [FileTransferManager] opens input stream and formats a Nearby Payload
 * -> Streams chunked packets over Wi-Fi Direct socket -> [Phone B] handles connection
 * -> Stores packet streams safely to external storage directory -> [Received File] successfully saved.
 */
class FileTransferManager(
    private val context: Context,
    private val fileTransferService: FileTransferService
) {

    companion object {
        private const val TAG = "FileTransferManager"
    }

    // Direct stream tracking of active and pending file payloads
    val activeTransfers: StateFlow<List<FilePayload>> = fileTransferService.activeTransfers

    /**
     * Start the local server socket listener on Phone B to capture incoming binary payload streams
     */
    fun startListeningForIncomingPayloads(port: Int, storageDirectory: File) {
        Log.i(TAG, "Initializing background socket listener to receive physical files on port $port")
        if (!storageDirectory.exists()) {
            storageDirectory.mkdirs()
        }
        fileTransferService.startFileServerListener(port, storageDirectory)
    }

    /**
     * Select a file on Phone A and transmit it over low-level sockets as a structured Nearby Payload
     */
    fun selectAndTransferFile(peerIpAddress: String, port: Int, filePath: String, onProgressUpdated: (FilePayload) -> Unit) {
        val selectedFile = File(filePath)
        if (!selectedFile.exists() || !selectedFile.isFile) {
            Log.e(TAG, "Selected file does not exist or is invalid: $filePath")
            val errorPayload = FilePayload(
                transferId = System.currentTimeMillis().toString(),
                fileName = selectedFile.name,
                fileSize = 0L,
                bytesTransferred = 0L,
                currentSpeedMbs = 0.0,
                status = TransferStatus.FAILED,
                filePath = filePath,
                isSender = true
            )
            onProgressUpdated(errorPayload)
            return
        }

        Log.i(TAG, "Initiating packet stream for ${selectedFile.name} (${selectedFile.length()} bytes) to $peerIpAddress:$port")
        
        fileTransferService.sendFilePacket(
            peerIpAddress = peerIpAddress,
            port = port,
            file = selectedFile,
            onProgress = { progress ->
                Log.d(TAG, "Payload upload progress [${progress.fileName}]: ${progress.bytesTransferred}/${progress.fileSize} bytes. Speed: ${progress.currentSpeedMbs} MB/s")
                onProgressUpdated(progress)
            }
        )
    }

    /**
     * Abort any ongoing payload uploading or downloading streams
     */
    fun abortTransfer(transferId: String) {
        Log.i(TAG, "Cancelling active file payload transfer: $transferId")
        fileTransferService.cancelFileTransfer(transferId)
    }
}
