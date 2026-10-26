import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Message, FileTransfer } from '../types';

interface FirebaseContextType {
  user: FirebaseUser | null;
  loading: boolean;
  online: boolean;
  googleToken: string | null;
  setGoogleToken: (token: string | null) => void;
  loginWithGoogle: (useRedirect?: boolean) => Promise<FirebaseUser | void>;
  logout: () => Promise<void>;
  backupChat: (peerId: string, peerName: string, messages: Message[]) => Promise<void>;
  restoreChatHistory: (peerId: string) => Promise<Message[]>;
  backupFileTransfers: (transfers: FileTransfer[]) => Promise<void>;
  restoreFileTransfers: () => Promise<FileTransfer[]>;
  getCloudChatsList: () => Promise<{ id: string; peerId: string; peerName: string; lastMessageText: string; updatedAt: any }[]>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return sessionStorage.getItem('google_access_token');
  });

  // Monitor network state
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle redirect sign-in results on initial mount
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setGoogleToken(credential.accessToken);
            sessionStorage.setItem('google_access_token', credential.accessToken);
          }
          console.log('Google Redirect Login Success:', result.user);
        }
      })
      .catch((error) => {
        console.error('Google Redirect Login Error:', error);
      });
  }, []);

  // Monitor Auth state changes and sync profile with backend
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          const response = await fetch('/api/users/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              displayName: currentUser.displayName || 'Pintu User',
              avatar: currentUser.photoURL || '',
            }),
          });
          if (!response.ok) {
            console.error('Failed to sync profile to Cloud SQL backend:', await response.text());
          } else {
            console.log('User profile synced to PostgreSQL successfully');
          }
        } catch (err) {
          console.error('Profile sync to Express server failed:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (useRedirect = false) => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.readonly');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/forms.body');
    provider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');
    
    if (useRedirect) {
      console.log('Initiating Google Sign-In via Redirect...');
      await signInWithRedirect(auth, provider);
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
        sessionStorage.setItem('google_access_token', credential.accessToken);
      }
      return result.user;
    } catch (error) {
      console.error('Popup Sign-In error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setGoogleToken(null);
    sessionStorage.removeItem('google_access_token');
  };

  /**
   * Backs up a complete local chat thread and messages to Cloud SQL.
   */
  const backupChat = async (peerId: string, peerName: string, messages: Message[]) => {
    if (!auth.currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/chats/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          peerId,
          peerName,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`API backupChat failed: ${await response.text()}`);
      }
      console.log(`Successfully backed up ${messages.length} messages to PostgreSQL`);
    } catch (error) {
      console.error('Error in backupChat:', error);
      throw error;
    }
  };

  /**
   * Restores historical messages for a chat from Cloud SQL.
   */
  const restoreChatHistory = async (peerId: string): Promise<Message[]> => {
    if (!auth.currentUser) return [];
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/chats/restore?peerId=${encodeURIComponent(peerId)}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API restoreChatHistory failed: ${await response.text()}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error in restoreChatHistory:', error);
      throw error;
    }
  };

  /**
   * Fetches list of all chat backup threads stored in Cloud SQL.
   */
  const getCloudChatsList = async () => {
    if (!auth.currentUser) return [];
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/chats/list', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API getCloudChatsList failed: ${await response.text()}`);
      }

      const data = await response.json();
      return data.chats || [];
    } catch (error) {
      console.error('Error in getCloudChatsList:', error);
      throw error;
    }
  };

  /**
   * Backs up local file transfer history to Cloud SQL.
   */
  const backupFileTransfers = async (transfers: FileTransfer[]) => {
    if (!auth.currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/files/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ transfers }),
      });

      if (!response.ok) {
        throw new Error(`API backupFileTransfers failed: ${await response.text()}`);
      }
      console.log(`Successfully backed up ${transfers.length} file logs to PostgreSQL`);
    } catch (error) {
      console.error('Error in backupFileTransfers:', error);
      throw error;
    }
  };

  /**
   * Restores historical file transfers from Cloud SQL.
   */
  const restoreFileTransfers = async (): Promise<FileTransfer[]> => {
    if (!auth.currentUser) return [];
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/files/restore', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API restoreFileTransfers failed: ${await response.text()}`);
      }

      const data = await response.json();
      return data.transfers || [];
    } catch (error) {
      console.error('Error in restoreFileTransfers:', error);
      throw error;
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      loading,
      online,
      googleToken,
      setGoogleToken,
      loginWithGoogle,
      logout,
      backupChat,
      restoreChatHistory,
      backupFileTransfers,
      restoreFileTransfers,
      getCloudChatsList
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
