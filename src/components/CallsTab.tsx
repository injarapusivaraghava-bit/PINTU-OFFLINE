import React, { useState, useEffect } from 'react';
import { Phone, Video, PhoneOff, Mic, MicOff, Volume2, ShieldAlert, AlertTriangle, Radio, CheckCircle2, Lock } from 'lucide-react';

interface CallsTabProps {
  onAddCallRecord?: (record: {
    peerName: string;
    peerAvatar: string;
    type: 'incoming' | 'outgoing' | 'missed';
    duration: number;
    isVideo: boolean;
  }) => void;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
  runMode?: 'simulation' | 'production';
  initialState?: 'idle' | 'calling' | 'connected' | 'ended';
  incomingCallType?: 'voice' | 'video';
  isNative?: boolean;
}

export default function CallsTab({
  lang,
  theme,
  isNative = false
}: CallsTabProps) {
  const isDark = theme === 'dark';

  // Check if WebRTC audio transport is actually configured and signaling available
  const [callStatusMessage, setCallStatusMessage] = useState<string | null>(null);

  // Sync native call state updates if received from Android bridge
  useEffect(() => {
    (window as any).onCallStatusUpdated = (status: string, reason?: string) => {
      if (status === 'failed') {
        setCallStatusMessage(reason || 'Call failed: Signaling or permissions unavailable');
      }
    };
  }, []);

  const txt = {
    en: {
      title: "Offline Voice & Video Calls",
      notAvailable: "NOT YET AVAILABLE",
      notAvailableSub: "Real duplex voice and video calls require physical WebRTC signaling and microphone/camera hardware.",
      browserTitle: "Native Android Required",
      browserDesc: "Web browsers cannot negotiate peer-to-peer RFCOMM or local Wi-Fi Direct audio/video UDP sockets. To prevent deception, fake call simulations are disabled.",
      reqTitle: "Requirements for Physical Calls:",
      req1: "Two Android phones running the compiled Pintu Offline APK.",
      req2: "Active Wi-Fi Direct P2P or Bluetooth Classic RFCOMM connection.",
      req3: "Microphone and Camera runtime permissions granted.",
      req4: "WebRTC peer SDP/ICE signaling exchange completed.",
      btnVoice: "Initiate Voice Call",
      btnVideo: "Initiate Video Call",
      statusCheck: "Checking Hardware Transport..."
    },
    te: {
      title: "ఆఫ్‌లైన్ వాయిస్ & వీడియో కాల్స్",
      notAvailable: "ఇంకా అందుబాటులో లేదు",
      notAvailableSub: "నిజమైన వాయిస్ మరియు వీడియో కాల్స్ కోసం భౌతిక WebRTC సిగ్నలింగ్ మరియు మైక్రోఫోన్/కెమెరా హార్డ్‌వేర్ అవసరం.",
      browserTitle: "ఆండ్రాయిడ్ యాప్ అవసరం",
      browserDesc: "బ్రౌజర్ ప్రివ్యూలలో నిజమైన ఆఫ్‌లైన్ ఆడియో లేదా వీడియో సాకెట్లు పనిచేయవు. తప్పుదోవ పట్టించకుండా ఉండటానికి ఫేక్ కాల్స్ తీసివేయబడ్డాయి.",
      reqTitle: "కాల్స్ కోసం కావాల్సినవి:",
      req1: "పింటు ఆఫ్‌లైన్ APK ఇన్స్టాల్ చేయబడిన రెండు ఆండ్రాయిడ్ ఫోన్లు.",
      req2: "వై-ఫై డైరెక్ట్ లేదా బ్లూటూత్ RFCOMM కనెక్షన్.",
      req3: "మైక్రోఫోన్ మరియు కెమెరా అనుమతులు.",
      req4: "WebRTC సిగ్నలింగ్ పూర్తవ్వడం.",
      btnVoice: "వాయిస్ కాల్ ప్రారంభించండి",
      btnVideo: "వీడియో కాల్ ప్రారంభించండి",
      statusCheck: "హార్డ్‌వేర్ పరిశీలన..."
    }
  }[lang];

  const handleAttemptCall = (type: 'voice' | 'video') => {
    if (!isNative) {
      setCallStatusMessage(
        lang === 'en'
          ? "Native Android Required: Web preview cannot establish real offline audio/video VoIP streams. No fake calls are displayed."
          : "ఆండ్రాయిడ్ యాప్ అవసరం: బ్రౌజర్ ప్రివ్యూలో ఆఫ్‌లైన్ కాల్స్ సాధ్యం కాదు."
      );
      return;
    }

    const nativeObj = (window as any).PintuNative || (window as any).AndroidNative;
    if (type === 'voice' && nativeObj?.startVoiceCall) {
      nativeObj.startVoiceCall("0.0.0.0", 5004);
    } else if (type === 'video' && nativeObj?.startVideoCall) {
      nativeObj.startVideoCall("0.0.0.0");
    } else {
      setCallStatusMessage("Call signaling transport is not yet configured with a connected peer.");
    }
  };

  return (
    <div
      id="calls-tab-container"
      className={`flex flex-col h-full justify-between p-4 overflow-y-auto ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      <div className="flex flex-col items-center justify-center text-center gap-4 py-4 my-auto">
        
        {/* Call Icon with Status Pill */}
        <div className="relative">
          <div className="w-16 h-16 bg-neutral-800/60 rounded-2xl flex items-center justify-center text-neutral-400 border border-neutral-700/60">
            <Phone className="h-8 w-8 text-neutral-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-neutral-950 p-1 rounded-full shadow">
            <Lock className="h-3.5 w-3.5" />
          </div>
        </div>

        <div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            {txt.notAvailable}
          </span>
          <h3 className="font-extrabold text-sm text-white mt-2.5">{txt.title}</h3>
          <p className="text-[11px] text-neutral-400 max-w-xs mx-auto mt-1 leading-relaxed">
            {txt.notAvailableSub}
          </p>
        </div>

        {/* Clear Explanation Box */}
        <div className="w-full text-left p-3.5 rounded-2xl bg-neutral-900/50 border border-neutral-800 text-[10px] space-y-2 mt-1">
          <div className="flex items-center gap-2 text-blue-400 font-extrabold">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{txt.browserTitle}</span>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {txt.browserDesc}
          </p>
          <div className="pt-2 border-t border-neutral-800/80">
            <span className="font-bold text-neutral-400 block mb-1">{txt.reqTitle}</span>
            <ul className="list-disc list-inside space-y-0.5 text-neutral-300">
              <li>{txt.req1}</li>
              <li>{txt.req2}</li>
              <li>{txt.req3}</li>
              <li>{txt.req4}</li>
            </ul>
          </div>
        </div>

        {callStatusMessage && (
          <div className="p-3 w-full rounded-xl bg-amber-950/70 border border-amber-500/30 text-left flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span className="text-[10px] text-amber-200">{callStatusMessage}</span>
          </div>
        )}

        {/* Action Triggers */}
        <div className="w-full flex flex-col gap-2 mt-2">
          <button
            id="btn-voice-call-trigger"
            onClick={() => handleAttemptCall('voice')}
            className="w-full py-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-neutral-700"
          >
            <Phone className="h-4 w-4 text-neutral-400" />
            {txt.btnVoice}
          </button>

          <button
            id="btn-video-call-trigger"
            onClick={() => handleAttemptCall('video')}
            className="w-full py-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-neutral-700"
          >
            <Video className="h-4 w-4 text-neutral-400" />
            {txt.btnVideo}
          </button>
        </div>

      </div>

      <div className="text-center text-[9px] text-neutral-500 border-t border-neutral-800/60 pt-2">
        Pintu Offline WebRTC Engine • Zero Fake Simulations Policy
      </div>
    </div>
  );
}
