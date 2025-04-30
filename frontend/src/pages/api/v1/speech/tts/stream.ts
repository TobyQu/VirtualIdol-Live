import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createErrorResponse,
  extractTTSParams,
  generateTTSAudio
} from '../utils';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 有效的MP3帧头
const VALID_MP3_FRAME_HEADER = new Uint8Array([
  0xFF, 0xFB, 0x90, 0x44  // MPEG1, Layer3, 128kbps, 44.1kHz
]);

// 静音MP3数据片段
const SILENT_MP3_DATA = new Uint8Array([
  0xFF, 0xFB, 0x30, 0xC0, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);

/**
 * 流式TTS生成接口
 * 将文本转换为语音，并直接返回二进制音频数据
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  try {
    // 提取请求参数
    const { 
      text, 
      voice_id, 
      tts_type = 'minimax',
      emotion = 'neutral',
      format = 'mp3',
      speaker_x = 1.32,
      speaker_y = 1.88
    } = extractTTSParams(req);
    
    // 参数验证
    if (!text) {
      return res.status(400).json(createErrorResponse(new Error('缺少必要参数: text'), 400));
    }
    
    if (!voice_id) {
      return res.status(400).json(createErrorResponse(new Error('缺少必要参数: voice_id'), 400));
    }
    
    // 生成语音 - 使用流式选项
    const audioResult = await generateTTSAudio(text, tts_type, voice_id, emotion, speaker_x, speaker_y, true);
    
    // 根据不同的返回类型处理音频数据
    let rawAudioData: Uint8Array;
    
    // 对于koeiromap
    if (tts_type === 'koeiromap' && typeof audioResult === 'object' && 'audio' in audioResult) {
      const b64 = audioResult.audio;
      const raw = Buffer.from(b64, 'base64');
      rawAudioData = new Uint8Array(raw);
    }
    // 对于minimax等返回ArrayBuffer的TTS
    else if (audioResult instanceof ArrayBuffer) {
      rawAudioData = new Uint8Array(audioResult);
    }
    // 其他不支持的返回类型
    else {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json(createErrorResponse(
        new Error(`不支持的音频返回类型: ${typeof audioResult}`), 
        500
      ));
    }
    
    console.log(`原始音频数据大小: ${rawAudioData.length} 字节`);
    
    // 检查音频数据是否合法
    if (rawAudioData.length === 0) {
      return res.status(500).json(createErrorResponse(
        new Error('TTS生成空音频数据'), 
        500
      ));
    }
    
    // 尝试在数据中寻找MP3头
    let mp3StartIndex = -1;
    for (let i = 0; i < Math.min(rawAudioData.length - 3, 200); i++) {
      if (rawAudioData[i] === 0xFF && 
         (rawAudioData[i + 1] === 0xFB || 
          rawAudioData[i + 1] === 0xF3 || 
          rawAudioData[i + 1] === 0xF2)) {
        mp3StartIndex = i;
        console.log(`发现MP3头部在位置: ${i}`);
        break;
      }
    }
    
    // 生成最终音频数据
    let finalAudioData: Uint8Array;
    
    if (mp3StartIndex > 0) {
      // 如果找到MP3头但不在开始位置，则截取
      console.log(`截取从 ${mp3StartIndex} 开始的数据作为MP3文件`);
      finalAudioData = rawAudioData.slice(mp3StartIndex);
    } 
    else if (mp3StartIndex === 0) {
      // MP3头在正确位置，直接使用
      finalAudioData = rawAudioData;
    }
    else {
      // 没有找到MP3头，添加一个标准头部
      console.log('未找到MP3头部，添加标准MP3头');
      
      // 创建一个临时文件将音频保存到磁盘
      // 这解决了某些浏览器中的范围请求问题
      const tempDir = path.join(process.cwd(), 'public', 'tmp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // 创建一个有效的MP3
      const validMp3 = new Uint8Array(VALID_MP3_FRAME_HEADER.length + rawAudioData.length + SILENT_MP3_DATA.length);
      validMp3.set(VALID_MP3_FRAME_HEADER, 0);
      validMp3.set(rawAudioData, VALID_MP3_FRAME_HEADER.length);
      validMp3.set(SILENT_MP3_DATA, VALID_MP3_FRAME_HEADER.length + rawAudioData.length);
      
      // 生成唯一的文件名
      const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex').slice(0, 8);
      const tempFilePath = path.join(tempDir, `tts_${hash}.mp3`);
      
      // 写入文件
      fs.writeFileSync(tempFilePath, validMp3);
      
      // 重定向到临时文件URL
      const urlPath = `/tmp/tts_${hash}.mp3`;
      console.log(`已将音频保存为临时文件: ${urlPath}`);
      
      // 使用302重定向而不是直接返回二进制数据
      // 这解决了blob URL的范围请求问题
      res.setHeader('Location', urlPath);
      return res.status(302).end();
    }
    
    // 确保数据量足够
    if (finalAudioData.length < 32) {
      console.log('音频数据太短，添加填充');
      const paddedData = new Uint8Array(finalAudioData.length + SILENT_MP3_DATA.length);
      paddedData.set(finalAudioData, 0);
      paddedData.set(SILENT_MP3_DATA, finalAudioData.length);
      finalAudioData = paddedData;
    }
    
    // 创建一个临时文件将音频保存到磁盘
    // 这解决了某些浏览器中的范围请求问题
    const tempDir = path.join(process.cwd(), 'public', 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 生成唯一的文件名
    const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex').slice(0, 8);
    const tempFilePath = path.join(tempDir, `tts_${hash}.mp3`);
    
    // 写入文件
    fs.writeFileSync(tempFilePath, finalAudioData);
    
    // 重定向到临时文件URL
    const urlPath = `/tmp/tts_${hash}.mp3`;
    console.log(`已将音频保存为临时文件: ${urlPath}`);
    
    // 使用302重定向而不是直接返回二进制数据
    // 这解决了blob URL的范围请求问题
    res.setHeader('Location', urlPath);
    return res.status(302).end();
    
  } catch (error) {
    console.error('流式TTS生成出错:', error);
    
    // 响应错误信息
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 