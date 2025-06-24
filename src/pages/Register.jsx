// src/pages/Register.jsx
import React, { useRef, useState } from 'react';
import {
  Form,
  Button,
  Card,
  Alert,
  Spinner,
  InputGroup,
  Container
} from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

export default function Register() {
  const emailRef     = useRef();
  const passRef      = useRef();
  const { register } = useAuth();
  const navigate     = useNavigate();
  const { dark }     = useTheme();

  const [error, setError]     = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validasyon state’leri
  const [emailValid, setEmailValid] = useState(true);
  const [passValid, setPassValid]   = useState(true);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmailValid(val === '' || validateEmail(val));
  };

  const handlePassChange = (e) => {
    const val = e.target.value;
    setPassValid(val === '' || val.length >= 6);
  };

  const toggleShowPassword = () => setShowPassword(prev => !prev);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Validasyon
    const email = emailRef.current.value.trim();
    const pass  = passRef.current.value.trim();
    if (!email || !validateEmail(email)) {
      setError('Geçerli bir e-posta girin.');
      setEmailValid(false);
      setLoading(false);
      return;
    }
    if (!pass || pass.length < 6) {
      setError('Parola en az 6 karakter olmalıdır.');
      setPassValid(false);
      setLoading(false);
      return;
    }

    try {
      let cred = await register(email, pass);
      if (!cred?.user) throw new Error('Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.');
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (verifErr) {
        setMessage('Kayıt başarılı! E-posta gönderilemedi, lütfen daha sonra deneyin.');
        setLoading(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }
      setMessage('Kayıt başarılı! E-posta kutunuzu kontrol edin.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err?.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="register-page" 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '1rem',
        backgroundColor: dark ? 'var(--color-bg-alt)' : 'var(--color-bg-alt)'
      }}
    >
      <Container style={{ maxWidth: '400px' }}>
        <Card className={`register-card shadow-lg rounded ${dark ? 'bg-dark text-light' : ''}`}>
          <Card.Body>
            <h2 className="mb-4 text-center">Kayıt Ol</h2>
            {error && (
              <Alert variant="danger" onClose={() => setError('')} dismissible>
                {error}
              </Alert>
            )}
            {message && (
              <Alert variant="success" onClose={() => setMessage('')} dismissible>
                {message}
              </Alert>
            )}
            <Form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <Form.Group id="email" className="mb-3">
                <Form.Label>Email</Form.Label>
                <InputGroup hasValidation>
                  <InputGroup.Text>
                    <FaEnvelope />
                  </InputGroup.Text>
                  <Form.Control
                    type="email"
                    ref={emailRef}
                    required
                    placeholder="E-posta adresi"
                    disabled={loading}
                    isInvalid={!emailValid}
                    onChange={handleEmailChange}
                    className={dark ? 'bg-secondary text-light border-0' : ''}
                  />
                  <Form.Control.Feedback type="invalid">
                    Geçerli bir e-posta girin.
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              {/* Parola */}
              <Form.Group id="password" className="mb-3">
                <Form.Label>Parola</Form.Label>
                <InputGroup hasValidation>
                  <InputGroup.Text>
                    <FaLock />
                  </InputGroup.Text>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    ref={passRef}
                    required
                    placeholder="Parolanız (en az 6 karakter)"
                    disabled={loading}
                    isInvalid={!passValid}
                    onChange={handlePassChange}
                    className={dark ? 'bg-secondary text-light border-0' : ''}
                  />
                  <Button
                    variant={dark ? 'outline-light' : 'outline-secondary'}
                    onClick={toggleShowPassword}
                    disabled={loading}
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    Parola en az 6 karakter olmalı.
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              {/* Kayıt Butonu */}
              <Button
                className="w-100 d-flex align-items-center justify-content-center mb-3"
                type="submit"
                disabled={loading}
                variant={dark ? 'primary' : 'primary'}
              >
                {loading
                  ? <Spinner animation="border" size="sm" />
                  : 'Kayıt Ol'}
              </Button>
            </Form>
            <div className="text-center">
              <small>
                Zaten hesabınız var mı?{' '}
                <Link to="/login">Giriş Yap</Link>
              </small>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
