// src/useWebSocketClient.js
import { useState, useEffect, useRef, useCallback } from 'react';

// Константы статусов WebSocket соединения
export const CONNECTION_STATUS = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error'
};

export function useWebSocketClient(token) {
    const [messages, setMessages] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
    const [lastError, setLastError] = useState(null);
    const ws = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const car_id = "cmMtY2FyLWNsaWVudCMwMDE="; // car id in base64
    
    // Функция для обработки сообщений от WebSocket
    const handleMessage = useCallback((data) => {
        try {
            // Пробуем распарсить JSON, если сообщение в формате JSON
            const parsedData = JSON.parse(data);
            console.log('Получено сообщение JSON:', parsedData);
            
            // Можно обрабатывать разные типы сообщений
            if (parsedData.type === 'command_response') {
                // Обработка ответа на команду
                setMessages(prevMessages => [...prevMessages, parsedData.message || data]);
            } else if (parsedData.type === 'telemetry') {
                // Обработка телеметрии (может быть добавлено позже)
                console.log('Получены данные телеметрии:', parsedData.data);
            } else {
                // Обработка других типов сообщений
                setMessages(prevMessages => [...prevMessages, data]);
            }
        } catch (e) {
            // Если не JSON, обрабатываем как текстовое сообщение
            console.log('Получено текстовое сообщение:', data);
            setMessages(prevMessages => [...prevMessages, data]);
        }
    }, []);

    // Функция для подключения к WebSocket
    const connectWebSocket = useCallback(() => {
        if (!token) {
            setConnectionStatus(CONNECTION_STATUS.ERROR);
            setLastError('Отсутствует токен авторизации');
            return;
        }
        
        try {
            setConnectionStatus(CONNECTION_STATUS.CONNECTING);
            
            // Используем URL из переменных окружения
            const wsUrl = process.env.REACT_APP_WS_URL || 'wss://81.200.149.133:9000';
            
            console.log('Подключение к WebSocket:', wsUrl);
            
            // Закрываем предыдущее соединение, если оно существует
            if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
                ws.current.close();
            }
            
            // Создаем новое WebSocket соединение
            ws.current = new WebSocket(wsUrl);

            // Обработчик успешного подключения
            ws.current.onopen = () => {
                console.log('WebSocket подключен');
                setConnectionStatus(CONNECTION_STATUS.CONNECTED);
                setLastError(null);
                
                // Отправляем авторизационные данные
                if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    try {
                        const authMessage = {
                            type: 'auth', 
                            token: token,
                            car_id: car_id
                        };
                        
                        console.log('Отправка авторизационных данных');
                        ws.current.send(JSON.stringify(authMessage));
                    } catch (error) {
                        console.error('Ошибка отправки сообщения:', error);
                    }
                }
            };

            // Обработчик входящих сообщений
            ws.current.onmessage = (event) => {
                console.log('Получены данные:', event.data);
                handleMessage(event.data);
            };

            // Обработчик ошибок
            ws.current.onerror = (error) => {
                console.error('Ошибка WebSocket:', error);
                setConnectionStatus(CONNECTION_STATUS.ERROR);
                setLastError('Ошибка WebSocket соединения');
            };

            // Обработчик закрытия соединения
            ws.current.onclose = (event) => {
                console.log('WebSocket соединение закрыто. Код:', event.code, 'Причина:', event.reason);
                setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
                
                // Автоматическое переподключение через 5 секунд, если соединение было закрыто не намеренно
                if (event.code !== 1000) { // 1000 - нормальное закрытие
                    console.log('Планирование переподключения...');
                    
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('Попытка переподключения...');
                        connectWebSocket();
                    }, 5000);
                }
            };
        } catch (error) {
            console.error('Ошибка настройки WebSocket:', error);
            setConnectionStatus(CONNECTION_STATUS.ERROR);
            setLastError(`Ошибка при настройке WebSocket: ${error.message}`);
        }
    }, [token, handleMessage]);

    // Подключение к WebSocket при монтировании компонента или изменении токена
    useEffect(() => {
        connectWebSocket();
        
        // Очистка при размонтировании
        return () => {
            if (ws.current) {
                ws.current.close(1000, 'Компонент размонтирован');
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [token, connectWebSocket]);

    // Функция для отправки сообщений
    const sendMessage = useCallback((message, type = 'command') => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                // Отправляем сообщение в виде JSON с типом
                const messageToSend = typeof message === 'object' 
                    ? JSON.stringify(message) 
                    : JSON.stringify({ type, message });
                    
                ws.current.send(messageToSend);
                console.log('Отправлено сообщение:', messageToSend);
                return true;
            } catch (error) {
                console.error('Ошибка отправки сообщения:', error);
                setLastError(`Ошибка при отправке сообщения: ${error.message}`);
                return false;
            }
        } else {
            console.error('WebSocket не подключен. Невозможно отправить сообщение.');
            setLastError('WebSocket не подключен. Невозможно отправить сообщение.');
            return false;
        }
    }, []);

    // Функция для ручного переподключения
    const reconnect = useCallback(() => {
        if (connectionStatus !== CONNECTION_STATUS.CONNECTING) {
            connectWebSocket();
        }
    }, [connectionStatus, connectWebSocket]);

    // Очистка очереди сообщений
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return { 
        messages, 
        sendMessage, 
        connectionStatus, 
        lastError, 
        reconnect,
        clearMessages 
    };
}
