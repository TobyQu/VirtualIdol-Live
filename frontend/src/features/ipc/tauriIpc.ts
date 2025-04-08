import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { Message } from '../messages/messages';

// 语音合成请求
export async function synthesizeSpeech(text: string, voiceId: string) {
  try {
    const response = await invoke('synthesize_speech', {
      text,
      voiceId,
    });
    return response as string;
  } catch (error) {
    console.error('Failed to synthesize speech:', error);
    throw error;
  }
}

// 聊天消息处理
export async function sendChatMessage(message: string) {
  try {
    const response = await invoke('send_chat_message', {
      message,
    });
    return response as Message;
  } catch (error) {
    console.error('Failed to send chat message:', error);
    throw error;
  }
}

// 监听后端事件
export async function listenToBackendEvents(callback: (event: any) => void) {
  try {
    const unlisten = await listen('backend-event', (event) => {
      callback(event);
    });
    return unlisten;
  } catch (error) {
    console.error('Failed to listen to backend events:', error);
    throw error;
  }
}

// 获取应用配置
export async function getAppConfig() {
  try {
    const config = await invoke('get_app_config');
    return config;
  } catch (error) {
    console.error('Failed to get app config:', error);
    throw error;
  }
}

// 保存应用配置
export async function saveAppConfig(config: any) {
  try {
    await invoke('save_app_config', { config });
    return true;
  } catch (error) {
    console.error('Failed to save app config:', error);
    return false;
  }
}