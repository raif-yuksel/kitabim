// src/hooks/useNotifications.js
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function useNotifications() {
  const { currentUser, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth durumu gelene kadar bekle
    if (authLoading) return;

    // Eğer kullanıcı yoksa yüklemeyi bitir ve temizle
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const notifRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      snapshot => {
        const notifs = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setNotifications(notifs);
        setLoading(false);
      },
      err => {
        console.error('useNotifications onSnapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser, authLoading]);

  const unreadCount = notifications.filter(n => n.read === false).length;
  return { notifications, unreadCount, loading };
}
