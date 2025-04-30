import type { NextApiRequest, NextApiResponse } from 'next';
import { addRole, CustomRole } from '@/utils/roleStorage';

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
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      code: 405,
      message: 'Method not allowed',
      response: null
    });
  }

  try {
    // 获取请求数据
    const roleData = req.body;
    
    // 验证必填字段
    if (!roleData.role_name) {
      return res.status(400).json({
        code: 400,
        message: '角色名称不能为空',
        response: null
      });
    }
    
    // 添加新角色
    const newRole = await addRole({
      role_name: roleData.role_name,
      persona: roleData.persona || '',
      personality: roleData.personality || '',
      scenario: roleData.scenario || '',
      examples_of_dialogue: roleData.examples_of_dialogue || '',
      custom_role_template_type: roleData.custom_role_template_type || 'zh',
      role_package_id: roleData.role_package_id || -1
    });
    
    // 返回成功响应
    return res.status(200).json({
      code: 200,
      message: 'success',
      response: "Data added to database"
    });
  } catch (error) {
    console.error('创建角色时出错:', error);
    
    // 返回错误响应
    return res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : '服务器错误',
      response: null
    });
  }
} 