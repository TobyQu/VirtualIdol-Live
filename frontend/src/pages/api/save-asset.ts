import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, Fields, Files, File } from 'formidable';
import * as fs from 'fs';
import * as path from 'path';

// 禁用默认的body解析器，因为我们将使用formidable处理文件上传
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 创建formidable的form对象来解析multipart/form-data
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
        const assetType = fields.assetType?.[0] || 'backgrounds'; // 默认为背景图片
        
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

        // 确定目标目录 - 现在使用public/assets
        const assetsDir = path.join(process.cwd(), 'public', 'assets');
        let targetDir: string;
        
        if (assetType === 'vrm') {
          targetDir = path.join(assetsDir, 'vrm');
        } else if (assetType === 'animations') {
          targetDir = path.join(assetsDir, 'animations');
        } else {
          targetDir = path.join(assetsDir, 'backgrounds');
        }

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

        // 构建资产URL路径 - 现在直接使用相对于public的路径
        const assetUrl = `/assets/${assetType}/${fileName}`;

        res.status(200).json({ 
          success: true, 
          assetUrl,
          fileName
        });
        return resolve({});
      } catch (error) {
        console.error('Error saving asset:', error);
        res.status(500).json({ error: 'Failed to save asset' });
        return resolve({});
      }
    });
  });
} 