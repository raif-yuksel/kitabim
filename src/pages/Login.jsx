// src/pages/Login.jsx
import React, { useRef, useState } from 'react';
import {
  Form,
  Button,
  Card,
  Alert,
  InputGroup
} from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  facebookProvider,
  githubProvider,
  twitterProvider
} from '../firebase';

// react-icons
import { FaGoogle, FaFacebookF, FaGithub, FaTwitter } from 'react-icons/fa';

export default function Login() {
  const emailRef = useRef();
  const passRef  = useRef();
  const { login }= useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(emailRef.current.value, passRef.current.value);
      navigate('/');
    } catch (e) {
      setError('Giriş başarısız: ' + e.message);
    }
    setLoading(false);
  }

  // Sosyal giriş fonksiyonu
  const socialLogin = provider => async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (e) {
      setError('Sosyal giriş başarısız: ' + e.message);
    }
    setLoading(false);
  };

  // Parola sıfırlama
  async function handleReset() {
    const email = emailRef.current.value;
    if (!email) {
      setError('Önce e-posta adresinizi girin.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Şifre sıfırlama linki e-posta adresinize gönderildi.');
    } catch (e) {
      setError('Şifre sıfırlama hatası: ' + e.message);
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <Card.Body>
          <h2 className="mb-4 text-center">Giriş Yap</h2>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            {/* Email */}
            <Form.Group id="email" className="mb-3">
              <Form.Label>Email</Form.Label>
              <InputGroup>
                <InputGroup.Text>@</InputGroup.Text>
                <Form.Control
                  type="email"
                  ref={emailRef}
                  required
                  placeholder="E-posta adresi"
                  disabled={loading}
                />
              </InputGroup>
            </Form.Group>

            {/* Parola */}
            <Form.Group id="password" className="mb-3">
              <Form.Label>Parola</Form.Label>
              <Form.Control
                type="password"
                ref={passRef}
                required
                placeholder="Parolanız"
                disabled={loading}
              />
            </Form.Group>

            {/* Giriş Butonu */}
            <Button
              className="w-100 mb-2"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>

            {/* Şifremi Unuttum */}
            <div className="text-center mb-3">
              <Button
                variant="link"
                onClick={handleReset}
                disabled={loading}
              >
                Şifremi Unuttum?
              </Button>
            </div>
          </Form>

          <hr />

          <div className="text-center mb-3">
            <small>Veya sosyal hesapla giriş yap</small>
          </div>

          {/* Sosyal Giriş Butonları */}
          <div className="d-grid gap-2">
            <Button
              variant="outline-danger"
              onClick={socialLogin(googleProvider)}
              disabled={loading}
              className="d-flex align-items-center justify-content-center"
            >
              <FaGoogle className="me-2" /> Google ile Giriş
            </Button>
          </div>

          {/* Kayıt Sayfası Linki */}
          <div className="mt-4 text-center">
            <small>
              Hesabınız yok mu?{' '}
              <Link to="/register">Kayıt Ol</Link>
            </small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
