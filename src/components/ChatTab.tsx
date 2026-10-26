import React, { useState, useRef, useEffect } from 'react';
import { 
  Smile, 
  Paperclip, 
  Camera, 
  Mic, 
  Send, 
  MoreVertical, 
  ChevronLeft, 
  Wifi, 
  AlertTriangle,
  Share2, 
  Download, 
  Image, 
  Video, 
  Music, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  MessageSquare,
  CloudUpload,
  CloudDownload
} from 'lucide-react';
import { Device, Message } from '../types';
import { shareContent } from '../utils/share';
import { useFirebase } from '../context/FirebaseContext';

interface ChatTabProps {
  devices: Device[];
  messages: Message[];
  activePeerId: string | null;
  onSelectPeer: (id: string) => void;
  onSendMessage: (text: string) => void;
  myDeviceId: string;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
  runMode?: 'simulation' | 'production';
}

interface ChatMessage {
  id: string;
  sender: 'me' | 'peer';
  text: string;
  time: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachment?: {
    name: string;
    size: string;
    type: 'photo' | 'video' | 'audio' | 'document';
  };
}

export default function ChatTab({
  devices,
  messages,
  activePeerId,
  onSelectPeer,
  onSendMessage,
  myDeviceId,
  lang,
  theme,
  runMode = 'simulation',
}: ChatTabProps) {
  const isDark = theme === 'dark';
  const isProduction = runMode === 'production';
  const activePeerName = lang === 'en' ? "Ravi's Phone" : "రవి ఫోన్";
  
  const { user, backupChat, restoreChatHistory } = useFirebase();
  const [backupStatus, setBackupStatus] = useState<'idle' | 'backing-up' | 'success' | 'failed'>('idle');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'restoring' | 'success' | 'failed'>('idle');

  const handleCloudBackup = async () => {
    if (!user) return;
    setBackupStatus('backing-up');
    try {
      const messagesToBackup: Message[] = localMsgs.map(m => ({
        id: m.id,
        senderId: m.sender === 'me' ? myDeviceId : 'peer-pixel9',
        senderName: m.sender === 'me' ? 'Me' : activePeerName,
        text: m.text,
        timestamp: Date.now() - (10 * 60 * 1000),
        status: m.status,
        channelType: m.attachment ? 'wifi-direct' : 'bluetooth',
        attachmentName: m.attachment?.name,
        attachmentSize: m.attachment ? 2 * 1024 * 1024 : undefined,
        attachmentType: m.attachment?.type === 'photo' ? 'image/jpeg' : 'application/pdf'
      }));
      await backupChat('peer-pixel9', activePeerName, messagesToBackup);
      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setBackupStatus('failed');
      setTimeout(() => setBackupStatus('idle'), 3000);
    }
  };

  const handleCloudRestore = async () => {
    if (!user) return;
    setRestoreStatus('restoring');
    try {
      const restored = await restoreChatHistory('peer-pixel9');
      if (restored && restored.length > 0) {
        const mapped: ChatMessage[] = restored.map(m => ({
          id: m.id,
          sender: m.senderId === myDeviceId ? 'me' : 'peer',
          text: m.text,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: m.status as any,
          attachment: m.attachmentName ? {
            name: m.attachmentName,
            size: 'Restored',
            type: 'document'
          } : undefined
        }));
        setLocalMsgs(mapped);
        setRestoreStatus('success');
      } else {
        setRestoreStatus('failed');
      }
      setTimeout(() => setRestoreStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setRestoreStatus('failed');
      setTimeout(() => setRestoreStatus('idle'), 3000);
    }
  };

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Download states for received files
  const [downloadStates, setDownloadStates] = useState<Record<string, 'download' | 'downloading' | 'completed' | 'open'>>({});
  const [activeFileViewer, setActiveFileViewer] = useState<string | null>(null);

  // Sync real-time message events from native Android RFCOMM sockets
  useEffect(() => {
    (window as any).onMessageStatusUpdated = (messageId: string, status: string) => {
      setLocalMsgs(prev => prev.map(m => {
        if (m.id === messageId) {
          const mappedStatus = status.toLowerCase() === 'delivered' ? 'delivered' :
                               status.toLowerCase() === 'sent' ? 'sent' :
                               status.toLowerCase() === 'failed' ? 'failed' : 'sending';
          return { ...m, status: mappedStatus as any };
        }
        return m;
      }));
    };

    (window as any).onMessageHistoryUpdate = (messagesJson: string) => {
      try {
        const parsed = JSON.parse(messagesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped: ChatMessage[] = parsed.map((m: any) => ({
            id: m.id,
            sender: m.senderId === 'self' || m.senderId === myDeviceId ? 'me' : 'peer',
            text: m.text,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: m.status === 'delivered' ? 'delivered' : m.status === 'sent' ? 'sent' : m.status === 'failed' ? 'failed' : 'sending'
          }));
          setLocalMsgs(mapped);
        }
      } catch (e) {
        console.error("Error parsing message history", e);
      }
    };
  }, [myDeviceId]);

  // Prepopulated chat history with multiple received and sent messages & attachments
  const [localMsgs, setLocalMsgs] = useState<ChatMessage[]>([
    { id: '1', sender: 'me', text: "Hello Ravi 👋 Ready to test offline file share?", time: "10:31 AM", status: 'read' },
    { id: '2', sender: 'peer', text: "Yes! Sending you some files over Wi-Fi Direct. Check these out!", time: "10:32 AM", status: 'read' },
    { 
      id: 'attach-photo', 
      sender: 'peer', 
      text: "Sent a photo", 
      time: "10:32 AM", 
      status: 'read',
      attachment: { name: "sunset_beach.jpg", size: "2.4 MB", type: 'photo' }
    },
    { 
      id: 'attach-doc', 
      sender: 'peer', 
      text: "Sent a PDF", 
      time: "10:33 AM", 
      status: 'read',
      attachment: { name: "pintu_mesh_specs.pdf", size: "1.1 MB", type: 'document' }
    },
    { 
      id: 'attach-audio', 
      sender: 'peer', 
      text: "Sent an audio file", 
      time: "10:33 AM", 
      status: 'read',
      attachment: { name: "voice_note_04.wav", size: "840 KB", type: 'audio' }
    },
    { 
      id: 'attach-video', 
      sender: 'peer', 
      text: "Sent a video walkthrough", 
      time: "10:34 AM", 
      status: 'read',
      attachment: { name: "pintu_demo_video.mp4", size: "14.2 MB", type: 'video' }
    }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMsgs]);

  // Handle local download transition flow
  const handleDownloadClick = (msgId: string, filename: string) => {
    // Stage 1: Download button clicked -> Downloading...
    setDownloadStates(prev => ({ ...prev, [msgId]: 'downloading' }));

    // Stage 2: Simulating background write on Android memory -> Complete after 1.5s
    setTimeout(() => {
      setDownloadStates(prev => ({ ...prev, [msgId]: 'completed' }));
      
      // Stage 3: Transition to Open File after 1 second
      setTimeout(() => {
        setDownloadStates(prev => ({ ...prev, [msgId]: 'open' }));
      }, 1200);

    }, 1500);
  };

  // Triggers mock view overlay
  const handleOpenFile = (filename: string) => {
    setActiveFileViewer(filename);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newId = 'm-' + Date.now();
    const newMsg: ChatMessage = {
      id: newId,
      sender: 'me',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending'
    };

    setLocalMsgs(prev => [...prev, newMsg]);
    setInputText('');

    const hasNative = typeof window !== 'undefined' && (window as any).PintuNative !== undefined;
    const hasAndroidNative = typeof window !== 'undefined' && (window as any).AndroidNative !== undefined;

    if (hasNative) {
      try {
        (window as any).PintuNative.sendTextMessage(activePeerId || 'default-peer', inputText);
      } catch (e) {
        console.error("Native send text message failed", e);
        setLocalMsgs(current => current.map(m => m.id === newId ? { ...m, status: 'failed' } : m));
      }
    } else if (hasAndroidNative) {
      try {
        (window as any).AndroidNative.sendMessage(inputText);
      } catch (e) {
        console.error("AndroidNative send message failed", e);
        setLocalMsgs(current => current.map(m => m.id === newId ? { ...m, status: 'failed' } : m));
      }
    } else {
      // In browser preview: mark failed after a short pause with native required indication
      setTimeout(() => {
        setLocalMsgs(current => current.map(m => m.id === newId ? { ...m, status: 'failed' } : m));
      }, 800);
    }
  };

  // WhatsApp share option helper for specific message
  const handleShareMessageOnWhatsApp = (msg: ChatMessage) => {
    let shareText = '';
    if (msg.attachment) {
      shareText = `[Pintu Offline File Share] Ravi shared a file via Pintu:\nFile Name: ${msg.attachment.name}\nSize: ${msg.attachment.size}\nType: ${msg.attachment.type.toUpperCase()}`;
    } else {
      shareText = `[Pintu Offline Chat] Message from ${msg.sender === 'me' ? 'Me' : activePeerName}: "${msg.text}"`;
    }
    shareContent(shareText, 'whatsapp');
  };

  const txt = {
    en: {
      status: "Nearby • Connected",
      inputPlaceholder: "Type a message...",
      safetyNotice: "Encryption: AES-256-GCM. Peer to Peer Connection active.",
      download: "Download",
      downloading: "Downloading...",
      downloadComplete: "Download Complete",
      openFile: "Open File",
      shareWhatsApp: "Share on WhatsApp",
      inviteOnWhatsApp: "Invite on WhatsApp"
    },
    te: {
      status: "దగ్గరలో • కనెక్ట్ అయింది",
      inputPlaceholder: "సందేశాన్ని టైప్ చేయండి...",
      safetyNotice: "ఎన్‌క్రిప్షన్: AES-256-GCM. పీర్ టు పీర్ కనెక్షన్ యాక్టివ్‌గా ఉంది.",
      download: "డౌన్‌లోడ్",
      downloading: "డౌన్‌లోడ్ అవుతోంది...",
      downloadComplete: "డౌన్‌లోడ్ పూర్తయింది",
      openFile: "ఫైల్ ఓపెన్ చేయి",
      shareWhatsApp: "వాట్సాప్‌లో షేర్ చేయండి",
      inviteOnWhatsApp: "వాట్సాప్‌లో ఆహ్వానించండి"
    }
  }[lang];

  return (
    <div
      id="chat-screen-container"
      className={`flex flex-col h-full justify-between relative ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      {/* Contact Chat Header */}
      <div className="p-3 border-b border-neutral-800/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
            alt={activePeerName}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-full object-cover border border-neutral-800/20"
          />
          <div className="text-left">
            <h4 className="font-extrabold text-xs leading-none">{activePeerName}</h4>
            <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              {txt.status}
            </span>
          </div>
        </div>

        {/* Global WhatsApp Invite option for this chat */}
        <button
          id="btn-chat-invite-whatsapp"
          onClick={() => {
            const inviteMsg = `PINTU OFFLINE\n\nPrivate • Instant • Nearby\n\nConnect with nearby devices, chat and share files.\n\nLet's chat offline!`;
            shareContent(inviteMsg, 'whatsapp');
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black hover:bg-emerald-600/30 transition-colors cursor-pointer"
          title={txt.inviteOnWhatsApp}
        >
          <Share2 className="h-3 w-3" />
          <span>{txt.inviteOnWhatsApp}</span>
        </button>

        {/* Firebase Cloud Sync Control Group */}
        {user ? (
          <div className="flex items-center gap-1.5 ml-2">
            <button
              id="btn-chat-cloud-backup"
              onClick={handleCloudBackup}
              disabled={backupStatus === 'backing-up'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold hover:bg-blue-600/20 transition-all cursor-pointer"
              title="Backup Chat to Firebase"
            >
              <CloudUpload className="h-3 w-3" />
              <span>
                {backupStatus === 'backing-up' ? '...' : (backupStatus === 'success' ? (lang === 'en' ? 'Saved' : 'సేవ్ అయింది') : (lang === 'en' ? 'Backup' : 'బ్యాకప్'))}
              </span>
            </button>
            <button
              id="btn-chat-cloud-restore"
              onClick={handleCloudRestore}
              disabled={restoreStatus === 'restoring'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-extrabold hover:bg-emerald-600/20 transition-all cursor-pointer"
              title="Restore Chat from Firebase"
            >
              <CloudDownload className="h-3 w-3" />
              <span>
                {restoreStatus === 'restoring' ? '...' : (restoreStatus === 'success' ? (lang === 'en' ? 'Restored' : 'రీస్టోర్ అయింది') : (lang === 'en' ? 'Restore' : 'రీస్టోర్'))}
              </span>
            </button>
          </div>
        ) : (
          <div className="text-[8px] font-bold text-neutral-400 ml-2 bg-neutral-500/5 px-2 py-1 rounded-lg border border-neutral-500/10">
            {lang === 'en' ? '☁️ Cloud Sync Inactive' : '☁️ క్లౌడ్ సింక్ లేదు'}
          </div>
        )}
      </div>

      {/* Scrolling Chat Thread */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-neutral-900/10 min-h-[220px] max-h-[280px]">
        {localMsgs.map(m => {
          const isMe = m.sender === 'me';
          const hasAttachment = !!m.attachment;
          const currentDlState = downloadStates[m.id] || 'download';

          return (
            <div
              key={m.id}
              id={`chat-bubble-${m.id}`}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
            >
              <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                
                {/* Bubble card */}
                <div
                  className={`p-3 rounded-2xl text-xs relative ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-neutral-900/40 border border-neutral-800/80 text-white rounded-bl-none shadow-sm'
                  }`}
                >
                  {/* File Attachment Presentation Box */}
                  {hasAttachment && m.attachment && (
                    <div className="mb-2.5 p-2 rounded-xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-2.5 text-left">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                          {m.attachment.type === 'photo' && <Image className="h-4.5 w-4.5" />}
                          {m.attachment.type === 'video' && <Video className="h-4.5 w-4.5" />}
                          {m.attachment.type === 'audio' && <Music className="h-4.5 w-4.5" />}
                          {m.attachment.type === 'document' && <FileText className="h-4.5 w-4.5" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-extrabold text-[10.5px] truncate text-white">{m.attachment.name}</p>
                          <span className="text-[9px] text-neutral-400 font-bold">{m.attachment.size}</span>
                        </div>
                      </div>

                      {/* Download option button states */}
                      <div className="flex flex-col gap-1 w-full pt-1">
                        {currentDlState === 'download' && (
                          <button
                            id={`btn-dl-file-${m.id}`}
                            onClick={() => handleDownloadClick(m.id, m.attachment!.name)}
                            className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[9.5px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>{txt.download}</span>
                          </button>
                        )}

                        {currentDlState === 'downloading' && (
                          <div className="w-full py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/50 text-neutral-300 text-[9.5px] font-black flex items-center justify-center gap-1.5 animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent border-neutral-300 animate-spin" />
                            <span>{txt.downloading}</span>
                          </div>
                        )}

                        {currentDlState === 'completed' && (
                          <div className="w-full py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-[9.5px] font-black flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3 animate-bounce" />
                            <span>{txt.downloadComplete}</span>
                          </div>
                        )}

                        {currentDlState === 'open' && (
                          <button
                            id={`btn-open-file-${m.id}`}
                            onClick={() => handleOpenFile(m.attachment!.name)}
                            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>{txt.openFile}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message body text */}
                  <p className="break-words text-[11px] leading-relaxed text-left">{m.text}</p>
                  
                  {/* Share on WhatsApp trigger button positioned elegantly inside the bubble */}
                  <button
                    id={`btn-share-msg-${m.id}`}
                    onClick={() => handleShareMessageOnWhatsApp(m)}
                    className="absolute -top-2 -right-2 p-1.5 rounded-full bg-emerald-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-emerald-700 cursor-pointer"
                    title={txt.shareWhatsApp}
                  >
                    <Share2 className="h-2.5 w-2.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1 mt-1 px-1 text-[8px] text-neutral-400">
                  <span>{m.time}</span>
                  {isMe && (
                    <span className="font-mono">
                      {m.status === 'sending' && '...'}
                      {m.status === 'sent' && '✓'}
                      {m.status === 'delivered' && '✓✓'}
                      {m.status === 'read' && <span className="text-blue-400 font-bold">✓✓</span>}
                    </span>
                  )}
                </div>

              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Action Controls Tray */}
      <div className="p-2 border-t border-neutral-800/10 flex flex-col gap-2 bg-neutral-900/5">
        {isProduction && (
          <div className="px-3 py-1.5 bg-amber-950/40 border border-amber-500/20 rounded-xl text-left flex items-start gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[9px] text-neutral-300">
              <span className="font-extrabold text-amber-400">Native Android feature required.</span> Offline local message sockets are unbound. Real phone-to-phone connection is required.
            </div>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-neutral-400">
            <button type="button" className="p-1.5 hover:text-neutral-300">
              <Smile className="h-4 w-4" />
            </button>
            <button type="button" className="p-1.5 hover:text-neutral-300">
              <Paperclip className="h-4 w-4" />
            </button>
          </div>

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={txt.inputPlaceholder}
            className="flex-1 bg-neutral-950 px-3.5 py-2.5 rounded-full text-xs border border-neutral-800 focus:border-blue-400 focus:outline-none text-white"
          />

          <button
            type="submit"
            id="chat-send-btn-mock"
            disabled={!inputText.trim()}
            className={`p-2.5 rounded-full text-white transition-all ${
              inputText.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-neutral-850 cursor-not-allowed'
            }`}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Dynamic File Viewer Simulation overlay */}
      {activeFileViewer && (
        <div className="absolute inset-0 bg-neutral-950/95 z-50 p-6 flex flex-col justify-center items-center text-center">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Android Secure Directory</h3>
          <p className="text-xs text-neutral-400 max-w-[200px] leading-relaxed mb-4">
            Successfully saved and loaded file: <br/>
            <span className="font-mono text-blue-400 font-bold">{activeFileViewer}</span> <br/>
            to storage location: <br/>
            <span className="font-mono text-[10px] text-emerald-400">/storage/emulated/0/PintuOffline/</span>
          </p>
          <button
            id="btn-close-file-viewer"
            onClick={() => setActiveFileViewer(null)}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer"
          >
            Close file preview
          </button>
        </div>
      )}

    </div>
  );
}
