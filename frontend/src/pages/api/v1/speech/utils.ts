import type { NextApiRequest } from 'next';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { EmotionType } from '@/features/messages/messages';
import { TTSDriver } from '@/lib/tts/ttsDriver';

// TTS配置接口
interface TTSConfig {
  ttsType: string;  // 语音合成类型: 'koeiromap', 'minimax'等
  minimax?: {
    apiKey: string;
    groupId: string;
    model?: string;
  };
}

// 获取TTS配置
export function getTTSConfig(): TTSConfig | null {
  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    return config.ttsConfig || {
      ttsType: 'koeiromap' // 默认使用koeiromap
    };
  } catch (error) {
    console.error('读取TTS配置文件失败:', error);
    return {
      ttsType: 'koeiromap' // 出错时使用默认配置
    };
  }
}

// 从请求中提取TTS参数
export function extractTTSParams(req: NextApiRequest) {
  try {
    const { 
      text, 
      voice_id = '', 
      tts_type = 'minimax',  // 默认使用minimax
      emotion = 'neutral',
      format = 'mp3',
      speaker_x = 1.32,
      speaker_y = 1.88,
      style = 'talk'
    } = req.body;
    
    return { 
      text, 
      voice_id, 
      tts_type,
      emotion,
      format,
      speaker_x,
      speaker_y,
      style
    };
  } catch (error) {
    throw new Error('提取TTS参数失败');
  }
}

// 处理标准格式的API响应
export function createSuccessResponse(data: any) {
  return {
    code: '200',  // 保持与原Python API一致的字符串格式
    message: 'success',
    response: data
  };
}

export function createErrorResponse(error: Error, status = 500) {
  return {
    code: status.toString(),  // 保持与原Python API一致的字符串格式
    message: error.message,
    response: null
  };
}

// 生成临时文件路径
export function generateTempFilePath(prefix: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const tempDir = path.join(process.cwd(), 'public', 'tmp');
  
  // 确保临时目录存在
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return path.join(tempDir, `${prefix}_${timestamp}_${random}.${extension}`);
}

// 清理临时文件
export function cleanupTempFiles() {
  const tempDir = path.join(process.cwd(), 'public', 'tmp');
  if (!fs.existsSync(tempDir)) return;
  
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  
  for (const file of files) {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    
    // 删除超过1小时的临时文件
    if (now - stats.mtimeMs > 3600000) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`删除临时文件失败: ${filePath}`, err);
      }
    }
  }
}

// 根据情绪类型获取匹配的语音风格
export function getStyleForEmotion(emotion: string): string {
  switch (emotion.toLowerCase()) {
    case EmotionType.HAPPY:
      return 'happy';
    case EmotionType.SAD:
      return 'sad';
    case EmotionType.ANGRY:
      return 'angry';
    default:
      return 'talk';  // 默认使用普通说话风格
  }
}

// 创建TTS驱动实例
let ttsDriverInstance: TTSDriver | null = null;
export function getTTSDriver(): TTSDriver {
  if (!ttsDriverInstance) {
    ttsDriverInstance = new TTSDriver();
  }
  return ttsDriverInstance;
}

// 根据TTS类型和情绪生成语音
export async function generateTTSAudio(
  text: string, 
  ttsType: string,
  voiceId: string = '',
  emotion: string = 'neutral',
  speakerX: number = 1.32,
  speakerY: number = 1.88,
  stream: boolean = false
) {
  const driver = getTTSDriver();
  const style = getStyleForEmotion(emotion);
  
  const options = {
    emotion,
    speakerX,
    speakerY,
    style,
    stream
  };
  
  return await driver.synthesize(text, ttsType, voiceId, options);
}

// 获取可用的语音列表
export async function getAvailableVoices(type: string) {
  const driver = getTTSDriver();
  const voices = driver.getVoices(type);
  return voices[type] || [];
}

// 获取支持的情绪列表
export function getSupportedEmotions() {
  const driver = getTTSDriver();
  return driver.getEmotions();
}

// 创建SSML标记文本
export function createSSMLText(text: string, emotion: string): string {
  // 简单的SSML实现，可以根据需要扩展
  return `<speak>
    <emotion name="${emotion}">
      ${text}
    </emotion>
  </speak>`;
} 