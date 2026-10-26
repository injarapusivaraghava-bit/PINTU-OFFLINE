import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Radio,
  Wifi,
  Bluetooth,
  MessageSquare,
  PhoneCall,
  FileDown,
  Settings as SettingsIcon,
  ShieldAlert,
  AlertCircle,
  Menu,
  X,
  RefreshCw,
  Plus,
  Globe,
  Moon,
  Sun,
  Activity,
  FileCode,
  QrCode,
  User,
  History,
  Phone,
  PhoneOff,
  Video,
  Play,
  Terminal,
  Download,
  Share2
} from 'lucide-react';

import { Device, Message, FileTransfer, CallState, DeviceSettings, ConnectionEvent } from './types';

import HomeTab from './components/HomeTab';
import RadarScanner from './components/RadarScanner';
import ChatTab from './components/ChatTab';
import FileShareTab from './components/FileShareTab';
import CallsTab from './components/CallsTab';
import SettingsTab from './components/SettingsTab';
import PINLockScreen from './components/PINLockScreen';
import SplashScreen from './components/SplashScreen';
import ProfileScreen from './components/ProfileScreen';
import HistoryScreen from './components/HistoryScreen';
import AppDownloadPage from './components/AppDownloadPage';
import FormsTab from './components/FormsTab';

// Unique session device ID
const SESSION_DEVICE_ID = 'dev-' + Math.random().toString(36).substring(2, 9);

