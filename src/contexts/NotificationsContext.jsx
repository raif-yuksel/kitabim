import React, { createContext, useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from './AuthContext';
import { initNotifications, listenMessages } from '../notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// 1) Context oluştur
export const NotificationsContext = createContext({
  notifications: [],
  unreadCount: 0,
  loading: true,
  markAsRead: () => {},
  pushMsgs: [],
});

// 2) Provider bileşeni
export function NotificationsProvider({ children }) {
  const { currentUser } = useAuth();
  const { notifications, unreadCount, loading } = useNotifications();
  const [pushMsgs, setPushMsgs] = useState([]);

  // **BİLDİRİMİ OKUNDU OLARAK İŞARETLE**
  const markAsRead = async (notifId) => {
    if (!notifId) return;
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (e) {
      // Gerekirse logla
      console.error('Bildirim okunamadı:', e);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    initNotifications(currentUser.uid);
    // listener'ı cleanup fonksiyonuna bağla
    const unsubscribe = listenMessages(msg => {
      setPushMsgs(ps => [...ps, msg]);
    });
    return () => {
      // Eğer listenMessages unsubscribe döndürüyorsa
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [currentUser]);

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      pushMsgs,
      setPushMsgs, // lazımsa ekle
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}
