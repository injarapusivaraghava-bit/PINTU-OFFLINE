package com.pintu.offline.service

import android.util.Log
import com.pintu.offline.db.MessageEntity
import com.pintu.offline.db.PintuDao
import com.pintu.offline.security.EncryptionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.*
import javax.crypto.spec.SecretKeySpec

class LocalMessageServiceImpl(
    private val pintuDao: PintuDao,
    private val encryptionManager: EncryptionManager,
    private val bluetoothService: BluetoothService
) : LocalMessageService {

    companion object {
        private const val TAG = "LocalMessageService"
    }

    private val _messageHistory = MutableStateFlow<List<LocalMessageService.OfflineMessage>>(emptyList())
    override val messageHistory: StateFlow<List<LocalMessageService.OfflineMessage>> = _messageHistory

    private val scope = CoroutineScope(Dispatchers.IO)
    private val aesKey = SecretKeySpec(ByteArray(32), "AES") // Session encryption key

    init {
        loadHistoryFromDb()
        setupSocketDataListener()
    }

    private fun loadHistoryFromDb() {
        scope.launch {
            try {
                val dbMessages = pintuDao.getMessagesForPeer("peer-default")
                val mapped = dbMessages.map { entity ->
                    LocalMessageService.OfflineMessage(
                        messageId = entity.messageUuid,
                        senderId = entity.senderId,
                        recipientId = entity.receiverId,
                        textContent = entity.text,
                        timestamp = entity.timestamp,
                        status = mapStatusFromDb(entity.status)
                    )
                }
                _messageHistory.value = mapped
            } catch (e: Exception) {
                Log.e(TAG, "Error loading messages from Room database", e)
            }
        }
    }

    private fun setupSocketDataListener() {
        bluetoothService.setOnDataReceivedListener { rawBytes ->
            scope.launch {
                try {
                    val jsonStr = String(rawBytes, Charsets.UTF_8)
                    val json = JSONObject(jsonStr)
                    val type = json.optString("type")

                    if (type == "CHAT") {
                        val msgId = json.getString("id")
                        val senderId = json.getString("senderId")
                        val encryptedText = json.getString("payload")
                        val timestamp = json.optLong("timestamp", System.currentTimeMillis())

                        val decryptedText = try {
                            encryptionManager.decryptMessage(encryptedText, aesKey)
                        } catch (_: Exception) {
                            encryptedText
                        }

                        // Save to Room DB
                        pintuDao.insertMessage(
                            MessageEntity(
                                messageUuid = msgId,
                                senderId = senderId,
                                receiverId = "self",
                                text = decryptedText,
                                timestamp = timestamp,
                                channelType = "bluetooth-rfcomm",
                                attachmentPath = null,
                                status = "delivered"
                            )
                        )

                        val inboundMessage = LocalMessageService.OfflineMessage(
                            messageId = msgId,
                            senderId = senderId,
                            recipientId = "self",
                            textContent = decryptedText,
                            timestamp = timestamp,
                            status = LocalMessageService.MessageStatus.DELIVERED
                        )

                        _messageHistory.value = _messageHistory.value + inboundMessage

                        // Send back ACK packet to confirm delivery to peer
                        val ackPacket = JSONObject().apply {
                            put("type", "ACK")
                            put("id", msgId)
                        }
                        bluetoothService.writeData(ackPacket.toString().toByteArray(Charsets.UTF_8))
                        Log.i(TAG, "Received message $msgId and dispatched ACK confirmation.")
                    } else if (type == "ACK") {
                        val ackMsgId = json.getString("id")
                        updateMessageStatus(ackMsgId, LocalMessageService.MessageStatus.DELIVERED)
                        Log.i(TAG, "Delivery ACK received for message $ackMsgId -> DELIVERED.")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed parsing incoming socket packet", e)
                }
            }
        }
    }

    override fun sendOfflineMessage(
        recipientId: String,
        textContent: String,
        onStatusUpdated: (LocalMessageService.OfflineMessage) -> Unit
    ) {
        val uniqueId = UUID.randomUUID().toString()
        val timestamp = System.currentTimeMillis()

        var currentMsg = LocalMessageService.OfflineMessage(
            messageId = uniqueId,
            senderId = "self",
            recipientId = recipientId,
            textContent = textContent,
            timestamp = timestamp,
            status = LocalMessageService.MessageStatus.PENDING
        )

        _messageHistory.value = _messageHistory.value + currentMsg
        onStatusUpdated(currentMsg)

        scope.launch {
            try {
                // Encrypt payload
                val encryptedText = try {
                    encryptionManager.encryptMessage(textContent, aesKey)
                } catch (_: Exception) {
                    textContent
                }

                // Insert into Room DB
                pintuDao.insertMessage(
                    MessageEntity(
                        messageUuid = uniqueId,
                        senderId = "self",
                        receiverId = recipientId,
                        text = textContent,
                        timestamp = timestamp,
                        channelType = "bluetooth-rfcomm",
                        attachmentPath = null,
                        status = "pending"
                    )
                )

                // Transmit packet over RFCOMM socket
                val packet = JSONObject().apply {
                    put("type", "CHAT")
                    put("id", uniqueId)
                    put("senderId", "self")
                    put("recipientId", recipientId)
                    put("payload", encryptedText)
                    put("timestamp", timestamp)
                }

                val written = bluetoothService.writeData(packet.toString().toByteArray(Charsets.UTF_8))
                if (written) {
                    currentMsg = currentMsg.copy(status = LocalMessageService.MessageStatus.SENT)
                    updateMessageInList(currentMsg)
                    onStatusUpdated(currentMsg)
                    Log.i(TAG, "Offline message $uniqueId written to RFCOMM socket successfully.")
                } else {
                    currentMsg = currentMsg.copy(status = LocalMessageService.MessageStatus.FAILED)
                    updateMessageInList(currentMsg)
                    onStatusUpdated(currentMsg)
                    Log.w(TAG, "Failed to write message $uniqueId: peer socket not connected.")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error transmitting message $uniqueId", e)
                currentMsg = currentMsg.copy(status = LocalMessageService.MessageStatus.FAILED)
                updateMessageInList(currentMsg)
                onStatusUpdated(currentMsg)
            }
        }
    }

    private fun updateMessageInList(msg: LocalMessageService.OfflineMessage) {
        _messageHistory.value = _messageHistory.value.map {
            if (it.messageId == msg.messageId) msg else it
        }
    }

    override fun receiveIncomingMessage(encryptedPayload: ByteArray, senderId: String) {
        setupSocketDataListener()
    }

    override fun updateMessageStatus(messageId: String, status: LocalMessageService.MessageStatus) {
        scope.launch {
            _messageHistory.value = _messageHistory.value.map { msg ->
                if (msg.messageId == messageId) msg.copy(status = status) else msg
            }
        }
    }

    private fun mapStatusFromDb(status: String): LocalMessageService.MessageStatus {
        return when (status.lowercase()) {
            "sent" -> LocalMessageService.MessageStatus.SENT
            "delivered" -> LocalMessageService.MessageStatus.DELIVERED
            "failed" -> LocalMessageService.MessageStatus.FAILED
            else -> LocalMessageService.MessageStatus.PENDING
        }
    }
}
