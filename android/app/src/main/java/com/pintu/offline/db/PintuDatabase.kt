package com.pintu.offline.db

import androidx.room.*

/**
 * Local Room Database Schema for persistent storage of offline mesh sessions, chat logs, and calls.
 */

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val deviceId: String,
    val displayName: String,
    val deviceMacAddress: String,
    val isPaired: Boolean,
    val lastSeenTimestamp: Long
)

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val messageUuid: String,
    val senderId: String,
    val receiverId: String,
    val text: String,
    val timestamp: Long,
    val channelType: String, // "bluetooth" or "wifi-direct"
    val attachmentPath: String?,
    val status: String // "sending", "sent", "delivered", "read"
)

@Entity(tableName = "calls")
data class CallEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val peerName: String,
    val peerAvatar: String,
    val callType: String, // "incoming", "outgoing", "missed"
    val timestamp: Long,
    val durationSeconds: Int,
    val isVideo: Boolean
)

@Entity(tableName = "file_transfers")
data class FileTransferEntity(
    @PrimaryKey val transferId: String,
    val fileName: String,
    val fileSize: Long,
    val speedMbs: Double,
    val direction: String, // "send" or "receive"
    val peerId: String,
    val peerName: String,
    val timestamp: Long,
    val status: String
)

@Dao
interface PintuDao {
    @Query("SELECT * FROM users")
    fun getAllUsers(): List<UserEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertUser(user: UserEntity)

    @Query("SELECT * FROM messages WHERE senderId = :peerId OR receiverId = :peerId ORDER BY timestamp ASC")
    fun getMessagesForPeer(peerId: String): List<MessageEntity>

    @Insert
    fun insertMessage(message: MessageEntity)

    @Query("SELECT * FROM calls ORDER BY timestamp DESC")
    fun getCallHistory(): List<CallEntity>

    @Insert
    fun insertCall(call: CallEntity)

    @Query("SELECT * FROM file_transfers ORDER BY timestamp DESC")
    fun getTransferHistory(): List<FileTransferEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun insertTransfer(transfer: FileTransferEntity)
}

@Database(
    entities = [UserEntity::class, MessageEntity::class, CallEntity::class, FileTransferEntity::class],
    version = 1,
    exportSchema = false
)
abstract class PintuDatabase : RoomDatabase() {
    abstract fun pintuDao(): PintuDao
}
