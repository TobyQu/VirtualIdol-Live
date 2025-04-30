import { NextApiRequest, NextApiResponse } from 'next';
import { createSuccessResponse, createErrorResponse } from '../utils';

/**
 * 重新初始化记忆服务的API端点
 * 
 * @param req NextJS API请求对象
 * @param res NextJS API响应对象
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(new Error('方法不允许'), 405));
  }

  try {
    // 在实际实现中，这里会重新初始化记忆服务
    // 当前只返回成功响应
    
    return res.status(200).json(createSuccessResponse({
      message: "记忆服务已重新初始化",
      status: "active",
      initialized_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error('重新初始化记忆服务失败:', error);
    return res.status(500).json(createErrorResponse(error instanceof Error ? error : new Error('未知错误'), 500));
  }
} 