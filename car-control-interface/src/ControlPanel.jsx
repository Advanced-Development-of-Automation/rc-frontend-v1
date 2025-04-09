// src/ControlPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Grid,
    Typography,
    Button,
    Select,
    MenuItem,
    TextField,
    Card,
    CardContent,
    LinearProgress,
    IconButton,
    Tooltip,
    Snackbar,
    CircularProgress,
    Paper,
    Stack,
    Divider,
    Fade,
    Zoom,
} from '@mui/material';
import {
    Speed as SpeedIcon,
    BatteryChargingFull as BatteryIcon,
    CameraAlt as CameraIcon,
    Refresh as RefreshIcon,
    PowerSettingsNew as PowerOffIcon,
    Send as SendIcon,
    SettingsInputHdmi as PortIcon,
    Brightness4 as Brightness4Icon,
    Brightness7 as Brightness7Icon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    HourglassEmpty as HourglassEmptyIcon,
    Map as MapIcon,
    Videocam as VideocamIcon,
    Info as InfoIcon,
    Terminal as TerminalIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon,
    ArrowBack as ArrowLeftIcon,
    ArrowForward as ArrowRightIcon,
    Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useWebSocketClient, CONNECTION_STATUS } from './useWebSocketClient';
import { useKeycloak } from './useKeycloak';

// Исправление для стандартной иконки маркера Leaflet в React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Компонент-заглушка для видеопотока с дополнительными свойствами для отображения
const VideoPlaceholder = ({ cameraName, isMain, onClick, position, sx }) => {
    // Определяем иконку в зависимости от позиции камеры
    let directionIcon;
    switch (position) {
        case 'Front':
            directionIcon = <ArrowUpwardIcon sx={{ fontSize: 24, position: 'absolute', bottom: 8, right: 8, color: 'rgba(255, 255, 255, 0.7)' }} />;
            break;
        case 'Back':
            directionIcon = <ArrowDownwardIcon sx={{ fontSize: 24, position: 'absolute', bottom: 8, right: 8, color: 'rgba(255, 255, 255, 0.7)' }} />;
            break;
        case 'Left':
            directionIcon = <ArrowLeftIcon sx={{ fontSize: 24, position: 'absolute', bottom: 8, right: 8, color: 'rgba(255, 255, 255, 0.7)' }} />;
            break;
        case 'Right':
            directionIcon = <ArrowRightIcon sx={{ fontSize: 24, position: 'absolute', bottom: 8, right: 8, color: 'rgba(255, 255, 255, 0.7)' }} />;
            break;
        default:
            directionIcon = null;
    }
    
    return (
        <Box
            onClick={onClick}
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                backgroundColor: '#1e1e1e',
                borderRadius: 2,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: isMain ? 8 : 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
                border: isMain ? '2px solid #4caf50' : 'none',
                '&:hover': {
                    boxShadow: 6,
                    transform: isMain ? 'scale(1.01)' : 'scale(1.05)',
                },
                ...sx
            }}
        >
            {/* Название камеры */}
            <Typography 
                variant={isMain ? "h6" : "subtitle2"} 
                sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    left: 8, 
                    backgroundColor: 'rgba(0,0,0,0.6)', 
                    p: 0.5, 
                    borderRadius: 1,
                    zIndex: 2
                }}
            >
                {cameraName}
            </Typography>
            
            {/* Иконка камеры в центре */}
            <VideocamIcon sx={{ 
                fontSize: isMain ? 60 : 40, 
                color: 'rgba(255, 255, 255, 0.3)',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            }} />
            
            {/* Иконка позиции камеры */}
            {directionIcon}
            
            {/* Иконка полноэкранного режима только для главной камеры */}
            {isMain && (
                <FullscreenIcon sx={{ 
                    fontSize: 24, 
                    position: 'absolute', 
                    top: 8, 
                    right: 8, 
                    color: 'rgba(255, 255, 255, 0.7)',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: '50%',
                    p: 0.5
                }} />
            )}
            
            {/* Здесь будет реальное видео */}
            {/* <video src={videoUrl} autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> */}
        </Box>
    );
};

