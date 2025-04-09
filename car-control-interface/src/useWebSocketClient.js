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
            console.log('Received JSON message:', parsedData);
            
            // Устанавливаем сообщение в состояние
            setMessages(prevMessages => [...prevMessages, data]);
        } catch (e) {
            // Если не JSON, обрабатываем как текстовое сообщение
            console.log('Received text message:', data);
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
            
            // Формируем URL с параметрами jwt и car_id
            const wsUrl = `wss://81.200.149.133:9000/?jwt=${token}&car_id=${car_id}`;
            console.log('Connecting to WebSocket:', wsUrl);
            
            // Закрываем предыдущее соединение, если оно существует
            if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
                ws.current.close();
            }
            
            // Создаем новое WebSocket соединение
            ws.current = new WebSocket(wsUrl);

            // Обработчик успешного подключения
            ws.current.onopen = () => {
                console.log('Connected to WebSocket');
                setConnectionStatus(CONNECTION_STATUS.CONNECTED);
                setLastError(null);
            };

            // Обработчик входящих сообщений
            ws.current.onmessage = (event) => {
                console.log('Received:', event.data);
                handleMessage(event.data);
            };

            // Обработчик ошибок
            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setConnectionStatus(CONNECTION_STATUS.ERROR);
                setLastError('Ошибка WebSocket соединения');
            };

            // Обработчик закрытия соединения
            ws.current.onclose = (event) => {
                console.log('WebSocket Disconnected. Code:', event.code, 'Reason:', event.reason || '');
                setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
                
                // Автоматическое переподключение через 5 секунд, если соединение было закрыто не намеренно
                if (event.code !== 1000) { // 1000 - нормальное закрытие
                    console.log('Scheduling reconnection...');
                    
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        console.log('Attempting to reconnect...');
                        connectWebSocket();
                    }, 5000);
                }
            };
        } catch (error) {
            console.error('Error setting up WebSocket:', error);
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
                ws.current.close(1000, 'Component unmounted');
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [token, connectWebSocket]);

    // Функция для отправки сообщений
    const sendMessage = useCallback((message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                const messageToSend = typeof message === 'object' 
                    ? JSON.stringify(message) 
                    : message;
                    
                ws.current.send(messageToSend);
                console.log('Sent message:', messageToSend);
                return true;
            } catch (error) {
                console.error('Error sending message:', error);
                setLastError(`Ошибка при отправке сообщения: ${error.message}`);
                return false;
            }
        } else {
            console.error('WebSocket is not open. Unable to send message:', message);
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