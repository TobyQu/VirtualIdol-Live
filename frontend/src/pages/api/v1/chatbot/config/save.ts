import type { NextApiRequest, NextApiResponse } from 'next';
import { saveConfig } from '@/utils/configStorage';

// 定义响应结构
type ApiResponse = {
  code: number;
  message: string;
  data: {
    success: boolean;
  } | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      code: 405,
      message: 'Method not allowed',
      data: null
    });
  }

  try {
    // 获取请求体中的配置数据
    const configData = req.body;
    
    if (!configData) {
      return res.status(400).json({
        code: 400,
        message: '请求中缺少配置数据',
        data: null
      });
    }
    
    // 保存配置
    const success = await saveConfig(configData);
    
    if (success) {
      // 返回成功响应
      return res.status(200).json({
        code: 0,
        message: 'success',
        data: {
          success: true
        }
      });
    } else {
      // 保存失败
      return res.status(500).json({
        code: 500,
        message: '保存配置失败',
        data: {
          success: false
        }
      });
    }
  } catch (error) {
    console.error('保存配置时出错:', error);
    
    // 返回错误响应
    return res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null
    });
  }
} 