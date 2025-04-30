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

const createSpeakCharacter = () => {
  let lastTime = 0;
  let prevFetchPromise: Promise<unknown> = Promise.resolve();
  let prevSpeakPromise: Promise<unknown> = Promise.resolve();

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

      const buffer = await fetchAudio(screenplay.talk, globalConfig).catch(() => null);
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

export const fetchAudio = async (talk: Talk, globalConfig: GlobalConfig): Promise<ArrayBuffer> => {
  // 使用流式TTS生成
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
    return buffer;
  } catch (error) {
    console.error('流式音频获取失败，尝试使用非流式API:', error);
    try {
      return await fallbackToNonStreamAPI(talk, globalConfig);
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
    }
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
