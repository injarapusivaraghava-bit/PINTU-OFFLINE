import React, { useState } from 'react';
import { Camera, Share2, LogIn, LogOut, CloudCheck, CloudOff, AlertCircle, ExternalLink } from 'lucide-react';
import { shareContent } from '../utils/share';
import { useFirebase } from '../context/FirebaseContext';

import { DeviceSettings } from '../types';

interface ProfileScreenProps {
  settings?: DeviceSettings;
  onUpdateSettings?: (newSettings: Partial<DeviceSettings>) => void;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
}

export default function ProfileScreen({ settings, onUpdateSettings, lang, theme }: ProfileScreenProps) {
  const isDark = theme === 'dark';
  const { user, loginWithGoogle, logout, online } = useFirebase();
  const [authError, setAuthError] = useState<{ text: string; details: string; showNewTabLink: boolean } | null>(null);

  const handleGoogleSignIn = async (useRedirect = false) => {
    setAuthError(null);
    try {
      await loginWithGoogle(useRedirect);
    } catch (err: any) {
      console.error('Google sign-in caught in Profile:', err);
      const isPopupClosed = err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user');
      const isPopupCancelled = err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request');

      if (isPopupClosed || isPopupCancelled) {
        setAuthError({
          text: lang === 'en' 
            ? 'Sign-In Popup Blocked or Closed' 
            : 'పాప్-అప్ మూసివేయబడింది లేదా బ్లాక్ చేయబడింది',
          details: lang === 'en'
            ? 'Your browser blocked the Google login pop-up inside this sandbox frame. To authenticate successfully, click "GOOGLE LOGIN (REDIRECT)" or "Open in New Tab" below.'
            : 'ఈ శాండ్‌బాక్స్ ఐఫ్రేమ్ లో గూగుల్ లాగిన్ పాప్-అప్‌ను బ్రౌజర్ బ్లాక్ చేసింది. కింద ఉన్న "గూగుల్ లాగిన్ (రీడైరెక్ట్)" లేదా "కొత్త ట్యాబ్ లో ఓపెన్ చేయి" క్లిక్ చేయండి.',
          showNewTabLink: true
        });
      } else {
        setAuthError({
          text: lang === 'en' ? 'Google Authentication Failed' : 'గూగుల్ లాగిన్ విఫలమైంది',
          details: err.message || String(err),
          showNewTabLink: true
        });
      }
    }
  };

  const handleShareId = (type: 'whatsapp' | 'native') => {
    const text = `PINTU OFFLINE PEER\n\nConnect with me nearby!\nMy Pintu ID: P12345678\nDevice: Pintu's Phone\n\nDownload Pintu to chat and transfer files offline.`;
    shareContent(text, type);
  };

  return (
    <div
      id="profile-screen-container"
      className={`flex flex-col gap-5 p-4 rounded-2xl h-full overflow-y-auto ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      <div className="text-center flex flex-col items-center mt-2">
        {/* Profile Picture with Edit Overlay */}
        <div className="relative">
          <img
            src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"}
            alt="Pintu User Profile"
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-full object-cover border-4 border-blue-500 shadow-md"
          />
          <button
            id="edit-profile-avatar-btn"
            className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 shadow border-2 border-white transition-all cursor-pointer"
          >
            <Camera className="h-3 w-3" />
          </button>
        </div>

        <h3 className="font-extrabold text-sm mt-3">
          {user ? user.displayName : (lang === 'en' ? 'Pintu User' : 'పింటు యూజర్')}
        </h3>
        <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          {user ? user.email : 'pintu_12345'}
        </p>
      </div>

      {/* Firebase Cloud Sync Card */}
      <div className={`p-3.5 rounded-2xl border flex flex-col gap-3 ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {user ? (
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <CloudCheck className="h-4 w-4" />
              </span>
            ) : (
              <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 animate-pulse">
                <CloudOff className="h-4 w-4" />
              </span>
            )}
            <div className="text-left">
              <span className="text-[10px] font-bold block leading-none">
                {lang === 'en' ? 'CLOUD BACKUPS' : 'క్లౌడ్ బ్యాకప్‌లు'}
              </span>
              <span className={`text-[9px] font-semibold block mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {user 
                  ? (lang === 'en' ? 'Synced & Secure' : 'సింక్ చేయబడింది') 
                  : (lang === 'en' ? 'Local storage only' : 'లోకల్ మాత్రమే')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-neutral-500'}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
              {online ? (lang === 'en' ? 'Online' : 'ఆన్‌లైన్') : (lang === 'en' ? 'Offline' : 'ఆఫ్‌లైన్')}
            </span>
          </div>
        </div>

        {user ? (
          <button
            id="profile-firebase-logout-btn"
            onClick={logout}
            className="w-full py-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            {lang === 'en' ? 'LOGOUT CLOUD PROFILE' : 'క్లౌడ్ ప్రొఫైల్ లాగ్ అవుట్'}
          </button>
        ) : (
          <div className="space-y-3 w-full">
            <button
              id="profile-firebase-login-btn"
              disabled={!online}
              onClick={() => handleGoogleSignIn(false)}
              className={`w-full py-2.5 rounded-xl text-white font-extrabold text-[10px] flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer ${
                online ? 'bg-blue-600 hover:bg-blue-700' : 'bg-neutral-500 cursor-not-allowed opacity-55'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              {lang === 'en' ? 'GOOGLE LOGIN (POPUP)' : 'గూగుల్ లాగిన్ (పాప్-అప్)'}
            </button>

            <button
              id="profile-firebase-login-redirect-btn"
              disabled={!online}
              onClick={() => handleGoogleSignIn(true)}
              className={`w-full py-2.5 rounded-xl text-white font-extrabold text-[10px] flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer ${
                online ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/20' : 'bg-neutral-500 cursor-not-allowed opacity-55'
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {lang === 'en' ? 'GOOGLE LOGIN (REDIRECT)' : 'గూగుల్ లాగిన్ (రీడైరెక్ట్)'}
            </button>

            {authError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left space-y-2">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-amber-400 leading-tight">
                      {authError.text}
                    </h4>
                    <p className="text-[9px] text-neutral-300 font-semibold leading-normal mt-0.5">
                      {authError.details}
                    </p>
                  </div>
                </div>

                {authError.showNewTabLink && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[9px] uppercase tracking-wider transition-colors cursor-pointer text-center"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {lang === 'en' ? 'Open in New Tab' : 'కొత్త ట్యాబ్ లో ఓపెన్ చేయి'}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Device Specifications Table Grid */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50 border-neutral-200/50'
      }`}>
        <div className="grid grid-cols-2 gap-y-3.5 text-xs">
          <div>
            <span className={`block text-[10px] uppercase font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {lang === 'en' ? 'Device Name' : 'పరికరం పేరు'}
            </span>
            <span className="font-bold mt-1 block">Pintu's Phone</span>
          </div>
          <div>
            <span className={`block text-[10px] uppercase font-bold ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {lang === 'en' ? 'Pintu ID' : 'పింటు ఐడి'}
            </span>
            <span className="font-bold mt-1 block">P12345678</span>
          </div>
        </div>
      </div>

      {/* Realistic Mock QR Code in center */}
      <div className="flex flex-col items-center justify-center py-2 flex-1">
        <div className={`p-4 rounded-2xl border bg-white flex items-center justify-center ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          {/* Custom vector QR code grid simulation using SVG for crisp lines */}
          <svg className="w-24 h-24 text-neutral-800" viewBox="0 0 100 100" fill="currentColor">
            {/* Corner square top-left */}
            <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
            {/* Corner square top-right */}
            <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
            {/* Corner square bottom-left */}
            <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
            {/* Small center grid blocks */}
            <rect x="45" y="45" width="10" height="10" />
            <rect x="35" y="15" width="10" height="5" />
            <rect x="50" y="20" width="5" height="10" />
            <rect x="15" y="40" width="5" height="15" />
            <rect x="40" y="75" width="15" height="5" />
            <rect x="75" y="45" width="5" height="15" />
            <rect x="85" y="85" width="10" height="10" />
            <rect x="65" y="65" width="10" height="5" />
            <rect x="80" y="70" width="5" height="10" />
          </svg>
        </div>
        <span className={`text-[10px] font-semibold mt-2 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          {lang === 'en' ? 'Scan to Connect Instantly' : 'వెంటనే కనెక్ట్ కావడానికి స్కాన్ చేయండి'}
        </span>
      </div>

      {/* Share Buttons */}
      <div className="flex flex-col gap-2 mt-auto">
        <button
          id="profile-share-whatsapp-btn"
          onClick={() => handleShareId('whatsapp')}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          {lang === 'en' ? 'SHARE ON WHATSAPP' : 'వాట్సాప్‌లో షేర్ చేయండి'}
        </button>
        <button
          id="profile-share-native-btn"
          onClick={() => handleShareId('native')}
          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] flex items-center justify-center gap-2 transition-all shadow cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5" />
          {lang === 'en' ? 'SHARE VIA ANDROID NATIVE' : 'ఆండ్రాయిడ్ షేర్ ద్వార'}
        </button>
      </div>
    </div>
  );
}
