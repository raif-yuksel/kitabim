// components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
   if (!currentUser.emailVerified) {
     return <p>Lütfen e-posta adresinizi doğrulayın.</p>;
    }
  return children;
}