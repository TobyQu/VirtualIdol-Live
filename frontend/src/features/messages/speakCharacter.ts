import { wait } from "@/utils/wait";
import { synthesizeVoice } from "../koeiromap/koeiromap";
import { Viewer } from "../vrmViewer/viewer";
import { Screenplay } from "./messages";
import { Talk } from "./messages";
import axios from 'axios';
import { postRequestArraybuffer, getFullApiUrl } from "../httpclient/httpclient";
import { GlobalConfig } from "../config/configApi";
import { generateAudioStream } from "../tts/ttsApi";

// 直接使用相对路径，由 NextJS 处理
const apiBasePath = '/api';

// 创建一个Map来缓存最近的音频请求和结果
const audioCache = new Map<string, {timestamp: number, data: ArrayBuffer}>();
// 缓存有效期（毫秒）
const CACHE_TTL = 60000; // 1分钟

// 创建一个函数来清理过期的缓存项
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of audioCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      audioCache.delete(key);
    }
  }
};

// 定期清理缓存
setInterval(cleanupCache, 30000); // 每30秒清理一次

const createSpeakCharacter = () => {
  let lastTime = 0;
  let prevFetchPromise: Promise<unknown> = Promise.resolve();
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();
  // 跟踪正在进行的请求
  const pendingRequests = new Map<string, Promise<ArrayBuffer>>();

  return (
    globalConfig: GlobalConfig,
    screenplay: Screenplay,
    viewer: Viewer,
    onStart?: () => void,
    onComplete?: () => void
  ) => {
    const fetchPromise = prevFetchPromise.then(async () => {
      const now = Date.now();
      if (now - lastTime < 1000) {
        await wait(1000 - (now - lastTime));
      }

      const buffer = await fetchAudio(screenplay.talk, globalConfig, pendingRequests).catch(() => null);
      lastTime = Date.now();
      return buffer;
    });

    prevFetchPromise = fetchPromise;
    prevSpeakPromise = Promise.all([fetchPromise, prevSpeakPromise])
      .then(([audioBuffer]) => {
        onStart?.();
        if (!audioBuffer) {
          return;
        }
        return viewer.model?.speak(audioBuffer, screenplay);
      }).catch(e => {
        onComplete?.();
      })
    prevSpeakPromise.then(() => {
      onComplete?.();
    });
  };
}

export const speakCharacter = createSpeakCharacter();

// 创建缓存键
const createCacheKey = (talk: Talk, globalConfig: GlobalConfig): string => {
  const emotion = talk.emotion || globalConfig.ttsConfig.emotion || 'neutral';
  return `${talk.message}|${globalConfig.ttsConfig.ttsVoiceId}|${emotion}|${globalConfig.ttsConfig.ttsType || 'minimax'}`;
};

