import { promises as fs } from 'fs';
import path from 'path';

export interface AssetFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

export interface AssetCategory {
  vrm: AssetFile[];
  background: AssetFile[];
  animation: AssetFile[];
}

export async function scanAssets(): Promise<AssetCategory> {
  const assetsDir = path.join(process.cwd(), 'assets');
  
  try {
    const assets: AssetCategory = {
      vrm: [],
      background: [],
      animation: []
    };
    
    // 扫描VRM模型目录
    await scanDirectory(assetsDir, 'vrm', '.vrm', assets.vrm);
    
    // 扫描背景图片目录
    await scanDirectory(assetsDir, 'backgrounds', ['.png', '.jpg', '.jpeg', '.webp'], assets.background);
    
    // 扫描动画文件目录
    await scanDirectory(assetsDir, 'animations', ['.vrma', '.fbx'], assets.animation);
    
    return assets;
  } catch (error) {
    console.error('Error scanning assets:', error);
    return {
      vrm: [],
      background: [],
      animation: []
    };
  }
}

async function scanDirectory(
  baseDir: string, 
  subDir: string, 
  extensions: string | string[], 
  result: AssetFile[]
) {
  try {
    const dirPath = path.join(baseDir, subDir);
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const extension = path.extname(file).toLowerCase();
        const extensionList = Array.isArray(extensions) ? extensions : [extensions];
        
        if (stats.size > 0 && extensionList.includes(extension)) {
          result.push({
            name: file,
            path: `/assets/${subDir}/${file}`,
            size: stats.size,
            type: subDir
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${subDir} directory:`, error);
  }
} 