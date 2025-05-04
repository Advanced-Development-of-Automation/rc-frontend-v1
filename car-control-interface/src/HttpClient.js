// src/HttpClient.js
import axios from 'axios';

export const httpClient = axios.create({
    baseURL: 'https://81.200.149.133:8443/', // Замените на ваш базовый URL
    headers: {
        'Content-Type': 'application/json',
    },
});

// Добавьте перехватчики (interceptors), если необходимо
httpClient.interceptors.request.use(
    (config) => {
        // Можно добавить токен или другие заголовки
        const token = localStorage.getItem('token'); // Пример
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);
