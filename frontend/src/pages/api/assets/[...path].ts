import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: assetPath } = req.query;
  
  if (!assetPath || !Array.isArray(assetPath)) {
    return res.status(400).json({ error: 'Invalid asset path' });
  }
  
  // 构建文件的完整路径
  const filePath = path.join(process.cwd(), 'assets', ...assetPath);
  
  // 检查文件是否存在
  try {
    const fileStats = fs.statSync(filePath);
    
    if (!fileStats.isFile()) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // 确定MIME类型
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    
    // 设置适当的内容类型
    res.setHeader('Content-Type', contentType);
    
    // 读取并返回文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving asset:', error);
    return res.status(404).json({ error: 'File not found' });
  }
} 