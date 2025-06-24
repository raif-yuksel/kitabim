// src/utils/notifications.js
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function markNotificationAsRead(userId, notifId) {
  try {
    const notifDocRef = doc(db, 'users', userId, 'notifications', notifId);
    await updateDoc(notifDocRef, { read: true });
  } catch (err) {
    console.error('markNotificationAsRead error:', err);
  }
}

export async function markAllNotificationsAsRead(userId, notifications) {
  try {
    const batch = db.batch();
    notifications.forEach(n => {
      if (!n.read) {
        const notifRef = doc(db, 'users', userId, 'notifications', n.id);
        batch.update(notifRef, { read: true });
      }
    });
    await batch.commit();
  } catch (err) {
    console.error('markAllNotificationsAsRead batch error:', err);
  }
}
