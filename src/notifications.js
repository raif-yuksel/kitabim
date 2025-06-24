// src/notifications.js
import { getToken, onMessage, isSupported as messagingIsSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, messaging } from './firebase';

const VAPID_KEY = process.env.REACT_APP_VAPID_KEY;

export async function initNotifications(uid) {
  // 1) Ortam ve destek kontrolü
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.warn('Push veya Notification API desteklenmiyor');
    return;
  }
  // Firebase Messaging SDK desteği
  let supported = false;
  try {
    supported = await messagingIsSupported();
  } catch (e) {
    console.warn('Messaging destek kontrolünde hata:', e);
  }
  if (!supported || !messaging) {
    console.warn('Firebase Messaging desteklenmiyor veya henüz initialize edilmedi');
    return;
  }
  // 2) VAPID_KEY kontrolü
  if (!VAPID_KEY) {
    console.warn('VAPID_KEY tanımlı değil! .env dosyanızı kontrol edin.');
    return;
  }

  // 3) Service Worker kaydı (tekrar kayıt varsa hata vermez)
  let registration;
  try {
    registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch (err) {
    console.error('SW kaydı hatası:', err);
    return;
  }

  // 4) SW ready bekle
  try {
    await navigator.serviceWorker.ready;
  } catch (err) {
    console.error('SW ready hatası:', err);
    return;
  }

  // 5) Bildirim izni kontrolü
  let permission = Notification.permission;
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission();
    } catch (err) {
      console.error('Bildirim izni isteğinde hata:', err);
      return;
    }
  }
  if (permission !== 'granted') {
    console.warn('Bildirim izni verilmedi');
    return;
  }

  // 6) FCM token al
  let token;
  try {
    token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
  } catch (err) {
    console.error('Token alınamadı:', err);
    return;
  }
  if (!token) {
    console.warn('FCM token boş döndü');
    return;
  }

  // 7) Firestore’a kaydet
  try {
    const uref = doc(db, 'users', uid);
    await updateDoc(uref, { fcmTokens: arrayUnion(token) });
  } catch (err) {
    console.error('Token Firestore kaydetme hatası:', err);
  }
}

export function listenMessages(cb) {
  // Ön planda mesajları dinle
  messagingIsSupported().then(supported => {
    if (!supported || !messaging) {
      console.warn('Messaging servisi kullanılabilir değil');
      return;
    }
    onMessage(messaging, payload => {
      if (payload.notification) {
        cb(payload.notification);
      }
    });
  }).catch(err => {
    console.error('Messaging destek kontrolünde hata:', err);
  });
}
