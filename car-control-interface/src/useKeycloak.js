// src/useKeycloak.js
import { useKeycloak as useKeycloakOriginal } from '@react-keycloak/web';

export function useKeycloak() {
    const { keycloak, initialized } = useKeycloakOriginal();
    return { keycloak, initialized };
}
