const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

exports.onCommentCreate = functions.firestore
  .document('comments/{commentId}')
  .onCreate(async (snap, ctx) => {
    const comment = snap.data();
    const { postId, authorId } = comment;

    // 1) Postu al ve sahibi bul
    const postSnap = await db.collection('posts').doc(postId).get();
    if (!postSnap.exists) return null;
    const postOwner = postSnap.data().ownerId;
    if (postOwner === authorId) return null; // Kendi postuna bildirim yollama

    // 2) Bildirim nesnesi oluştur
    const notif = {
      toUser: postOwner,
      fromUser: authorId,
      type: 'comment',
      postId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      message: `📖 Yeni yorum: "${comment.text.slice(0, 30)}..."`,
    };
    const notifRef = await db.collection('notifications').add(notif);

    // 3) Hedef kullanıcının FCM token’ını al
    const userSnap = await db.collection('users').doc(postOwner).get();
    const token = userSnap.data().fcmToken;
    if (!token) return null;

    // 4) Push bildirimi gönder
    const payload = {
      notification: {
        title: 'Yeni Yorum!',
        body: notif.message,
      }
    };
    await messaging.sendToDevice(token, payload);

    return null;
  });
