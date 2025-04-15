import { buildUrl } from "@/utils/buildUrl";
import { getRequest, postRequest, buildMediaUrl } from "../httpclient/httpclient";
import axios from 'axios';
import { EmotionType } from "../messages/messages";

export const voiceData = {
    id: "",
    name: ""
}
export type Voice = typeof voiceData;

/**
 * 获取语音列表（仅Minimax）
 * @returns 语音列表
 */
export async function getVoices() {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    const body = { "type": "minimax" };

    try {
        const chatRes = await postRequest("/api/speech/tts/voices/", headers, body);
        if (chatRes.code !== '200') {
            throw new Error(`获取语音列表失败: ${chatRes.message || '未知错误'}`);
        }
        return chatRes.response.minimax || [];
    } catch (error) {
        console.error("获取语音列表出错:", error);
        throw error;
    }
}

/**
 * 生成语音音频
 * @param text 要转换的文本
 * @param voice_id 语音ID
 * @param emotion 情绪 (可选，从上下文自动设置)
 * @returns 音频URL
 */
export async function generateAudio(text: string, voice_id: string, emotion: string = 'neutral') {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    const body = {
        "text": text,
        "voice_id": voice_id,
        "tts_type": "minimax",
        "emotion": emotion
    };

    try {
        const response = await postRequest("/api/speech/tts/generate/", headers, body);
        if (response.code !== '200') {
            throw new Error(`生成语音失败: ${response.message || '未知错误'}`);
        }
        return response.response.audio_url;
    } catch (error) {
        console.error("生成语音出错:", error);
        throw error;
    }
}

/**
 * 生成语音音频流（流式TTS）
 * @param text 要转换的文本
 * @param voice_id 语音ID
 * @param emotion 情绪 (可选，从上下文自动设置)
 * @returns ArrayBuffer音频数据
 */
export async function generateAudioStream(text: string, voice_id: string, emotion: string = 'neutral'): Promise<ArrayBuffer> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        // 接受所有MIME类型
        "Accept": "*/*"
    };

    const body = {
        "text": text,
        "voice_id": voice_id,
        "tts_type": "minimax",
        "emotion": emotion,
        "format": "mp3"  // 明确指定mp3格式
    };

    try {
        console.log(`请求流式TTS - 文本: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}, 声音ID: ${voice_id}, 情绪: ${emotion}`);
        
        // 获取环境变量，确保URL正确
        const environment = process.env.NODE_ENV;
        let baseUrl = "";
        
        if (environment === "development") {
            baseUrl = "http://localhost:8000";
        } else if (environment === "production") {
            baseUrl = "/api/chatbot";
        } else {
            console.warn("未知环境变量，使用默认值");
            baseUrl = "http://localhost:8000";
        }
        
        // 确保使用完整的URL地址
        const fullUrl = `${baseUrl}/api/speech/tts/stream/`;
        console.log(`发送流式TTS请求到: ${fullUrl}`);
        
        const response = await axios.post(fullUrl, body, {
            headers: headers,
            responseType: 'arraybuffer',  // 直接请求二进制数据
            timeout: 30000
        });
        
        if (response.status !== 200) {
            throw new Error(`生成流式语音失败: 状态码 ${response.status}`);
        }
        
        const buffer = response.data;
        
        // 验证返回的数据是否为有效的ArrayBuffer
        if (!buffer || !(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
            console.error("收到无效的响应数据类型或空数据");
            throw new Error("无效的音频数据响应");
        }
        
        // 检查是否收到了正确的音频数据
        const responseContentType = response.headers['content-type'] || '';
        console.log(`响应Content-Type: ${responseContentType}`);
        
        console.log(`成功获取流式音频数据，大小: ${buffer.byteLength} 字节`);
        
        // 查看数据的前几个字节
        const dataView = new DataView(buffer);
        let hexString = '';
        for (let i = 0; i < Math.min(20, buffer.byteLength); i++) {
            const byte = dataView.getUint8(i).toString(16).padStart(2, '0');
            hexString += byte + ' ';
        }
        console.log(`音频数据头部: ${hexString}`);
        
        // 检查是否是MP3格式（检查MP3文件头）
        let isMP3 = false;
        for (let i = 0; i < Math.min(buffer.byteLength - 1, 100); i++) {
            const b1 = dataView.getUint8(i);
            const b2 = dataView.getUint8(i + 1);
            if (b1 === 0xFF && (b2 === 0xFB || b2 === 0xF3 || b2 === 0xF2)) {
                isMP3 = true;
                console.log(`在位置 ${i} 发现MP3文件头`);
                // 如果MP3头不在开头，可以截取从该位置开始的数据
                if (i > 0) {
                    console.log(`截取从位置 ${i} 开始的数据作为MP3文件`);
                    return buffer.slice(i);
                }
                break;
            }
        }
        
        if (!isMP3) {
            console.warn("未检测到MP3文件头，音频解码可能会失败");
        }
        
        return buffer;
    } catch (error) {
        console.error("生成流式语音出错:", error);
        throw error;
    }
}

/**
 * 获取可用的情绪类型
 * @returns 情绪类型列表
 */
export function getEmotions() {
    return Object.values(EmotionType);
}
