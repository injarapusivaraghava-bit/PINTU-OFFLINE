import React from 'react';
import { User, Shield, Lock, Bell, Eye, Database, Info, Moon, Volume2, Key, Radio, Link, Share2, Download, MapPin, Phone, Mail } from 'lucide-react';
import { DeviceSettings } from '../types';
import { shareContent, generateInviteMessage } from '../utils/share';

interface SettingsTabProps {
  settings: DeviceSettings;
  onUpdateSettings: (newSettings: Partial<DeviceSettings>) => void;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
  onToggleTheme?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function SettingsTab({
  settings,
  onUpdateSettings,
  lang,
  theme,
  onToggleTheme,
  onNavigateToTab,
}: SettingsTabProps) {
  const isDark = theme === 'dark';

  const txt = {
    en: {
      title: "Settings",
      account: "Account",
      privacy: "Privacy",
      security: "Security",
      notifs: "Notifications",
      appearance: "Appearance",
      data: "Data Usage",
      about: "About Pintu",
      darkMode: "Dark Mode",
      appLock: "App Lock",
      nearby: "Nearby Discovery",
      sound: "Sound",
      vibration: "Vibration",
      autoAccept: "Auto Accept Files",
      appVer: "Pintu Offline v1.0.4 (Development)",
      downloadConfig: "Share & Download Config",
      appLink: "App Download Link",
      apkLink: "APK Download URL",
      shareWhatsApp: "Share Pintu on WhatsApp",
      placeholderApp: "Enter App download link",
      placeholderApk: "Enter APK download URL",
      appLockNotif: "Configure App lock PIN inside Security panel."
    },
    te: {
      title: "సెట్టింగ్స్",
      account: "ఖాతా",
      privacy: "గోప్యత",
      security: "భద్రత",
      notifs: "నోటిఫికేషన్‌లు",
      appearance: "రూపకల్పన",
      data: "డేటా వినియోగం",
      about: "పింటు గురించి",
      darkMode: "డార్క్ మోడ్",
      appLock: "యాప్ లాక్",
      nearby: "సమీప ఆవిష్కరణ",
      sound: "ధ్వని",
      vibration: "వైబ్రేషన్",
      autoAccept: "ఆటో యాక్సెప్ట్ ఫైల్స్",
      appVer: "పింటు ఆఫ్‌లైన్ v1.0.4 (అభివృద్ధి)",
      downloadConfig: "షేర్ & డౌన్‌లోడ్ కాన్ఫిగ్",
      appLink: "యాప్ డౌన్‌లోడ్ లింక్",
      apkLink: "APK డౌన్‌లోడ్ URL",
      shareWhatsApp: "వాట్సాప్‌లో పింటుని షేర్ చేయండి",
      placeholderApp: "యాప్ డౌన్‌లోడ్ లింక్ నమోదు చేయండి",
      placeholderApk: "APK డౌన్‌లోడ్ URL నమోదు చేయండి",
      appLockNotif: "భద్రతా ప్యానెల్ లోపల యాప్ లాక్ పిన్‌ను కాన్ఫిగర్ చేయండి."
    }
  }[lang];

  return (
    <div
      id="settings-tab-container"
      className={`flex flex-col gap-4 p-4 rounded-2xl h-full overflow-y-auto ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      <div className="border-b border-neutral-100 pb-2">
        <h3 className="font-extrabold text-sm">{txt.title}</h3>
      </div>

      {/* Row Menus */}
      <div className="space-y-1.5">
        {[
          { icon: User, label: txt.account },
          { icon: Shield, label: txt.privacy },
          { icon: Lock, label: txt.security },
          { icon: Bell, label: txt.notifs },
          { icon: Eye, label: txt.appearance },
          { icon: Database, label: txt.data },
          { icon: Info, label: txt.about },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all hover:bg-neutral-900/5 cursor-pointer ${
              isDark ? 'bg-neutral-900/40 border-neutral-800/80' : 'bg-neutral-50 border-neutral-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className={`h-4.5 w-4.5 ${isDark ? 'text-blue-400' : 'text-indigo-600'}`} />
              <span className="text-xs font-bold">{item.label}</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-bold">&gt;</span>
          </div>
        ))}
      </div>

      {/* Toggles Container */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200/50'
      }`}>
        <h4 className="text-[10px] uppercase font-black text-neutral-400 tracking-wider mb-3">Toggles</h4>
        
        <div className="space-y-3.5">
          {/* Dark Mode toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-2">
              <Moon className="h-4 w-4 text-blue-400" />
              {txt.darkMode}
            </span>
            <button
              id="toggle-dark-mode"
              onClick={onToggleTheme}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-all cursor-pointer ${
                isDark ? 'bg-blue-500 flex justify-end' : 'bg-neutral-300 flex justify-start'
              }`}
            >
              <div className="w-4.5 h-4.5 bg-white rounded-full shadow" />
            </button>
          </div>

          {/* App Lock Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500" />
              {txt.appLock}
            </span>
            <button
              id="toggle-app-lock"
              onClick={() => onUpdateSettings({ appLockEnabled: !settings.appLockEnabled })}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-all cursor-pointer ${
                settings.appLockEnabled ? 'bg-blue-500 flex justify-end' : 'bg-neutral-300 flex justify-start'
              }`}
            >
              <div className="w-4.5 h-4.5 bg-white rounded-full shadow" />
            </button>
          </div>

          {/* Nearby Discovery Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-500" />
              {txt.nearby}
            </span>
            <button
              id="toggle-nearby-discovery"
              onClick={() => onUpdateSettings({ discoverable: !settings.discoverable })}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-all cursor-pointer ${
                settings.discoverable ? 'bg-blue-500 flex justify-end' : 'bg-neutral-300 flex justify-start'
              }`}
            >
              <div className="w-4.5 h-4.5 bg-white rounded-full shadow" />
            </button>
          </div>

          {/* Auto Accept files toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500" />
              {txt.autoAccept}
            </span>
            <button
              id="toggle-auto-accept-files"
              onClick={() => onUpdateSettings({ autoAcceptFiles: !settings.autoAcceptFiles })}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-all cursor-pointer ${
                settings.autoAcceptFiles ? 'bg-blue-500 flex justify-end' : 'bg-neutral-300 flex justify-start'
              }`}
            >
              <div className="w-4.5 h-4.5 bg-white rounded-full shadow" />
            </button>
          </div>
        </div>
      </div>

      {/* Office Address & Customer Support Card */}
      <div className={`p-4 rounded-2xl border text-left flex flex-col gap-3 ${
        isDark ? 'bg-neutral-900/60 border-neutral-800 text-white' : 'bg-neutral-50 border-neutral-200/50 text-neutral-800'
      }`}>
        <h4 className="text-[10px] uppercase font-black text-neutral-400 tracking-wider flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-indigo-400" />
          {lang === 'en' ? 'Office Location & Support' : 'ఆఫీస్ చిరునామా & సపోర్ట్'}
        </h4>

        <div className="space-y-2 text-xs">
          {/* Physical Address */}
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-neutral-400 text-[10px] uppercase">
                {lang === 'en' ? 'Turangi Address' : 'తురంగి చిరునామా'}
              </span>
              <span className="font-bold text-neutral-200 block text-[11px] leading-snug">
                Turangi, Kakinada, Andhra Pradesh - 533016
              </span>
            </div>
          </div>

          {/* Phone / WhatsApp Contacts */}
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-neutral-400 text-[10px] uppercase">
                {lang === 'en' ? 'Direct Calls & WhatsApp' : 'డైరెక్ట్ కాల్స్ & వాట్సాప్'}
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <a
                  href="tel:8977776111"
                  className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-black transition-all cursor-pointer text-[10px]"
                >
                  📞 Call 8977776111
                </a>
                <a
                  href="https://wa.me/918977776111?text=Hello%20Pintu%20Offline%20Support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold transition-all cursor-pointer text-[10px]"
                >
                  💬 WhatsApp Support
                </a>
              </div>
            </div>
          </div>

          {/* Support Email */}
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-neutral-400 text-[10px] uppercase">
                {lang === 'en' ? 'Support Email ID' : 'సపోర్ట్ ఈమెయిల్ ఐడి'}
              </span>
              <a
                href="mailto:injarapusivaraghava@gmail.com"
                className="font-bold text-blue-400 hover:underline block text-[11px] leading-none mt-0.5"
              >
                injarapusivaraghava@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Pintu Download URLs and WhatsApp Share configuration panel */}
      <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200/50'
      }`}>
        <h4 className="text-[10px] uppercase font-black text-neutral-400 tracking-wider flex items-center gap-1.5">
          <Link className="h-3.5 w-3.5 text-blue-400" />
          {txt.downloadConfig}
        </h4>

        {/* App Download Link Input */}
        <div className="flex flex-col gap-1.5 text-xs text-left">
          <label htmlFor="input-app-download-link" className="font-bold text-neutral-400">
            {txt.appLink}
          </label>
          <input
            id="input-app-download-link"
            type="text"
            value={settings.appDownloadLink || ''}
            onChange={(e) => onUpdateSettings({ appDownloadLink: e.target.value })}
            placeholder={txt.placeholderApp}
            className={`px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:border-blue-500 transition-colors ${
              isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-800'
            }`}
          />
        </div>

        {/* APK Download Link Input */}
        <div className="flex flex-col gap-1.5 text-xs text-left">
          <label htmlFor="input-apk-download-link" className="font-bold text-neutral-400">
            {txt.apkLink}
          </label>
          <input
            id="input-apk-download-link"
            type="text"
            value={settings.apkDownloadLink || ''}
            onChange={(e) => onUpdateSettings({ apkDownloadLink: e.target.value })}
            placeholder={txt.placeholderApk}
            className={`px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:border-blue-500 transition-colors ${
              isDark ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-300 text-neutral-800'
            }`}
          />
        </div>

        {/* WhatsApp Share Button */}
        <button
          id="btn-settings-share-whatsapp"
          onClick={() => shareContent(generateInviteMessage(settings.appDownloadLink), 'whatsapp')}
          className="mt-1.5 w-full p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          <span>{txt.shareWhatsApp}</span>
        </button>
      </div>

      <div className="text-center py-2">
        <span className="text-[9px] font-semibold text-neutral-400">
          {txt.appVer}
        </span>
      </div>
    </div>
  );
}
