// src/components/NotificationBell.jsx
import React, { useContext, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { NotificationsContext } from '../contexts/NotificationsContext';
import { Bell } from 'react-bootstrap-icons';
import '../styles/NotificationBell.css';

export default function NotificationBell() {
  const { notifications, markAsRead } = useContext(NotificationsContext);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;
  const navigate = useNavigate();

  // Bildirime tıklanınca ilgili yere yönlendirme fonksiyonu
  const handleNotificationClick = n => {
    markAsRead(n.id);
    setOpen(false);
    // Bildirim tipine göre yönlendir
    if ((n.type === "comment" || n.type === "like" || n.type === "favorite") && n.postId) {
      navigate(`/post/${n.postId}`);
    } else if (n.type === "reply" && n.postId) {
      navigate(`/post/${n.postId}#comments`);
    } else if (n.type === "follow" && n.followerId) {
      navigate(`/author/${n.followerId}`);
    }
    // Ekstra: Diğer türlerde sayfa yoksa sadece okunduya çeker
  };

  return (
    <div style={{ position: 'relative' }}>
      <Bell size={24} onClick={() => setOpen(o => !o)} />
      {unreadCount > 0 && (
        <span className="badge badge-danger">{unreadCount}</span>
      )}
      {open && (
        <div className="notif-dropdown">
          {notifications.length === 0 ? (
            <div className="notif-item empty">
              <small>Henüz bildirimin yok.</small>
            </div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              className={`notif-item ${n.read ? '' : 'unread'}`}
              onClick={() => handleNotificationClick(n)}
              style={{ cursor: 'pointer' }}
            >
              <small>{n.message}</small>
              <br />
              <small className="text-muted">
                {n.createdAt?.toDate?.() ? n.createdAt.toDate().toLocaleString() : ''}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
