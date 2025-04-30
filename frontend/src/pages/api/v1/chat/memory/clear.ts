import { NextApiRequest, NextApiResponse } from 'next';
import { createSuccessResponse, createErrorResponse } from '../utils';

/**
 * 清除聊天记忆的API端点
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
    // 在实际实现中，这里会清除记忆存储
    // 当前只返回成功，表示记忆已清除
    
    // 返回成功响应
    return res.status(200).json(createSuccessResponse({
      message: "记忆已清除"
    }));
  } catch (error) {
    console.error('清除记忆失败:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 