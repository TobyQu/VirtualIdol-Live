import type { NextApiRequest, NextApiResponse } from 'next';
import { getRoles } from '@/utils/roleStorage';

// 定义响应结构
type ApiResponse = {
  code: number;
  message: string;
  response: any | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({
      code: 405,
      message: 'Method not allowed',
      response: null
    });
  }

  try {
    // 获取所有角色
    const roles = await getRoles();
    
    // 返回成功响应
    return res.status(200).json({
      code: 200,  // 注意：原Python API使用字符串"200"，我们这里保持一致
      message: 'success',
      response: roles
    });
  } catch (error) {
    console.error('获取角色列表时出错:', error);
    
    // 返回错误响应
    return res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : '服务器错误',
      response: null
    });
  }
} 