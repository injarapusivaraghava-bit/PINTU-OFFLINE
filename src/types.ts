export type DeviceType = 'phone' | 'tablet' | 'laptop';

export interface Device {
  id: string;
  name: string;
  avatar: string;
  signalStrength: number; // in dBm, e.g. -45 to -90
  distance: number; // in meters
  isPaired: boolean; // Bluetooth Pairing State
  isConnectedWifi: boolean; // Wi-Fi Direct Connection State
  isConnected?: boolean; // Overall connection state
  macAddress?: string; // Physical MAC address
  deviceType: DeviceType;
  isDiscovered: boolean;
  lastSeen?: number;
  isVirtual?: boolean; // True for simulated browser peers, false for real tabs
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  status: MessageStatus;
  channelType: 'bluetooth' | 'wifi-direct';
  attachment?: {
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  };
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number; // 0 to 100
  speed: number; // in MB/s
  direction: 'send' | 'receive';
  peerId: string;
  peerName: string;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  fileType?: string;
  timestamp: number;
  dataUrl?: string; // To simulate opening the file
}

export interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  isConnected: boolean;
  peer: Device | null;
  cameraEnabled: boolean;
  micEnabled: boolean;
  duration: number; // seconds
  isVideo: boolean;
  status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'disconnected' | 'rejected';
}

export interface DeviceSettings {
  deviceName: string;
  avatar: string;
  bluetoothEnabled: boolean;
  wifiDirectEnabled: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
  discoverable: boolean;
  storagePath: string;
  appLockEnabled?: boolean;
  autoAcceptFiles?: boolean;
  appDownloadLink?: string;
  apkDownloadLink?: string;
}

export interface ConnectionEvent {
  type: 'DISCOVER' | 'CONNECT_REQUEST' | 'CONNECT_ACCEPT' | 'CONNECT_REJECT' | 'DISCONNECT' | 'CHAT_MESSAGE' | 'FILE_TRANSFER_START' | 'FILE_TRANSFER_PROGRESS' | 'FILE_TRANSFER_COMPLETE' | 'CALL_REQUEST' | 'CALL_ACCEPT' | 'CALL_REJECT' | 'CALL_HANGUP';
  senderId: string;
  senderName: string;
  senderAvatar: string;
  targetId?: string;
  payload?: any;
}
