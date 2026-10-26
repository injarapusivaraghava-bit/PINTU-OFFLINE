import { Device } from '../types';

export const VIRTUAL_PEERS: Device[] = [
  {
    id: 'peer-pixel9',
    name: "Ravi's Pixel 9 Pro",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    signalStrength: -48,
    distance: 1.8,
    isPaired: false,
    isConnectedWifi: false,
    deviceType: 'phone',
    isDiscovered: true,
    lastSeen: Date.now(),
    isVirtual: true,
  },
  {
    id: 'peer-tabs9',
    name: "Priya's Galaxy Tab S9",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    signalStrength: -62,
    distance: 4.2,
    isPaired: false,
    isConnectedWifi: false,
    deviceType: 'tablet',
    isDiscovered: true,
    lastSeen: Date.now(),
    isVirtual: true,
  },
  {
    id: 'peer-iphone15',
    name: "Anand's iPhone 15 Pro",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
    signalStrength: -75,
    distance: 8.5,
    isPaired: false,
    isConnectedWifi: false,
    deviceType: 'phone',
    isDiscovered: true,
    lastSeen: Date.now(),
    isVirtual: true,
  },
  {
    id: 'peer-macbook',
    name: "Sandeep's MacBook Air",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
    signalStrength: -55,
    distance: 3.1,
    isPaired: false,
    isConnectedWifi: false,
    deviceType: 'laptop',
    isDiscovered: true,
    lastSeen: Date.now(),
    isVirtual: true,
  },
  {
    id: 'peer-oneplus',
    name: "Kiran's OnePlus 12",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
    signalStrength: -88,
    distance: 14.3,
    isPaired: false,
    isConnectedWifi: false,
    deviceType: 'phone',
    isDiscovered: true,
    lastSeen: Date.now(),
    isVirtual: true,
  }
];

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getSignalStrengthLabel(dbm: number): { label: string; color: string; percentage: number } {
  let percentage = 100 - Math.min(Math.max((-dbm - 30) * 1.5, 0), 100);
  percentage = Math.round(percentage);

  if (dbm >= -55) {
    return { label: 'Excellent', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', percentage };
  } else if (dbm >= -70) {
    return { label: 'Good', color: 'text-teal-600 bg-teal-50 border-teal-200', percentage };
  } else if (dbm >= -85) {
    return { label: 'Fair', color: 'text-amber-600 bg-amber-50 border-amber-200', percentage };
  } else {
    return { label: 'Weak', color: 'text-rose-600 bg-rose-50 border-rose-200', percentage };
  }
}

export const MOCK_BOT_REPLIES: Record<string, string[]> = {
  'peer-pixel9': [
    "Hey! I see your device. Bluetooth connection is solid! 📶",
    "Did you see the starter project? It's really fast over offline channels.",
    "Are we sending some test files today? Try dragging a file in the File Share tab!",
    "Offline WebRTC calls actually work quite nicely too, check out the Calls tab!",
    "I'm sitting about 2 meters away from you. Pretty cool!"
  ],
  'peer-tabs9': [
    "Hello from the tablet! Wi-Fi Direct connection speed is incredible here. ⚡",
    "Yeah, local network file sharing is easily transferring at 35+ MB/s!",
    "This works great for field operations when internet goes down.",
    "Try giving me a call! Click the Phone icon next to my name.",
    "I'm listening on standard peer-to-peer protocols."
  ],
  'peer-iphone15': [
    "Hey, what's up? Just testing the mesh networking protocol.",
    "The cross-platform design looks neat. Can you send me that picture?",
    "Offline calling is super stable inside 10 meters.",
    "My signal strength is fair right now, about -75dBm.",
    "Glad we have this local backup communication tool."
  ],
  'peer-macbook': [
    "Terminal connected. Simulating offline nodes.",
    "WebRTC calls established locally. Frame rendering active.",
    "Ready for high-speed offline file synchronization.",
    "Bluetooth discoverability is fully operational on my end."
  ],
  'peer-oneplus': [
    "Connection is a bit laggy since I am 14 meters away, but it still works!",
    "Bluetooth range limits are being tested.",
    "The chat queue automatically syncs when we get closer. Awesome offline buffer feature!",
    "Ping me once I move closer to get a faster Wi-Fi Direct speed."
  ]
};

export function getRandomReply(peerId: string): string {
  const replies = MOCK_BOT_REPLIES[peerId] || [
    "Understood. Offline signal is active.",
    "Received your offline packet. Status: OK.",
    "Let's test file transfer next!",
    "Connection verified."
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
