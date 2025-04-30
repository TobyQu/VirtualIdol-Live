import fs from 'fs';
import path from 'path';

// 配置文件路径
const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'config.json');
const TEMP_CONFIG_FILE_PATH = path.join(CONFIG_DIR, 'config.json.tmp');
const ROLES_FILE_PATH = path.join(CONFIG_DIR, 'roles.json');

// 获取默认角色名称
function getDefaultCharacterName(): string {
  try {
    // 检查角色文件是否存在
    if (fs.existsSync(ROLES_FILE_PATH)) {
      const rolesData = fs.readFileSync(ROLES_FILE_PATH, 'utf-8');
      try {
        const roles = JSON.parse(rolesData);
        // 如果有角色，使用第一个角色的名称
        if (Array.isArray(roles) && roles.length > 0 && roles[0].role_name) {
          return roles[0].role_name;
        }
      } catch (e) {
        console.error('解析roles.json失败:', e);
      }
    }
    return "虚拟角色"; // 默认名称，如果找不到角色文件或解析失败
  } catch (error) {
    console.error('获取默认角色名称失败:', error);
    return "虚拟角色";
  }
}

// 默认配置 - 可在系统启动时从环境变量加载
function getDefaultConfig(): string {
  const defaultCharacterName = getDefaultCharacterName();
  return JSON.stringify({
    characterConfig: {
      character: 1,
      character_name: defaultCharacterName,
      yourName: "用户",
      vrmModel: "/assets/vrm/default.vrm",
      vrmModelType: "system",
      cameraDistance: 1.0
    },
    languageModelConfig: {
      openai: {
        OPENAI_API_KEY: "",
        OPENAI_BASE_URL: ""
      },
      ollama: {
        OLLAMA_API_BASE: "http://localhost:11434",
        OLLAMA_API_MODEL_NAME: "qwen:7b"
      },
      zhipuai: {
        ZHIPUAI_API_KEY: "SK-"
      }
    },
    enableProxy: false,
    httpProxy: "http://host.docker.internal:23457",
    httpsProxy: "https://host.docker.internal:23457",
    socks5Proxy: "socks5://host.docker.internal:23457",
    conversationConfig: {
      conversationType: "default",
      languageModel: "openai"
    },
    memoryStorageConfig: {
      faissMemory: {
        dataDir: "storage/memory"
      },
      enableLongMemory: false,
      enableSummary: false,
      languageModelForSummary: "openai",
      enableReflection: false,
      languageModelForReflection: "openai",
      local_memory_num: 5
    },
    background_url: "/assets/backgrounds/default.png",
    enableLive: false,
    liveStreamingConfig: {
      B_ROOM_ID: "",
      B_COOKIE: ""
    },
    ttsConfig: {
      ttsVoiceId: "female-shaonv",
      emotion: "neutral",
      ttsType: "minimax",
      minimax: {
        apiKey: "",
        groupId: "",
        model: "speech-02-turbo"
      }
    },
    emotionConfig: {
      enabled: false,
      sensitivity: 0.5,
      changeSpeed: 0.5,
      defaultEmotion: "neutral",
      expressionIntensity: 0.7
    }
  }, null, 2);
}

// 缓存配置，避免频繁读取文件
let configCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 缓存有效期：1分钟

/**
 * 确保配置目录存在
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 获取系统配置
 * @returns 配置对象
 */
export async function getConfig(): Promise<any> {
  // 检查缓存是否有效
  const now = Date.now();
  if (configCache && (now - cacheTimestamp < CACHE_TTL)) {
    return configCache;
  }

  ensureConfigDir();

  try {
    // 检查配置文件是否存在
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      // 读取配置文件
      const configData = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      
      try {
        // 尝试解析JSON
        const configObj = JSON.parse(configData);
        
        // 更新缓存
        configCache = configObj;
        cacheTimestamp = now;
        
        return configObj;
      } catch (jsonError) {
        console.error('配置文件JSON格式无效:', jsonError);
        // JSON解析失败，返回默认配置
        return JSON.parse(getDefaultConfig());
      }
    } else {
      // 配置文件不存在，创建默认配置
      const defaultConfig = JSON.parse(getDefaultConfig());
      await saveConfig(defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error('获取配置时出错:', error);
    // 出错时返回默认配置
    return JSON.parse(getDefaultConfig());
  }
}

/**
 * 保存系统配置
 * @param config 配置对象
 * @returns 是否保存成功
 */
export async function saveConfig(config: any): Promise<boolean> {
  ensureConfigDir();

  try {
    // 格式化JSON字符串（美化输出）
    const configString = JSON.stringify(config, null, 2);
    
    // 先写入临时文件
    fs.writeFileSync(TEMP_CONFIG_FILE_PATH, configString, 'utf-8');
    
    // 如果原文件存在，则备份
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const backupPath = `${CONFIG_FILE_PATH}.bak`;
      fs.copyFileSync(CONFIG_FILE_PATH, backupPath);
    }
    
    // 用临时文件替换原文件（原子操作）
    fs.renameSync(TEMP_CONFIG_FILE_PATH, CONFIG_FILE_PATH);
    
    // 更新缓存
    configCache = config;
    cacheTimestamp = Date.now();
    
    return true;
  } catch (error) {
    console.error('保存配置时出错:', error);
    return false;
  }
}

/**
 * 清除配置缓存，强制从文件重新加载
 */
export function clearConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
}

/**
 * 获取配置文件路径（用于调试）
 */
export function getConfigFilePath(): string {
  return CONFIG_FILE_PATH;
} 