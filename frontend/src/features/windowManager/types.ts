import { GlobalConfig } from "@/features/config/configApi";
import { Message } from "@/features/messages/messages";

// 消息类型定义
export enum WindowMessageType {
  CHAT_WINDOW_CLOSED = 'CHAT_WINDOW_CLOSED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  CONFIG_UPDATED = 'CONFIG_UPDATED',
  CHAT_LOG_UPDATED = 'CHAT_LOG_UPDATED',
  REQUEST_SYNC_DATA = 'REQUEST_SYNC_DATA',
  SYNC_CHAT_LOG = 'SYNC_CHAT_LOG',
  SYNC_CONFIG = 'SYNC_CONFIG'
}

// 窗口消息接口
export interface WindowMessage {
  type: WindowMessageType;
  content?: string;
  user_name?: string;
  chatLog?: Message[];
  config?: GlobalConfig;
}

// 分离窗口状态
export interface DetachedWindowState {
  isDetached: boolean;
  chatWindow: Window | null;
}

// 分离窗口功能接口
export interface WindowManagerContextType extends DetachedWindowState {
  handleDetachChat: () => void;
  syncChatLog: (chatLog: Message[]) => void;
  syncConfig: (config: GlobalConfig) => void;
  sendChatMessage: (content: string, user_name: string, chatLog: Message[]) => void;
} 