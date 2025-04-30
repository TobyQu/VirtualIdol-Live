import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { 
  createSuccessResponse, 
  createErrorResponse,
  extractTTSParams,
  generateTTSAudio,
  generateTempFilePath,
  cleanupTempFiles
} from '../utils';

/**
 * TTS生成接口
 * 将文本转换为语音，并返回音频文件URL
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 定期清理临时文件
  cleanupTempFiles();
  
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  try {
    // 提取请求参数
    const { 
      text, 
      voice_id, 
      tts_type = 'minimax',  // 默认使用minimax
      emotion = 'neutral',
      speaker_x = 1.32,
      speaker_y = 1.88
    } = extractTTSParams(req);
    
    // 参数验证
    if (!text) {
      return res.status(400).json(createErrorResponse(new Error('缺少必要参数: text'), 400));
    }
    
    // 参数验证 - 确保voice_id存在
    if (!voice_id) {
      return res.status(400).json(createErrorResponse(new Error('缺少必要参数: voice_id'), 400));
    }
    
    // 生成语音
    const audioResult = await generateTTSAudio(text, tts_type, voice_id, emotion, speaker_x, speaker_y);
    
    // 对于koeiromap，直接返回audio字段
    if (tts_type === 'koeiromap' && typeof audioResult === 'object' && 'audio' in audioResult) {
      // 从base64解码为Uint8Array，避免类型错误
      const b64 = audioResult.audio;
      const raw = Buffer.from(b64, 'base64'); 
      const audioData = new Uint8Array(raw);
      
      const audioFilePath = generateTempFilePath('tts', 'mp3');
      fs.writeFileSync(audioFilePath, audioData);
      
      // 获取相对路径作为URL
      const publicDir = path.join(process.cwd(), 'public');
      const relativePath = audioFilePath.replace(publicDir, '');
      const audioUrl = relativePath.split(path.sep).join('/');
      
      return res.status(200).json(createSuccessResponse({
        audio_url: audioUrl,
        text: text,
        emotion: emotion
      }));
    }
    
    // 对于其他TTS，如minimax，处理ArrayBuffer
    if (audioResult instanceof ArrayBuffer) {
      const audioData = new Uint8Array(audioResult);
      const audioFilePath = generateTempFilePath('tts', 'mp3');
      fs.writeFileSync(audioFilePath, audioData);
      
      // 获取相对路径作为URL
      const publicDir = path.join(process.cwd(), 'public');
      const relativePath = audioFilePath.replace(publicDir, '');
      const audioUrl = relativePath.split(path.sep).join('/');
      
      return res.status(200).json(createSuccessResponse({
        audio_url: audioUrl,
        text: text,
        emotion: emotion
      }));
    }
    
    // 如果返回的是音频数据的URL或文件名
    if (typeof audioResult === 'string') {
      return res.status(200).json(createSuccessResponse({
        audio_url: audioResult.startsWith('/') ? audioResult : `/${audioResult}`,
        text: text,
        emotion: emotion
      }));
    }
    
    // 返回错误 - 不支持的返回类型
    return res.status(500).json(createErrorResponse(new Error(`不支持的音频返回类型: ${typeof audioResult}`), 500));
  } catch (error) {
    console.error('TTS生成出错:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 