import React, { useState } from 'react';
import { ChevronLeft, Download, Share2, Smartphone, AlertTriangle, CheckCircle2, ShieldAlert, Terminal, Copy, Check } from 'lucide-react';
import { DeviceSettings } from '../types';
import { shareContent, generateInviteMessage } from '../utils/share';

interface AppDownloadPageProps {
  settings: DeviceSettings;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
  onBack: () => void;
}

export default function AppDownloadPage({
  settings,
  lang,
  theme,
  onBack,
}: AppDownloadPageProps) {
  const isDark = theme === 'dark';
  const [downloading, setDownloading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Validate if a valid external or local build artifact URL is configured
  const isValidApkUrl = (url?: string) => {
    if (!url) return false;
    const trimmed = url.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');
  };

  const hasApkUrl = isValidApkUrl(settings.apkDownloadLink);

  const handleDownloadAPK = () => {
    if (!hasApkUrl || !settings.apkDownloadLink) return;

    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setCompleted(true);

      try {
        window.open(settings.apkDownloadLink, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.error("Failed to open APK URL", e);
      }

      setTimeout(() => {
        setCompleted(false);
      }, 3000);
    }, 1200);
  };

  const handleShareOnWhatsApp = () => {
    const inviteMsg = generateInviteMessage(settings.appDownloadLink);
    shareContent(inviteMsg, 'whatsapp');
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const txt = {
    en: {
      header: "App Download & Build",
      title: "Pintu Offline Android App",
      subtitle: "Native Android SDK 35 application for physical Bluetooth Classic and Wi-Fi Direct peer mesh.",
      sectionApk: "Android APK Build Artifact",
      downloadApkBtn: "DOWNLOAD APK",
      downloading: "Preparing Download...",
      complete: "Download Started!",
      sectionShare: "Share App via WhatsApp",
      shareWaBtn: "SHARE APP / WHATSAPP",
      shareNote: "Opens Android share sheet with WhatsApp contact picker to share the public download URL.",
      buildWorkflowTitle: "Gradle APK Build Workflow:",
      debugBuildCmd: "cd android && ./gradlew assembleDebug",
      releaseBuildCmd: "cd android && ./gradlew assembleRelease",
      aabBuildCmd: "cd android && ./gradlew bundleRelease",
      aabTitle: "Google Play Store (AAB):",
      aabDesc: "Builds signed Android App Bundle (AAB) for Google Play Console publishing.",
      appDownloadLinkInfo: "Public App URL:",
      apkDownloadLinkInfo: "Artifact Build URL:"
    },
    te: {
      header: "యాప్ డౌన్‌లోడ్ & బిల్డ్",
      title: "పింటు ఆఫ్‌లైన్ ఆండ్రాయిడ్ యాప్",
      subtitle: "భౌతిక బ్లూటూత్ మరియు వై-ఫై డైరెక్ట్ మెష్ కోసం స్థానిక ఆండ్రాయిడ్ SDK 35 యాప్.",
      sectionApk: "ఆండ్రాయిడ్ APK బిల్డ్ ఆర్టిఫాక్ట్",
      downloadApkBtn: "DOWNLOAD APK",
      downloading: "డౌన్‌లోడ్ సిద్ధమవుతోంది...",
      complete: "డౌన్‌లోడ్ ప్రారంభమైంది!",
      sectionShare: "వాట్సాప్ ద్వారా షేర్ చేయండి",
      shareWaBtn: "యాప్ షేర్ చేయండి / వాట్సాప్",
      shareNote: "వాట్సాప్ కాంటాక్ట్ పికర్ మరియు ఆండ్రాయిడ్ షేర్ షీట్‌ను తెరుస్తుంది.",
      buildWorkflowTitle: "Gradle APK బిల్డ్ విధానం:",
      debugBuildCmd: "cd android && ./gradlew assembleDebug",
      releaseBuildCmd: "cd android && ./gradlew assembleRelease",
      aabBuildCmd: "cd android && ./gradlew bundleRelease",
      aabTitle: "గూగుల్ ప్లే స్టోర్ (AAB):",
      aabDesc: "గూగుల్ ప్లే కోసం ఆండ్రాయిడ్ యాప్ బండిల్ (AAB) రూపొందిస్తుంది.",
      appDownloadLinkInfo: "పబ్లిక్ యాప్ URL:",
      apkDownloadLinkInfo: "ఆర్టిఫాక్ట్ బిల్డ్ URL:"
    }
  }[lang];

  return (
    <div
      id="app-download-page-screen"
      className={`flex flex-col h-full justify-between p-4 overflow-y-auto ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      {/* Back button and Header */}
      <div className="flex items-center gap-2 border-b border-neutral-100/10 pb-2 mb-2">
        <button
          id="btn-download-page-back"
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-neutral-800/10 cursor-pointer"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>
        <span className="text-xs font-black uppercase tracking-wider text-neutral-400">{txt.header}</span>
      </div>

      {/* Main Banner */}
      <div className="text-center flex flex-col items-center gap-1 my-1">
        <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-400">
          <Smartphone className="h-7 w-7" />
        </div>
        <h3 className="text-xs font-black tracking-tight leading-none text-white">{txt.title}</h3>
        <p className="text-[9.5px] text-neutral-400 leading-normal max-w-[240px] mx-auto mt-0.5">
          {txt.subtitle}
        </p>
      </div>

      {/* Configured Links Preview info card */}
      <div className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 my-1.5 text-[9px] font-bold ${
        isDark ? 'bg-neutral-900/30 border-neutral-800/60' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <div className="flex flex-col">
          <span className="text-neutral-500 uppercase">{txt.appDownloadLinkInfo}</span>
          <span className="text-blue-400 truncate font-mono">{settings.appDownloadLink || 'https://play.google.com/store/apps/details?id=com.pintu.offline'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-neutral-500 uppercase">{txt.apkDownloadLinkInfo}</span>
          <span className="text-neutral-300 truncate font-mono">
            {hasApkUrl && settings.apkDownloadLink ? settings.apkDownloadLink : 'Built locally via Gradle (app-debug.apk)'}
          </span>
        </div>
      </div>

      {/* Section 1: Android APK Download */}
      <div className={`p-3 rounded-2xl border flex flex-col gap-2.5 my-1.5 text-left ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
          <Download className="h-3.5 w-3.5 text-blue-400" />
          {txt.sectionApk}
        </h4>

        {hasApkUrl ? (
          completed ? (
            <div className="w-full py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-black flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 animate-bounce" />
              <span>{txt.complete}</span>
            </div>
          ) : downloading ? (
            <div className="w-full py-2.5 rounded-xl bg-neutral-800 text-neutral-400 text-[11px] font-black flex items-center justify-center gap-2 animate-pulse">
              <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-neutral-400 animate-spin" />
              <span>{txt.downloading}</span>
            </div>
          ) : (
            <button
              id="btn-download-apk-action"
              onClick={handleDownloadAPK}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
            >
              <Download className="h-4 w-4" />
              <span>{txt.downloadApkBtn}</span>
            </button>
          )
        ) : (
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-left space-y-1">
            <span className="text-[9.5px] font-black text-blue-400 block">{txt.buildWorkflowTitle}</span>
            <div className="space-y-1 pt-1 font-mono text-[8.5px]">
              <div
                onClick={() => handleCopyCommand(txt.debugBuildCmd)}
                className="p-1.5 rounded bg-black/60 border border-neutral-800 flex items-center justify-between text-neutral-300 hover:text-white cursor-pointer"
                title="Copy Debug APK build command"
              >
                <span>{txt.debugBuildCmd}</span>
                {copiedCmd === txt.debugBuildCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-neutral-500" />}
              </div>
              <div
                onClick={() => handleCopyCommand(txt.releaseBuildCmd)}
                className="p-1.5 rounded bg-black/60 border border-neutral-800 flex items-center justify-between text-neutral-300 hover:text-white cursor-pointer"
                title="Copy Release APK build command"
              >
                <span>{txt.releaseBuildCmd}</span>
                {copiedCmd === txt.releaseBuildCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-neutral-500" />}
              </div>
            </div>
            <span className="text-[8px] text-neutral-400 block pt-1">
              Artifact: <code className="text-neutral-300">android/app/build/outputs/apk/debug/app-debug.apk</code>
            </span>
          </div>
        )}
      </div>

      {/* Section 2: Google Play AAB Workflow */}
      <div className={`p-3 rounded-2xl border flex flex-col gap-2 my-1.5 text-left ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          {txt.aabTitle}
        </h4>
        <p className="text-[8.5px] text-neutral-300">
          {txt.aabDesc}
        </p>
        <div
          onClick={() => handleCopyCommand(txt.aabBuildCmd)}
          className="p-1.5 rounded bg-black/60 border border-neutral-800 flex items-center justify-between text-neutral-300 font-mono text-[8.5px] hover:text-white cursor-pointer"
          title="Copy AAB bundle command"
        >
          <span>{txt.aabBuildCmd}</span>
          {copiedCmd === txt.aabBuildCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-neutral-500" />}
        </div>
      </div>

      {/* Section 3: WhatsApp Share App */}
      <div className={`p-3 rounded-2xl border flex flex-col gap-2 my-1.5 text-left ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
      }`}>
        <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
          <Share2 className="h-3.5 w-3.5 text-emerald-400" />
          {txt.sectionShare}
        </h4>
        <p className="text-[8.5px] text-neutral-400">
          {txt.shareNote}
        </p>

        <button
          id="btn-share-app-whatsapp"
          onClick={handleShareOnWhatsApp}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
        >
          <Share2 className="h-4 w-4" />
          <span>{txt.shareWaBtn}</span>
        </button>
      </div>

    </div>
  );
}
