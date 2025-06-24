// functions/rateLimiter.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

exports.limitComments = functions.https.onCall(async (data, context) => {
  const uid = context.auth.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated');
  const now = Date.now();
  const ref = db.collection('rateLimits').doc(uid);
  const snap = await ref.get();
  let attempts = [], last;
  if (snap.exists) attempts = snap.data().timestamps;
  // son 1 dakikadaki kayıtları filtrele
  attempts = attempts.filter(t => now - t < 60*1000);
  if (attempts.length >= 5) {
    throw new functions.https.HttpsError('resource-exhausted','Çok hızlısınız. Bekleyin.');
  }
  attempts.push(now);
  await ref.set({ timestamps: attempts });
  return { ok: true };
});
