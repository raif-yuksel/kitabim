// src/components/BadgesGrid.jsx
import React from "react";
import "../styles/BadgesGrid.css"; // Aşağıda stil var

export default function BadgesGrid({ badges, earnedIds = [] }) {
  return (
    <div className="badges-grid">
      {badges.map(badge => (
        <div
          key={badge.id}
          className={`badge-item ${earnedIds.includes(badge.id) ? "earned" : "locked"}`}
          title={badge.title + ": " + badge.description}
        >
          <img src={badge.iconUrl} alt={badge.title} />
          <span>{badge.title}</span>
        </div>
      ))}
    </div>
  );
}
