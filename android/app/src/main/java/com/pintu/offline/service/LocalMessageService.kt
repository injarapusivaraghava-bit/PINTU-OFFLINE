package com.pintu.offline.service

import kotlinx.coroutines.flow.StateFlow

/**
 * Interface definition for LocalMessageService.
 * Manages Room SQL persistence, message state delivery, and AES-GCM-256 encryption.
 */
interface LocalMessageService {

    enum class MessageStatus {
        PENDING,
        SENT,
        DELIVERED,
        FAILED
    }

    data class OfflineMessage(
        val messageId: String,
        val senderId: String,
        val recipientId: String,
        val textContent: String,
        val timestamp: Long,
        val status: MessageStatus
    )

    /**
     * Live flow of active messages in the conversation queue
     */
    val messageHistory: StateFlow<List<OfflineMessage>>

    /**
     * Send encrypted offline text message to a specific recipient over direct sockets
     */
    fun sendOfflineMessage(recipientId: String, textContent: String, onStatusUpdated: (OfflineMessage) -> Unit)

    /**
     * Receive and decrypt an incoming message, inserting it into the Room database
     */
    fun receiveIncomingMessage(encryptedPayload: ByteArray, senderId: String)

    /**
     * Mark pending messages as sent or delivered inside local storage
     */
    fun updateMessageStatus(messageId: String, status: MessageStatus)
}