export const fetchAudio = async (
  talk: Talk, 
  globalConfig: GlobalConfig, 
  pendingRequests: Map<string, Promise<ArrayBuffer>> = new Map()
): Promise<ArrayBuffer> => {
  // 创建缓存键
  const cacheKey = createCacheKey(talk, globalConfig);
  
  // 检查缓存是否存在有效的音频数据
  const cached = audioCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`使用缓存的音频数据 - 文本: ${talk.message.substring(0, 30)}...`);
    return cached.data;
  }
  
  // 检查是否有相同的请求正在进行中
  if (pendingRequests.has(cacheKey)) {
    console.log(`复用进行中的TTS请求 - 文本: ${talk.message.substring(0, 30)}...`);
    return pendingRequests.get(cacheKey)!;
  }
  
  // 创建新的音频获取Promise
  const audioPromise = (async () => {
    try {
      console.log(`准备请求流式TTS音频 - 文本: ${talk.message.substring(0, 50)}${talk.message.length > 50 ? '...' : ''}, 声音ID: ${globalConfig.ttsConfig.ttsVoiceId}`);
      
      // 优先使用talk中的emotion（如果存在），否则回退到globalConfig中的配置
      const emotion = talk.emotion || globalConfig.ttsConfig.emotion || 'neutral';
      console.log(`使用情绪: ${emotion}（${talk.emotion ? '来自聊天' : '来自配置'}）`);
      
      // 使用新的流式TTS API
      const buffer = await generateAudioStream(
        talk.message, 
        globalConfig.ttsConfig.ttsVoiceId, 
        emotion
      );
      
      // 检查返回的音频数据
      if (!buffer || buffer.byteLength === 0) {
        console.error('流式TTS返回了空音频数据，尝试使用非流式API');
        return await fallbackToNonStreamAPI(talk, globalConfig);
      }
      
      console.log(`成功获取流式音频数据，大小: ${buffer.byteLength} 字节`);
      
      // 缓存音频数据
      audioCache.set(cacheKey, {
        timestamp: Date.now(),
        data: buffer
      });
      
      return buffer;
    } catch (error) {
      console.error('流式音频获取失败，尝试使用非流式API:', error);
      try {
        const fallbackBuffer = await fallbackToNonStreamAPI(talk, globalConfig);
        
        // 缓存回退方法获取的音频数据
        audioCache.set(cacheKey, {
          timestamp: Date.now(),
          data: fallbackBuffer
        });
        
        return fallbackBuffer;
      } catch (fallbackError) {
        console.error('备用TTS也失败，使用静音音频:', fallbackError);
        
        // 最后的保底方案：返回静音音频
        const silentMp3 = new Uint8Array([
          0xFF, 0xFB, 0x30, 0xC0, 0x00, 0x00, 0x00, 0x00, 
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00
        ]);
        
        return silentMp3.buffer;
      } finally {
        // 无论成功或失败，都从正在进行的请求映射中移除
        pendingRequests.delete(cacheKey);
      }
    }
  })();
  
  // 将此Promise添加到正在进行的请求映射中
  pendingRequests.set(cacheKey, audioPromise);
  
  // 获取结果
  try {
    const result = await audioPromise;
    return result;
  } finally {
    // 请求完成，从映射中移除
    pendingRequests.delete(cacheKey);
  }
};

// 回退到非流式API的函数
const fallbackToNonStreamAPI = async (talk: Talk, globalConfig: GlobalConfig): Promise<ArrayBuffer> => {
  // 优先使用talk中的emotion（如果存在），否则回退到globalConfig中的配置
  const emotion = talk.emotion || globalConfig.ttsConfig.emotion || 'neutral';
  
  const requestBody = {
    text: talk.message,
    voice_id: globalConfig.ttsConfig.ttsVoiceId,
    tts_type: globalConfig.ttsConfig.ttsType || 'minimax',
    emotion: emotion
  };

  const headers = {
    'Content-Type': 'application/json',
    'Accept': '*/*'  // 接受任何类型的响应
  }
  
  try {
    console.log(`尝试使用非流式API - 文本: ${talk.message.substring(0, 50)}${talk.message.length > 50 ? '...' : ''}, 情绪: ${emotion}`);
    
    // 使用正确的API路径
    const ttsEndpoint = '/api/v1/speech/tts/generate/';
    
    // 直接使用axios
    const response = await axios.post(ttsEndpoint, requestBody, {
      responseType: 'arraybuffer',
      headers: headers,
      timeout: 30000
    });
    
    if (response.status !== 200) {
      console.error(`非流式TTS请求失败，状态码: ${response.status}`);
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }
    
    const buffer = response.data;
    
    if (!buffer || buffer.byteLength === 0) {
      console.error('非流式TTS返回了空音频数据');
      throw new Error('Received empty audio data from TTS service');
    }
    
    console.log(`成功获取非流式音频数据，大小: ${buffer.byteLength} 字节`);
    return buffer;
  } catch (error) {
    console.error('非流式音频获取失败:', error);
    
    // 如果TTS完全失败，返回一个微小的静音音频数据，以允许对话继续
    // 这是一个非常短的有效MP3静音文件的二进制数据
    console.log('返回静音音频数据以允许对话继续');
    
    // 这是一个微小的有效MP3文件的二进制数据 (44 bytes)
    const silentMp3 = new Uint8Array([
      0xFF, 0xFB, 0x30, 0xC0, 0x00, 0x00, 0x00, 0x00, 
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ]);
    
    return silentMp3.buffer;
  }
};
