import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  createErrorResponse
} from './utils';

// 支持的语言列表
const SUPPORTED_LANGUAGES = {
  'zh': '中文',
  'en': '英语',
  'ja': '日语',
  'ko': '韩语',
  'fr': '法语',
  'de': '德语',
  'es': '西班牙语',
  'it': '意大利语',
  'ru': '俄语'
};

/**
 * 文本翻译接口
 * 支持多种语言之间的相互翻译
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  try {
    // 获取请求参数
    const { 
      text, 
      source_lang = 'auto', 
      target_lang = 'zh' 
    } = req.body;
    
    // 参数验证
    if (!text) {
      return res.status(400).json(createErrorResponse(new Error('缺少必要参数: text'), 400));
    }
    
    if (target_lang && !SUPPORTED_LANGUAGES[target_lang]) {
      return res.status(400).json(createErrorResponse(new Error(`不支持的目标语言: ${target_lang}`), 400));
    }
    
    // 简单的占位实现，实际项目应该集成真实的翻译API
    let translatedText = text;
    
    // 假设我们使用一个简单的模拟来展示API结构
    if (target_lang === 'zh') {
      translatedText = `[翻译结果] ${text}`;
    } else if (target_lang === 'en') {
      translatedText = `[Translation] ${text}`;
    } else if (target_lang === 'ja') {
      translatedText = `[翻訳結果] ${text}`;
    } else {
      translatedText = `[${target_lang}] ${text}`;
    }
    
    // 返回成功响应
    return res.status(200).json(createSuccessResponse({
      translated_text: translatedText,
      source_language: source_lang === 'auto' ? 'zh' : source_lang, // 在实际实现中应检测源语言
      target_language: target_lang
    }));
  } catch (error) {
    console.error('文本翻译出错:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 