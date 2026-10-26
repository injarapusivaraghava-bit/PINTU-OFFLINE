package com.pintu.offline

import android.content.Context
import android.util.Log
import com.pintu.offline.service.LocalMessageService
import com.pintu.offline.service.LocalMessageService.OfflineMessage
import com.pintu.offline.service.LocalMessageService.MessageStatus
import kotlinx.coroutines.flow.StateFlow

/**
 * ChatManager orchestrates local offline encrypted message loops.
 * It manages message persistence in the SQLite Room database and routes outgoing/incoming envelopes.
 */
class ChatManager(
    private val context: Context,
    private val localMessageService: LocalMessageService
) {

    companion object {
        private const val TAG = "ChatManager"
    }

    /**
     * Live state flow of the user's active session message logs (retrieved from local SQLite)
     */
    val messageHistory: StateFlow<List<OfflineMessage>> = localMessageService.messageHistory

    /**
     * Send an AES-GCM encrypted message to an offline peer
     */
    fun sendOfflineChat(recipientId: String, textContent: String, onSent: (OfflineMessage) -> Unit) {
        if (textContent.isBlank()) {
            Log.w(TAG, "Attempted to send an empty offline text payload; rejected.")
            return
        }

        Log.i(TAG, "Packaging chat payload for $recipientId. Content length: ${textContent.length}")
        localMessageService.sendOfflineMessage(recipientId, textContent) { msg ->
            Log.d(TAG, "Chat delivery status update: Message ${msg.messageId} -> ${msg.status}")
            onSent(msg)
        }
    }

    /**
     * Receive and process a binary payload received from low-level sockets
     */
    fun handleIncomingPayload(encryptedBytes: ByteArray, senderId: String) {
        Log.i(TAG, "Received message payload from $senderId. Size: ${encryptedBytes.size} bytes.")
        try {
            localMessageService.receiveIncomingMessage(encryptedBytes, senderId)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decrypt or persist incoming chat envelope.", e)
        }
    }

    /**
     * Manually update the status of an offline message record
     */
    fun updateStatus(messageId: String, status: MessageStatus) {
        Log.d(TAG, "Updating message status record in SQLite database. ID: $messageId -> $status")
        localMessageService.updateMessageStatus(messageId, status)
    }
}
