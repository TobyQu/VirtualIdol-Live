import { MinimaxTTS, minimaxVoices, EMOTIONS } from './minimaxTTS';
import { synthesizeVoice } from '@/features/koeiromap/koeiromap';
import fs from 'fs';
import path from 'path';

/**
 * TTS配置
 */
interface TTSConfig {
  ttsType: string;
  minimax?: {
    apiKey: string;
    groupId: string;
    model?: string;
  };
}

/**
 * 基础TTS接口
 */
export interface BaseTTS {
  /**
   * 生成语音
   * @param text 文本
   * @param voiceId 声音ID
   * @param options 选项
   */
  synthesize(text: string, voiceId: string, options?: any): Promise<any>;
  
  /**
   * 获取声音列表
   */
  getVoices(): any[];
}

/**
 * Koeiromap TTS实现
 */
export class KoeiromapTTS implements BaseTTS {
  async synthesize(text: string, voiceId: string, options: any = {}): Promise<any> {
    const speakerX = options.speakerX || 1.32;
    const speakerY = options.speakerY || 1.88;
    const style = options.style || 'talk';
    
    const voice = await synthesizeVoice(text, speakerX, speakerY, style);
    return voice;
  }
  
  getVoices(): any[] {
    return [{ id: 'default', name: '默认语音' }];
  }
}

/**
 * Minimax TTS包装类
 */
export class MinimaxTTSWrapper implements BaseTTS {
  private client: MinimaxTTS;
  
  constructor(config: { apiKey: string, groupId: string, model?: string }) {
    this.client = new MinimaxTTS(config);
  }
  
  async synthesize(text: string, voiceId: string, options: any = {}): Promise<any> {
    const emotion = options.emotion || 'neutral';
    const stream = options.stream || false;
    
    return await this.client.createAudio(text, voiceId, emotion, stream);
  }
  
  getVoices(): any[] {
    return this.client.getVoices();
  }
}

/**
 * TTS驱动类
 */
export class TTSDriver {
  private ttsMap: Record<string, BaseTTS> = {};
  
  constructor() {
    // 读取配置
    const config = this.getConfig();
    
    // 初始化Koeiromap TTS
    this.ttsMap['koeiromap'] = new KoeiromapTTS();
    
    // 初始化Minimax TTS (如果配置存在)
    if (config.minimax?.apiKey && config.minimax?.groupId) {
      this.ttsMap['minimax'] = new MinimaxTTSWrapper({
        apiKey: config.minimax.apiKey,
        groupId: config.minimax.groupId,
        model: config.minimax.model
      });
    }
  }
  
  /**
   * 读取配置
   */
  private getConfig(): TTSConfig {
    try {
      const configPath = path.join(process.cwd(), 'data', 'config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      return config.ttsConfig || { ttsType: 'koeiromap' };
    } catch (error) {
      console.error('读取TTS配置文件失败:', error);
      return { ttsType: 'koeiromap' };
    }
  }
  
  /**
   * 合成语音
   * @param text 文本
   * @param ttsType TTS类型
   * @param voiceId 声音ID
   * @param options 选项
   */
  async synthesize(text: string, ttsType: string, voiceId: string, options: any = {}): Promise<any> {
    console.log(`Synthesis text=${text.substring(0, 30)}..., tts_type=${ttsType}, voice_id=${voiceId}`);
    
    try {
      // 检查TTS类型是否存在
      if (!this.ttsMap[ttsType]) {
        console.warn(`不支持的TTS类型: ${ttsType}，强制使用koeiromap`);
        ttsType = 'koeiromap';
      }
      
      const tts = this.ttsMap[ttsType];
      
      // 调用对应的TTS合成
      const result = await tts.synthesize(text, voiceId, options);
      
      return result;
    } catch (error) {
      console.error('语音合成错误:', error);
      throw error;
    }
  }
  
  /**
   * 获取声音列表
   * @param ttsType TTS类型
   */
  getVoices(ttsType?: string): Record<string, any[]> {
    try {
      const result: Record<string, any[]> = {};
      
      if (!ttsType) {
        // 获取所有TTS类型的语音
        for (const [key, tts] of Object.entries(this.ttsMap)) {
          result[key] = tts.getVoices();
        }
      } else if (this.ttsMap[ttsType]) {
        // 获取指定TTS类型的语音
        result[ttsType] = this.ttsMap[ttsType].getVoices();
      }
      
      return result;
    } catch (error) {
      console.error('获取语音列表错误:', error);
      return {};
    }
  }
  
  /**
   * 获取情绪列表
   */
  getEmotions(): string[] {
    return EMOTIONS;
  }
} 