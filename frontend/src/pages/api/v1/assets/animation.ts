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

type AnimationFile = {
  name: string;
  path: string;
  size: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 根据HTTP方法处理不同的操作
  switch (req.method) {
    case 'GET':
      return handleGetAnimations(req, res);
    case 'POST':
      return handleUploadAnimation(req, res);
    case 'DELETE':
      return handleDeleteAnimation(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

// 获取动画文件
async function handleGetAnimations(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 检查是否需要获取特定目录的动画
    const { dir } = req.query;
    
    if (dir && typeof dir === 'string' && ['daily', 'emote', 'dance'].includes(dir)) {
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
    } else {
      // 获取所有动画文件
      const assets = await scanAssets();
      return res.status(200).json(assets.animation);
    }
  } catch (error) {
    console.error('Error fetching animation assets:', error);
    return res.status(500).json({ error: 'Failed to fetch animation assets' });
  }
}

// 上传动画文件
async function handleUploadAnimation(req: NextApiRequest, res: NextApiResponse) {
  const form = new IncomingForm({
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB限制
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
        const animationCategory = fields.category?.[0] || 'daily'; // 默认为daily
        
        if (!file) {
          res.status(400).json({ error: 'No file uploaded' });
          return resolve({});
        }
        
        // 验证动画类别
        if (!['daily', 'emote', 'dance'].includes(animationCategory)) {
          res.status(400).json({ error: 'Invalid animation category' });
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
        const targetDir = path.join(assetsDir, 'animations', animationCategory);

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
        const assetUrl = `/assets/animations/${animationCategory}/${fileName}`;

        res.status(200).json({ 
          success: true, 
          assetUrl,
          fileName
        });
        return resolve({});
      } catch (error) {
        console.error('Error saving animation:', error);
        res.status(500).json({ error: 'Failed to save animation' });
        return resolve({});
      }
    });
  });
}

// 删除动画文件
async function handleDeleteAnimation(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { filePath, category } = req.query;
    
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    if (!category || typeof category !== 'string' || !['daily', 'emote', 'dance'].includes(category)) {
      return res.status(400).json({ error: 'Valid animation category is required' });
    }
    
    // 提取文件名以检查是否为default开头的文件（不允许删除）
    const fileName = path.basename(filePath);
    if (fileName.toLowerCase().startsWith('default')) {
      return res.status(403).json({ error: 'Cannot delete default files' });
    }
    
    // 构建文件的完整路径
    const assetsDir = path.join(process.cwd(), 'public', 'assets');
    const fullFilePath = path.join(assetsDir, 'animations', category, fileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 删除文件
    await fs.promises.unlink(fullFilePath);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting animation:', error);
    return res.status(500).json({ error: 'Failed to delete animation' });
  }
} 