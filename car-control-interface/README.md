# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

# Система удаленного управления автомобилем

## Обзор проекта

Это веб-приложение для удаленного управления автомобилем с использованием WebSocket для передачи команд и получения данных телеметрии в реальном времени. Приложение включает в себя систему камер, панель управления и мониторинг состояния автомобиля.

## Настройка WebSocket

Проект использует WebSocket для обмена данными с сервером управления автомобилем. Настройка осуществляется через переменные окружения в файле `.env`:

```
REACT_APP_WS_URL=wss://81.200.149.133:9000
```

### Формат сообщений

WebSocket API поддерживает следующие форматы сообщений:

1. **Отправка команд**:
   ```json
   {
     "type": "command",
     "message": "ваша_команда_здесь"
   }
   ```

2. **Подключение к порту**:
   ```json
   {
     "type": "port_connection",
     "port": "имя_порта",
     "action": "connect"
   }
   ```

3. **Ответы сервера**:
   ```json
   {
     "type": "command_response",
     "message": "результат_выполнения_команды"
   }
   ```

4. **Данные телеметрии**:
   ```json
   {
     "type": "telemetry",
     "data": {
       "speed": 84,
       "battery": 26,
       "coordinates": {
         "lat": 51.505,
         "lng": -0.09
       },
       "status": "moving"
     }
   }
   ```

5. **Проверка соединения**:
   ```json
   {
     "type": "connection_check",
     "message": "Проверка соединения"
   }
   ```

6. **Ответ на подключение к порту**:
   ```json
   {
     "type": "port_connection_response",
     "status": "success", // или "error"
     "message": "Порт подключен успешно"
   }
   ```

### Использование WebSocket в компонентах

Для работы с WebSocket в компонентах используется хук `useWebSocketClient`:

```jsx
import { useWebSocketClient, CONNECTION_STATUS } from './useWebSocketClient';

function YourComponent() {
  const { 
    messages,           // массив полученных сообщений
    sendMessage,        // функция для отправки сообщений
    connectionStatus,   // статус соединения
    lastError,          // последняя ошибка
    reconnect,          // функция для переподключения
    clearMessages       // функция для очистки списка сообщений
  } = useWebSocketClient(authToken);
  
  // Отправка команды
  const handleSendCommand = (command) => {
    sendMessage(command);
  };
  
  // Отправка структурированной команды
  const handleSendStructuredCommand = () => {
    sendMessage({
      type: 'custom_command',
      action: 'move',
      direction: 'forward',
      speed: 10
    });
  };
  
  // Мониторинг статуса соединения
  useEffect(() => {
    if (connectionStatus === CONNECTION_STATUS.ERROR) {
      console.error('Ошибка соединения:', lastError);
    }
  }, [connectionStatus, lastError]);
  
  // Обработка полученных сообщений
  useEffect(() => {
    if (messages.length > 0) {
      // Обработка последнего сообщения
      const lastMessage = messages[messages.length - 1];
      console.log('Получено сообщение:', lastMessage);
    }
  }, [messages]);
  
  return (
    <div>
      {/* Ваш UI с использованием полученных данных */}
    </div>
  );
}
```

### Статусы соединения

Модуль WebSocket поддерживает следующие статусы соединения:

- `CONNECTION_STATUS.CONNECTING` - подключение в процессе
- `CONNECTION_STATUS.CONNECTED` - соединение установлено
- `CONNECTION_STATUS.DISCONNECTED` - соединение разорвано
- `CONNECTION_STATUS.ERROR` - ошибка соединения

## Функциональность WebSocket клиента

- **Автоматическое переподключение** - клиент автоматически пытается переподключиться через 5 секунд в случае разрыва соединения
- **Обработка разных типов сообщений** - клиент может обрабатывать как текстовые сообщения, так и JSON-структуры
- **Мониторинг состояния** - отслеживание статуса соединения и ошибок
- **Отправка структурированных данных** - поддержка отправки данных в формате JSON
- **Индикация статуса** - визуальный индикатор статуса соединения в интерфейсе

## Дополнительная информация

Для дополнительной информации о протоколе обмена данными с автомобилем обратитесь к документации серверной части.
