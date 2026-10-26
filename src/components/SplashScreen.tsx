import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Radio } from 'lucide-react';

interface SplashScreenProps {
  onLoadingComplete: () => void;
  lang: 'en' | 'te';
}

export default function SplashScreen({ onLoadingComplete, lang }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onLoadingComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  return (
    <div id="splash-container" className="absolute inset-0 bg-[#0a192f] text-white flex flex-col items-center justify-between p-10 z-50 overflow-hidden select-none">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Glowing Pintu P-shaped logo */}
        <motion.div
          id="splash-logo"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative w-28 h-28 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_24px_rgba(37,99,235,0.4)] border-4 border-white/10"
        >
          {/* Mock P symbol inside */}
          <span className="text-6xl font-black text-white tracking-tighter pr-1">P</span>
          
          {/* Signal wave dots above the P */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
            <Radio className="h-4 w-4 text-blue-300" />
          </div>
        </motion.div>

        <motion.h1
          id="splash-title"
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-2xl font-black tracking-widest mt-6 bg-gradient-to-r from-white via-neutral-100 to-blue-200 bg-clip-text text-transparent"
        >
          {lang === 'en' ? 'PINTU OFFLINE' : 'పింటు ఆఫ్లైన్'}
        </motion.h1>

        <motion.p
          id="splash-tagline"
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-[10px] font-bold tracking-wider uppercase text-blue-400 mt-2.5"
        >
          {lang === 'en' ? 'Private • Instant • Nearby' : 'వ్యక్తిగత • తక్షణ • దగ్గరలో'}
        </motion.p>
      </div>

      {/* Sleek loader wheel */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-neutral-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-l-blue-500 animate-spin" />
        </div>
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
          {lang === 'en' ? 'Tuning Radio Mesh' : 'మెష్ సిద్ధమౌతోంది'}
        </span>
      </div>
    </div>
  );
}
