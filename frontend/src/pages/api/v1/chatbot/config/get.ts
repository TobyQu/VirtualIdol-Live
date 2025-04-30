import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '@/utils/configStorage';

// 定义响应结构
type ApiResponse = {
  code: number;
  message: string;
  data: {
    config: string;
  } | null;
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
      data: null
    });
  }

  try {
    // 使用配置工具获取配置
    const config = await getConfig();
    
    // 将配置对象转为JSON字符串，保持与原Python API的兼容性
    const configString = JSON.stringify(config);
    
    // 返回成功响应
    return res.status(200).json({
      code: 0,
      message: 'success',
      data: {
        config: configString
      }
    });
  } catch (error) {
    console.error('获取配置时出错:', error);
    
    // 返回错误响应
    return res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null
    });
  }
} 