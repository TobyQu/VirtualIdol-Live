import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// 添加请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;

// API 端点
export const API_ENDPOINTS = {
  // 聊天相关
  CHAT: {
    SEND_MESSAGE: '/chatbot/chat',
    GET_HISTORY: '/chatbot/history',
    CLEAR_HISTORY: '/chatbot/clear',
  },
  // 语音相关
  SPEECH: {
    TEXT_TO_SPEECH: '/chatbot/tts',
    SPEECH_TO_TEXT: '/chatbot/stt',
  },
  // 系统配置
  SYSTEM: {
    GET_CONFIG: '/chatbot/config/get',
    UPDATE_CONFIG: '/chatbot/config/save',
  },
  // 角色相关
  ROLE: {
    LIST: '/chatbot/roles',
    UPLOAD: '/chatbot/role/upload',
    DELETE: '/chatbot/role/delete',
  },
  // VRM 模型相关
  VRM: {
    LIST: '/chatbot/vrm/list',
    UPLOAD: '/chatbot/vrm/upload',
    DELETE: '/chatbot/vrm/delete',
  },
};

// WebSocket 端点
export const WS_ENDPOINTS = {
  CHAT: '/ws/chat',
};

// 构建完整的 WebSocket URL
export const buildWsUrl = (endpoint: string) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//localhost:8000${endpoint}`;
}; 