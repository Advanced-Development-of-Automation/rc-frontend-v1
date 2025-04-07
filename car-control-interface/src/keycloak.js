// src/keycloak.js
import Keycloak from 'keycloak-js';

// Создаем singleton экземпляр Keycloak
let keycloakInstance = null;

const createKeycloak = () => {
    if (!keycloakInstance) {
        keycloakInstance = new Keycloak({
            url: process.env.REACT_APP_KEYCLOAK_URL || 'https://81.200.149.133:8443',
            realm: process.env.REACT_APP_KEYCLOAK_REALM || 'default',
            clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'rc-frontend-1',
        });
    }
    return keycloakInstance;
};

const keycloak = createKeycloak();

export default keycloak;
