// src/components/RadialMenu.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  FaSun,
  FaMoon,
  FaHome,
  FaUser,
  FaPlus,
  FaBookmark,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus
} from 'react-icons/fa';
import '../styles/radial-menu.css'; // Radial menü CSS’inizi global import edin

/**
 * RadialMenu:
 *  - visible: boolean, menünün gösterilip gösterilmeyeceği
 *  - onClose: () => void, menüyü kapatma callback
 *  - pos: { x, y } opsiyonel, farenin olduğu noktaya açmak isterseniz
 */
const RadialMenu = ({ visible, onClose, pos }) => {
  const menuRef = useRef(null);
  const indicatorRef = useRef(null);
  const { currentUser, logout, userData } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  // Escape ve tıklama dışı kapatma
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
    };
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  // Menüdeki item’ları tanımlıyoruz. İkon ve route/action:
  const items = [];

  // Ana sayfa
  items.push({
    icon: <FaHome />,
    action: () => {
      navigate('/');
      onClose();
    },
    label: 'Ana Sayfa',
  });
  // Yeni paylaş
  if (currentUser) {
    items.push({
      icon: <FaPlus />,
      action: () => {
        navigate('/new');
        onClose();
      },
      label: 'Yeni Paylaş',
    });
  }
  // Yer işaretleri
  if (currentUser) {
    items.push({
      icon: <FaBookmark />,
      action: () => {
        navigate('/bookmarks');
        onClose();
      },
      label: 'Yer İşaretleri',
    });
  }
  // Profil
  if (currentUser) {
    items.push({
      icon: <FaUser />,
      action: () => {
        navigate('/profile');
        onClose();
      },
      label: 'Profil',
    });
  }
  // Giriş/Kayıt
  if (!currentUser) {
    items.push({
      icon: <FaSignInAlt />,
      action: () => {
        navigate('/login');
        onClose();
      },
      label: 'Giriş Yap',
    });
    items.push({
      icon: <FaUserPlus />,
      action: () => {
        navigate('/register');
        onClose();
      },
      label: 'Kayıt Ol',
    });
  }
  // Tema toggle
  items.push({
    icon: dark ? <FaSun /> : <FaMoon />,
    action: () => {
      toggle();
      // Menü açık kalabilir veya kapatmak istersen:
      // onClose();
    },
    label: dark ? 'Açık Moda Geç' : 'Koyu Moda Geç',
  });
  // Admin dashboard vs. (opsiyonel)
  if (userData?.role === 'admin') {
    items.push({
      icon: <FaUser />,
      action: () => {
        navigate('/admin');
        onClose();
      },
      label: 'Admin Dashboard',
    });
    items.push({
      icon: <FaUser />,
      action: () => {
        navigate('/admin/moderation');
        onClose();
      },
      label: 'Onay',
    });
    items.push({
      icon: <FaUser />,
      action: () => {
        navigate('/admin/reports');
        onClose();
      },
      label: 'Rapor',
    });
  }
  // Çıkış
  if (currentUser) {
    items.push({
      icon: <FaSignOutAlt />,
      action: async () => {
        await logout();
        onClose();
        navigate('/login');
      },
      label: 'Çıkış',
    });
  }

  // Hesapladıktan sonra açılacak item sayısı
  const count = items.length;
  const angleStep = 360 / count;

  // Güncelleme fonksiyonu (hover indicator)
  const updateIndicator = (newAngle) => {
    if (indicatorRef.current) {
      indicatorRef.current.style.display = 'block';
      indicatorRef.current.style.setProperty('--indicator-angle', `${newAngle}deg`);
    }
  };
  const handleMouseLeave = () => {
    if (indicatorRef.current) indicatorRef.current.style.display = 'none';
  };

  // Menü pozisyonu: Eğer pos verilmişse absolute olarak fare noktasına aç, yoksa fixed merkezde
  const style = pos
    ? {
        display: 'flex',
      }
    : {
        display: 'flex',
      };

  return (
    <div id="customMenu" ref={menuRef} style={style}>
      <nav id="menu" onMouseLeave={handleMouseLeave}>
        {items.map((item, index) => {
          const angle = index * -angleStep;
          return (
            <button
              key={index}
              type="button"
              className="item"
              style={{ '--angle': `${angle}deg` }}
              onMouseEnter={() => updateIndicator(angle + 60)}
              onClick={item.action}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
        <div id="center">
            <p>KİTABIM</p>
            <small>MENÜ</small>
        </div>
      </nav>
      {/* Hover indicator */}
      <div id="indicator" ref={indicatorRef} style={{ display: 'none' }} />
      {/* SVG clipPath veya başka dekorasyon varsa: */}
      <svg height="0" width="0">
        <defs>
          <clipPath clipPathUnits="objectBoundingBox" id="sector">
            {/* JSX içinde class yerine className, stroke-width yerine strokeWidth */}
            <path
              fill="none"
              stroke="#111"
              strokeWidth="1"
              className="sector"
              d="M0.5,0.5 l0.5,0 A0.5,0.5 0 0,0 0.75,.066987298 z"
            ></path>
          </clipPath>
        </defs>
      </svg>
    </div>
  );
};

export default RadialMenu;
