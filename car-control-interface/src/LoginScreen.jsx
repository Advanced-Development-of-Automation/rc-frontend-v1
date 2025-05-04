// LoginScreen.jsx
import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Card, CardContent } from '@mui/material';
import { useTheme } from '@mui/material/styles';

function LoginScreen({ onLogin }) {
    const theme = useTheme();
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLoginClick = () => {
        if (login === '' || password === '') {
            setError('Пожалуйста, заполните все поля');
            return;
        }
        // Реализуйте реальную логику авторизации
        setError('');
        onLogin();
    };

    return (
        <Box
            sx={{
                backgroundColor: theme.palette.background.default,
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 2,
            }}
        >
            <Card sx={{ width: 300, borderRadius: 4, boxShadow: 6 }}>
                <CardContent>
                    <Typography variant="h5" align="center" gutterBottom>
                        Войти
                    </Typography>
                    <TextField
                        label="Логин"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                    />
                    <TextField
                        label="Пароль"
                        type="password"
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && (
                        <Typography color="error" variant="body2" align="center">
                            {error}
                        </Typography>
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={handleLoginClick}
                    >
                        Войти
                    </Button>
                </CardContent>
            </Card>
        </Box>
    );
}

export default LoginScreen;
