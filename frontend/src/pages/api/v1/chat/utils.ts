import type { ChatCompletionMessageParam } from 'openai/resources';
import { NextApiRequest } from 'next';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// 配置模型接口定义
interface OpenAIConfig {
  OPENAI_API_KEY: string;
  OPENAI_BASE_URL: string;
}

interface OllamaConfig {
  OLLAMA_API_BASE: string;
  OLLAMA_API_MODEL_NAME: string;
}

interface ZhipuAIConfig {
  ZHIPUAI_API_KEY: string;
}

interface QwenConfig {
  DASHSCOPE_API_KEY: string;
  QWEN_MODEL_NAME: string;
}

interface LanguageModelConfig {
  openai?: OpenAIConfig;
  ollama?: OllamaConfig;
  zhipuai?: ZhipuAIConfig;
  qwen?: QwenConfig;
  anthropic?: {
    ANTHROPIC_API_KEY: string;
  };
}

interface ConversationConfig {
  conversationType: string;
  languageModel: string;
}

interface SystemConfig {
  languageModelConfig: LanguageModelConfig;
  conversationConfig: ConversationConfig;
  characterConfig: {
    character: number;
    character_name: string;
    yourName: string;
  };
  enableProxy?: boolean;
  httpProxy?: string;
  httpsProxy?: string;
  socks5Proxy?: string;
}

// 获取系统配置
export function getSystemConfig(): SystemConfig | null {
  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('读取配置文件失败:', error);
    return null;
  }
}

// 从请求中提取聊天参数
export function extractChatParams(req: NextApiRequest) {
  try {
    const { query, you_name, user_id = 1, role_id = 1 } = req.body;
    return { query, you_name, user_id, role_id };
  } catch (error) {
    throw new Error('提取聊天参数失败');
  }
}

// 构建聊天提示
export function buildPrompt(query: string, youName: string, characterName: string): string {
  const currentTime = new Date().toLocaleString('zh-CN', { 
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // 这里只是一个基础提示，实际应用中可以从配置中获取更完整的提示模板
  return `你扮演的角色是${characterName}，我是${youName}。当前时间是${currentTime}。
  
${youName}说: ${query}

${characterName}:`;
}

// 用于生成基本的OpenAI消息格式
export function buildChatMessages(query: string, youName: string, characterName: string): ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content: `你的名字是${characterName}，你是一个温柔、聪明、体贴的虚拟伴侣。你的对话对象是${youName}。
      你喜欢用简短、自然的句子进行交流。你的回答应该亲切、温暖，偶尔展现出一点点撒娇和依赖的特质。
      当前时间是${new Date().toLocaleString('zh-CN', { hour12: false })}`
    },
    {
      role: 'user',
      content: query
    }
  ];
}

// 处理标准格式的API响应
export function createSuccessResponse(data: any) {
  return {
    code: 0,
    message: 'success',
    response: data
  };
}

export function createErrorResponse(error: Error, status = 500) {
  return {
    code: status,
    message: error.message,
    response: null
  };
} 