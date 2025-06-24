// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationsProvider } from './contexts/NotificationsContext'; // <-- ekledik
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <NotificationsProvider> {/* Bildirim context */}
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </NotificationsProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
