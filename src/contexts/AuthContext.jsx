import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData]       = useState(null);
  const [loading, setLoading]         = useState(true);

  async function register(email, password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Sadece yeni kullanıcı için doküman oluştur!
      const uref = doc(db, 'users', cred.user.uid);
      await setDoc(uref, {
        displayName: cred.user.email,
        avatarUrl: '',
        bio: '',
        role: 'user'
      }, { merge: true });
      return cred;
    } catch (err) {
      console.error('register hata:', err.code, err.message);
      throw err;
    }
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  // Kullanıcı değiştiğinde dokümanı oku, varsa güncelleme!
  useEffect(() => {
    let unsubscribeUser = () => {};
    setLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        const uref = doc(db, 'users', user.uid);
        // Eğer Firestore'da user dokümanı yoksa (yeni bir Google login vs. ise), doküman yarat:
        const snap = await getDoc(uref);
        if (!snap.exists()) {
          await setDoc(uref, {
            displayName: user.email,
            avatarUrl: '',
            bio: '',
            role: 'user'
          }, { merge: true });
        }
        // Firestore'dan dinle!
        unsubscribeUser = onSnapshot(uref, snap => {
          setUserData(snap.exists() ? snap.data() : null);
          setLoading(false);
        }, err => {
          console.error('AuthContext onSnapshot error:', err);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => {
      unsubscribeAuth();
      unsubscribeUser();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    register,
    login,
    logout
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
