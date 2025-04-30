import axios from 'axios';

/**
 * Minimax TTS声音列表
 */
export const minimaxVoices = [
  // 系统音色
  {"id": "male-qn-qingse", "name": "青涩青年音色"},
  {"id": "male-qn-jingying", "name": "精英青年音色"},
  {"id": "male-qn-badao", "name": "霸道青年音色"},
  {"id": "male-qn-daxuesheng", "name": "青年大学生音色"},
  {"id": "female-shaonv", "name": "少女音色"},
  {"id": "female-yujie", "name": "御姐音色"},
  {"id": "female-chengshu", "name": "成熟女性音色"},
  {"id": "female-tianmei", "name": "甜美女性音色"},
  {"id": "presenter_male", "name": "男性主持人"},
  {"id": "presenter_female", "name": "女性主持人"},
  {"id": "audiobook_male_1", "name": "男性有声书1"},
  {"id": "audiobook_male_2", "name": "男性有声书2"},
  {"id": "audiobook_female_1", "name": "女性有声书1"},
  {"id": "audiobook_female_2", "name": "女性有声书2"},
  // 精品音色
  {"id": "male-qn-qingse-jingpin", "name": "青涩青年音色-beta"},
  {"id": "male-qn-jingying-jingpin", "name": "精英青年音色-beta"},
  {"id": "male-qn-badao-jingpin", "name": "霸道青年音色-beta"},
  {"id": "male-qn-daxuesheng-jingpin", "name": "青年大学生音色-beta"},
  {"id": "female-shaonv-jingpin", "name": "少女音色-beta"},
  {"id": "female-yujie-jingpin", "name": "御姐音色-beta"},
  {"id": "female-chengshu-jingpin", "name": "成熟女性音色-beta"},
  {"id": "female-tianmei-jingpin", "name": "甜美女性音色-beta"},
  // 儿童及卡通音色
  {"id": "clever_boy", "name": "聪明男童"},
  {"id": "cute_boy", "name": "可爱男童"},
  {"id": "lovely_girl", "name": "萌萌女童"},
  {"id": "cartoon_pig", "name": "卡通猪小琪"},
  // 其他音色
  {"id": "bingjiao_didi", "name": "病娇弟弟"},
  {"id": "junlang_nanyou", "name": "俊朗男友"},
  {"id": "chunzhen_xuedi", "name": "纯真学弟"},
  {"id": "lengdan_xiongzhang", "name": "冷淡学长"},
  {"id": "badao_shaoye", "name": "霸道少爷"},
  {"id": "tianxin_xiaoling", "name": "甜心小玲"},
  {"id": "qiaopi_mengmei", "name": "俏皮萌妹"},
  {"id": "wumei_yujie", "name": "妩媚御姐"},
  {"id": "diadia_xuemei", "name": "嗲嗲学妹"},
  {"id": "danya_xuejie", "name": "淡雅学姐"},
  {"id": "Santa_Claus", "name": "Santa Claus"},
  {"id": "Grinch", "name": "Grinch"},
  {"id": "Rudolph", "name": "Rudolph"},
  {"id": "Arnold", "name": "Arnold"},
  {"id": "Charming_Santa", "name": "Charming Santa"},
  {"id": "Charming_Lady", "name": "Charming Lady"},
  {"id": "Sweet_Girl", "name": "Sweet Girl"},
  {"id": "Cute_Elf", "name": "Cute Elf"},
  {"id": "Attractive_Girl", "name": "Attractive Girl"},
  {"id": "Serene_Woman", "name": "Serene Woman"}
];

/**
 * 情绪列表
 */
export const EMOTIONS = ["happy", "sad", "angry", "fearful", "disgusted", "surprised", "neutral"];

/**
 * TTS配置
 */
export interface MinimaxTTSConfig {
  apiKey: string;
  groupId: string;
  model?: string;
}

/**
 * Minimax TTS客户端
 */
export class MinimaxTTS {
  private API_BASE_URL = "https://api.minimax.chat/v1/";
  private TTS_API_ENDPOINT = "t2a_v2";  // 使用新的API端点
  private model: string;
  private apiKey: string;
  private groupId: string;

