import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, ShieldAlert, Delete, Fingerprint } from 'lucide-react';

interface PINLockScreenProps {
  onUnlockSuccess: () => void;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
}

export default function PINLockScreen({ onUnlockSuccess, lang, theme }: PINLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  const handleNumClick = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 6) {
        // Simple demo pin validation: accepts any 6 digits for responsive demo
        setTimeout(() => {
          onUnlockSuccess();
        }, 350);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleFingerprint = () => {
    // Simulated fingerprint touch unlock
    setPin('123456');
    setTimeout(() => {
      onUnlockSuccess();
    }, 350);
  };

  const isDark = theme === 'dark';

  return (
    <div
      id="pin-lock-container"
      className={`absolute inset-0 flex flex-col justify-between p-6 z-50 select-none ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-neutral-50 text-neutral-800'
      }`}
    >
      <div className="flex flex-col items-center justify-center mt-10">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
          isDark ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'bg-indigo-50 text-indigo-600'
        }`}>
          <KeyRound className="h-7 w-7" />
        </div>
        
        <h2 className="text-md font-extrabold tracking-wide uppercase">
          {lang === 'en' ? 'Enter Pintu PIN' : 'పింటు పిన్ నమోదు చేయండి'}
        </h2>
        <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          {lang === 'en' ? 'Private Mesh Lock screen' : 'వ్యక్తిగత మెష్ లాక్ స్క్రీన్'}
        </p>

        {/* PIN Dot Indicators */}
        <div className="flex gap-4.5 mt-8">
          {[0, 1, 2, 3, 4, 5].map(idx => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                pin.length > idx
                  ? isDark ? 'bg-blue-400 scale-110 shadow-[0_0_8px_#3b82f6]' : 'bg-indigo-600 scale-110'
                  : isDark ? 'bg-neutral-800 border border-neutral-700' : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Numeric Keypad Touch Grid */}
      <div className="flex flex-col gap-3.5 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              id={`pin-btn-${num}`}
              onClick={() => handleNumClick(num)}
              className={`py-3.5 rounded-2xl text-lg font-bold transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-neutral-900/60 hover:bg-neutral-800 text-white border border-neutral-800/50'
                  : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-100'
              }`}
            >
              {num}
            </button>
          ))}
          
          {/* Column 4 */}
          <button
            id="pin-btn-fingerprint"
            onClick={handleFingerprint}
            className={`py-3.5 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-neutral-900/40 text-blue-400 hover:bg-neutral-800' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
            title="Biometric unlock"
          >
            <Fingerprint className="h-6 w-6 animate-pulse" />
          </button>

          <button
            id="pin-btn-0"
            onClick={() => handleNumClick('0')}
            className={`py-3.5 rounded-2xl text-lg font-bold transition-all active:scale-95 cursor-pointer ${
              isDark
                ? 'bg-neutral-900/60 hover:bg-neutral-800 text-white border border-neutral-800/50'
                : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-100'
            }`}
          >
            0
          </button>

          <button
            id="pin-btn-delete"
            onClick={handleDelete}
            className={`py-3.5 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              isDark ? 'bg-neutral-900/40 text-neutral-400 hover:bg-neutral-800' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
            }`}
            title="Delete last digit"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <button
          id="btn-forgot-pin"
          onClick={() => setPin('')}
          className="text-xs text-center font-semibold text-blue-500 hover:text-blue-400 mt-2 transition-colors cursor-pointer"
        >
          {lang === 'en' ? 'Forgot PIN?' : 'పిన్ మర్చిపోయారా?'}
        </button>

        <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 mt-2 ${
          isDark ? 'bg-neutral-900/80 border-neutral-800 text-neutral-400' : 'bg-neutral-50 border-neutral-200 text-neutral-500'
        }`}>
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-tight">
            <b>DEVELOPMENT NOTE:</b> Simple PIN simulation for responsive preview. Standard production builds will link this screen to the Android KeyStore or Fingerprint Biometrics API.
          </p>
        </div>
      </div>
    </div>
  );
}
