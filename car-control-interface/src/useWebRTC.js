import { useState, useEffect, useRef, useCallback } from 'react';

// Конфигурация STUN/TURN серверов для установления соединения
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

// Состояния соединения
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

/**
 * Хук для работы с WebRTC
 * @param {string} signalingServerUrl - URL сигнального сервера
 * @param {string} token - Токен авторизации для сигнального сервера
 */
export function useWebRTC(signalingServerUrl, token = null) {
  // Состояния
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const [videoStreams, setVideoStreams] = useState({
    Camera1: null,
    Camera2: null,
    Camera3: null
  });
  const [dataChannel, setDataChannel] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [remotePeerId, setRemotePeerId] = useState(null);

  // Refs
  const peerConnectionRef = useRef(null);
  const signalingSocketRef = useRef(null);
  const dataChannelRef = useRef(null);

  // Инициализация WebSocket соединения с сигнальным сервером
  const initSignalingConnection = useCallback(() => {
    // Закрываем предыдущее соединение, если оно существует
    if (signalingSocketRef.current && signalingSocketRef.current.readyState !== WebSocket.CLOSED) {
      signalingSocketRef.current.close();
    }

    setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    
    // Формируем URL с учетом токена авторизации
    let url = signalingServerUrl;
    if (token) {
      url += (url.includes('?') ? '&' : '?') + `token=${token}`;
    }

    // Создаем новое WebSocket соединение
    try {
      const socket = new WebSocket(url);
      signalingSocketRef.current = socket;

      socket.onopen = () => {
        console.log('Signaling WebSocket соединение установлено');
        
        // Отправляем сообщение о регистрации на сигнальном сервере
        socket.send(JSON.stringify({
          type: 'register',
          role: 'web-client',
          clientId: generateClientId() // Генерируем уникальный ID клиента
        }));
      };

      socket.onmessage = handleSignalingMessage;

      socket.onerror = (error) => {
        console.error('Ошибка WebSocket соединения:', error);
        setLastError('Ошибка соединения с сигнальным сервером');
        setConnectionStatus(CONNECTION_STATUS.ERROR);
      };

      socket.onclose = () => {
        console.log('Signaling WebSocket соединение закрыто');
        setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
        // Очищаем соединение WebRTC при закрытии WebSocket
        cleanupWebRTC();
      };
    } catch (error) {
      console.error('Не удалось установить WebSocket соединение:', error);
      setLastError(`Не удалось подключиться: ${error.message}`);
      setConnectionStatus(CONNECTION_STATUS.ERROR);
    }
  }, [signalingServerUrl, token]);

  // Обработка сообщений от сигнального сервера
  const handleSignalingMessage = useCallback(async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Получено сообщение от сигнального сервера:', message);

      // Обработка различных типов сообщений
      switch (message.type) {
        case 'registered':
          console.log('Клиент успешно зарегистрирован на сигнальном сервере');
          setConnectionStatus(CONNECTION_STATUS.CONNECTED);
          // После регистрации можно начать поиск RC-клиента
          sendToSignalingServer({
            type: 'find_peer',
            targetRole: 'rc-client'
          });
          break;

        case 'peer_found':
          console.log('Найден RC-клиент:', message.peerId);
          setRemotePeerId(message.peerId);
          // Инициализируем WebRTC соединение и отправляем предложение
          initPeerConnection();
          break;

        case 'offer':
          // Получено предложение от RC-клиента
          await handleOffer(message);
          break;

        case 'answer':
          // Получен ответ на наше предложение
          await handleAnswer(message);
          break;

        case 'ice_candidate':
          // Получен ICE-кандидат
          await handleIceCandidate(message);
          break;

        case 'error':
          console.error('Ошибка от сигнального сервера:', message.message);
          setLastError(message.message);
          break;

        default:
          console.log('Получено неизвестное сообщение:', message);
      }
    } catch (error) {
      console.error('Ошибка при обработке сообщения:', error, event.data);
    }
  }, []);

  // Отправка сообщения на сигнальный сервер
  const sendToSignalingServer = useCallback((message) => {
    if (signalingSocketRef.current && signalingSocketRef.current.readyState === WebSocket.OPEN) {
      signalingSocketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.error('Сигнальный сервер не подключен');
      return false;
    }
  }, []);

  // Инициализация WebRTC соединения
  const initPeerConnection = useCallback(async () => {
    try {
      // Очищаем предыдущее соединение, если оно существует
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      // Создаем новое RTCPeerConnection
      const peerConnection = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = peerConnection;

      // Обработка ICE кандидатов
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Отправляем ICE-кандидата на сигнальный сервер
          sendToSignalingServer({
            type: 'ice_candidate',
            candidate: event.candidate,
            targetId: remotePeerId
          });
        }
      };

      // Обработка изменения состояния соединения
      peerConnection.onconnectionstatechange = () => {
        console.log('WebRTC соединение изменило состояние:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          console.log('WebRTC соединение установлено!');
        } else if (peerConnection.connectionState === 'failed' || 
                  peerConnection.connectionState === 'disconnected' || 
                  peerConnection.connectionState === 'closed') {
          console.error('WebRTC соединение закрыто или не удалось установить');
          
          if (peerConnection.connectionState === 'failed') {
            // Пробуем переустановить соединение
            setTimeout(() => {
              initPeerConnection();
            }, 3000);
          }
        }
      };

      // Обработка получения треков (видео/аудио)
      peerConnection.ontrack = (event) => {
        console.log('Получен медиатрек:', event);
        handleRemoteTrack(event);
      };

      // Создаем datachannel для обмена командами
      createDataChannel(peerConnection);

      // Создаем предложение для RC-клиента
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Отправляем предложение на сигнальный сервер
      sendToSignalingServer({
        type: 'offer',
        sdp: peerConnection.localDescription,
        targetId: remotePeerId
      });

    } catch (error) {
      console.error('Ошибка при инициализации WebRTC соединения:', error);
      setLastError(`Ошибка установки WebRTC соединения: ${error.message}`);
    }
  }, [remotePeerId, sendToSignalingServer]);

  // Обработка предложения от удаленного пира
  const handleOffer = useCallback(async (message) => {
    try {
      if (!peerConnectionRef.current) {
        // Если соединение еще не создано, инициализируем его
        const peerConnection = new RTCPeerConnection(iceServers);
        peerConnectionRef.current = peerConnection;

        // Настраиваем обработчики событий
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            sendToSignalingServer({
              type: 'ice_candidate',
              candidate: event.candidate,
              targetId: message.from
            });
          }
        };

        peerConnection.onconnectionstatechange = () => {
          console.log('WebRTC соединение изменило состояние:', peerConnection.connectionState);
        };

        peerConnection.ontrack = (event) => {
          handleRemoteTrack(event);
        };

        // Обработчик для datachannel
        peerConnection.ondatachannel = (event) => {
          const channel = event.channel;
          setupDataChannel(channel);
        };
      }

      const peerConnection = peerConnectionRef.current;
      
      // Устанавливаем удаленное описание из предложения
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
      
      // Создаем ответ
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Отправляем ответ
      sendToSignalingServer({
        type: 'answer',
        sdp: peerConnection.localDescription,
        targetId: message.from
      });
      
      setRemotePeerId(message.from);
      
    } catch (error) {
      console.error('Ошибка при обработке предложения:', error);
      setLastError(`Ошибка при обработке предложения: ${error.message}`);
    }
  }, [sendToSignalingServer]);

  // Обработка ответа на предложение
  const handleAnswer = useCallback(async (message) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(message.sdp)
        );
        console.log('Установлено удаленное описание из ответа');
      }
    } catch (error) {
      console.error('Ошибка при обработке ответа:', error);
      setLastError(`Ошибка при обработке ответа: ${error.message}`);
    }
  }, []);

  // Обработка полученного ICE-кандидата
  const handleIceCandidate = useCallback(async (message) => {
    try {
      if (peerConnectionRef.current && message.candidate) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(message.candidate)
        );
        console.log('Добавлен ICE-кандидат');
      }
    } catch (error) {
      console.error('Ошибка при обработке ICE-кандидата:', error);
    }
  }, []);

  // Обработка входящих медиапотоков
  const handleRemoteTrack = useCallback((event) => {
    if (event.track.kind === 'video' && event.streams && event.streams[0]) {
      console.log('Получен видеопоток:', event.streams[0].id);
      
      // Получаем ID камеры из дополнительных данных (если есть)
      const streamId = event.streams[0].id;
      let cameraId = 'Camera1'; // По умолчанию Camera1
      
      // Если в ID потока есть информация о номере камеры
      if (streamId.includes('camera')) {
        // Пытаемся извлечь номер камеры из ID потока
        const match = streamId.match(/camera(\d+)/i);
        if (match && match[1]) {
          const cameraNumber = parseInt(match[1]);
          // Проверяем, что номер камеры в допустимом диапазоне (1-3)
          if (cameraNumber >= 1 && cameraNumber <= 3) {
            cameraId = `Camera${cameraNumber}`;
          }
        }
      }
      
      // Обновляем состояние видеопотоков
      setVideoStreams(prevStreams => ({
        ...prevStreams,
        [cameraId]: event.streams[0]
      }));
    }
  }, []);

  // Создание канала данных
  const createDataChannel = useCallback((peerConnection) => {
    try {
      // Создаем datachannel для обмена командами
      const channel = peerConnection.createDataChannel('commands', {
        ordered: true // Гарантированная доставка сообщений
      });
      
      setupDataChannel(channel);
    } catch (error) {
      console.error('Ошибка при создании datachannel:', error);
    }
  }, []);

  // Настройка обработчиков событий для канала данных
  const setupDataChannel = useCallback((channel) => {
    channel.onopen = () => {
      console.log('DataChannel открыт');
      dataChannelRef.current = channel;
      setDataChannel(channel);
    };
    
    channel.onclose = () => {
      console.log('DataChannel закрыт');
      dataChannelRef.current = null;
      setDataChannel(null);
    };
    
    channel.onerror = (error) => {
      console.error('Ошибка DataChannel:', error);
    };
    
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Получено сообщение через DataChannel:', message);
        
        // Здесь можно добавить обработку входящих сообщений
        // Например, обновление телеметрии или статусов
      } catch (error) {
        console.error('Ошибка при обработке сообщения DataChannel:', error);
      }
    };
  }, []);

  // Очистка WebRTC соединения
  const cleanupWebRTC = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    setDataChannel(null);
    setVideoStreams({
      Camera1: null,
      Camera2: null,
      Camera3: null
    });
  }, []);

  // Переподключение к сигнальному серверу
  const reconnect = useCallback(() => {
    cleanupWebRTC();
    initSignalingConnection();
  }, [cleanupWebRTC, initSignalingConnection]);

  // Отправка команды через DataChannel
  const sendCommand = useCallback((command) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        // Если команда передана как объект, сериализуем его
        const message = typeof command === 'object' ? JSON.stringify(command) : command;
        dataChannelRef.current.send(message);
        return true;
      } catch (error) {
        console.error('Ошибка отправки команды:', error);
        setLastError(`Ошибка отправки команды: ${error.message}`);
        return false;
      }
    } else {
      console.error('DataChannel не готов для отправки');
      setLastError('DataChannel не готов для отправки команды');
      return false;
    }
  }, []);

  // Генерация уникального ID клиента
  const generateClientId = () => {
    return 'webclient_' + Math.random().toString(36).substr(2, 9);
  };

  // Инициализация соединения при монтировании компонента
  useEffect(() => {
    // Инициализируем соединение только если URL указан
    if (signalingServerUrl) {
      initSignalingConnection();
    }
    
    // Очистка при размонтировании
    return () => {
      if (signalingSocketRef.current) {
        signalingSocketRef.current.close();
      }
      cleanupWebRTC();
    };
  }, [signalingServerUrl, token, initSignalingConnection, cleanupWebRTC]);

  // Возвращаем публичный API хука
  return {
    connectionStatus,
    videoStreams,
    dataChannel,
    lastError,
    sendCommand,
    reconnect
  };
} 