// Главный компонент
function ControlPanel({ darkMode, toggleDarkMode }) {
    // Состояния компонента
    const [port, setPort] = useState(localStorage.getItem('selectedPort') || '');
    const [command, setCommand] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [commandError, setCommandError] = useState(false);
    const [portStatus, setPortStatus] = useState('idle'); // 'idle', 'connecting', 'error', 'ready'
    const [cameraEnabled, setCameraEnabled] = useState(false); // Состояние для доступности камер/управления
    const [mainCamera, setMainCamera] = useState('Front'); // По умолчанию основная камера - передняя
    
    // Новые состояния для телеметрии
    const [telemetry, setTelemetry] = useState({
        speed: 0,
        battery: 0,
        coordinates: { lat: 51.505, lng: -0.09 },
        status: 'stopped',
        lastUpdate: null
    });
    
    const [mapCenter, setMapCenter] = useState([51.505, -0.09]);
    const [mapZoom, setMapZoom] = useState(13);

    const theme = useTheme();
    const mapRef = useRef(null);

    // Использование Keycloak
    const { keycloak } = useKeycloak();

    // Использование WebSocket клиента с токеном
    const { 
        messages, 
        sendMessage, 
        connectionStatus, 
        lastError, 
        reconnect 
    } = useWebSocketClient(keycloak.token);

    // Обработка изменения порта
    const handlePortChange = (event) => {
        const selectedPort = event.target.value;
        setPort(selectedPort);
        localStorage.setItem('selectedPort', selectedPort);
        setPortStatus('idle');
        setCameraEnabled(false); // Сброс доступности камер при смене порта
    };

    // Обработка отправки команды
    const handleSendCommand = () => {
        if (command.trim() === '') {
            setCommandError(true);
            return;
        }
        setCommandError(false);
        setIsLoading(true);
        
        // Проверяем успешность отправки сообщения
        const success = sendMessage(command);
        if (!success) {
            setResponse("Ошибка отправки команды: " + lastError);
            setSnackbarOpen(true);
            setIsLoading(false);
        }
        
        setCommand('');
    };

    // Обработка изменения команды
    const handleCommandChange = (e) => {
        setCommand(e.target.value);
        if (e.target.value.trim() !== '') {
            setCommandError(false);
        }
    };

    // Обработка клика по камере - установка её как главной
    const handleCameraClick = (camName) => {
        if (!cameraEnabled) return;
        setMainCamera(camName);
        console.log(`Camera ${camName} set as main`);
    };

    // Обработка подключения к порту
    const handleConnectPort = () => {
        if (!port) return;
        setPortStatus('connecting');
        setCameraEnabled(false);

        // Проверяем статус WebSocket соединения
        if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
            console.log('Пробуем переподключиться к WebSocket серверу...');
            reconnect(); // Пытаемся переподключиться, если соединение не установлено
            
            // Даем время на переподключение
            setTimeout(() => {
                if (connectionStatus === CONNECTION_STATUS.CONNECTED) {
                    console.log('WebSocket успешно подключен, отправляем команду подключения к порту');
                    sendPortConnectionCommand();
                } else {
                    console.log('WebSocket не удалось подключиться');
                    setPortStatus('error');
                    setSnackbarOpen(true);
                    setResponse('Ошибка подключения к WebSocket серверу');
                    setCameraEnabled(false);
                }
            }, 2000);
        } else {
            console.log('WebSocket подключен, отправляем команду подключения к порту');
            sendPortConnectionCommand();
        }
    };

    // Функция для отправки команды подключения к порту
    const sendPortConnectionCommand = () => {
        // Отправляем команду подключения к порту через WebSocket
        const success = sendMessage(JSON.stringify({
            type: 'port_connection',
            port: port,
            action: 'connect'
        }));
        
        console.log('Отправка команды подключения порта:', success);
        
        if (!success) {
            setPortStatus('error');
            setSnackbarOpen(true);
            setResponse('Ошибка отправки команды подключения к порту');
            setCameraEnabled(false);
            return;
        }
        
        // Имитируем успешное подключение для тестирования интерфейса
        // В реальном приложении эта логика должна зависеть от ответа сервера
        const successTimeout = setTimeout(() => {
            setPortStatus('ready');
            setSnackbarOpen(true);
            setResponse('Порт подключен, камеры доступны');
            setCameraEnabled(true);
        }, 3000);
        
        return () => {
            clearTimeout(successTimeout);
        };
    };

    // Автоматическое подключение при инициализации, если порт сохранен
    useEffect(() => {
        if (port) {
            handleConnectPort();
        }
    }, []);

    // Автоматическое закрытие уведомления
    useEffect(() => {
        if (snackbarOpen) {
            const timer = setTimeout(() => {
                setSnackbarOpen(false);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [snackbarOpen]);

    // Обработка сообщений WebSocket - добавим отладочную информацию
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            console.log('Получено новое сообщение:', lastMessage);
            
            // Специальная обработка для сообщений с UUID и других специальных форматов
            if (typeof lastMessage === 'string') {
                // Проверим на формат ID + случайные символы (например, 57766995IyWGVTdRftWEdZw)
                if (/^\d{8}[a-zA-Z0-9]{12,}$/.test(lastMessage)) {
                    console.log('Распознан ID сообщения:', lastMessage);
                    return; // Просто игнорируем такие сообщения, это ID
                }
                
                // Проверим на формат "Recieved: {...}|timestamp"
                if (lastMessage.startsWith('Recieved:')) {
                    try {
                        // Извлекаем JSON часть из сообщения
                        const parts = lastMessage.split('|');
                        const jsonPart = parts[0].replace('Recieved: ', '').trim();
                        const parsedMessage = JSON.parse(jsonPart);
                        
                        console.log('Извлечено сообщение из ответа:', parsedMessage);
                        
                        // Обработка успешно распарсенного сообщения
                        handleParsedMessage(parsedMessage);
                        return;
                    } catch (e) {
                        console.log('Не удалось извлечь JSON из сообщения с префиксом:', e);
                    }
                }
            }
            
            try {
                // Стандартный парсинг JSON
                const parsedMessage = typeof lastMessage === 'string' ? 
                    JSON.parse(lastMessage) : lastMessage;
                
                console.log('Сообщение успешно распарсено:', parsedMessage);
                
                // Обработка стандартного JSON-сообщения
                handleParsedMessage(parsedMessage);
            } catch (e) {
                // Если не удалось распарсить как JSON, просто показываем текст
                console.log('Не удалось распарсить сообщение как JSON:', e);
                
                // Некоторые ответы могут быть в нестандартном формате, 
                // просто отображаем их как текст
                setResponse(`Получено: ${lastMessage}`);
                setSnackbarOpen(true);
                setIsLoading(false);
            }
        }
    }, [messages]);
    
    // Вспомогательная функция для обработки распарсенных сообщений
    const handleParsedMessage = (parsedMessage) => {
        // Обрабатываем разные типы сообщений
        if (parsedMessage.type === 'port_connection_response') {
            // Ответ на запрос подключения к порту
            if (parsedMessage.status === 'success') {
                setPortStatus('ready');
                setCameraEnabled(true);
            } else {
                setPortStatus('error');
                setCameraEnabled(false);
            }
            setResponse(parsedMessage.message || 'Статус порта изменен');
            setSnackbarOpen(true);
        } else if (parsedMessage.type === 'telemetry') {
            // Обработка телеметрии
            const { data } = parsedMessage;
            if (data) {
                setTelemetry({
                    speed: data.speed || 0,
                    battery: data.battery || 0,
                    coordinates: data.coordinates || telemetry.coordinates,
                    status: data.status || 'unknown',
                    lastUpdate: data.timestamp || Date.now()
                });
                
                // Обновляем центр карты, если автомобиль движется
                if (data.coordinates && data.status === 'moving') {
                    setMapCenter([data.coordinates.lat, data.coordinates.lng]);
                    
                    // Перемещаем карту к новым координатам
                    if (mapRef.current) {
                        mapRef.current.setView(
                            [data.coordinates.lat, data.coordinates.lng],
                            mapZoom,
                            { animate: true }
                        );
                    }
                }
            }
        } else if (parsedMessage.type === 'command_response') {
            // Ответы на команды
            setResponse(`Ответ: ${parsedMessage.message || JSON.stringify(parsedMessage)}`);
            setSnackbarOpen(true);
            setIsLoading(false);
        } else if (parsedMessage.type === 'auth_response') {
            // Ответ на авторизацию
            setResponse(`Авторизация: ${parsedMessage.status === 'success' ? 'успешна' : 'ошибка'}`);
            setSnackbarOpen(true);
        } else if (parsedMessage.type === 'test_message') {
            // Ответ на тестовое сообщение
            setResponse(`Тестовое сообщение получено: ${parsedMessage.message}`);
            setSnackbarOpen(true);
            setIsLoading(false);
        } else {
            // Для прочих сообщений просто показываем текст
            setResponse(`Ответ: ${JSON.stringify(parsedMessage)}`);
            setSnackbarOpen(true);
            setIsLoading(false);
        }
    };

    // Отображаем статус WebSocket соединения
    useEffect(() => {
        let statusMessage = "";
        switch (connectionStatus) {
            case CONNECTION_STATUS.CONNECTED:
                statusMessage = "WebSocket подключен";
                break;
            case CONNECTION_STATUS.CONNECTING:
                statusMessage = "Подключение к WebSocket...";
                break;
            case CONNECTION_STATUS.DISCONNECTED:
                statusMessage = "WebSocket отключен";
                break;
            case CONNECTION_STATUS.ERROR:
                statusMessage = `Ошибка WebSocket: ${lastError}`;
                break;
            default:
                statusMessage = "Неизвестный статус WebSocket";
        }
        
        // Показываем уведомление при изменении статуса соединения
        if (statusMessage) {
            console.log('Изменение статуса WebSocket:', statusMessage);
            setResponse(statusMessage);
            setSnackbarOpen(true);
        }
    }, [connectionStatus, lastError]);

    // Обработка выхода из системы
    const handleLogout = () => {
        keycloak.logout();
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
          return;
        }
        setSnackbarOpen(false);
    };

    const cameraList = ['Front', 'Back', 'Left', 'Right'];
    
    // Стили и размеры для различных позиций камер
    const getCameraStyle = (position) => {
        const isMain = position === mainCamera;
        const hasMainSideCamera = mainCamera === 'Left' || mainCamera === 'Right';
        const isMainFront = mainCamera === 'Front';

        // Базовые стили для всех камер
        const baseStyle = {
            position: 'absolute',
            transition: 'all 0.5s ease-in-out',
            opacity: isMain ? 1 : 0.8,
            zIndex: isMain ? 10 : 1,
        };
        
        // Определяем позиции и размеры в зависимости от позиции и статуса (главная/неглавная)
        switch (position) {
            case 'Front':
                // Когда основная камера - боковая, сдвигаем переднюю камеру вверх
                return {
                    ...baseStyle,
                    top: '5%',
                    left: isMain ? '12.5%' : (hasMainSideCamera ? '30%' : '30%'),
                    width: isMain ? '75%' : '40%', 
                    height: isMain ? '65%' : '22%',
                };
            case 'Back':
                // Центрируем заднюю камеру строго под передней
                return {
                    ...baseStyle,
                    bottom: '5%',
                    left: isMain ? '12.5%' : (hasMainSideCamera ? '30%' : '30%'),
                    width: isMain ? '75%' : '40%',
                    height: isMain ? '65%' : '22%',
                };
            case 'Left':
                return {
                    ...baseStyle,
                    top: isMain ? '15%' : '32%',
                    left: isMain ? '12.5%' : '5%',
                    width: isMain ? '75%' : '30%',
                    height: isMain ? '65%' : '28%',
                };
            case 'Right':
                return {
                    ...baseStyle,
                    top: isMain ? '15%' : '32%',
                    right: isMain ? '12.5%' : '5%',
                    width: isMain ? '75%' : '30%',
                    height: isMain ? '65%' : '28%',
                };
            default:
                return baseStyle;
        }
    };

    // Добавим функцию для обработки изменения зума карты
    const handleMapZoomEnd = (e) => {
        setMapZoom(e.target.getZoom());
    };

    // Добавим кнопку проверки WebSocket
    const handleTestWebSocket = () => {
        if (connectionStatus === CONNECTION_STATUS.CONNECTED) {
            const success = sendMessage(JSON.stringify({
                type: 'test_message',
                message: 'Тестовое сообщение',
                timestamp: Date.now()
            }));
            
            if (success) {
                setResponse('Тестовое сообщение отправлено');
            } else {
                setResponse('Ошибка отправки тестового сообщения');
            }
            setSnackbarOpen(true);
        } else {
            reconnect();
            setResponse('Попытка переподключения к WebSocket...');
            setSnackbarOpen(true);
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
            {/* Верхняя панель (AppBar) */}
            <Paper
                elevation={3}
                sx={{
                    p: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    flexShrink: 0,
                    zIndex: 100,
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 'bold', ml: 1 }}>
                    🚗 Система удаленного управления
                </Typography>
                <Box display="flex" alignItems="center">
                    <Tooltip title="Переключить тему">
                        <IconButton onClick={toggleDarkMode} color="inherit">
                            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Переподключиться к WebSocket">
                        <IconButton color="inherit" onClick={() => window.location.reload()} sx={{ mr: 1 }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                     <Tooltip title="Отключиться">
                        <IconButton color="error" onClick={handleLogout}>
                            <PowerOffIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Paper>

            {/* Основной контент (Камеры + Сайдбар) */}
            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                {/* Левая часть - Интерактивная панель камер с расположением по направлениям */}
                <Box 
                    sx={{ 
                        flexGrow: 1, 
                        position: 'relative',
                        backgroundColor: theme.palette.background.default,
                        borderRadius: 1,
                        m: 1,
                        overflow: 'hidden',
                        // Добавляем эффект "кокпита" с градиентной рамкой
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            borderRadius: 4,
                            padding: '2px',
                            background: 'linear-gradient(45deg, rgba(0,0,0,0.1), rgba(255,255,255,0.1))',
                            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            maskComposite: 'exclude',
                            pointerEvents: 'none',
                            zIndex: 11,
                        }
                    }}
                >
                    {/* Затемнение, если камеры не активны */}
                    {!cameraEnabled && (
                        <Box 
                            sx={{ 
                                position: 'absolute', 
                                top: 0, 
                                left: 0, 
                                right: 0, 
                                bottom: 0, 
                                backgroundColor: 'rgba(0,0,0,0.6)', 
                                zIndex: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column'
                            }}
                        >
                            <Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
                                Камеры не активны
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'white' }}>
                                Пожалуйста, подключитесь к порту устройства
                            </Typography>
                        </Box>
                    )}
                    
                    {/* Камеры */}
                    {cameraList.map((camName) => (
                        <Zoom 
                            key={camName} 
                            in={true} 
                            style={{ 
                                transitionDelay: `${cameraList.indexOf(camName) * 100}ms`,
                            }}
                        >
                            <Box sx={getCameraStyle(camName)}>
                                <VideoPlaceholder 
                                    cameraName={camName}
                                    position={camName} 
                                    isMain={mainCamera === camName}
                                    onClick={() => handleCameraClick(camName)}
                                />
                            </Box>
                        </Zoom>
                    ))}
                    
                    {/* Элемент "кузова" автомобиля для визуального ориентира */}
                    <Box 
                        sx={{ 
                            position: 'absolute', 
                            top: '32%', 
                            left: '30%', 
                            width: '40%', 
                            height: '28%',
                            border: `2px dashed ${theme.palette.divider}`,
                            borderRadius: 8,
                            opacity: 0.3,
                            pointerEvents: 'none',
                            display: mainCamera === 'Front' || mainCamera === 'Back' ? 'none' : 'block'
                        }}
                    />
                </Box>

                {/* Правая часть - Сайдбар */}
                <Paper
                    elevation={4}
                    sx={{
                        width: { xs: '100%', md: 350 },
                        flexShrink: 0,
                        borderLeft: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                        p: 2,
                    }}
                >
                    <Stack spacing={2} divider={<Divider sx={{ my: 1 }} />}>
                        {/* Секция: Подключение */}
                        <Box>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <PortIcon sx={{ mr: 1 }} /> Подключение
                            </Typography>
                            <Stack spacing={1.5}>
                                <Box sx={{ 
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    backgroundColor: theme.palette.background.paper,
                                }}>
                                    <select
                                        value={port}
                                        onChange={(event) => handlePortChange(event)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            outline: 'none',
                                            fontSize: '14px',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        <option value="">Выберите порт</option>
                                        <option value="port_1">port_1</option>
                                        <option value="port_2">port_2</option>
                                        <option value="port_3">port_3</option>
                                        <option value="port_4">port_4</option>
                                    </select>
                                </Box>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleConnectPort}
                                    disabled={portStatus === 'connecting' || portStatus === 'ready' || !port}
                                    fullWidth
                                >
                                    {portStatus === 'connecting' ? 'Подключение...' : (portStatus === 'ready' ? 'Подключено' : 'Подключить')}
                                </Button>
                                <Box sx={{ display: 'flex', alignItems: 'center', height: 24 }}>
                                    {portStatus === 'connecting' && (
                                        <>
                                            <CircularProgress size={16} sx={{ mr: 1 }} />
                                            <Typography variant="body2" color="text.secondary">Подключение...</Typography>
                                        </>
                                    )}
                                    {portStatus === 'error' && (
                                        <>
                                            <ErrorIcon color="error" sx={{ mr: 1 }} />
                                            <Typography variant="body2" color="error">Ошибка</Typography>
                                        </>
                                    )}
                                    {portStatus === 'ready' && (
                                        <>
                                            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                                            <Typography variant="body2" color="text.secondary">Готово</Typography>
                                        </>
                                    )}
                                </Box>
                            </Stack>
                        </Box>

                        {/* Секция: Статус машины - Обновляем для использования реальных данных телеметрии */}
                         <Box>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <InfoIcon sx={{ mr: 1 }} /> Статус
                            </Typography>
                             <Stack spacing={1}>
                                <Box display="flex" alignItems="center">
                                    <SpeedIcon sx={{ mr: 1 }} color="action" />
                                    <Typography variant="body2" sx={{ flexGrow: 1 }}>Скорость:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                        {telemetry.speed} км/ч
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(telemetry.speed, 120)}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                                    <BatteryIcon sx={{ mr: 1 }} color="action" />
                                    <Typography variant="body2" sx={{ flexGrow: 1 }}>Аккумулятор:</Typography>
                                     <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                        {telemetry.battery}%
                                     </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={telemetry.battery}
                                    color={
                                        telemetry.battery > 50 
                                            ? "success" 
                                            : (telemetry.battery > 20 ? "warning" : "error")
                                    }
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                                    <InfoIcon sx={{ mr: 1 }} color="action" />
                                    <Typography variant="body2" sx={{ flexGrow: 1 }}>Статус:</Typography>
                                     <Typography variant="body2" sx={{ 
                                        fontWeight: 'medium',
                                        color: telemetry.status === 'moving' ? 'success.main' : 'text.secondary'
                                     }}>
                                        {telemetry.status === 'moving' ? 'В движении' : 'Остановлен'}
                                     </Typography>
                                </Box>
                                {telemetry.lastUpdate && (
                                    <Typography variant="caption" color="text.secondary" align="right" sx={{ mt: 1 }}>
                                        Обновлено: {new Date(telemetry.lastUpdate).toLocaleTimeString()}
                                    </Typography>
                                )}
                             </Stack>
                        </Box>

                         {/* Секция: Команды */}
                         <Box>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <TerminalIcon sx={{ mr: 1 }} /> Команды
                            </Typography>
                            <Stack spacing={1.5}>
                                <TextField
                                    label="Отправить команду"
                                    value={command}
                                    onChange={handleCommandChange}
                                    error={commandError}
                                    helperText={commandError ? 'Команда не может быть пустой' : ''}
                                    fullWidth
                                    size="small"
                                    disabled={!cameraEnabled || isLoading}
                                />
                                <Button
                                    variant="contained"
                                    endIcon={isLoading ? <CircularProgress size={16} /> : <SendIcon />}
                                    onClick={handleSendCommand}
                                    disabled={isLoading || !cameraEnabled || !!commandError || !command.trim()}
                                    fullWidth
                                >
                                    {isLoading ? 'Отправка...' : 'Отправить'}
                                </Button>
                                {response && !snackbarOpen && (
                                    <Typography variant="caption" color="text.secondary">
                                        Последний ответ: {response.length > 50 ? response.substring(0, 50) + '...' : response}
                                    </Typography>
                                )}
                             </Stack>
                        </Box>

                         {/* Секция: Карта - Обновляем для использования реальных координат */}
                         <Box>
                             <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                <MapIcon sx={{ mr: 1 }} /> Карта
                            </Typography>
                            <Box sx={{ height: 200, width: '100%', borderRadius: 1, overflow: 'hidden' }}>
                                <MapContainer
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={true}
                                    ref={mapRef}
                                    zoomControl={false}
                                    whenReady={(map) => {
                                        mapRef.current = map.target;
                                    }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker 
                                        position={[telemetry.coordinates.lat, telemetry.coordinates.lng]}
                                        title="Автомобиль"
                                    >
                                        <Popup>
                                            Автомобиль<br/>
                                            Скорость: {telemetry.speed} км/ч<br/>
                                            Статус: {telemetry.status === 'moving' ? 'В движении' : 'Остановлен'}
                                        </Popup>
                                    </Marker>
                                </MapContainer>
                            </Box>
                        </Box>
                    </Stack>
                </Paper>
            </Box>

            {/* Индикатор статуса WebSocket соединения */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 10,
                    right: 10,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: '16px',
                    padding: '4px 8px',
                    boxShadow: 2,
                    zIndex: 1000,
                    cursor: 'pointer'
                }}
                onClick={handleTestWebSocket}
            >
                <Box
                    sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: connectionStatus === CONNECTION_STATUS.CONNECTED ? 
                            '#4caf50' : (connectionStatus === CONNECTION_STATUS.CONNECTING ? 
                            '#ff9800' : '#f44336'),
                        mr: 1
                    }}
                />
                <Typography variant="caption">
                    {connectionStatus === CONNECTION_STATUS.CONNECTED ? 
                        'WebSocket онлайн' : (connectionStatus === CONNECTION_STATUS.CONNECTING ? 
                        'Подключение...' : 'Не подключен')}
                </Typography>
            </Box>

            {/* Уведомление - заменяем Snackbar на кастомную реализацию */}
            {snackbarOpen && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(50, 50, 50, 0.8)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: 2,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        zIndex: 2000,
                        maxWidth: '80%',
                        textAlign: 'center',
                    }}
                >
                    <Typography>{response}</Typography>
                </Box>
            )}
        </Box>
    );
}

export default ControlPanel;
