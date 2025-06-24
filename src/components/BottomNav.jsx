// src/components/BottomNav.jsx
import React from 'react';
import { Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FaHome,
  FaPlus,
  FaBookmark,
  FaUser,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus
} from 'react-icons/fa';
import '../styles/bottom-nav.css';

export default function BottomNav() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Çıkış hatası:', e);
    }
  };

  return (
    <Nav className="bottom-nav d-flex justify-content-around align-items-center">
      {/* Ana Sayfa */}
      <Nav.Item className="nav-icon" onClick={() => navigate('/')}>
        <FaHome size={24} />
      </Nav.Item>

      {/* Yeni Paylaş (giriş varsa) */}
      {currentUser && (
        <Nav.Item className="nav-icon" onClick={() => navigate('/new')}>
          <FaPlus size={24} />
        </Nav.Item>
      )}

      {/* Yer İşaretleri */}
      {currentUser && (
        <Nav.Item className="nav-icon" onClick={() => navigate('/bookmarks')}>
          <FaBookmark size={24} />
        </Nav.Item>
      )}

      {/* Profil */}
      {currentUser && (
        <Nav.Item className="nav-icon" onClick={() => navigate('/profile')}>
          <FaUser size={24} />
        </Nav.Item>
      )}

      {/* Giriş / Kayıt (giriş yoksa) */}
      {!currentUser && (
        <>
          <Nav.Item className="nav-icon" onClick={() => navigate('/login')}>
            <FaSignInAlt size={24} />
          </Nav.Item>
          <Nav.Item className="nav-icon" onClick={() => navigate('/register')}>
            <FaUserPlus size={24} />
          </Nav.Item>
        </>
      )}

      {/* Çıkış */}
      {currentUser && (
        <Nav.Item className="nav-icon" onClick={handleLogout}>
          <FaSignOutAlt size={24} />
        </Nav.Item>
      )}
    </Nav>
  );
}
