import { BaseDirectory, createDir, readTextFile, writeTextFile } from '@tauri-apps/api/fs';

// 确保应用数据目录存在
export async function ensureAppDataDir() {
  try {
    await createDir('tmp', { dir: BaseDirectory.AppData, recursive: true });
    return true;
  } catch (error) {
    console.error('Failed to create app data directory:', error);
    return false;
  }
}

// 保存音频文件
export async function saveAudioFile(fileName: string, content: ArrayBuffer) {
  try {
    const uint8Array = new Uint8Array(content);
    await writeTextFile(
      `tmp/${fileName}`,
      uint8Array.toString(),
      { dir: BaseDirectory.AppData }
    );
    return true;
  } catch (error) {
    console.error('Failed to save audio file:', error);
    return false;
  }
}

// 读取配置文件
export async function readConfig() {
  try {
    const content = await readTextFile('config.json', { dir: BaseDirectory.AppData });
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read config:', error);
    return null;
  }
}

// 保存配置文件
export async function saveConfig(config: any) {
  try {
    await writeTextFile(
      'config.json',
      JSON.stringify(config, null, 2),
      { dir: BaseDirectory.AppData }
    );
    return true;
  } catch (error) {
    console.error('Failed to save config:', error);
    return false;
  }
}