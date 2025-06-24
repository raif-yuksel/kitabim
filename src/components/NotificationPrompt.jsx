// src/components/NotificationPrompt.jsx
import React from "react";
import { initNotifications } from "../notifications";

export default function NotificationPrompt({ uid }) {
  // Bildirim izni zaten varsa gösterme
  if (!uid || Notification.permission === "granted") return null;

  return (
    <div style={{
      background: "#fff3cd",
      border: "1px solid #ffe066",
      color: "#664d03",
      borderRadius: 8,
      padding: "12px 16px",
      margin: "16px auto",
      maxWidth: 420,
      display: "flex",
      alignItems: "center",
      gap: 16
    }}>
      <span style={{ flex: 1 }}>Bildirim almak ister misiniz?</span>
      <button
        style={{
          background: "#ffe066",
          border: "none",
          borderRadius: 4,
          padding: "7px 14px",
          fontWeight: "bold",
          color: "#664d03",
          cursor: "pointer"
        }}
        onClick={() => initNotifications(uid)}
      >
        Bildirime İzin Ver
      </button>
    </div>
  );
}
