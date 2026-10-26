package com.pintu.offline.service

import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.*
import java.net.ServerSocket
import java.net.Socket
import java.util.*
import java.util.concurrent.ConcurrentHashMap

class FileTransferServiceImpl : FileTransferService {

    companion object {
        private const val TAG = "FileTransferService"
        private const val BUFFER_SIZE = 8192 // 8KB block buffer
    }

    private val _activeTransfers = MutableStateFlow<List<FileTransferService.FilePayload>>(emptyList())
    override val activeTransfers: StateFlow<List<FileTransferService.FilePayload>> = _activeTransfers

    private val transfersMap = ConcurrentHashMap<String, FileTransferService.FilePayload>()
    private var serverSocket: ServerSocket? = null
    private var isListening = false
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun startFileServerListener(port: Int, targetStorageDir: File) {
        if (isListening) return
        isListening = true

        scope.launch {
            try {
                serverSocket = ServerSocket(port)
                Log.d(TAG, "File Server Listener running on port $port. Storage target: ${targetStorageDir.absolutePath}")

                while (isListening) {
                    val socket = serverSocket?.accept() ?: break
                    handleIncomingFileSocket(socket, targetStorageDir)
                }
            } catch (e: Exception) {
                Log.e(TAG, "File Server Listener socket exception", e)
                isListening = false
            }
        }
    }

    private fun handleIncomingFileSocket(socket: Socket, targetStorageDir: File) {
        scope.launch {
            try {
                val inputStream = DataInputStream(BufferedInputStream(socket.getInputStream()))
                
                // Read File Metadata header
                val fileName = inputStream.readUTF()
                val fileSize = inputStream.readLong()
                val transferId = UUID.randomUUID().toString()

                val destinationFile = File(targetStorageDir, fileName)
                val outputStream = BufferedOutputStream(FileOutputStream(destinationFile))

                val payload = FileTransferService.FilePayload(
                    transferId = transferId,
                    fileName = fileName,
                    fileSize = fileSize,
                    bytesTransferred = 0,
                    currentSpeedMbs = 0.0,
                    status = FileTransferService.TransferStatus.TRANSFERRING,
                    filePath = destinationFile.absolutePath,
                    isSender = false
                )
                updateTransfer(transferId, payload)

                val buffer = ByteArray(BUFFER_SIZE)
                var bytesRead: Int
                var totalBytesRead = 0L
                val startTime = System.currentTimeMillis()

                Log.i(TAG, "Receiving file '$fileName' of size $fileSize bytes from peer.")

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead

                    val elapsedTimeSec = (System.currentTimeMillis() - startTime) / 1000.0
                    val speedMbs = if (elapsedTimeSec > 0) (totalBytesRead / (1024.0 * 1024.0)) / elapsedTimeSec else 0.0

                    updateTransfer(
                        transferId,
                        payload.copy(
                            bytesTransferred = totalBytesRead,
                            currentSpeedMbs = speedMbs,
                            status = if (totalBytesRead >= fileSize) FileTransferService.TransferStatus.COMPLETED else FileTransferService.TransferStatus.TRANSFERRING
                        )
                    )
                }

                outputStream.flush()
                outputStream.close()
                Log.i(TAG, "Completed file download: ${destinationFile.absolutePath}")
            } catch (e: Exception) {
                Log.e(TAG, "Error downloading incoming socket file package", e)
            } finally {
                socket.close()
            }
        }
    }

    override fun sendFilePacket(
        peerIpAddress: String,
        port: Int,
        file: File,
        onProgress: (progress: FileTransferService.FilePayload) -> Unit
    ) {
        val transferId = UUID.randomUUID().toString()
        val fileSize = file.length()
        val fileName = file.name

        val payload = FileTransferService.FilePayload(
            transferId = transferId,
            fileName = fileName,
            fileSize = fileSize,
            bytesTransferred = 0,
            currentSpeedMbs = 0.0,
            status = FileTransferService.TransferStatus.PREPARING,
            filePath = file.absolutePath,
            isSender = true
        )
        updateTransfer(transferId, payload)

        scope.launch {
            try {
                Log.d(TAG, "Attempting connection to remote peer file server at $peerIpAddress:$port")
                val socket = Socket(peerIpAddress, port)
                val outputStream = DataOutputStream(BufferedOutputStream(socket.getOutputStream()))

                // Write File Metadata headers
                outputStream.writeUTF(fileName)
                outputStream.writeLong(fileSize)
                outputStream.flush()

                val fileInputStream = BufferedInputStream(FileInputStream(file))
                val buffer = ByteArray(BUFFER_SIZE)
                var bytesRead: Int
                var totalBytesWritten = 0L
                val startTime = System.currentTimeMillis()

                updateTransfer(transferId, payload.copy(status = FileTransferService.TransferStatus.TRANSFERRING))

                while (fileInputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesWritten += bytesRead

                    val elapsedTimeSec = (System.currentTimeMillis() - startTime) / 1000.0
                    val speedMbs = if (elapsedTimeSec > 0) (totalBytesWritten / (1024.0 * 1024.0)) / elapsedTimeSec else 0.0

                    val updatedProgress = payload.copy(
                        bytesTransferred = totalBytesWritten,
                        currentSpeedMbs = speedMbs,
                        status = if (totalBytesWritten >= fileSize) FileTransferService.TransferStatus.COMPLETED else FileTransferService.TransferStatus.TRANSFERRING
                    )
                    updateTransfer(transferId, updatedProgress)
                    onProgress(updatedProgress)
                }

                outputStream.flush()
                socket.close()
                fileInputStream.close()
                Log.i(TAG, "Successfully transferred file: $fileName to peer.")
            } catch (e: Exception) {
                Log.e(TAG, "Failed transferring file packet to peer $peerIpAddress", e)
                val failedPayload = payload.copy(status = FileTransferService.TransferStatus.FAILED)
                updateTransfer(transferId, failedPayload)
                onProgress(failedPayload)
            }
        }
    }

    override fun cancelFileTransfer(transferId: String) {
        val transfer = transfersMap[transferId]
        if (transfer != null) {
            updateTransfer(transferId, transfer.copy(status = FileTransferService.TransferStatus.CANCELLED))
        }
    }

    private fun updateTransfer(transferId: String, payload: FileTransferService.FilePayload) {
        transfersMap[transferId] = payload
        _activeTransfers.value = transfersMap.values.toList()
    }
}
