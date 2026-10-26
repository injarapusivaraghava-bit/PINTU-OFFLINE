import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image, 
  Video, 
  FileText, 
  Music, 
  CheckCircle, 
  Wifi, 
  AlertTriangle, 
  Download, 
  Share2, 
  CheckCircle2, 
  ExternalLink,
  Smartphone,
  UploadCloud,
  File
} from 'lucide-react';
import { Device, FileTransfer } from '../types';
import { shareContent, generateInviteMessage } from '../utils/share';

interface FileShareTabProps {
  devices: Device[];
  fileTransfers: FileTransfer[];
  onStartFileTransfer?: (peerId: string, file: { name: string; size: number; type: string }) => void;
  onStartTransfer?: (peerId: string, file: { name: string; size: number; type: string }) => void;
  speedLimit?: number;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
  appDownloadLink?: string;
  runMode?: 'simulation' | 'production';
}

export default function FileShareTab({
  devices,
  fileTransfers,
  onStartFileTransfer,
  speedLimit,
  lang,
  theme,
  appDownloadLink,
  runMode = 'simulation',
}: FileShareTabProps) {
  const isDark = theme === 'dark';
  const isProduction = runMode === 'production';

  // Drag and Drop & file upload state trackers
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; rawSize: number; type: string } | null>(null);
  const [targetPeerId, setTargetPeerId] = useState<string>('p-2'); // Default to Phone 2

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [transferState, setTransferState] = useState<'idle' | 'preparing' | 'transferring' | 'completed'>('idle');
  const [percent, setPercent] = useState<number>(0);
  const [productionError, setProductionError] = useState<string | null>(null);

  // Received files queue with Photos, Videos, Documents, and Audio
  const [receivedFiles, setReceivedFiles] = useState([
    { id: 'rcv-1', name: 'trip_photo_09.jpg', size: '2.8 MB', type: 'photo', sender: "Ravi's Phone" },
    { id: 'rcv-2', name: 'tutorial_clip.mp4', size: '14.5 MB', type: 'video', sender: "Kumar's Phone" },
    { id: 'rcv-3', name: 'pintu_whitepaper.pdf', size: '1.2 MB', type: 'document', sender: "Anand's iPhone" },
    { id: 'rcv-4', name: 'audio_announcement.mp3', size: '3.4 MB', type: 'audio', sender: "Ravi's Phone" }
  ]);

  // File download state buffers
  const [downloadStates, setDownloadStates] = useState<Record<string, 'download' | 'downloading' | 'completed' | 'open'>>({});
  const [activeFileViewer, setActiveFileViewer] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const formattedSize = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      setSelectedFile({
        name: file.name,
        size: formattedSize,
        rawSize: file.size,
        type: file.type.split('/')[0] || 'document'
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formattedSize = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      setSelectedFile({
        name: file.name,
        size: formattedSize,
        rawSize: file.size,
        type: file.type.split('/')[0] || 'document'
      });
    }
  };

  const triggerUploadFile = () => {
    const fileName = selectedFile ? selectedFile.name : 'photo.jpg';
    const fileSize = selectedFile ? selectedFile.size : '3.2 MB';
    const fileType = selectedFile ? selectedFile.type : 'photo';

    // Verify if PintuNative hardware layer exists
    const hasPintuNative = typeof window !== 'undefined' && (window as any).PintuNative !== undefined;
    if (hasPintuNative) {
      try {
        (window as any).PintuNative.sendFile(targetPeerId, `/sdcard/Download/${fileName}`);
      } catch (e) {
        console.error("PintuNative file transfer failed", e);
      }
    }

    setTransferState('preparing');
    setPercent(0);

    setTimeout(() => {
      setTransferState('transferring');
      const interval = setInterval(() => {
        setPercent(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTransferState('completed');

            // Find peer name
            const targetPeer = devices.find(d => d.id === targetPeerId) || { name: 'Phone 2' };

            // Append directly to Received queue to simulate the file successful transmission to Phone 2
            setReceivedFiles(current => [
              {
                id: `rcv-${Date.now()}`,
                name: fileName,
                size: fileSize,
                type: fileType,
                sender: targetPeer.name
              },
              ...current
            ]);

            setSelectedFile(null); // Clear selection
            return 100;
          }
          return prev + 25;
        });
      }, 300);
    }, 800);
  };

  const startDemoTransfer = (category: string) => {
    setSelectedCategory(category);
    setTransferState('preparing');
    setPercent(0);

    setTimeout(() => {
      setTransferState('transferring');
      const interval = setInterval(() => {
        setPercent(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTransferState('completed');

            // Simulated category file names
            const fileNamesMap: Record<string, string> = {
              Photos: 'snap_shot_1.jpg',
              Videos: 'motion_clip.mp4',
              Docs: 'project_brief.pdf',
              Audio: 'voice_memo.mp3'
            };
            const fileTypesMap: Record<string, string> = {
              Photos: 'photo',
              Videos: 'video',
              Docs: 'document',
              Audio: 'audio'
            };

            const targetPeer = devices.find(d => d.id === targetPeerId) || { name: 'Phone 2' };

            setReceivedFiles(current => [
              {
                id: `rcv-${Date.now()}`,
                name: fileNamesMap[category] || 'photo.jpg',
                size: '4.5 MB',
                type: fileTypesMap[category] || 'photo',
                sender: targetPeer.name
              },
              ...current
            ]);

            return 100;
          }
          return prev + 20;
        });
      }, 250);
    }, 1000);
  };

  // Simulates download lifecycle saving to Android storage
  const handleDownloadClick = (fileId: string) => {
    setDownloadStates(prev => ({ ...prev, [fileId]: 'downloading' }));

    setTimeout(() => {
      setDownloadStates(prev => ({ ...prev, [fileId]: 'completed' }));

      setTimeout(() => {
        setDownloadStates(prev => ({ ...prev, [fileId]: 'open' }));
      }, 1000);
    }, 1500);
  };

  const handleShareFileOnWhatsApp = (fileName: string, size: string) => {
    const text = `Check out this file shared with me via Pintu Offline:\n📂 File: ${fileName}\n⚖️ Size: ${size}\n\nNo internet needed with Pintu mesh!`;
    shareContent(text, 'whatsapp');
  };

  const handleInviteWhatsApp = () => {
    shareContent(generateInviteMessage(appDownloadLink), 'whatsapp');
  };

  const txt = {
    en: {
      title: "File Share",
      photos: "Photos",
      videos: "Videos",
      docs: "Documents",
      audio: "Audio",
      selectBtn: "SELECT FILE",
      nearby: "Transmitting Target",
      connected: "Connected",
      preparing: "Preparing payload...",
      transferring: "Transferring...",
      completed: "Completed",
      receivedHeader: "Received Files Queue",
      download: "Download",
      downloading: "Downloading...",
      downloadComplete: "Download Complete",
      openFile: "Open File",
      shareWhatsApp: "Share File",
      inviteBanner: "Invite friends on WhatsApp to share offline files!"
    },
    te: {
      title: "ఫైల్ షేర్",
      photos: "ఫోటోలు",
      videos: "వీడియోలు",
      docs: "పత్రాలు",
      audio: "ఆడియో",
      selectBtn: "ఫైల్ ఎంచుకోండి",
      nearby: "ట్రాన్స్మిటింగ్ టార్గెట్",
      connected: "కనెక్ట్ అయింది",
      preparing: "సిద్ధమౌతోంది...",
      transferring: "పంపుతోంది...",
      completed: "పూర్తయింది",
      receivedHeader: "స్వీకరించిన ఫైల్‌లు",
      download: "డౌన్‌లోడ్",
      downloading: "డౌన్‌లోడ్ అవుతోంది...",
      downloadComplete: "డౌన్‌లోడ్ పూర్తయింది",
      openFile: "ఫైల్ ఓపెన్ చేయి",
      shareWhatsApp: "ఫైల్ షేర్",
      inviteBanner: "ఆఫ్‌లైన్ ఫైల్‌లను పంచుకోవడానికి వాట్సాప్‌లో స్నేహితులను ఆహ్వానించండి!"
    }
  }[lang];

  return (
    <div
      id="file-sharing-container"
      className={`flex flex-col h-full justify-between p-3 overflow-y-auto max-h-[380px] ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      <div className="border-b border-neutral-100/10 pb-1.5 flex justify-between items-center">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-blue-400">{txt.title}</h3>
      </div>

      {/* Drag & Drop File Upload Area */}
      <div 
        id="file-drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`mt-2 p-3.5 rounded-xl border border-dashed transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
          dragActive 
            ? 'border-blue-500 bg-blue-500/5' 
            : isDark 
              ? 'border-neutral-800 bg-neutral-900/25 hover:bg-neutral-900/40' 
              : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100'
        }`}
        onClick={() => document.getElementById('file-uploader-input')?.click()}
      >
        <input 
          type="file" 
          id="file-uploader-input" 
          className="hidden" 
          onChange={handleFileChange}
        />
        <UploadCloud className={`h-6 w-6 ${dragActive ? 'text-blue-400' : 'text-neutral-500'}`} />
        <div className="text-center">
          <p className="text-[10px] font-extrabold text-neutral-300">
            {selectedFile ? selectedFile.name : "Drag & drop files or click to choose"}
          </p>
          <p className="text-[8px] text-neutral-500 font-medium">
            {selectedFile ? `${selectedFile.size} • Ready to broadcast` : "Supports photo.jpg, video.mp4, audio, PDF"}
          </p>
        </div>
      </div>

      {/* Target Receiver Selector */}
      <div className="mt-2 text-left flex flex-col gap-1">
        <label className="text-[8.5px] font-black uppercase text-neutral-500 tracking-wider">Select Recipient Node</label>
        <div className="flex gap-2">
          <select
            id="peer-selector"
            value={targetPeerId}
            onChange={(e) => setTargetPeerId(e.target.value)}
            className={`w-full p-2 text-[10px] font-bold rounded-lg border outline-none ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-800'
            }`}
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.isConnectedWifi ? "Connected" : "Discovered Mesh Peer"})
              </option>
            ))}
            {devices.length === 0 && (
              <option value="p-2">Phone 2 (Offline Direct Socket Target)</option>
            )}
          </select>

          <button
            id="btn-send-file"
            onClick={triggerUploadFile}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-4 gap-2 my-2">
        {[
          { id: 'Photos', icon: Image, label: txt.photos, color: 'text-pink-500 bg-pink-500/10' },
          { id: 'Videos', icon: Video, label: txt.videos, color: 'text-purple-500 bg-purple-500/10' },
          { id: 'Docs', icon: FileText, label: txt.docs, color: 'text-blue-500 bg-blue-500/10' },
          { id: 'Audio', icon: Music, label: txt.audio, color: 'text-amber-500 bg-amber-500/10' }
        ].map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              id={`cat-${cat.id.toLowerCase()}`}
              onClick={() => startDemoTransfer(cat.id)}
              className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                isDark ? 'bg-neutral-900/40 border-neutral-800/80' : 'bg-neutral-50 border-neutral-100'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${cat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[8.5px] font-black leading-none mt-1 truncate max-w-full">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Transmission Meter */}
      <AnimatePresence>
        {transferState !== 'idle' && (
          <motion.div
            id="file-progress-widget"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`p-2.5 rounded-xl border mb-2.5 text-left ${
              isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-neutral-100 shadow'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-black">
              <span className="text-blue-400">
                {transferState === 'preparing' && txt.preparing}
                {transferState === 'transferring' && `${txt.transferring} (${speedLimit} MB/s)`}
                {transferState === 'completed' && txt.completed}
              </span>
              <span>{Math.round(percent)}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Received Files Header */}
      <div className="text-left mt-1.5 mb-2">
        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">{txt.receivedHeader}</h4>
      </div>

      {/* Received Files List */}
      <div className="space-y-2 mb-3">
        {receivedFiles.map(file => {
          const currentDlState = downloadStates[file.id] || 'download';
          return (
            <div
              key={file.id}
              id={`received-card-${file.id}`}
              className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
                isDark ? 'bg-neutral-900/40 border-neutral-800/80' : 'bg-neutral-50 border-neutral-100'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 overflow-hidden text-left">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    {file.type === 'photo' && <Image className="h-4 w-4" />}
                    {file.type === 'video' && <Video className="h-4 w-4" />}
                    {file.type === 'audio' && <Music className="h-4 w-4" />}
                    {file.type === 'document' && <FileText className="h-4 w-4" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-extrabold text-white truncate max-w-[120px]">{file.name}</p>
                    <div className="flex items-center gap-1.5 text-[8px] text-neutral-400 font-medium">
                      <span>{file.size}</span>
                      <span>•</span>
                      <span className="truncate max-w-[50px]">{file.sender}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Share icon next to file info */}
                <button
                  id={`btn-share-file-wa-${file.id}`}
                  onClick={() => handleShareFileOnWhatsApp(file.name, file.size)}
                  className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/30 cursor-pointer"
                  title="Share File on WhatsApp"
                >
                  <Share2 className="h-3 w-3" />
                </button>
              </div>

              {/* Functional multi-stage download buttons */}
              <div className="w-full">
                {currentDlState === 'download' && (
                  <button
                    id={`btn-download-file-${file.id}`}
                    onClick={() => handleDownloadClick(file.id)}
                    className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    <span>{txt.download}</span>
                  </button>
                )}

                {currentDlState === 'downloading' && (
                  <div className="w-full py-1.5 rounded-lg bg-neutral-850 text-neutral-400 text-[9px] font-extrabold flex items-center justify-center gap-1 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-t-transparent border-neutral-400 animate-spin" />
                    <span>{txt.downloading}</span>
                  </div>
                )}

                {currentDlState === 'completed' && (
                  <div className="w-full py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-[9px] font-extrabold flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3 animate-bounce" />
                    <span>{txt.downloadComplete}</span>
                  </div>
                )}

                {currentDlState === 'open' && (
                  <button
                    id={`btn-open-file-${file.id}`}
                    onClick={() => setActiveFileViewer(file.name)}
                    className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>{txt.openFile}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Invite Promotion banner */}
      <button
        id="btn-file-share-wa-invite"
        onClick={handleInviteWhatsApp}
        className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[9.5px] font-black flex items-center justify-center gap-1.5 shadow cursor-pointer text-center leading-normal"
      >
        <Smartphone className="h-4 w-4 shrink-0" />
        <span>{txt.inviteBanner}</span>
      </button>

      {/* Simulated File Viewer simulation portal */}
      {activeFileViewer && (
        <div className="absolute inset-0 bg-neutral-950/95 z-50 p-6 flex flex-col justify-center items-center text-center">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">Android Local Storage</h3>
          <p className="text-xs text-neutral-400 max-w-[200px] leading-relaxed mb-4">
            Successfully loaded: <br/>
            <span className="font-mono text-blue-400 font-bold">{activeFileViewer}</span> <br/>
            Saved location: <br/>
            <span className="font-mono text-[10px] text-emerald-400">/storage/emulated/0/PintuOffline/</span>
          </p>
          <button
            id="btn-close-file-viewer-fs"
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

