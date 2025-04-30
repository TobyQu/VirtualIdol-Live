import { NextApiRequest, NextApiResponse } from 'next';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { ollama, createOllama } from 'ollama-ai-provider';
import { zhipu, createZhipu } from 'zhipu-ai-provider';
import { qwen, createQwen } from 'qwen-ai-provider';
import { 
  extractChatParams, 
  getSystemConfig, 
  buildChatMessages, 
  createErrorResponse 
} from './utils';
import OpenAI from 'openai';

/**
 * 处理流式聊天请求
 * @param req NextJS API请求对象
 * @param res NextJS API响应对象
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("流式聊天API被调用，请求方法:", req.method, "路径:", req.url);
  
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  // 设置响应头，统一使用SSE格式
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    // 提取请求参数
    const { query, you_name, user_id, role_id } = extractChatParams(req);
    
    // 参数验证
    if (!query || !you_name) {
      res.write(`data: ${JSON.stringify({ text: "错误: 缺少必要参数" })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    
    // 获取系统配置
    const config = getSystemConfig();
    if (!config) {
      res.write(`data: ${JSON.stringify({ text: "错误: 无法获取系统配置" })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    
    // 构建聊天消息
    const aiMessages = buildChatMessages(
      query, 
      you_name, 
      config.characterConfig.character_name
    );
    
    // 根据当前配置选择不同的模型
    const modelType = config.conversationConfig.languageModel;
    
    // 实现OpenAI流式响应
    if (modelType === 'openai') {
      try {
        // 获取OpenAI配置
        const apiKey = config.languageModelConfig?.openai?.OPENAI_API_KEY;
        const baseURL = config.languageModelConfig?.openai?.OPENAI_BASE_URL;
        
        if (!apiKey) {
          throw new Error('缺少OpenAI API密钥');
        }
        
        // 直接使用OpenAI客户端创建流式响应
        const openaiClient = new OpenAI({
          apiKey,
          baseURL: baseURL || undefined
        });
        
        const stream = await openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: aiMessages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true
        });
        
        // 处理流式响应
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
          }
        }
        
        // 结束响应
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      } catch (error) {
        console.error('OpenAI API调用失败:', error);
        return res.status(500).json(createErrorResponse(new Error('OpenAI API调用失败'), 500));
      }
    } 
    // 如果需要支持Ollama
    else if (modelType === 'ollama') {
      try {
        // 获取Ollama配置
        const ollamaBaseUrl = config.languageModelConfig?.ollama?.OLLAMA_API_BASE || 'http://localhost:11434';
        const ollamaModel = config.languageModelConfig?.ollama?.OLLAMA_API_MODEL_NAME || 'llama3';
        
        // 直接使用fetch API调用Ollama
        const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: ollamaModel,
            messages: aiMessages,
            stream: true,
            options: {
              temperature: 0.7
            }
          }),
        });
        
        if (!response.body) {
          throw new Error('Ollama API返回了空响应');
        }
        
        // 创建读取器
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // 处理Ollama流
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                res.write(`data: ${JSON.stringify({ text: data.message.content })}\n\n`);
              }
            } catch (e) {
              console.warn('解析Ollama响应失败:', e);
            }
          }
        }
        
        // 结束请求
        res.write('data: [DONE]\n\n');
        res.end();
        return;
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
        
        // 创建智谱AI提供程序
        const customZhipu = createZhipu({
          apiKey
        });
        
        // 通过自定义SSE方式处理，避免类型错误
        res.write('data: {"text": "智谱AI流式响应启动中..."}\n\n');
        
        try {
          // 1. 获取token (智谱AI需要JWT令牌)
          // 这个步骤在zhipu-ai-provider内部完成
          
          // 2. 发送请求到智谱AI接口
          // 将OpenAI格式转换为智谱格式
          const zhipuMessages = aiMessages.map(msg => ({
            role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
            content: typeof msg.content === 'string' ? msg.content : ''
          }));
          
          // 通过AI SDK的provider访问API
          // 注意：根据智谱文档，这种方式可能无法直接访问流式API
          // 所以这里实现一个简化版，实际使用可能需要直接使用fetch等底层方法
          
          // 使用非流式API，返回完整响应
          const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'glm-4',
              messages: zhipuMessages,
              temperature: 0.7,
              max_tokens: 1000,
              stream: false
            })
          });
          
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content || '';
          
          if (content) {
            // 模拟流式响应，将完整响应分成小块发送
            const chunks = content.match(/.{1,20}/g) || [content];
            for (const chunk of chunks) {
              res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
              // 添加小延迟模拟流式效果
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          // 结束响应
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        } catch (error) {
          console.error('智谱AI流式处理失败:', error);
          throw error;
        }
      } catch (error) {
        console.error('智谱AI API调用失败:', error);
        return res.status(500).json(createErrorResponse(new Error('智谱AI模型调用失败'), 500));
      }
    }
    // 如果需要支持Qwen
    else if (modelType === 'qwen') {
      try {
        // 获取Qwen API配置
        const apiKey = config.languageModelConfig?.qwen?.DASHSCOPE_API_KEY;
        const qwenModel = config.languageModelConfig?.qwen?.QWEN_MODEL_NAME || 'qwen-plus';
        
        if (!apiKey) {
          throw new Error('缺少通义千问(Qwen) API密钥');
        }
        
        // 通过自定义SSE方式处理，避免类型错误
        res.write('data: {"text": "通义千问流式响应启动中..."}\n\n');
        
        try {
          // 将OpenAI格式转换为Qwen格式
          const qwenMessages = aiMessages.map(msg => ({
            role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
            content: typeof msg.content === 'string' ? msg.content : ''
          }));
          
          // 使用直接请求API的方式
          const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: qwenModel,
              messages: qwenMessages,
              temperature: 0.7,
              max_tokens: 1000,
              stream: true
            })
          });
          
          if (!response.body) {
            throw new Error('通义千问API返回了空响应');
          }
          
          // 创建读取器
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          
          // 处理千问流
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6); // 移除 "data: " 前缀
                try {
                  if (jsonStr === '[DONE]') continue;
                  
                  const data = JSON.parse(jsonStr);
                  const content = data.choices?.[0]?.delta?.content || '';
                  if (content) {
                    res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
                  }
                } catch (e) {
                  console.warn('解析通义千问响应失败:', e);
                }
              }
            }
          }
          
          // 结束响应
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        } catch (error) {
          console.error('通义千问流式处理失败:', error);
          throw error;
        }
      } catch (error) {
        console.error('通义千问API调用失败:', error);
        return res.status(500).json(createErrorResponse(new Error('通义千问模型调用失败'), 500));
      }
    }
    // 如果需要支持其他模型
    else {
      return res.status(400).json(createErrorResponse(new Error('不支持的语言模型类型'), 400));
    }
  } catch (error) {
    console.error('流式聊天处理出错:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 