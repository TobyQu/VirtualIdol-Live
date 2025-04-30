import { NextApiRequest, NextApiResponse } from 'next';
import { createSuccessResponse, createErrorResponse } from '../utils';

/**
 * 检查记忆状态的API端点
 * 
 * @param req NextJS API请求对象
 * @param res NextJS API响应对象
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  try {
    // 在实际实现中，这里会检查记忆服务的状态
    // 当前简单返回一个模拟的状态
    
    return res.status(200).json(createSuccessResponse({
      status: "active",
      memory_count: 0,
      last_updated: new Date().toISOString()
    }));
  } catch (error) {
    console.error('检查记忆状态失败:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 