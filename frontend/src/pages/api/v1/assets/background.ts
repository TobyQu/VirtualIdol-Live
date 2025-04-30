import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Fields, Files, File } from 'formidable';
import * as fs from 'fs';
import * as path from 'path';
import { scanAssets } from '@/utils/scanPublicAssets';

// 禁用默认的body解析器，因为我们将使用formidable处理文件上传
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 根据HTTP方法处理不同的操作
  switch (req.method) {
    case 'GET':
      return handleGetBackgrounds(req, res);
    case 'POST':
      return handleUploadBackground(req, res);
    case 'DELETE':
      return handleDeleteBackground(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// 获取所有背景图片
async function handleGetBackgrounds(req: NextApiRequest, res: NextApiResponse) {
  try {
    const assets = await scanAssets();
    return res.status(200).json(assets.background);
  } catch (error) {
    console.error('Error fetching background assets:', error);
    return res.status(500).json({ error: 'Failed to fetch background assets' });
  }
}

// 上传背景图片
async function handleUploadBackground(req: NextApiRequest, res: NextApiResponse) {
  const form = new IncomingForm({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB限制
  });

  return new Promise((resolve, reject) => {
    form.parse(req, async (err: Error | null, fields: Fields, files: Files) => {
      if (err) {
        console.error('Error parsing form:', err);
        res.status(500).json({ error: 'Failed to parse uploaded file' });
        return resolve({});
      }

      try {
        const file = files.file?.[0] as File | undefined;
        
        if (!file) {
          res.status(400).json({ error: 'No file uploaded' });
          return resolve({});
        }

        // 确保文件名没有超过限制
        let fileName = file.originalFilename || 'unnamed-file';
        if (fileName.length > 45) {
          const extension = path.extname(fileName);
          const baseName = path.basename(fileName, extension);
          fileName = baseName.substring(0, 45) + extension;
        }

        // 确定目标目录
        const assetsDir = path.join(process.cwd(), 'public', 'assets');
        const targetDir = path.join(assetsDir, 'backgrounds');

        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // 构建目标文件路径
        const targetPath = path.join(targetDir, fileName);

        // 使用fs.copyFile代替读写操作
        await fs.promises.copyFile(file.filepath, targetPath);
        
        // 删除临时文件
        await fs.promises.unlink(file.filepath);

        // 构建资产URL路径
        const assetUrl = `/assets/backgrounds/${fileName}`;

        res.status(200).json({ 
          success: true, 
          assetUrl,
          fileName
        });
        return resolve({});
      } catch (error) {
        console.error('Error saving background:', error);
        res.status(500).json({ error: 'Failed to save background' });
        return resolve({});
      }
    });
  });
}

// 删除背景图片
async function handleDeleteBackground(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { filePath } = req.query;
    
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // 提取文件名以检查是否为default开头的文件（不允许删除）
    const fileName = path.basename(filePath);
    if (fileName.toLowerCase().startsWith('default')) {
      return res.status(403).json({ error: 'Cannot delete default files' });
    }
    
    // 构建文件的完整路径
    const assetsDir = path.join(process.cwd(), 'public', 'assets');
    const fullFilePath = path.join(assetsDir, 'backgrounds', fileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 删除文件
    await fs.promises.unlink(fullFilePath);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting background:', error);
    return res.status(500).json({ error: 'Failed to delete background' });
  }
} 