// src/components/BadgeCongratsModal.jsx
import React from "react";
import Modal from "react-bootstrap/Modal";
import "../styles/BadgeCongratsModal.css";

// avatarUrl: kullanıcı profil görseli (opsiyonel)
export default function BadgeCongratsModal({ badge, show, onClose, avatarUrl }) {
  if (!badge) return null;
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Body className="badge-congrats-body">
        <div className="badge-congrats-anim">
          {avatarUrl && (
          <div className="badge-user-avatar">
            <img
              src={avatarUrl}
              alt="Kullanıcı"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "2px solid #5cb85c",
                margin: "10px auto 0",
                boxShadow: "0 2px 8px #0002"
              }}
            />
          </div>
        )}
          <div className="badge-firework"></div>
        </div>
        <h4>Tebrikler! <span role="img" aria-label="celebrate">🎉</span></h4>
        <div className="badge-title">{badge.title}</div>
        <div className="badge-desc">{badge.description}</div>
        <button className="btn btn-success mt-3 animated-btn" onClick={onClose}>
          Tamam
        </button>
      </Modal.Body>
    </Modal>
  );
}
