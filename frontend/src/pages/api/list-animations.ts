import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

type AnimationFile = {
  name: string;
  path: string;
  size: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 获取请求的目录参数
  const { dir } = req.query;
  
  // 验证目录参数
  if (!dir || typeof dir !== 'string' || !['daily', 'emote', 'dance'].includes(dir)) {
    return res.status(400).json({ error: 'Invalid directory parameter' });
  }

  try {
    // 构建动画目录路径
    const animationsDir = path.join(process.cwd(), 'public', 'assets', 'animations', dir);
    
    // 检查目录是否存在
    if (!fs.existsSync(animationsDir)) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    // 读取目录内容
    const files = fs.readdirSync(animationsDir);
    
    // 过滤并格式化文件信息
    const animations: AnimationFile[] = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.fbx', '.vrma'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(animationsDir, file);
        const relativePath = `/assets/animations/${dir}/${file}`;
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: relativePath,
          size: stats.size
        };
      });
    
    return res.status(200).json(animations);
  } catch (error) {
    console.error('Error reading animations directory:', error);
    return res.status(500).json({ error: 'Failed to read animations directory' });
  }
} 