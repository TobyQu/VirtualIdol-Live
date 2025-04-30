import { buildUrl } from "@/utils/buildUrl";
import { getRequest, postRequest, getFullApiUrl } from "../httpclient/httpclient";
import axios from 'axios';
import { EmotionType } from "../messages/messages";

export const voiceData = {
    id: "",
    name: ""
}
export type Voice = typeof voiceData;

/**
 * 获取语音列表（Minimax）
 * @returns 语音列表
 */
export async function getVoices() {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    const body = { "type": "minimax" };

    try {
        const chatRes = await postRequest("/api/v1/speech/tts/voices/", headers, body);
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
        const response = await postRequest("/api/v1/speech/tts/generate/", headers, body);
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
        
        // 使用完整的API路径
        const apiUrl = "/api/v1/speech/tts/stream/";
        console.log(`发送流式TTS请求到: ${apiUrl}`);
        
        const response = await axios.post(apiUrl, body, {
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
export async function getEmotions() {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    try {
        const response = await getRequest("/api/v1/speech/tts/emotions/", headers);
        if (response.code !== '200') {
            throw new Error(`获取情绪列表失败: ${response.message || '未知错误'}`);
        }
        return response.response.emotions || [];
    } catch (error) {
        console.error("获取情绪列表出错:", error);
        // 如果API调用失败，返回本地定义的情绪类型
        return Object.values(EmotionType);
    }
}

/**
 * 翻译文本
 * @param text 要翻译的文本
 * @param source_lang 源语言，默认自动检测
 * @param target_lang 目标语言，默认中文
 * @returns 翻译后的文本
 */
export async function translateText(text: string, source_lang: string = 'auto', target_lang: string = 'zh') {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    const body = {
        "text": text,
        "source_lang": source_lang,
        "target_lang": target_lang
    };

    try {
        const response = await postRequest("/api/v1/speech/translation/", headers, body);
        if (response.code !== '200') {
            throw new Error(`翻译文本失败: ${response.message || '未知错误'}`);
        }
        return response.response.translated_text;
    } catch (error) {
        console.error("翻译文本出错:", error);
        throw error;
    }
}
