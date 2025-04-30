import { NextApiRequest, NextApiResponse } from 'next';
import { 
  createSuccessResponse, 
  createErrorResponse,
  getAvailableVoices
} from '../utils';

/**
 * 获取可用的语音列表
 * 根据TTS类型返回对应的可用语音
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  try {
    // 获取请求参数
    const { type = 'minimax' } = req.body;  // 默认使用minimax类型
    
    // 获取指定类型的可用语音列表
    const voices = await getAvailableVoices(type);
    
    // 返回成功响应
    return res.status(200).json(createSuccessResponse({
      [type]: voices
    }));
  } catch (error) {
    console.error('获取语音列表出错:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 