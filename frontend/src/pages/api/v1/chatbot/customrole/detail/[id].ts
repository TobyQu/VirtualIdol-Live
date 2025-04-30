import type { NextApiRequest, NextApiResponse } from 'next';
import { getRole } from '@/utils/roleStorage';

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

  // 获取角色ID
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      code: 400,
      message: '无效的角色ID',
      response: null
    });
  }
  
  // 转换为数字
  const roleId = parseInt(id);
  
  if (isNaN(roleId)) {
    return res.status(400).json({
      code: 400,
      message: '角色ID必须为数字',
      response: null
    });
  }

  try {
    // 获取角色详情
    const role = await getRole(roleId);
    
    if (!role) {
      return res.status(404).json({
        code: 404,
        message: '角色不存在',
        response: null
      });
    }
    
    // 返回成功响应
    return res.status(200).json({
      code: 200,
      message: 'success',
      response: role
    });
  } catch (error) {
    console.error('获取角色详情时出错:', error);
    
    // 返回错误响应
    return res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : '服务器错误',
      response: null
    });
  }
} 