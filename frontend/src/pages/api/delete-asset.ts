import { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filePath, assetType } = req.query;
    
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    if (!assetType || typeof assetType !== 'string' || !['backgrounds', 'vrm', 'animations'].includes(assetType)) {
      return res.status(400).json({ error: 'Valid asset type is required' });
    }
    
    // 提取文件名以检查是否为default开头的文件（不允许删除）
    const fileName = path.basename(filePath);
    if (fileName.toLowerCase().startsWith('default')) {
      return res.status(403).json({ error: 'Cannot delete default files' });
    }
    
    // 构建文件的完整路径
    const assetsDir = path.join(process.cwd(), 'public', 'assets');
    const fullFilePath = path.join(assetsDir, assetType, fileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 删除文件
    await fs.promises.unlink(fullFilePath);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return res.status(500).json({ error: 'Failed to delete asset' });
  }
} 