// src/App.jsx
import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toast, ToastContainer as RBToastContainer } from 'react-bootstrap';
import { ToastContainer as ReactToastifyContainer } from 'react-toastify';
import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { initNotifications } from './notifications';
import { NotificationsContext } from './contexts/NotificationsContext';

import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import RadialMenu from './components/RadialMenu';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import NotificationPrompt from './components/NotificationPrompt';
import BadgeCongratsModal from './components/BadgeCongratsModal';

import Register from './pages/Register';
import Login from './pages/Login';
import Feed from './pages/Feed';
import NewPost from './pages/NewPost';
import PostDetail from './pages/PostDetail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminModeration from './pages/AdminModeration';
import Bookmarks from './pages/Bookmarks';
import AuthorPage from './pages/AuthorPage';
import AdminReports from './pages/AdminReports';

export default function App() {
  const { currentUser } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [modalBadge, setModalBadge] = useState(null); // 👈 Rozet animasyon modali
  const location = useLocation();
  const { dark } = useTheme();

  // Push mesajları için
  const { pushMsgs } = useContext(NotificationsContext);
  const [toasts, setToasts] = useState([]);

  // Footer / BottomNav görünürlük
  const hideFooter = ['/login','/register'];
  const hideBottomNav = ['/login','/register'];
  const isFooterVisible = !hideFooter.includes(location.pathname);
  const isBottomNavVisible = currentUser && !hideBottomNav.includes(location.pathname);

  // 1) Push init
  useEffect(() => {
    if (currentUser) initNotifications(currentUser.uid);
  }, [currentUser]);

  // 2) Gelen push’u Toast olarak göster
  useEffect(() => {
    if (!pushMsgs.length) return;
    const { title, body, icon } = pushMsgs.slice(-1)[0];
    setToasts(ts => [...ts, { id: Date.now(), title, body, icon }]);
  }, [pushMsgs]);

  const removeToast = useCallback(id => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  // 3) Sağ tık → RadialMenu
  const handleContextMenu = useCallback(e => {
    if (!currentUser || window.innerWidth < 768) return;
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });
    setMenuVisible(true);
  }, [currentUser]);

  const handleCloseMenu = useCallback(() => {
    setMenuVisible(false);
    setMenuPos(null);
  }, []);

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [handleContextMenu]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape' && menuVisible) handleCloseMenu();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuVisible, handleCloseMenu]);

  useEffect(() => {
    if (currentUser && window.innerWidth >= 768) {
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 5000);
      return () => clearTimeout(t);
    }
    setShowHint(false);
  }, [currentUser]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (menuVisible) handleCloseMenu();
  }, [location.pathname, dark]);

  useEffect(() => {
    if (!currentUser && menuVisible) handleCloseMenu();
  }, [currentUser, menuVisible, handleCloseMenu]);

  return (
    <>
      {/* Badge Animasyonları için React Toastify Container */}
      <ReactToastifyContainer />

      {/* Rozet Popup Modal */}
      <BadgeCongratsModal
        badge={modalBadge}
        show={!!modalBadge}
        onClose={() => setModalBadge(null)}
      />

      {/* RadialMenu */}
      <RadialMenu visible={menuVisible} onClose={handleCloseMenu} pos={menuPos} />

      {/* Offline uyarısı */}
      {!online && (
        <RBToastContainer position="top-end" className="p-3">
          <Toast bg="warning" show autohide>
            <Toast.Body>
              Çevrimdışı moddasınız. Bazı özellikler kısıtlı olabilir.
            </Toast.Body>
          </Toast>
        </RBToastContainer>
      )}

      {/* Hint */}
      {showHint && (
        <RBToastContainer position="bottom-start" className="p-3">
          <Toast onClose={() => setShowHint(false)} show>
            <Toast.Body style={{fontSize:'0.85rem'}}>
              <strong>Sağ tıklayarak</strong> Radial Menü’yü açabilirsiniz. (Esc ile kapatın)
            </Toast.Body>
          </Toast>
        </RBToastContainer>
      )}

      {/* Push Notification Toasts */}
      <RBToastContainer position="top-end" className="p-3">
        {toasts.map(t => (
          <Toast
            key={t.id}
            onClose={() => removeToast(t.id)}
            show
            delay={5000}
            autohide
          >
            <Toast.Header>
              {t.icon && <img src={t.icon} width={20} className="me-2" alt="" />}
              <strong className="me-auto">{t.title}</strong>
            </Toast.Header>
            <Toast.Body>{t.body}</Toast.Body>
          </Toast>
        ))}
      </RBToastContainer>

      <div className="d-flex flex-column min-vh-100">
        {currentUser && <NotificationPrompt uid={currentUser.uid} />}
        <div className="content-container flex-grow-1">
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Feed setModalBadge={setModalBadge} /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><NewPost setModalBadge={setModalBadge} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile setModalBadge={setModalBadge} /></ProtectedRoute>} />
            <Route path="/post/:id" element={<ProtectedRoute><PostDetail setModalBadge={setModalBadge} /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard/></AdminRoute>} />
            <Route path="/admin/moderation" element={<AdminRoute><AdminModeration/></AdminRoute>} />
            <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks/></ProtectedRoute>} />
            <Route path="/author/:uid" element={<ProtectedRoute><AuthorPage/></ProtectedRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports/></AdminRoute>} />
          </Routes>
        </div>
        {isBottomNavVisible && (
          <div className="d-block d-md-none">
            <BottomNav />
          </div>
        )}
        {isFooterVisible && <Footer />}
      </div>
    </>
  );
}
