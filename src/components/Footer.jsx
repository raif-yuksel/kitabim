// src/components/Footer.jsx
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="app-footer py-4 mt-auto">
      <Container>
        <Row>
          <Col md={4} className="mb-3">
            <h5>Kitabım</h5>
            <p>Kültürel paylaşımların adresi. Kitap, şiir, fıkra ve daha fazlası…</p>
          </Col>
          <Col md={4} className="mb-3">
            <h6>Hızlı Bağlantılar</h6>
            <ul className="list-unstyled">
              <li><Link to="/">Ana Sayfa</Link></li>
              <li><Link to="/new">Yeni Gönderi</Link></li>
              <li><Link to="/bookmarks">Yer İşaretleri</Link></li>
              <li><Link to="/profile">Profilim</Link></li>
            </ul>
          </Col>
          <Col md={4} className="mb-3">
            <h6>İletişim & Sosyal</h6>
            <p>Email: <a href="">destek@kitabim.com</a></p>
            <p>
              <a href="" target="_blank" rel="noopener noreferrer">Twitter</a> •
              <a href="" target="_blank" rel="noopener noreferrer"> Facebook</a>
            </p>
            <small>© {currentYear} Kitabım. Tüm hakları saklıdır.</small>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}
