import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  syncUserProfile,
  backupChatHeader,
  saveMessageRecord,
  getChatMessages,
  getOwnerChats,
  syncFileTransfer,
  getOwnerFiles,
} from './src/db/repo.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // --- API ROUTES FIRST ---

  // 1. Health Probe
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'cloud-sql-postgres' });
  });

  // 2. User Profile Sync
  app.post('/api/users/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid, email } = req.user;
      const { displayName, avatar } = req.body;
      const result = await syncUserProfile(uid, displayName || 'Pintu User', email || '', avatar || '');
      res.json({ success: true, user: result[0] });
    } catch (error: any) {
      console.error('API /api/users/sync failed:', error);
      res.status(500).json({ error: error.message || 'Failed to sync user profile' });
    }
  });

  // 3. Backup Chat & Messages
  app.post('/api/chats/backup', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user;
      const { peerId, peerName, messages } = req.body;

      if (!peerId || !peerName || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Missing required body elements' });
      }

      // Ensure standard alphanumeric IDs for keys
      const sanitizedPeerId = peerId.replace(/[^a-zA-Z0-9_\-]/g, '');
      const chatId = `${uid}_${sanitizedPeerId}`;

      const lastMsgText = messages[messages.length - 1]?.text || '';
      await backupChatHeader(chatId, uid, sanitizedPeerId, peerName, lastMsgText);

      // Save each message record in database
      for (const msg of messages) {
        const msgId = msg.id ? msg.id.replace(/[^a-zA-Z0-9_\-]/g, '') : `msg_${msg.timestamp}`;
        await saveMessageRecord(
          msgId,
          chatId,
          msg.senderId ? msg.senderId.replace(/[^a-zA-Z0-9_\-]/g, '') : uid,
          msg.senderName || 'Me',
          msg.text,
          Number(msg.timestamp),
          msg.status,
          msg.channelType,
          msg.attachmentName,
          msg.attachmentSize,
          msg.attachmentType
        );
      }

      res.json({ success: true, count: messages.length });
    } catch (error: any) {
      console.error('API /api/chats/backup failed:', error);
      res.status(500).json({ error: error.message || 'Failed to backup chat history' });
    }
  });

  // 4. Restore Chat Messages
  app.get('/api/chats/restore', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user;
      const peerId = req.query.peerId as string;

      if (!peerId) {
        return res.status(400).json({ error: 'Missing peerId parameter' });
      }

      const sanitizedPeerId = peerId.replace(/[^a-zA-Z0-9_\-]/g, '');
      const chatId = `${uid}_${sanitizedPeerId}`;

      const dbMsgs = await getChatMessages(chatId);
      // Map to schema format expected by front-end
      const mapped = dbMsgs.map((m) => ({
        id: m.messageId,
        senderId: m.senderId,
        senderName: m.senderName,
        text: m.text,
        timestamp: m.timestamp,
        status: m.status,
        channelType: m.channelType,
        attachmentName: m.attachmentName,
        attachmentSize: m.attachmentSize,
        attachmentType: m.attachmentType,
      }));

      res.json({ success: true, messages: mapped });
    } catch (error: any) {
      console.error('API /api/chats/restore failed:', error);
      res.status(500).json({ error: error.message || 'Failed to restore chat messages' });
    }
  });

  // 5. Get List of Cloud Backed Up Chats
  app.get('/api/chats/list', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user;
      const dbChats = await getOwnerChats(uid);
      const mapped = dbChats.map((c) => ({
        id: c.chatId,
        peerId: c.peerId,
        peerName: c.peerName,
        lastMessageText: c.lastMessageText,
        updatedAt: c.updatedAt,
      }));
      res.json({ success: true, chats: mapped });
    } catch (error: any) {
      console.error('API /api/chats/list failed:', error);
      res.status(500).json({ error: error.message || 'Failed to retrieve backup chats' });
    }
  });

  // 6. Sync File Transfer History Logs
  app.post('/api/files/backup', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user;
      const { transfers } = req.body;

      if (!Array.isArray(transfers)) {
        return res.status(400).json({ error: 'Body must contain a transfers array' });
      }

      for (const tf of transfers) {
        const fileId = tf.id.replace(/[^a-zA-Z0-9_\-]/g, '');
        await syncFileTransfer(
          fileId,
          uid,
          tf.fileName,
          Number(tf.fileSize),
          Number(tf.progress),
          Number(tf.speed),
          tf.direction,
          tf.peerId.replace(/[^a-zA-Z0-9_\-]/g, ''),
          tf.peerName,
          tf.status,
          Number(tf.timestamp)
        );
      }

      res.json({ success: true, count: transfers.length });
    } catch (error: any) {
      console.error('API /api/files/backup failed:', error);
      res.status(500).json({ error: error.message || 'Failed to sync file history' });
    }
  });

  // 7. Restore File Transfer Logs
  app.get('/api/files/restore', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.user;
      const dbFiles = await getOwnerFiles(uid);
      const mapped = dbFiles.map((f) => ({
        id: f.fileId,
        fileName: f.fileName,
        fileSize: f.fileSize,
        progress: f.progress,
        speed: f.speed,
        direction: f.direction,
        peerId: f.peerId,
        peerName: f.peerName,
        status: f.status,
        timestamp: f.timestamp,
      }));
      res.json({ success: true, transfers: mapped });
    } catch (error: any) {
      console.error('API /api/files/restore failed:', error);
      res.status(500).json({ error: error.message || 'Failed to restore file transfer history' });
    }
  });


  // --- VITE MIDDLEWARE CONFIGURATION ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
