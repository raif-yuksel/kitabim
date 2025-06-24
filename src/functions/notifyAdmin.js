// functions/notifyAdmin.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(functions.config().sendgrid.key);

exports.onReport = functions.firestore
  .document('reports/{rid}')
  .onCreate(async (snap, ctx)=>{
    const { postId, commentId } = snap.data();
    const msg = {
      to: 'admin@kitabim.com',
      from: 'noreply@kitabim.com',
      subject: 'Yeni Rapor',
      text: `Yeni rapor: post=${postId} comment=${commentId||'-'}`
    };
    await sgMail.send(msg);
  });
