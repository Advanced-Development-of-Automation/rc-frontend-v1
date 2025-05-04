import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

/**
 * Компонент для отображения видеопотока
 * @param {MediaStream} stream - Поток WebRTC
 * @param {string} cameraName - Название камеры
 * @param {boolean} isMain - Является ли камера основной
 * @param {function} onClick - Обработчик клика по камере
 * @param {object} sx - Дополнительные стили
 */
const VideoPlayer = ({ stream, cameraName, isMain = false, onClick, sx = {} }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    // Когда поток доступен, привязываем его к video элементу
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Обработчик ошибок воспроизведения
      const handlePlayError = (e) => {
        console.error('Ошибка воспроизведения видео:', e);
      };
      
      // Настраиваем обработчики событий
      videoRef.current.addEventListener('error', handlePlayError);
      
      // Автоматически запускаем воспроизведение
      const playVideo = async () => {
        try {
          await videoRef.current.play();
        } catch (err) {
          console.error('Не удалось автоматически воспроизвести видео:', err);
        }
      };
      
      playVideo();
      
      // Очистка при размонтировании
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('error', handlePlayError);
          videoRef.current.srcObject = null;
        }
      };
    }
  }, [stream]);
  
  // Функция для перехода в полноэкранный режим
  const handleFullscreen = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.mozRequestFullScreen) {
        videoRef.current.mozRequestFullScreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };
  
  // Получаем номер камеры из названия
  const cameraNumber = cameraName.replace('Camera', '');
  
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
      {/* Номер камеры */}
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
        Камера {cameraNumber}
      </Typography>
      
      {/* Видео элемент */}
      {stream ? (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            display: 'block'
          }} 
        />
      ) : (
        <>
          {/* Иконка, когда нет видеопотока */}
          <VideocamOffIcon 
            sx={{ 
              fontSize: isMain ? 60 : 40, 
              color: 'rgba(255, 255, 255, 0.3)',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute',
              bottom: 8,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)'
            }}
          >
            Ожидание видео...
          </Typography>
        </>
      )}
      
      {/* Иконка полноэкранного режима только для главной камеры */}
      {isMain && stream && (
        <Box
          onClick={handleFullscreen}
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8,
            zIndex: 3,
            p: 0.5,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)',
            }
          }}
        >
          <FullscreenIcon 
            sx={{ 
              fontSize: 24, 
              color: 'rgba(255, 255, 255, 0.7)'
            }} 
          />
        </Box>
      )}
    </Box>
  );
};

export default VideoPlayer; 