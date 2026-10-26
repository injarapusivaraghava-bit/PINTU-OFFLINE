import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  RefreshCw,
  CheckCircle,
  Wifi,
  Bluetooth,
  Loader2,
  AlertTriangle,
  QrCode,
  Scan,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Smartphone
} from 'lucide-react';
import { Device } from '../types';
import QRCodeHandshake from './QRCodeHandshake';

interface RadarScannerProps {
  devices: Device[];
  onToggleBluetoothPair: (id: string) => void;
  onToggleWifiDirect: (id: string) => void;
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
  runMode?: 'simulation' | 'production';
  myDeviceId?: string;
  myDeviceName?: string;
  onNavigateToTab?: (tab: string) => void;
  onPeerConnected?: (peer: { id: string; name: string; idNumber: string }) => void;
}

export default function RadarScanner({
  devices,
  onToggleBluetoothPair,
  onToggleWifiDirect,
  isScanning,
  onStartScan,
  onStopScan,
  lang,
  theme,
  myDeviceId = 'dev-pintu-self',
  myDeviceName = "Pintu User's Phone",
  onNavigateToTab,
  onPeerConnected
}: RadarScannerProps) {
  const isDark = theme === 'dark';

  // Toggle between classic radar sweep and QR code P2P handshake
  const [activeView, setActiveView] = useState<'radar' | 'qr'>('radar');

  const isNative =
    typeof window !== 'undefined' &&
    ((window as any).AndroidNative !== undefined || (window as any).PintuNative !== undefined);

  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnectClick = (id: string) => {
    setConnectingId(id);
    if (isNative) {
      const nativeObj = (window as any).AndroidNative || (window as any).PintuNative;
      if (nativeObj?.connectToDevice) {
        nativeObj.connectToDevice(id);
      }
    }
    onToggleBluetoothPair(id);
    setTimeout(() => {
      setConnectingId(null);
    }, 1200);
  };

  const handleQrHandshakeCompleted = (peer: { id: string; name: string; idNumber: string }) => {
    if (onPeerConnected) {
      onPeerConnected(peer);
    }
  };

  const txt = {
    en: {
      title: "Nearby Devices",
      radarTab: "Radar Sweeper",
      qrTab: "QR Handshake",
      scanning: "Scanning...",
      stopScan: "STOP SCAN",
      startScan: "START SCAN",
      connect: "CONNECT / PAIR",
      connecting: "Connecting...",
      connected: "CONNECTED",
      disconnect: "DISCONNECT",
      qrBannerTitle: "Instant QR P2P Handshake",
      qrBannerSub: "Zero-wait pairing: scan or display device QR code",
      nativeNoticeTitle: "Native Android Required",
      nativeNoticeDesc: "Raw Bluetooth Classic RFCOMM and Wi-Fi Direct transceivers are disabled in browser environments. Install and launch the Pintu Offline APK on your Android phones to scan and discover real physical devices.",
      noDevicesFound: "No nearby devices found yet. Tap START SCAN to search for active Bluetooth Classic / Wi-Fi Direct devices, or use QR Handshake to pair.",
      activePeersHeader: "Discovered Devices:"
    },
    te: {
      title: "దగ్గరలో ఉన్నవారు",
      radarTab: "రేడార్ స్వీపర్",
      qrTab: "క్యూఆర్ హ్యాండ్‌షేక్",
      scanning: "స్కాన్ చేస్తోంది...",
      stopScan: "స్కాన్ ఆపండి",
      startScan: "స్కాన్ చేయండి",
      connect: "కనెక్ట్ / పెయిర్",
      connecting: "కనెక్ట్ అవుతోంది...",
      connected: "కనెక్ట్ అయింది",
      disconnect: "డిస్‌కనెక్ట్",
      qrBannerTitle: "తక్షణ క్యూఆర్ P2P హ్యాండ్‌షేక్",
      qrBannerSub: "వెంటనే కనెక్ట్ కావడానికి క్యూఆర్ కోడ్‌ను స్కాన్ చేయండి",
      nativeNoticeTitle: "ఆండ్రాయిడ్ యాప్ అవసరం",
      nativeNoticeDesc: "బ్రౌజర్ ప్రివ్యూలలో బ్లూటూత్ RFCOMM మరియు వై-ఫై డైరెక్ట్ పనిచేయవు. సమీప పరికరాలను కనుగొనడానికి ఆండ్రాయిడ్ APKని ఇన్స్టాల్ చేయండి.",
      noDevicesFound: "పరికరాలు ఏవీ కనుగొనబడలేదు. స్కాన్ చేయడానికి 'స్కాన్ చేయండి' నొక్కండి లేదా క్యూఆర్ హ్యాండ్‌షేక్ ఉపయోగించండి.",
      activePeersHeader: "కనుగొనబడిన పరికరాలు:"
    }
  }[lang];

  return (
    <div
      id="radar-screen-container"
      className={`flex flex-col h-full justify-between p-3.5 overflow-y-auto ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      {/* Top Header & Mode Toggle Switcher */}
      <div className="flex items-center justify-between border-b border-neutral-700/30 pb-2 mb-2">
        <div className="flex items-center p-0.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <button
            id="btn-switch-to-radar"
            onClick={() => setActiveView('radar')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'radar'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>{txt.radarTab}</span>
          </button>

          <button
            id="btn-switch-to-qr"
            onClick={() => setActiveView('qr')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'qr'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3 h-3 text-cyan-400" />
            <span>{txt.qrTab}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        <span className="text-[9.5px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-extrabold border border-blue-500/20">
          {activeView === 'qr' ? 'P2P Ready' : isScanning ? txt.scanning : `${devices.length} Found`}
        </span>
      </div>

      {/* Main View Switcher: Classic Radar Sweep vs QR Handshake */}
      {activeView === 'qr' ? (
        <div className="flex-1 overflow-hidden">
          <QRCodeHandshake
            myDeviceId={myDeviceId}
            myDeviceName={myDeviceName}
            lang={lang}
            theme={theme}
            onHandshakeSuccess={handleQrHandshakeCompleted}
            onNavigateToTab={onNavigateToTab}
            onClose={() => setActiveView('radar')}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Quick Instant P2P QR Handshake Callout Banner */}
          <button
            id="btn-banner-instant-qr"
            onClick={() => setActiveView('qr')}
            className="w-full py-2 px-3 mb-2 rounded-xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-cyan-600/20 hover:from-blue-600/30 hover:via-indigo-600/30 hover:to-cyan-600/30 border border-blue-500/30 flex items-center justify-between text-left transition-all cursor-pointer group shadow-sm shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow group-hover:scale-105 transition-transform">
                <QrCode className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-white block leading-tight flex items-center gap-1.5">
                  {txt.qrBannerTitle}
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-extrabold border border-emerald-500/30">
                    INSTANT
                  </span>
                </span>
                <span className="text-[8.5px] text-neutral-400 font-medium block">
                  {txt.qrBannerSub}
                </span>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>

          {/* Animated Circular Radar Sweeper Area */}
          <div className="flex-1 flex items-center justify-center relative min-h-[140px] my-1">
            <div className="relative w-36 h-36 rounded-full border border-neutral-800/80 bg-neutral-900/30 flex items-center justify-center overflow-hidden shadow-inner">
              {/* Sweeping radar effect */}
              {isScanning && (
                <motion.div
                  id="radar-laser-sweep"
                  className="absolute inset-0 origin-center bg-gradient-to-tr from-blue-500/15 via-transparent to-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                />
              )}

              {/* Concentric circles */}
              <div className="absolute w-26 h-26 rounded-full border border-dashed border-blue-500/15 pointer-events-none" />
              <div className="absolute w-16 h-16 rounded-full border border-blue-500/10 pointer-events-none" />

              {/* Crosshair lines */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-800/40 pointer-events-none" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-800/40 pointer-events-none" />

              {/* Center Dot representing Self */}
              <div className="relative z-10 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-4 border-neutral-950 shadow-md">
                <Radio className="h-3 w-3 text-white" />
              </div>

              {/* Placed target nodes floating in the radar */}
              {devices.map((dev, idx) => {
                const positions = [
                  { x: -36, y: -22 },
                  { x: 36, y: 26 },
                  { x: -8, y: 38 },
                  { x: 18, y: -36 }
                ];
                const p = positions[idx % positions.length] || { x: 0, y: 0 };
                const isConnected = dev.isPaired || dev.isConnectedWifi;

                return (
                  <motion.div
                    key={dev.id}
                    className="absolute z-20"
                    style={{
                      left: `calc(50% + ${p.x}px - 7px)`,
                      top: `calc(50% + ${p.y}px - 7px)`,
                    }}
                    animate={
                      isScanning
                        ? {
                            scale: [1, 1.15, 1],
                            opacity: [0.8, 1, 0.8]
                          }
                        : {}
                    }
                    transition={{ repeat: Infinity, duration: 1.5, delay: idx * 0.4 }}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white shadow-sm ${
                        isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-blue-400'
                      }`}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Device list or honest empty state */}
          <div id="radar-peers-scroller" className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {devices.length > 0 ? (
              devices.map(dev => {
                const isConnected = dev.isPaired || dev.isConnectedWifi;
                const isConnecting = connectingId === dev.id;

                return (
                  <div
                    key={dev.id}
                    id={`device-row-${dev.id}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isConnected
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : isDark
                        ? 'bg-neutral-900/40 border-neutral-800'
                        : 'bg-neutral-50 border-neutral-100'
                    }`}
                  >
                    <div className="text-left">
                      <span className="font-extrabold text-xs block leading-none">{dev.name}</span>
                      <span
                        className={`text-[9px] mt-1 block font-bold ${
                          isDark ? 'text-blue-400' : 'text-blue-600'
                        }`}
                      >
                        {dev.macAddress || dev.id}
                      </span>
                      <span
                        className={`text-[9.5px] mt-0.5 block font-semibold ${
                          isDark ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      >
                        {dev.distance ? `${dev.distance}m away` : 'Nearby'} • {isConnected ? 'Connected' : 'Available'}
                      </span>
                    </div>

                    <button
                      id={`btn-connect-${dev.id}`}
                      onClick={() => handleConnectClick(dev.id)}
                      className={`text-[9.5px] font-extrabold px-3 py-1.5 rounded-xl border tracking-wide transition-all cursor-pointer ${
                        isConnected
                          ? 'bg-emerald-500 text-white border-transparent hover:bg-rose-600'
                          : isConnecting
                          ? 'bg-neutral-800 text-neutral-400 border-neutral-700 cursor-wait'
                          : 'bg-blue-600 text-white border-transparent hover:bg-blue-700'
                      }`}
                    >
                      {isConnected && txt.disconnect}
                      {isConnecting && (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {txt.connecting}
                        </span>
                      )}
                      {!isConnected && !isConnecting && txt.connect}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-left">
                {!isNative ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {txt.nativeNoticeTitle}
                      </span>
                    </div>
                    <p className="text-[9px] text-neutral-300 leading-relaxed">
                      {txt.nativeNoticeDesc}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-400 text-center py-2">
                    {txt.noDevicesFound}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bottom controller button for starting/stopping scanning sweeps */}
          <div className="mt-2 pt-1">
            <button
              id="btn-scan-nearby-radar"
              onClick={isScanning ? onStopScan : onStartScan}
              className={`w-full py-2.5 rounded-full text-xs font-black tracking-wider transition-all active:scale-95 cursor-pointer shadow-md ${
                isScanning
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isScanning ? txt.stopScan : txt.startScan}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
