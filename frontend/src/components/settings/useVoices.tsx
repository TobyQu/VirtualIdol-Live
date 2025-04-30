import { useState, useEffect } from 'react';
import { voiceData, getVoices } from '@/features/tts/ttsApi';

export function useVoices() {
  const [voices, setVoices] = useState([voiceData]);
  const [isClient, setIsClient] = useState(false);

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 初始化数据
  useEffect(() => {
    if (!isClient) return;
    
    // 获取语音列表
    getVoices().then(data => setVoices(data));
  }, [isClient]);

  const refreshVoices = () => {
    getVoices().then(data => setVoices(data));
  };

  return {
    voices,
    setVoices,
    refreshVoices
  };
} 