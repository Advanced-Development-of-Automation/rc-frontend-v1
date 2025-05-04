// src/VideoFeed.jsx
import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

function VideoFeed() {
    return (
        <Card sx={{ margin: 2 }}>
            <CardContent>
                <Typography variant="h6">Video Feed</Typography>
                {/* Здесь можно добавить видеопоток или изображение */}
                <div style={{ height: '300px', backgroundColor: '#000' }}>
                    {/* Placeholder для видео */}
                    <Typography variant="body1" color="white" align="center" sx={{ lineHeight: '300px' }}>
                        Видео поток здесь
                    </Typography>
                </div>
            </CardContent>
        </Card>
    );
}

export default VideoFeed;
