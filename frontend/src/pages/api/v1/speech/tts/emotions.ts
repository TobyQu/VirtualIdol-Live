import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  createErrorResponse,
  getSupportedEmotions
} from '../utils';
import { EmotionLabel } from '@/features/messages/messages';

/**
 * 获取支持的情绪列表
 * 返回TTS支持的情绪类型及其中文标签
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  try {
    // 获取支持的情绪列表
    const emotions = getSupportedEmotions();
    
    // 将情绪类型与标签组合
    const emotionsWithLabels = emotions.map(emotion => ({
      id: emotion,
      name: EmotionLabel[emotion] || emotion
    }));
    
    // 返回成功响应
    return res.status(200).json(createSuccessResponse({
      emotions: emotionsWithLabels
    }));
  } catch (error) {
    console.error('获取情绪列表出错:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 