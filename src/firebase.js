// src/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider
} from 'firebase/auth';
import {
  initializeFirestore,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { getStorage }   from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';  // ← Analytics eklendi

const firebaseConfig = {
  apiKey: "AIzaSyCEdd9L6bljiauu7pFQVHkIAL2Qo4LJ1QM",
  authDomain: "kitap-01.firebaseapp.com",
  databaseURL: "https://kitap-01-default-rtdb.firebaseio.com",
  projectId: "kitap-01",
  storageBucket: "kitap-01.firebasestorage.app",
  messagingSenderId: "929324838289",
  appId: "1:929324838289:web:91c2f76304a0f6c20c3e30",
  measurementId: "G-TX5CYQJT40"
};

// 1) Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

let messaging = null;
if (await isSupported()) {
  messaging = getMessaging(app);
}
// 2) Analytics’i başlat
export const analytics = getAnalytics(app);

// 3) Auth & OAuth sağlayıcılar
export const auth = getAuth(app);
export const googleProvider   = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const githubProvider   = new GithubAuthProvider();
export const twitterProvider  = new TwitterAuthProvider();

// 4) Firestore (persistence ve long‐polling ile)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('IndexedDB persistence yalnızca tek bir sekmede aktif olabilir.');
  } else if (err.code === 'unimplemented') {
    console.warn('Tarayıcı bu Storage özelliklerini desteklemiyor.');
  }
});

// 5) Storage & Messaging
export const storage   = getStorage(app);
export {messaging};
