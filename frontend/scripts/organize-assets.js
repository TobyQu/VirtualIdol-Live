const fs = require('fs');
const path = require('path');

// 定义目录路径
const publicDir = path.join(__dirname, '..', 'public');
const assetsDir = path.join(__dirname, '..', 'assets');
const vrmDir = path.join(assetsDir, 'vrm');
const backgroundsDir = path.join(assetsDir, 'backgrounds');
const animationsDir = path.join(assetsDir, 'animations');

// 确保目标目录存在
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

// 将文件从源目录移动到目标目录
function moveFile(sourceFile, targetDir) {
  const fileName = path.basename(sourceFile);
  const targetFile = path.join(targetDir, fileName);
  
  try {
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`Copied: ${sourceFile} -> ${targetFile}`);
  } catch (error) {
    console.error(`Error copying ${sourceFile}: ${error.message}`);
  }
}

// 扫描目录并按文件类型分类移动文件
function organizeFiles() {
  ensureDirectoryExists(vrmDir);
  ensureDirectoryExists(backgroundsDir);
  ensureDirectoryExists(animationsDir);
  
  // 读取public目录中的文件
  const files = fs.readdirSync(publicDir);
  
  for (const file of files) {
    const filePath = path.join(publicDir, file);
    
    // 跳过目录
    if (fs.statSync(filePath).isDirectory()) {
      continue;
    }
    
    const extension = path.extname(file).toLowerCase();
    
    // 按文件扩展名分类
    if (extension === '.vrm') {
      moveFile(filePath, vrmDir);
    } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
      moveFile(filePath, backgroundsDir);
    } else if (['.vrma', '.fbx'].includes(extension)) {
      moveFile(filePath, animationsDir);
    }
  }
  
  // 处理可能的子目录，如daily和emote
  const subDirs = ['daily', 'emote'];
  for (const subDir of subDirs) {
    const subDirPath = path.join(publicDir, subDir);
    
    if (fs.existsSync(subDirPath) && fs.statSync(subDirPath).isDirectory()) {
      const subDirFiles = fs.readdirSync(subDirPath);
      
      for (const file of subDirFiles) {
        const filePath = path.join(subDirPath, file);
        
        if (fs.statSync(filePath).isFile() && path.extname(file).toLowerCase() === '.fbx') {
          // 创建子目录结构
          const targetSubDir = path.join(animationsDir, subDir);
          ensureDirectoryExists(targetSubDir);
          moveFile(filePath, targetSubDir);
        }
      }
    }
  }
}

// 执行文件组织
organizeFiles();
console.log('Asset organization complete!'); 