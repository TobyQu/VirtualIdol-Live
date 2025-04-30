import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { ollama, createOllama } from 'ollama-ai-provider';
import { zhipu, createZhipu } from 'zhipu-ai-provider';
import { qwen, createQwen } from 'qwen-ai-provider';
import { generateText } from 'ai';
import { 
  extractChatParams, 
  getSystemConfig, 
  buildChatMessages, 
  createSuccessResponse, 
  createErrorResponse 
} from './utils';

/**
 * 处理聊天请求
 * @param req NextJS API请求对象
 * @param res NextJS API响应对象
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  try {
    // 提取请求参数
    const { query, you_name, user_id, role_id } = extractChatParams(req);
    
    // 参数验证
    if (!query || !you_name) {
      return res.status(400).json(createErrorResponse(new Error('缺少必要参数'), 400));
    }
    
    // 获取系统配置
    const config = getSystemConfig();
    if (!config) {
      return res.status(500).json(createErrorResponse(new Error('无法获取系统配置'), 500));
    }
    
    // 构建聊天消息
    const messages = buildChatMessages(
      query, 
      you_name, 
      config.characterConfig.character_name
    );
    
    // 根据当前配置选择不同的模型
    const modelType = config.conversationConfig.languageModel;
    
    // 使用OpenAI处理聊天
    if (modelType === 'openai') {
      try {
        // 创建OpenAI客户端
        const apiKey = config.languageModelConfig?.openai?.OPENAI_API_KEY;
        const baseURL = config.languageModelConfig?.openai?.OPENAI_BASE_URL;
        
        if (!apiKey) {
          throw new Error('缺少OpenAI API密钥');
        }
        
        // 使用原生OpenAI包直接调用API
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: baseURL || undefined,
        });
        
        // 调用OpenAI API
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
        });
        
        // 获取回复文本
        const response = completion.choices[0].message.content || '';
        
        // 返回成功响应
        return res.status(200).json(createSuccessResponse(response));
      } catch (error) {
        console.error('OpenAI API调用失败:', error);
        return res.status(500).json(createErrorResponse(new Error('OpenAI API调用失败'), 500));
      }
    } 
    // 如果需要支持Ollama
    else if (modelType === 'ollama') {
      try {
        // 使用fetch直接调用Ollama API
        const ollamaBaseUrl = config.languageModelConfig?.ollama?.OLLAMA_API_BASE || 'http://localhost:11434';
        const ollamaModel = config.languageModelConfig?.ollama?.OLLAMA_API_MODEL_NAME || 'llama3';
        
        const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: ollamaModel,
            messages: messages,
            options: {
              temperature: 0.7
            }
          }),
        });
        
        const result = await response.json();
        const textResponse = result.message?.content || '';
        
        return res.status(200).json(createSuccessResponse(textResponse));
      } catch (error) {
        console.error('Ollama API调用失败:', error);
        return res.status(500).json(createErrorResponse(new Error('Ollama模型调用失败'), 500));
      }
    } 
    // 如果需要支持智谱AI
    else if (modelType === 'zhipuai') {
      try {
        // 获取智谱API配置
        const apiKey = config.languageModelConfig?.zhipuai?.ZHIPUAI_API_KEY;
        
        if (!apiKey) {
          throw new Error('缺少智谱AI API密钥');
        }
        
        // 使用智谱AI直接调用
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'glm-4',
            messages: messages.map(msg => ({
              role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
              content: typeof msg.content === 'string' ? msg.content : ''
            })),
            temperature: 0.7,
            max_tokens: 1000
          })
        });
        
        const result = await response.json();
        const textResponse = result.choices?.[0]?.message?.content || '';
        
        return res.status(200).json(createSuccessResponse(textResponse));
      } catch (error) {
        console.error('智谱AI调用失败:', error);
        return res.status(500).json(createErrorResponse(new Error('智谱AI模型调用失败'), 500));
      }
    }
    // 如果需要支持Qwen
    else if (modelType === 'qwen') {
      try {
        // 获取通义千问API配置
        const apiKey = config.languageModelConfig?.qwen?.DASHSCOPE_API_KEY;
        const qwenModel = config.languageModelConfig?.qwen?.QWEN_MODEL_NAME || 'qwen-plus';
        
        if (!apiKey) {
          throw new Error('缺少通义千问API密钥');
        }
        
        // 使用通义千问直接调用
        const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: qwenModel,
            messages: messages.map(msg => ({
              role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
              content: typeof msg.content === 'string' ? msg.content : ''
            })),
            temperature: 0.7,
            max_tokens: 1000
          })
        });
        
        const result = await response.json();
        const textResponse = result.choices?.[0]?.message?.content || '';
        
        return res.status(200).json(createSuccessResponse(textResponse));
      } catch (error) {
        console.error('通义千问调用失败:', error);
        return res.status(500).json(createErrorResponse(new Error('通义千问模型调用失败'), 500));
      }
    }
    // 如果需要支持其他模型
    else {
      return res.status(400).json(createErrorResponse(new Error('不支持的语言模型类型'), 400));
    }
  } catch (error) {
    console.error('聊天处理出错:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 