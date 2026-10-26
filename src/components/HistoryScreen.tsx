import React, { useState } from 'react';
import { Phone, Video, PhoneCall, PhoneIncoming, PhoneOff, Trash2 } from 'lucide-react';

interface CallRecord {
  id: string;
  peerName: string;
  peerAvatar: string;
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number;
  duration: number; // in seconds
  isVideo: boolean;
}

interface HistoryScreenProps {
  callHistory: CallRecord[];
  onClearHistory: () => void;
  lang: 'en' | 'te';
  theme: 'light' | 'dark';
  onCallPeer?: (name: string, isVideo: boolean) => void;
}

export default function HistoryScreen({ callHistory, onClearHistory, lang, theme }: HistoryScreenProps) {
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing' | 'missed'>('all');
  const isDark = theme === 'dark';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredHistory = callHistory.filter(call => {
    if (filter === 'all') return true;
    return call.type === filter;
  });

  return (
    <div
      id="history-screen-container"
      className={`flex flex-col gap-4 p-4 rounded-2xl h-full ${
        isDark ? 'bg-[#0a192f] text-white' : 'bg-white text-neutral-800'
      }`}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
        <h3 className="font-extrabold text-sm">
          {lang === 'en' ? 'Call History' : 'కాల్స్ చరిత్ర'}
        </h3>
        {callHistory.length > 0 && (
          <button
            id="clear-hist-btn"
            onClick={onClearHistory}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex gap-1.5 p-1 bg-neutral-100/80 rounded-xl">
        {(['all', 'incoming', 'outgoing', 'missed'] as const).map(f => (
          <button
            key={f}
            id={`filter-history-${f}`}
            onClick={() => setFilter(f)}
            className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Call list scroll */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[340px]">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 text-xs">
            <Phone className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
            {lang === 'en' ? 'No calls recorded' : 'కాల్ రికార్డులు లేవు'}
          </div>
        ) : (
          filteredHistory.map(call => (
            <div
              key={call.id}
              id={`history-item-${call.id}`}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                isDark ? 'bg-neutral-900/40 border-neutral-800/80' : 'bg-neutral-50 border-neutral-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={call.peerAvatar}
                  alt={call.peerName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-neutral-200"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs">{call.peerName}</span>
                    {call.isVideo ? (
                      <Video className="h-3 w-3 text-neutral-400" />
                    ) : (
                      <Phone className="h-3 w-3 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      {call.type === 'incoming' && <PhoneIncoming className="h-2.5 w-2.5 text-emerald-500" />}
                      {call.type === 'outgoing' && <PhoneCall className="h-2.5 w-2.5 text-blue-400" />}
                      {call.type === 'missed' && <PhoneOff className="h-2.5 w-2.5 text-rose-500" />}
                      <span className="capitalize">{call.type}</span>
                    </span>
                    <span>•</span>
                    <span>{new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="text-right text-[10px]">
                <span className="font-bold">{call.type === 'missed' ? 'Missed' : formatDuration(call.duration)}</span>
                <p className="text-[8px] text-neutral-400 mt-0.5">WebRTC</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
