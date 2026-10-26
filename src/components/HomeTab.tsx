import React from 'react';
import { motion } from 'motion/react';
import { Radio, Smartphone, MessageSquare, FileDown, PhoneCall, Video, Settings, Wifi, Download, Share2, FileText, MapPin, Phone, Mail, Bluetooth, ShieldAlert, AlertCircle } from 'lucide-react';
import { Device, DeviceSettings } from '../types';

interface HomeTabProps {
  devices: Device[];
  settings: DeviceSettings;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
  onNavigateToTab: (tab: string) => void;
  onStartScan: () => void;
}

export default function HomeTab({
  devices,
  settings,
  lang,
  theme,
  onNavigateToTab,
  onStartScan,
}: HomeTabProps) {
  const isDark = theme === 'dark';
  const isNative = typeof window !== 'undefined' && ((window as any).PintuNative !== undefined || (window as any).AndroidNative !== undefined);

  const connectedDevicesCount = devices.filter(d => d.isConnected).length;
  const discoveredDevicesCount = devices.length;

  // Language mapping
  const txt = {
    en: {
      offlineMode: "Offline Mode",
      internetNotRequired: "INTERNET NOT REQUIRED",
      nativeRequiredTitle: "Native Android Required",
      nativeRequiredDesc: "Browser previews cannot access device Bluetooth or Wi-Fi Direct radios. Install the Pintu Offline APK on Android to connect with nearby devices.",
      connected: "Connected",
      disconnected: "Disconnected",
      noConnection: "No physical connection",
      btStatus: "Bluetooth Radio",
      wifiStatus: "Wi-Fi Direct P2P",
      devicesDiscovered: `${discoveredDevicesCount} device${discoveredDevicesCount === 1 ? '' : 's'} discovered`,
      devicesConnected: `${connectedDevicesCount} active peer link${connectedDevicesCount === 1 ? '' : 's'}`,
      nearby: "Nearby",
      chat: "Chat",
      files: "Files",
      voice: "Voice Call",
      video: "Video Call",
      settings: "Settings",
      scanBtn: "SCAN NEARBY DEVICES",
      inviteDownload: "Invite & Download Pintu",
      inviteSub: "Share APK or Invite on WhatsApp",
      formsTitle: "📝 Offline Google Forms",
      formsSub: "Sync Google Forms & collect survey responses offline",
      supportTitle: "🏢 Office Location & Support",
      addressLabel: "Kakinada Turangi Address:",
      addressVal: "Turangi, Kakinada, Andhra Pradesh - 533016",
      supportLabel: "Customer Support / WhatsApp:",
      callSupport: "📞 Call 8977776111",
      waSupport: "💬 WhatsApp",
      emailLabel: "Support Email ID:"
    },
    te: {
      offlineMode: "ఆఫ్‌లైన్ మోడ్",
      internetNotRequired: "ఇంటర్నెట్ అవసరం లేదు",
      nativeRequiredTitle: "ఆండ్రాయిడ్ యాప్ అవసరం",
      nativeRequiredDesc: "బ్రౌజర్ ప్రివ్యూలో బ్లూటూత్ లేదా వై-ఫై రేడియోలు పనిచేయవు. సమీప పరికరాలతో కనెక్ట్ కావడానికి పింటు APKని ఆండ్రాయిడ్ ఫోన్‌లో ఇన్స్టాల్ చేయండి.",
      connected: "కనెక్ట్ అయింది",
      disconnected: "డిస్‌కనెక్ట్ అయింది",
      noConnection: "భౌతిక కనెక్షన్ లేదు",
      btStatus: "బ్లూటూత్ రేడియో",
      wifiStatus: "వై-ఫై డైరెక్ట్",
      devicesDiscovered: `${discoveredDevicesCount} పరికరాలు కనుగొనబడ్డాయి`,
      devicesConnected: `${connectedDevicesCount} కనెక్ట్ చేయబడ్డాయి`,
      nearby: "దగ్గరలో ఉన్నవారు",
      chat: "చాట్",
      files: "ఫైల్స్",
      voice: "వాయిస్ కాల్",
      video: "వీడియో కాల్",
      settings: "సెట్టింగ్స్",
      scanBtn: "సమీప పరికరాలను స్కాన్ చేయండి",
      inviteDownload: "పింటుని ఆహ్వానించండి & డౌన్‌లోడ్ చేయండి",
      inviteSub: "APK పంచుకోండి లేదా వాట్సాప్‌లో ఆహ్వానించండి",
      formsTitle: "📝 ఆఫ్‌లైన్ గూగుల్ ఫారమ్‌లు",
      formsSub: "గూగుల్ ఫారమ్‌లను డౌన్‌లోడ్ చేసి ఆఫ్‌లైన్‌లో నింపండి",
      supportTitle: "🏢 ఆఫీస్ చిరునామా & సపోర్ట్",
      addressLabel: "కాకినాడ తురంగి చిరునామా:",
      addressVal: "తురంగి, కాకినాడ, ఆంధ్రప్రదేశ్ - 533016",
      supportLabel: "కస్టమర్ కేర్ కాల్స్ / వాట్సాప్:",
      callSupport: "📞 కాల్ 8977776111",
      waSupport: "💬 వాట్సాప్",
      emailLabel: "సపోర్ట్ ఈమెయిల్ ఐడి:"
    }
  }[lang];

  return (
    <div
      id="home-tab-container"
      className={`flex flex-col h-full justify-between p-4 overflow-y-auto ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      {/* Top Banner indicating offline capability */}
      <div className="flex items-center justify-between mb-3 border-b border-neutral-100/10 pb-2">
        <div className="flex items-center gap-1.5">
          <Smartphone className={`h-4.5 w-4.5 ${isDark ? 'text-blue-400' : 'text-indigo-600'}`} />
          <span className="text-[10px] font-black tracking-wider uppercase">
            {txt.offlineMode}
          </span>
        </div>
        <span className="text-[9px] bg-emerald-500/15 text-emerald-500 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
          {txt.internetNotRequired}
        </span>
      </div>

      {/* Clear Native Android Required Banner when running in web preview */}
      {!isNative ? (
        <div className="p-3 mb-3 text-left rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">
              {txt.nativeRequiredTitle}
            </span>
          </div>
          <p className="text-[9.5px] text-neutral-300 font-medium leading-relaxed mt-1.5">
            {txt.nativeRequiredDesc}
          </p>
        </div>
      ) : null}

      {/* Main Connection Status Card */}
      <div
        id="home-connection-card"
        className={`p-3.5 rounded-2xl border flex items-center justify-between mb-3 ${
          isDark
            ? connectedDevicesCount > 0
              ? 'bg-emerald-950/20 border-emerald-500/30 shadow-sm'
              : 'bg-neutral-900/50 border-neutral-800 shadow-sm'
            : connectedDevicesCount > 0
              ? 'bg-emerald-50 border-emerald-100 shadow-sm'
              : 'bg-neutral-50 border-neutral-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center border ${
            connectedDevicesCount > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400'
          }`}>
            <Wifi className="h-5 w-5" />
            {connectedDevicesCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-left">
            <h3 className={`text-xs font-black leading-none ${
              connectedDevicesCount > 0 ? 'text-emerald-500' : 'text-neutral-300'
            }`}>
              {connectedDevicesCount > 0 ? txt.connected : txt.disconnected}
            </h3>
            <p className={`text-[10px] font-bold mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {connectedDevicesCount > 0
                ? txt.devicesConnected
                : isNative
                  ? txt.noConnection
                  : txt.devicesDiscovered}
            </p>
          </div>
        </div>

        {/* Hardware Status Indicators */}
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${
            settings.bluetoothEnabled
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-neutral-800 border-neutral-700 text-neutral-500'
          }`} title={txt.btStatus}>
            <Bluetooth className="h-3.5 w-3.5" />
          </div>
          <div className={`p-1.5 rounded-lg border ${
            settings.wifiDirectEnabled
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-neutral-800 border-neutral-700 text-neutral-500'
          }`} title={txt.wifiStatus}>
            <Wifi className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Promo Banner for App Invite & Download Section */}
      <button
        id="home-promo-download-invite"
        onClick={() => onNavigateToTab('app-download-page')}
        className={`p-3 rounded-2xl border flex items-center justify-between text-left cursor-pointer transition-colors w-full mb-2 ${
          isDark 
            ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-white' 
            : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">{txt.inviteDownload}</h4>
            <p className="text-[9px] text-neutral-400 font-bold mt-0.5">{txt.inviteSub}</p>
          </div>
        </div>
        <span className="text-xs text-emerald-400 font-black">&gt;</span>
      </button>

      {/* Promo Banner for Google Forms Link */}
      <button
        id="home-promo-google-forms"
        onClick={() => onNavigateToTab('forms')}
        className={`p-3 rounded-2xl border flex items-center justify-between text-left cursor-pointer transition-colors w-full mb-3 ${
          isDark 
            ? 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-white' 
            : 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-wider">
              {txt.formsTitle}
            </h4>
            <p className="text-[9px] text-neutral-400 font-bold mt-0.5">
              {txt.formsSub}
            </p>
          </div>
        </div>
        <span className="text-xs text-blue-400 font-black">&gt;</span>
      </button>

      {/* Office Address & Customer Support Card */}
      <div className={`p-3 rounded-2xl border text-left flex flex-col gap-2 mb-3.5 ${
        isDark ? 'bg-indigo-950/20 border-indigo-500/20 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-800'
      }`}>
        <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
          {txt.supportTitle}
        </span>
        
        <div className="space-y-1.5 text-[9.5px]">
          {/* Physical Address */}
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-neutral-300">
                {txt.addressLabel}
              </span>
              <span className="font-semibold text-neutral-400 block leading-tight">
                {txt.addressVal}
              </span>
            </div>
          </div>

          {/* Customer Calls Contact */}
          <div className="flex items-start gap-2">
            <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-neutral-300">
                {txt.supportLabel}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href="tel:8977776111"
                  className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-black transition-all cursor-pointer"
                >
                  {txt.callSupport}
                </a>
                <a
                  href="https://wa.me/918977776111?text=Hello%20Pintu%20Offline%20Support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold transition-all cursor-pointer"
                >
                  {txt.waSupport}
                </a>
              </div>
            </div>
          </div>

          {/* Support Email */}
          <div className="flex items-start gap-2">
            <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-neutral-300">
                {txt.emailLabel}
              </span>
              <a
                href="mailto:injarapusivaraghava@gmail.com"
                className="font-semibold text-blue-400 hover:underline leading-none mt-0.5 block"
              >
                injarapusivaraghava@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2x3 Grid Feature Navigation Buttons */}
      <div id="home-features-grid" className="grid grid-cols-2 gap-3 mb-4">
        
        {/* Card 1: Nearby */}
        <button
          id="feat-btn-nearby"
          onClick={() => onNavigateToTab('radar')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-white'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <span className="text-xs font-bold">{txt.nearby}</span>
        </button>

        {/* Card 2: Chat */}
        <button
          id="feat-btn-chat"
          onClick={() => onNavigateToTab('chat')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-white'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold">{txt.chat}</span>
        </button>

        {/* Card 3: Files */}
        <button
          id="feat-btn-files"
          onClick={() => onNavigateToTab('files')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-white'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <FileDown className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold">{txt.files}</span>
        </button>

        {/* Card 4: Voice Call */}
        <button
          id="feat-btn-voice"
          onClick={() => onNavigateToTab('calls')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-white'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <PhoneCall className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold">{txt.voice}</span>
        </button>

        {/* Card 5: Video Call */}
        <button
          id="feat-btn-video"
          onClick={() => onNavigateToTab('calls')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-white'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <Video className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold">{txt.video}</span>
        </button>

        {/* Card 6: Settings */}
        <button
          id="feat-btn-settings"
          onClick={() => onNavigateToTab('settings')}
          className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-white'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-blue-600/10 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <Settings className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold">{txt.settings}</span>
        </button>

      </div>

      {/* Large Bottom Scan Pill Button */}
      <div className="mt-2 pb-1">
        <button
          id="btn-scan-nearby"
          onClick={() => {
            onStartScan();
            onNavigateToTab('radar');
          }}
          className="w-full py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs tracking-wider transition-all active:scale-98 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <Radio className="h-4 w-4" />
          {txt.scanBtn}
        </button>
      </div>
    </div>
  );
}
