// src/components/Navbar.jsx
import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

export default function AppNavbar() {
  const { currentUser, logout, userData } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <Navbar bg={dark ? 'dark' : 'light'} variant={dark ? 'dark' : 'light'} expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Kitabım
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            {currentUser && (
              <Nav.Link as={Link} to="/new">
                + Yeni Paylaş
              </Nav.Link>
            )}
            {userData?.role === 'admin' && (
              <Nav.Link as={Link} to="/admin">
                Dashboard
              </Nav.Link>
            )}
            {userData?.role === 'admin' && (
              <Nav.Link as={Link} to="/admin/moderation">
                Onay
              </Nav.Link>
            )}
          </Nav>
          <Nav className="align-items-center">
            {currentUser && (
              <Nav.Link as={Link} to="/bookmarks">
                🔖 Yer İşaretleri
              </Nav.Link>
            )}
            <Nav.Link onClick={toggle} className="me-2">
              {dark ? <FaSun /> : <FaMoon />}
            </Nav.Link>
            {currentUser ? (
              <>
                <Navbar.Text className="me-3">
                  Hoşgeldin, <Nav.Link as={Link} to="/profile">{userData?.displayName || currentUser.email}</Nav.Link>
                </Navbar.Text>
                <Button variant="outline-danger" onClick={handleLogout}>
                  Çıkış
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} to="/login" variant="outline-primary" className="me-2">
                  Giriş Yap
                </Button>
                <Button as={Link} to="/register" variant="primary">
                  Kayıt Ol
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
