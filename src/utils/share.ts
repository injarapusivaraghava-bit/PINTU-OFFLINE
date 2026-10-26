/**
 * Shared WhatsApp and Native Android Share utilities for Pintu Offline
 */

export interface ShareOptions {
  text: string;
  appDownloadLink?: string;
  apkDownloadLink?: string;
}

// Generates the standard Pintu invite message with public download URL
export function generateInviteMessage(appDownloadLink?: string): string {
  const link = appDownloadLink && appDownloadLink.trim() !== '' 
    ? appDownloadLink 
    : 'https://play.google.com/store/apps/details?id=com.pintu.offline';

  return `PINTU OFFLINE\n\nPrivate • Instant • Nearby\n\nConnect with nearby devices, chat and share files offline without internet.\n\nDownload App:\n${link}\n\nCustomer Support Call / WhatsApp: +91 8977776111\nEmail: injarapusivaraghava@gmail.com\nAddress: Turangi, Kakinada, Andhra Pradesh - 533016`;
}

/**
 * Executes a share using either the Android Native Interface (if available),
 * the Web Share API (navigator.share), or falls back to WhatsApp.
 */
export function shareContent(text: string, shareType: 'whatsapp' | 'native' = 'whatsapp') {
  const anyWindow = window as any;

  // 1. Android Native Interface check (AndroidNative or PintuNative)
  if (anyWindow.AndroidNative && typeof anyWindow.AndroidNative.shareApp === 'function') {
    try {
      anyWindow.AndroidNative.shareApp(text);
      return { success: true, method: 'android-native' };
    } catch (e) {
      console.error('AndroidNative shareApp failed', e);
    }
  }

  if (anyWindow.PintuNative && typeof anyWindow.PintuNative.shareApp === 'function') {
    try {
      anyWindow.PintuNative.shareApp(text);
      return { success: true, method: 'pintu-native' };
    } catch (e) {
      console.error('PintuNative shareApp failed', e);
    }
  }

  // 2. Web Share API (opens native Android/OS share sheet in mobile browsers)
  if (navigator.share) {
    try {
      navigator.share({
        title: 'Pintu Offline',
        text: text,
      }).catch((err) => {
        // If user cancelled, that's fine
        console.log('Share dismissed or handled:', err);
      });
      return { success: true, method: 'web-share' };
    } catch (e) {
      console.warn('navigator.share threw error, falling back', e);
    }
  }

  // 3. Direct WhatsApp Share without hardcoded recipient so user can select any contact
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  return { success: true, method: 'whatsapp-web' };
}
