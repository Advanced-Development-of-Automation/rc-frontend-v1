// Тестовый WebSocket сервер для разработки
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');

// Настройки сервера
const PORT = process.env.PORT || 9000;
const USE_HTTPS = true; // Установите в false для работы без HTTPS

// Загрузка SSL сертификатов 
const server = USE_HTTPS ? 
    https.createServer({
        cert: fs.readFileSync('./cert.pem'),
        key: fs.readFileSync('./key.pem')
    }) : null;

// Создание WebSocket сервера
const wss = USE_HTTPS ? 
    new WebSocket.Server({ server }) : 
    new WebSocket.Server({ port: PORT });

// Хранение активных соединений
const clients = new Map();

// Имитация состояния автомобиля
let carState = {
    speed: 0,
    battery: 85,
    position: { lat: 51.505, lng: -0.09 },
    connected: false,
    port: '',
    lastCommand: '',
    error: null
};

// Запуск телеметрии
let telemetryInterval = null;

// Обработка подключений
wss.on('connection', (ws, req) => {
    const url = new URL(`http://localhost${req.url}`);
    const token = url.searchParams.get('jwt') || 'no-token';
    const car_id = url.searchParams.get('car_id') || 'unknown-car';
    
    const clientId = `${token.substring(0, 8)}...${car_id}`;
    
    clients.set(ws, { id: clientId, token, car_id });
    
    console.log(`[${new Date().toLocaleTimeString()}] Новое соединение: ${clientId}`);
    console.log(`[${new Date().toLocaleTimeString()}] Всего соединений: ${clients.size}`);
    
    // Отправка приветственного сообщения
    ws.send(JSON.stringify({
        type: 'connection_response',
        message: 'Соединение установлено',
        timestamp: Date.now()
    }));
    
    // Обработка сообщений
    ws.on('message', (message) => {
        try {
            console.log(`[${new Date().toLocaleTimeString()}] Получено сообщение от ${clientId}: ${message}`);
            
            // Пробуем распарсить JSON
            let parsedMessage;
            try {
                parsedMessage = JSON.parse(message);
            } catch (e) {
                // Если не JSON, обрабатываем как текст
                parsedMessage = { type: 'command', message: message.toString() };
            }
            
            // Обработка разных типов сообщений
            switch (parsedMessage.type) {
                case 'connection_check':
                    ws.send(JSON.stringify({
                        type: 'connection_response',
                        message: 'Соединение активно',
                        timestamp: Date.now()
                    }));
                    break;
                    
                case 'port_connection':
                    handlePortConnection(ws, parsedMessage);
                    break;
                    
                case 'command':
                    handleCommand(ws, parsedMessage);
                    break;
                    
                default:
                    // Обработка прочих типов сообщений
                    ws.send(JSON.stringify({
                        type: 'command_response',
                        message: `Получено: ${typeof message === 'string' ? message : JSON.stringify(parsedMessage)}`,
                        timestamp: Date.now()
                    }));
            }
        } catch (error) {
            console.error(`[${new Date().toLocaleTimeString()}] Ошибка обработки сообщения:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                message: `Ошибка обработки сообщения: ${error.message}`,
                timestamp: Date.now()
            }));
        }
    });
    
    // Обработка закрытия соединения
    ws.on('close', () => {
        const client = clients.get(ws);
        console.log(`[${new Date().toLocaleTimeString()}] Соединение закрыто: ${client ? client.id : 'неизвестный клиент'}`);
        clients.delete(ws);
        
        // Если это был последний клиент, останавливаем телеметрию
        if (clients.size === 0 && telemetryInterval) {
            clearInterval(telemetryInterval);
            telemetryInterval = null;
            carState.connected = false;
            console.log(`[${new Date().toLocaleTimeString()}] Телеметрия остановлена`);
        }
        
        console.log(`[${new Date().toLocaleTimeString()}] Осталось соединений: ${clients.size}`);
    });
});

// Обработка подключения к порту
function handlePortConnection(ws, message) {
    if (message.action === 'connect') {
        carState.port = message.port;
        carState.connected = true;
        carState.error = null;
        
        // Отправка успешного ответа
        ws.send(JSON.stringify({
            type: 'port_connection_response',
            status: 'success',
            message: `Успешное подключение к порту ${message.port}`,
            timestamp: Date.now()
        }));
        
        // Запуск телеметрии, если еще не запущена
        if (!telemetryInterval) {
            startTelemetry();
        }
    } else if (message.action === 'disconnect') {
        carState.connected = false;
        carState.port = '';
        
        // Отправка ответа об отключении
        ws.send(JSON.stringify({
            type: 'port_connection_response',
            status: 'success',
            message: 'Порт отключен',
            timestamp: Date.now()
        }));
        
        // Остановка телеметрии
        if (telemetryInterval) {
            clearInterval(telemetryInterval);
            telemetryInterval = null;
        }
    } else {
        // Неизвестное действие
        ws.send(JSON.stringify({
            type: 'port_connection_response',
            status: 'error',
            message: `Неизвестное действие: ${message.action}`,
            timestamp: Date.now()
        }));
    }
}

// Обработка команд
function handleCommand(ws, message) {
    const cmd = typeof message.message === 'string' ? message.message.toLowerCase() : '';
    carState.lastCommand = cmd;
    
    // Обработка простых команд для демонстрации
    if (cmd.includes('вперед') || cmd.includes('forward')) {
        carState.speed = Math.min(carState.speed + 10, 120);
        ws.send(JSON.stringify({
            type: 'command_response',
            message: `Ускорение до ${carState.speed} км/ч`,
            timestamp: Date.now()
        }));
    } else if (cmd.includes('назад') || cmd.includes('backward') || cmd.includes('back')) {
        carState.speed = Math.max(carState.speed - 10, 0);
        ws.send(JSON.stringify({
            type: 'command_response',
            message: `Замедление до ${carState.speed} км/ч`,
            timestamp: Date.now()
        }));
    } else if (cmd.includes('стоп') || cmd.includes('stop')) {
        carState.speed = 0;
        ws.send(JSON.stringify({
            type: 'command_response',
            message: 'Остановка',
            timestamp: Date.now()
        }));
    } else if (cmd.includes('влево') || cmd.includes('left')) {
        ws.send(JSON.stringify({
            type: 'command_response',
            message: 'Поворот налево',
            timestamp: Date.now()
        }));
    } else if (cmd.includes('вправо') || cmd.includes('right')) {
        ws.send(JSON.stringify({
            type: 'command_response',
            message: 'Поворот направо',
            timestamp: Date.now()
        }));
    } else if (cmd.includes('статус') || cmd.includes('status')) {
        ws.send(JSON.stringify({
            type: 'command_response',
            message: `Текущий статус: скорость ${carState.speed} км/ч, заряд ${carState.battery}%`,
            timestamp: Date.now()
        }));
    } else {
        // Обработка других команд
        ws.send(JSON.stringify({
            type: 'command_response',
            message: `Команда получена: ${cmd}`,
            timestamp: Date.now()
        }));
    }
}

// Запуск телеметрии
function startTelemetry() {
    console.log(`[${new Date().toLocaleTimeString()}] Телеметрия запущена`);
    
    // Отправка данных телеметрии каждые 2 секунды
    telemetryInterval = setInterval(() => {
        // Имитация изменения параметров
        carState.battery = Math.max(carState.battery - 0.1, 0); // Медленная разрядка
        
        if (carState.speed > 0) {
            // Имитация движения - изменение координат
            carState.position.lat += (Math.random() - 0.5) * 0.001;
            carState.position.lng += (Math.random() - 0.5) * 0.001;
        }
        
        // Подготовка данных телеметрии
        const telemetryData = {
            type: 'telemetry',
            data: {
                speed: carState.speed,
                battery: Math.round(carState.battery),
                coordinates: carState.position,
                status: carState.speed > 0 ? 'moving' : 'stopped',
                timestamp: Date.now()
            }
        };
        
        // Отправка телеметрии всем подключенным клиентам
        clients.forEach((client, ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(telemetryData));
            }
        });
    }, 2000);
}

// Запуск сервера
if (USE_HTTPS) {
    server.listen(PORT, () => {
        console.log(`[${new Date().toLocaleTimeString()}] Secure WebSocket сервер запущен на порту ${PORT}`);
    });
} else {
    console.log(`[${new Date().toLocaleTimeString()}] WebSocket сервер запущен на порту ${PORT}`);
}

// Обработка завершения работы
process.on('SIGINT', () => {
    if (telemetryInterval) {
        clearInterval(telemetryInterval);
    }
    
    wss.clients.forEach((client) => {
        client.terminate();
    });
    
    console.log(`[${new Date().toLocaleTimeString()}] Сервер остановлен`);
    process.exit(0);
}); 