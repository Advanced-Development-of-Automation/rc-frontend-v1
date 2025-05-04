// src/theme.js
import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) =>
    createTheme({
        palette: {
            mode,
            primary: {
                main: '#0D47A1', // Темно-синий цвет
            },
            secondary: {
                main: '#FF6F00', // Ярко-оранжевый цвет
            },
            error: {
                main: '#f44336', // Красный цвет для ошибок
            },
            success: {
                main: '#4caf50', // Зеленый цвет для успеха
            },
            background: {
                default: mode === 'dark' ? '#121212' : '#F5F5F5',
            },
        },
        typography: {
            fontFamily: 'Roboto, sans-serif',
        },
    });
