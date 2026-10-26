import { integer, pgTable, serial, text, timestamp, bigint } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  displayName: text('display_name').notNull(),
  email: text('email').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Chats Table
export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  chatId: text('chat_id').notNull().unique(), // Unique identifier (ownerUid_peerId)
  ownerId: text('owner_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  peerId: text('peer_id').notNull(),
  peerName: text('peer_name').notNull(),
  lastMessageText: text('last_message_text'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Messages Table
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  messageId: text('message_id').notNull().unique(),
  chatId: text('chat_id')
    .references(() => chats.chatId, { onDelete: 'cascade' })
    .notNull(),
  senderId: text('sender_id').notNull(),
  senderName: text('sender_name').notNull(),
  text: text('text').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  status: text('status').notNull(), // 'sending' | 'sent' | 'delivered' | 'read'
  channelType: text('channel_type').notNull(), // 'bluetooth' | 'wifi-direct'
  attachmentName: text('attachment_name'),
  attachmentSize: integer('attachment_size'),
  attachmentType: text('attachment_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. File Transfers Table
export const fileTransfers = pgTable('file_transfers', {
  id: serial('id').primaryKey(),
  fileId: text('file_id').notNull().unique(),
  ownerId: text('owner_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  fileName: text('file_name').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  progress: integer('progress').notNull(),
  speed: integer('speed').notNull(),
  direction: text('direction').notNull(), // 'send' | 'receive'
  peerId: text('peer_id').notNull(),
  peerName: text('peer_name').notNull(),
  status: text('status').notNull(), // 'pending' | 'transferring' | 'completed' | 'failed'
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- RELATIONSHIPS ---

export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  fileTransfers: many(fileTransfers),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  owner: one(users, {
    fields: [chats.ownerId],
    references: [users.uid],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.chatId],
  }),
}));

export const fileTransfersRelations = relations(fileTransfers, ({ one }) => ({
  owner: one(users, {
    fields: [fileTransfers.ownerId],
    references: [users.uid],
  }),
}));
