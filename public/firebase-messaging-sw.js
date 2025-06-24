// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCEdd9L6bljiauu7pFQVHkIAL2Qo4LJ1QM",
  authDomain: "kitap-01.firebaseapp.com",
  databaseURL: "https://kitap-01-default-rtdb.firebaseio.com",
  projectId: "kitap-01",
  storageBucket: "kitap-01.firebasestorage.app",
  messagingSenderId: "929324838289",
  appId: "1:929324838289:web:91c2f76304a0f6c20c3e30",
  measurementId: "G-TX5CYQJT40"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, { body, icon });
});