import React from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { SafetyProvider } from './context/SafetyContext';
import { initServiceWorker } from './services/serviceWorker';

initServiceWorker();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <AuthProvider>
        <SafetyProvider>
          <App />
        </SafetyProvider>
      </AuthProvider>
    </AppProvider>
  </React.StrictMode>
);
