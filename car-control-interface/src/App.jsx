// src/App.js
import React from 'react';
import './App.css';
import ControlPanel from './ControlPanel';
import { useKeycloak } from './useKeycloak'; // Обновленный путь
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getTheme } from './theme'; // Именованный импорт
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

function App() {
    const { keycloak, initialized } = useKeycloak();
    const [darkMode, setDarkMode] = React.useState(false);

    const toggleDarkMode = () => {
        setDarkMode((prevMode) => !prevMode);
    };

    const theme = getTheme(darkMode ? 'dark' : 'light');

    if (!initialized) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    height: '100vh',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {keycloak.authenticated ? (
                <ControlPanel darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        height: '100vh',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <CircularProgress />
                </Box>
            )}
        </ThemeProvider>
    );
}

export default App;
