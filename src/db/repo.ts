import { db } from './index.ts';
import { users, chats, messages, fileTransfers } from './schema.ts';
import { eq, and } from 'drizzle-orm';

/**
 * Sync or register a user's profile info.
 */
export async function syncUserProfile(uid: string, displayName: string, email: string, avatar: string) {
  try {
    return await db.insert(users)
      .values({
        uid,
        displayName,
        email,
        avatar,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          displayName,
          email,
          avatar,
          updatedAt: new Date(),
        },
      })
      .returning();
  } catch (error) {
    console.error("Database syncUserProfile failed:", error);
    throw new Error("Database profile sync failed. Please try again later.", { cause: error });
  }
}

/**
 * Backup a chat head record.
 */
export async function backupChatHeader(chatId: string, ownerId: string, peerId: string, peerName: string, lastMessageText: string) {
  try {
    return await db.insert(chats)
      .values({
        chatId,
        ownerId,
        peerId,
        peerName,
        lastMessageText,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chats.chatId,
        set: {
          peerName,
          lastMessageText,
          updatedAt: new Date(),
        },
      })
      .returning();
  } catch (error) {
    console.error("Database backupChatHeader failed:", error);
    throw new Error("Database chat backup failed. Please try again later.", { cause: error });
  }
}

/**
 * Save a message record.
 */
export async function saveMessageRecord(
  messageId: string,
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  timestamp: number,
  status: string,
  channelType: string,
  attachmentName?: string,
  attachmentSize?: number,
  attachmentType?: string
) {
  try {
    return await db.insert(messages)
      .values({
        messageId,
        chatId,
        senderId,
        senderName,
        text,
        timestamp,
        status,
        channelType,
        attachmentName: attachmentName || null,
        attachmentSize: attachmentSize || null,
        attachmentType: attachmentType || null,
      })
      .onConflictDoNothing()
      .returning();
  } catch (error) {
    console.error("Database saveMessageRecord failed:", error);
    throw new Error("Database message storage failed. Please try again later.", { cause: error });
  }
}

/**
 * Retrieve messages for a specific chat.
 */
export async function getChatMessages(chatId: string) {
  try {
    return await db.select()
      .from(messages)
      .where(eq(messages.chatId, chatId));
  } catch (error) {
    console.error("Database getChatMessages failed:", error);
    throw new Error("Database retrieval failed. Please try again later.", { cause: error });
  }
}

/**
 * Retrieve list of backed up chat heads for an owner.
 */
export async function getOwnerChats(ownerId: string) {
  try {
    return await db.select()
      .from(chats)
      .where(eq(chats.ownerId, ownerId));
  } catch (error) {
    console.error("Database getOwnerChats failed:", error);
    throw new Error("Database list retrieval failed. Please try again later.", { cause: error });
  }
}

/**
 * Sync file transfer history logs.
 */
export async function syncFileTransfer(
  fileId: string,
  ownerId: string,
  fileName: string,
  fileSize: number,
  progress: number,
  speed: number,
  direction: string,
  peerId: string,
  peerName: string,
  status: string,
  timestamp: number
) {
  try {
    return await db.insert(fileTransfers)
      .values({
        fileId,
        ownerId,
        fileName,
        fileSize,
        progress,
        speed,
        direction,
        peerId,
        peerName,
        status,
        timestamp,
      })
      .onConflictDoUpdate({
        target: fileTransfers.fileId,
        set: {
          progress,
          speed,
          status,
          timestamp,
        },
      })
      .returning();
  } catch (error) {
    console.error("Database syncFileTransfer failed:", error);
    throw new Error("Database file transfer sync failed. Please try again later.", { cause: error });
  }
}

/**
 * Get all file transfer records of a user.
 */
export async function getOwnerFiles(ownerId: string) {
  try {
    return await db.select()
      .from(fileTransfers)
      .where(eq(fileTransfers.ownerId, ownerId));
  } catch (error) {
    console.error("Database getOwnerFiles failed:", error);
    throw new Error("Database files retrieval failed. Please try again later.", { cause: error });
  }
}