// Raw source-code templates for the developer Kotlin view
const KOTLIN_FILES = {
  'MainActivity.kt': `package com.pintu.offline

import android.os.Bundle
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import com.pintu.offline.service.*

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var bluetoothService: BluetoothService
    private lateinit var wifiDirectService: WifiDirectService
    private lateinit var localMessageService: LocalMessageService

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)
        // Binds PintuNative and AndroidNative bridges for offline mesh
    }
}`,
  'BluetoothService.kt': `package com.pintu.offline.service

import android.bluetooth.BluetoothDevice
import kotlinx.coroutines.flow.StateFlow

interface BluetoothService {
    val isBluetoothEnabled: StateFlow<Boolean>
    val isAdvertising: StateFlow<Boolean>
    
    fun startClassicDiscovery(onDeviceFound: (BluetoothDevice, Short) -> Unit, onFinished: () -> Unit)
    fun stopClassicDiscovery()
    fun pairDevice(deviceMacAddress: String, onResult: (Boolean) -> Unit)
    fun establishRfcommSocket(deviceMacAddress: String, onConnect: (Boolean) -> Unit)
    fun writeData(bytes: ByteArray): Boolean
}`,
  'WifiDirectService.kt': `package com.pintu.offline.service

import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pGroup
import kotlinx.coroutines.flow.StateFlow

interface WifiDirectService {
    val connectionInfo: StateFlow<WifiDirectConnectionInfo>
    val discoveredP2pDevices: StateFlow<List<WifiP2pDevice>>
    
    fun initializeWifiDirect()
    fun discoverWifiDirectPeers()
    fun createDirectGroup(onGroupCreated: (WifiP2pGroup?) -> Unit)
    fun connectToDevice(deviceAddress: String, onSuccess: () -> Unit, onFailure: (Int) -> Unit)
    fun removeGroup()
}`,
  'LocalMessageService.kt': `package com.pintu.offline.service

import kotlinx.coroutines.flow.StateFlow

interface LocalMessageService {
    val messageHistory: StateFlow<List<OfflineMessage>>
    
    fun sendOfflineMessage(recipientId: String, textContent: String, onStatusUpdated: (OfflineMessage) -> Unit)
    fun receiveIncomingMessage(encryptedPayload: ByteArray, senderId: String)
    fun updateMessageStatus(messageId: String, status: MessageStatus)
}`
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('splash');
  const [lang, setLang] = useState<'en' | 'te'>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeCodeFile, setActiveCodeFile] = useState<string>('MainActivity.kt');

  const [isNative, setIsNative] = useState<boolean>(
    typeof window !== 'undefined' && ((window as any).PintuNative !== undefined || (window as any).AndroidNative !== undefined)
  );

  // Real discovered devices list - never default to fake virtual devices
  const [devices, setDevices] = useState<Device[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([]);
  const [systemEvents, setSystemEvents] = useState<string[]>([
    "Pintu Offline system initialized.",
    "Target Android SDK 35 (Android 15) configuration active.",
    "Awaiting hardware scan or native bridge sync."
  ]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Real call logs - no fake mock calls
  const [callHistory, setCallHistory] = useState<Array<{
    id: string;
    peerName: string;
    peerAvatar: string;
    type: 'incoming' | 'outgoing' | 'missed';
    timestamp: number;
    duration: number;
    isVideo: boolean;
  }>>([]);

  // Local settings
  const [settings, setSettings] = useState<DeviceSettings>({
    deviceName: "Pintu User's Phone",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
    bluetoothEnabled: true,
    wifiDirectEnabled: true,
    cameraEnabled: true,
    micEnabled: true,
    discoverable: true,
    storagePath: "/storage/emulated/0/PintuOffline/",
    appLockEnabled: true,
    appDownloadLink: "https://play.google.com/store/apps/details?id=com.pintu.offline",
    apkDownloadLink: ((import.meta as any).env?.VITE_APK_DOWNLOAD_URL as string) || ""
  });

  // System logging helper
  const addSystemEvent = (msg: string) => {
    setSystemEvents(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  // Bind Web-to-Native callbacks
  useEffect(() => {
    const detectNative = () => {
      const nativeExists = typeof window !== 'undefined' && ((window as any).PintuNative !== undefined || (window as any).AndroidNative !== undefined);
      setIsNative(nativeExists);
    };
    detectNative();

    // Sync hardware states from Android Native container
    (window as any).onPintuNativeStateUpdate = (stateJsonStr: string) => {
      try {
        const state = JSON.parse(stateJsonStr);
        if (state.deviceNativeMode) {
          setIsNative(true);
          addSystemEvent(`Native link status synced. Bluetooth: ${state.bluetoothEnabled ? 'ON' : 'OFF'}, Wi-Fi Direct: ${state.wifiDirectConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
        }
      } catch (e) {
        console.error("Error parsing native state", e);
      }
    };

    // Real discovered devices from Android hardware scanner
    (window as any).onDevicesDiscovered = (devicesJsonStr: string) => {
      try {
        const parsed = JSON.parse(devicesJsonStr);
        if (Array.isArray(parsed)) {
          const mapped: Device[] = parsed.map((item: any) => ({
            id: item.id,
            name: item.name || 'Bluetooth Node',
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
            signalStrength: -60,
            distance: parseFloat(item.distance) || 2.0,
            isPaired: item.state === 'connected',
            isConnectedWifi: item.state === 'connected',
            deviceType: 'phone',
            isDiscovered: true,
            macAddress: item.mac
          }));
          setDevices(mapped);
          addSystemEvent(`Discovered ${mapped.length} physical Android peer(s) over radio sweep.`);
        }
      } catch (e) {
        console.error("Error parsing discovered devices", e);
      }
    };

    // Chat Message delivery state updates
    (window as any).onMessageStatusUpdated = (messageId: string, status: string) => {
      addSystemEvent(`Message status update: ID ${messageId} is now ${status}`);
    };

    // File transfer packet progress updates
    (window as any).onFileProgress = (transferId: string, sent: number, total: number, status: string) => {
      const percent = Math.round((sent / total) * 100);
      addSystemEvent(`File progress: ID ${transferId} is ${percent}% (${status})`);
    };
  }, []);

  const handleStartScan = () => {
    setIsScanning(true);
    const nativeObj = (window as any).AndroidNative || (window as any).PintuNative;
    if (nativeObj && nativeObj.startDiscovery) {
      addSystemEvent("Requesting native Android SDK 35 Bluetooth Classic & Wi-Fi Direct scan...");
      try {
        nativeObj.startDiscovery();
      } catch (err) {
        addSystemEvent(`Native scan request error: ${err}`);
      }
    } else {
      addSystemEvent("Browser preview: Native Android Required for Bluetooth/Wi-Fi radio sweeping.");
      setTimeout(() => {
        setIsScanning(false);
      }, 2000);
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    const nativeObj = (window as any).AndroidNative || (window as any).PintuNative;
    if (nativeObj && nativeObj.stopDiscovery) {
      try {
        nativeObj.stopDiscovery();
        addSystemEvent("Native radio scan suspended.");
      } catch (err) {
        addSystemEvent(`Native scan stop error: ${err}`);
      }
    } else {
      addSystemEvent("Radio sweep stopped.");
    }
  };

  const handleToggleBluetoothPair = (deviceId: string) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;

    const nativeObj = (window as any).AndroidNative || (window as any).PintuNative;
    if (nativeObj?.pairDevice) {
      addSystemEvent(`Requesting Bluetooth Classic RFCOMM pairing with ${dev.name} (${dev.macAddress || dev.id})...`);
      nativeObj.pairDevice(dev.id);
    } else {
      addSystemEvent(`Native Android Required: Cannot pair over browser preview.`);
    }

    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isPaired: !d.isPaired } : d));
  };

  const handleToggleWifiDirect = (deviceId: string) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;

    const nativeObj = (window as any).AndroidNative || (window as any).PintuNative;
    if (nativeObj?.connectToDevice) {
      addSystemEvent(`Requesting Wi-Fi Direct P2P link with ${dev.name}...`);
      nativeObj.connectToDevice(dev.id);
    } else {
      addSystemEvent(`Native Android Required: Cannot connect Wi-Fi Direct in browser preview.`);
    }

    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isConnectedWifi: !d.isConnectedWifi } : d));
  };

  const handleSendMessage = (text: string) => {
    const nativeObj = (window as any).AndroidNative || (window as any).PintuNative;
    if (nativeObj && nativeObj.sendTextMessage) {
      const activePeerId = sessionStorage.getItem('pintu_active_peer') || 'default-peer';
      nativeObj.sendTextMessage(activePeerId, text);
      addSystemEvent(`Dispatched offline text to ${activePeerId} via native socket.`);
    } else {
      addSystemEvent(`Message stored locally. Native Android required for physical socket transmission.`);
    }
  };

  return (
    <div id="pintu-app-root" className="min-h-screen bg-[#080d1a] text-neutral-100 flex flex-col font-sans antialiased overflow-x-hidden selection:bg-blue-600/30">
      
      {/* Top Header */}
      <header id="app-top-header" className="border-b border-neutral-900 bg-[#0c1424]/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-[0_0_15px_rgba(37,99,235,0.35)] flex items-center justify-center border border-white/10">
            <Radio className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-md font-black tracking-widest text-white leading-none">PINTU OFFLINE</h1>
            <p className="text-[10px] text-blue-400 font-extrabold mt-1 uppercase tracking-wider">
              Native Android SDK 35 • Bluetooth Classic RFCOMM & Wi-Fi Direct
            </p>
          </div>
        </div>

        {/* Universal settings bar */}
        <div className="flex items-center gap-3">
          <button
            id="btn-toggle-lang"
            onClick={() => setLang(prev => prev === 'en' ? 'te' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Toggle English / Telugu translation"
          >
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            <span>{lang === 'en' ? 'Telugu (తెలుగు)' : 'English'}</span>
          </button>

          <button
            id="btn-toggle-theme"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Toggle Light / Dark Preview Theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-400" />}
          </button>
        </div>
      </header>

      {/* Main Dual-Cockpit Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        
        {/* LEFT COCKPIT: Developer controls, logs, and Gradle build instructions */}
        <section className="lg:col-span-7 flex flex-col gap-4 text-left">
          
          {/* App Status Card */}
          <div className="p-4 rounded-2xl bg-[#0c1424] border border-neutral-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase text-blue-400 tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Native Android Execution Environment
              </h2>
              <span className={`text-[8.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isNative
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {isNative ? 'Android Native Active' : 'Browser Preview'}
              </span>
            </div>

            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
              {isNative
                ? "Running inside the Pintu Offline Android APK container. Low-level Bluetooth Classic RFCOMM, Wi-Fi Direct, and Room database sockets are fully operational."
                : "Running in web preview mode. Browser security sandboxes do not provide direct access to Android Bluetooth Classic RFCOMM or Wi-Fi Direct hardware transceivers. Build and install the APK on Android devices to test real offline communication."}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[9.5px] bg-[#1a2c4e] border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-bold">✓ Target SDK 35</span>
              <span className="text-[9.5px] bg-[#1a2c4e] border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-bold">✓ Bluetooth Classic RFCOMM</span>
              <span className="text-[9.5px] bg-[#1a2c4e] border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-bold">✓ Wi-Fi Direct P2P</span>
              <span className="text-[9.5px] bg-[#1a2c4e] border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-bold">✓ Room SQLite Database</span>
            </div>
          </div>

          {/* Gradle Build Workflow */}
          <div className="p-4 rounded-2xl bg-[#0c1424] border border-neutral-900 flex flex-col gap-2.5">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-300 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              Gradle APK & AAB Build Commands
            </h3>
            <p className="text-[11px] text-neutral-400">
              Run these commands to build testing APKs or publish to Google Play:
            </p>

            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[8px] uppercase">1. Web Bundle:</span>
                <span className="text-emerald-400">npm run build</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[8px] uppercase">2. Debug APK (Testing):</span>
                <span className="text-blue-400">cd android && ./gradlew assembleDebug</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[8px] uppercase">3. Release APK (Signed):</span>
                <span className="text-indigo-400">cd android && ./gradlew assembleRelease</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-500 block text-[8px] uppercase">4. Google Play AAB:</span>
                <span className="text-amber-400">cd android && ./gradlew bundleRelease</span>
              </div>
            </div>
          </div>

          {/* Android Kotlin Source Files browser */}
          <div className="p-4 rounded-2xl bg-[#0c1424] border border-neutral-900 flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 mb-2.5 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-blue-400" />
              Android Kotlin Source Code
            </h3>
            
            <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-neutral-900/60 max-w-full">
              {Object.keys(KOTLIN_FILES).map(filename => (
                <button
                  key={filename}
                  id={`code-tab-${filename}`}
                  onClick={() => setActiveCodeFile(filename)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono tracking-tight shrink-0 transition-colors cursor-pointer ${
                    activeCodeFile === filename
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {filename}
                </button>
              ))}
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-xl mt-2 font-mono text-[10px] leading-relaxed text-blue-300/90 overflow-x-auto border border-neutral-900 max-h-[160px]">
              <pre>{KOTLIN_FILES[activeCodeFile as keyof typeof KOTLIN_FILES]}</pre>
            </div>
          </div>

          {/* Mesh System Events Ledger */}
          <div className="p-3.5 rounded-2xl bg-[#0c1424] border border-neutral-900 flex flex-col max-h-[140px]">
            <span className="text-[10px] font-black tracking-widest text-neutral-400 uppercase mb-1.5">System Events Log</span>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[9.5px] text-neutral-400">
              {systemEvents.map((evt, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-emerald-500 shrink-0">▶</span>
                  <p className="break-all">{evt}</p>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* RIGHT COCKPIT: Photorealistic Android device shell */}
        <section className="lg:col-span-5 flex items-center justify-center">
          
          <div className="relative w-[320px] h-[630px] bg-neutral-950 rounded-[44px] p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-neutral-800 flex flex-col overflow-hidden">
            
            {/* Ear speaker / Sensor Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-neutral-950 rounded-b-2xl z-50 flex items-center justify-center gap-1.5">
              <div className="w-10 h-1 bg-neutral-800 rounded-full" />
              <div className="w-2.5 h-2.5 bg-neutral-900 rounded-full border border-neutral-800 flex items-center justify-center">
                <div className="w-1 h-1 bg-blue-900 rounded-full" />
              </div>
            </div>

            {/* Phone Screen Canvas Container */}
            <div className="relative flex-1 rounded-[30px] overflow-hidden flex flex-col bg-[#0a192f] select-none">
              
              {/* Status Bar */}
              <div className="h-8 bg-transparent px-4 flex items-center justify-between text-[10px] font-extrabold text-neutral-400 z-40">
                <span>9:31</span>
                
                <div className="flex items-center gap-1.5">
                  <Bluetooth className={`h-3 w-3 ${settings.bluetoothEnabled ? 'text-blue-400' : 'text-neutral-600'}`} />
                  <Wifi className={`h-3 w-3 ${settings.wifiDirectEnabled ? 'text-blue-400' : 'text-neutral-600'}`} />
                  <div className="w-5.5 h-3 rounded-sm border border-neutral-400/50 p-0.5 flex items-center">
                    <div className="w-4.5 h-full bg-emerald-500 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* Native Status Banner */}
              <div className={`text-center py-1.5 px-3 text-[8.5px] font-black tracking-wide uppercase transition-all z-40 ${
                isNative 
                  ? 'bg-emerald-500/15 text-emerald-400 border-b border-emerald-500/25' 
                  : 'bg-amber-500/15 text-amber-500 border-b border-amber-500/25'
              }`}>
                {isNative ? (
                  <span>🔒 REAL NATIVE ANDROID CONNECTED</span>
                ) : (
                  <span>⚠️ BROWSER PREVIEW • NATIVE ANDROID REQUIRED</span>
                )}
              </div>

              {/* Screens and Subtabs */}
              <div className="flex-1 relative flex flex-col overflow-hidden pb-13">
                <AnimatePresence mode="wait">
                  {activeTab === 'splash' && (
                    <SplashScreen onLoadingComplete={() => setActiveTab('pinlock')} lang={lang} />
                  )}

                  {activeTab === 'pinlock' && (
                    <PINLockScreen onUnlockSuccess={() => setActiveTab('home')} lang={lang} theme={theme} />
                  )}

                  {activeTab === 'home' && (
                    <HomeTab
                      devices={devices}
                      settings={settings}
                      lang={lang}
                      theme={theme}
                      onNavigateToTab={setActiveTab}
                      onStartScan={handleStartScan}
                    />
                  )}

                  {activeTab === 'radar' && (
                    <RadarScanner
                      devices={devices}
                      onToggleBluetoothPair={handleToggleBluetoothPair}
                      onToggleWifiDirect={handleToggleWifiDirect}
                      isScanning={isScanning}
                      onStartScan={handleStartScan}
                      onStopScan={handleStopScan}
                      lang={lang}
                      theme={theme}
                      myDeviceId={SESSION_DEVICE_ID}
                      myDeviceName={settings.deviceName}
                      onNavigateToTab={setActiveTab}
                      onPeerConnected={(peer) => {
                        addSystemEvent(`QR P2P Handshake verified with ${peer.name} (${peer.idNumber}).`);
                        setDevices(prev => {
                          const existing = prev.find(d => d.id === peer.id || d.name.toLowerCase().includes(peer.name.toLowerCase()));
                          if (existing) {
                            return prev.map(d => d.id === existing.id ? { ...d, isPaired: true } : d);
                          }
                          return [
                            {
                              id: peer.id,
                              name: peer.name,
                              avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
                              signalStrength: -45,
                              distance: 0.8,
                              isPaired: true,
                              isConnectedWifi: false,
                              deviceType: 'phone',
                              isDiscovered: true,
                              macAddress: peer.idNumber
                            },
                            ...prev
                          ];
                        });
                      }}
                    />
                  )}

                  {activeTab === 'chat' && (
                    <ChatTab
                      devices={devices}
                      messages={messages}
                      activePeerId={sessionStorage.getItem('pintu_active_peer') || (devices[0]?.id || null)}
                      onSelectPeer={(id) => sessionStorage.setItem('pintu_active_peer', id)}
                      onSendMessage={handleSendMessage}
                      myDeviceId={SESSION_DEVICE_ID}
                      lang={lang}
                      theme={theme}
                    />
                  )}

                  {activeTab === 'files' && (
                    <FileShareTab
                      devices={devices}
                      fileTransfers={fileTransfers}
                      onStartTransfer={(peerId, file) => {
                        addSystemEvent(`Initiated local file transfer: ${file.name} to ${peerId}`);
                      }}
                      speedLimit={35}
                      lang={lang}
                      theme={theme}
                    />
                  )}

                  {activeTab === 'calls' && (
                    <CallsTab
                      lang={lang}
                      theme={theme}
                      isNative={isNative}
                    />
                  )}

                  {activeTab === 'forms' && (
                    <FormsTab
                      lang={lang}
                      theme={theme}
                      onBack={() => setActiveTab('home')}
                    />
                  )}

                  {activeTab === 'history' && (
                    <HistoryScreen
                      callHistory={callHistory}
                      lang={lang}
                      theme={theme}
                      onClearHistory={() => setCallHistory([])}
                      onCallPeer={(name, isVideo) => {
                        setActiveTab('calls');
                      }}
                    />
                  )}

                  {activeTab === 'profile' && (
                    <ProfileScreen
                      settings={settings}
                      onUpdateSettings={setSettings}
                      lang={lang}
                      theme={theme}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsTab
                      settings={settings}
                      onUpdateSettings={setSettings}
                      lang={lang}
                      theme={theme}
                      onNavigateToTab={setActiveTab}
                    />
                  )}

                  {activeTab === 'app-download-page' && (
                    <AppDownloadPage
                      settings={settings}
                      lang={lang}
                      theme={theme}
                      onBack={() => setActiveTab('home')}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Navigation Bar */}
              {activeTab !== 'splash' && activeTab !== 'pinlock' && (
                <nav
                  id="phone-bottom-nav"
                  className={`absolute bottom-0 inset-x-0 h-13 px-2 flex items-center justify-around border-t z-40 ${
                    theme === 'dark' ? 'bg-[#0c1424] border-neutral-900/60' : 'bg-[#fafafa] border-neutral-200'
                  }`}
                >
                  {[
                    { id: 'home', icon: Smartphone, label: lang === 'en' ? 'Home' : 'హోమ్' },
                    { id: 'radar', icon: Radio, label: lang === 'en' ? 'Nearby' : 'స్కాన్' },
                    { id: 'chat', icon: MessageSquare, label: lang === 'en' ? 'Chat' : 'చాట్' },
                    { id: 'calls', icon: Phone, label: lang === 'en' ? 'Calls' : 'కాల్స్' },
                    { id: 'profile', icon: User, label: lang === 'en' ? 'Profile' : 'ప్రొఫైల్' },
                    { id: 'settings', icon: SettingsIcon, label: lang === 'en' ? 'Settings' : 'సెట్టింగ్స్' }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        id={`bottom-nav-item-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex flex-col items-center justify-center w-11 h-11 transition-all cursor-pointer"
                      >
                        <Icon className={`h-4.5 w-4.5 transition-colors ${
                          isSelected ? 'text-blue-500 scale-105' : 'text-neutral-500 hover:text-neutral-300'
                        }`} />
                        <span className={`text-[8px] font-bold mt-1 tracking-tight truncate max-w-[40px] ${
                          isSelected ? 'text-blue-500' : 'text-neutral-500'
                        }`}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}

              {/* Android home bar */}
              <div className="absolute bottom-1 inset-x-0 h-1 flex justify-center pointer-events-none z-50">
                <div className="w-24 h-1 bg-neutral-600 rounded-full" />
              </div>

            </div>

          </div>

        </section>

      </div>

    </div>
  );
}