  /**
   * 构造函数
   * @param config TTS配置
   */
  constructor(config: MinimaxTTSConfig) {
    this.apiKey = config.apiKey;
    this.groupId = config.groupId;
    this.model = config.model || "speech-02-turbo";
  }

  /**
   * 创建音频
   * @param text 要转换的文本
   * @param voiceId 声音ID
   * @param emotion 情绪
   * @param stream 是否流式输出
   * @returns 音频数据
   */
  async createAudio(text: string, voiceId: string, emotion: string = "neutral", stream: boolean = false): Promise<string | ArrayBuffer> {
    if (!this.apiKey || !this.groupId) {
      throw new Error("Minimax API配置不完整，请设置apiKey和groupId");
    }

    // 验证情绪参数
    if (!EMOTIONS.includes(emotion)) {
      console.warn(`无效的情绪参数 '${emotion}'，已设为默认值 'neutral'`);
      emotion = "neutral";
    }

    console.log(`使用Minimax TTS生成音频 - 文本: ${text.substring(0, 50)}..., 声音ID: ${voiceId}, 情绪: ${emotion}, 流式: ${stream}`);

    // 准备请求数据
    const requestData: any = {
      model: this.model,
      text: text,
      stream: stream,
      language_boost: "auto",
      output_format: "hex",
      voice_setting: {
        voice_id: voiceId,
        speed: 1,
        vol: 1,
        pitch: 0
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3"
      }
    };

    // 如果使用的是支持情绪的模型，添加情绪参数
    if (["speech-02-hd", "speech-02-turbo", "speech-01-turbo", "speech-01-hd"].includes(this.model)) {
      requestData.voice_setting.emotion = emotion;
    }

    // 准备请求头
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };

    // 发送API请求
    const url = `${this.API_BASE_URL}${this.TTS_API_ENDPOINT}?GroupId=${this.groupId}`;

    try {
      const response = await axios.post(url, requestData, { headers });
      
      // 解析响应
      const responseData = response.data;
      console.log("Minimax TTS API响应:", JSON.stringify(responseData).substring(0, 200) + "...");
      
      // 获取音频数据
      let hexData = null;
      
      // 处理不同的响应格式
      if (typeof responseData === 'string') {
        // 尝试解析字符串为JSON
        try {
          const jsonData = JSON.parse(responseData);
          if (jsonData.data && typeof jsonData.data === 'object' && jsonData.data.audio) {
            hexData = jsonData.data.audio;
          } else if (jsonData.data && typeof jsonData.data === 'string') {
            hexData = jsonData.data;
          }
        } catch (e) {
          // 如果解析失败，可能是直接返回的hex数据
          hexData = responseData;
        }
      } else if (typeof responseData === 'object') {
        // 处理对象形式的响应
        if (responseData.data) {
          const dataField = responseData.data;
          if (typeof dataField === 'string') {
            // 数据直接是hex字符串
            hexData = dataField;
          } else if (typeof dataField === 'object') {
            // 数据是嵌套对象
            if (dataField.audio) {
              hexData = dataField.audio;
            }
          }
        } else if (responseData.response && responseData.response.data) {
          // 处理可能的嵌套结构
          const nestedData = responseData.response.data;
          if (typeof nestedData === 'string') {
            hexData = nestedData;
          } else if (typeof nestedData === 'object' && nestedData.audio) {
            hexData = nestedData.audio;
          }
        }
      }
      
      // 检查是否成功提取到数据
      if (!hexData) {
        console.error("无法从响应中提取音频数据:", responseData);
        throw new Error("响应中未包含可识别的音频数据");
      }
      
      // 将十六进制字符串转换为二进制数据
      const audioData = this.hexToArrayBuffer(hexData);
      return audioData;
    } catch (error) {
      console.error("Minimax TTS API请求失败:", error);
      throw error;
    }
  }

  /**
   * 十六进制字符串转ArrayBuffer
   */
  private hexToArrayBuffer(hexString: string): ArrayBuffer {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes.buffer;
  }

  /**
   * 获取可用的声音列表
   */
  getVoices() {
    return minimaxVoices;
  }
} 