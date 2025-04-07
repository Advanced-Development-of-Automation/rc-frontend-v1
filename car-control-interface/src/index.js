// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // Импорт из 'react-dom/client'
import App from './App';
import './global.css'; // Импорт глобальных стилей
import { ReactKeycloakProvider } from '@react-keycloak/web';
import keycloak from './keycloak';

const eventLogger = (event, error) => {
    console.log('onKeycloakEvent', event, error);
};

const tokenLogger = (tokens) => {
    console.log('onKeycloakTokens', tokens);
};

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
    <ReactKeycloakProvider
        authClient={keycloak}
        onEvent={eventLogger}
        onTokens={tokenLogger}
        initOptions={{
            onLoad: 'login-required', // Требовать вход при загрузке
            checkLoginIframe: false, // Отключить iframe проверки
            pkceMethod: 'S256',
            silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
            redirectUri: window.location.origin
        }}
    >
        <App />
    </ReactKeycloakProvider>
);
