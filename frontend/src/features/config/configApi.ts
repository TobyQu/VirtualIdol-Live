import {getRequest, postRequest} from "../httpclient/httpclient";

export interface MilvusMemoryConfig {
    host: string;
    port: string;
    user: string;
    password: string;
    dbName: string;
}

export interface ZepMemoryConfig {
    zep_url: string;
    zep_optional_api_key: string;
}

export interface MemoryStorageConfig {
    enableLongMemory: boolean;
    enableSummary: boolean;
    enableReflection: boolean;
    languageModelForSummary: string;
    languageModelForReflection: string;
    milvusMemory: MilvusMemoryConfig;
    zep_memory: ZepMemoryConfig;
}

export interface CharacterConfig {
    character: number;
    character_name: string;
    yourName: string;
    vrmModel: string;
    vrmModelType: string;
}

export interface TTSConfig {
    ttsType: string;
    ttsVoiceId: string;
    emotion?: string;
}

export interface ConversationConfig {
    conversationType: string;
    languageModel: string;
}

export interface OpenAIConfig {
    OPENAI_API_KEY: string;
    OPENAI_BASE_URL: string;
}

export interface ZhipuAIConfig {
    ZHIPUAI_API_KEY: string;
}

export interface OllamaConfig {
    OLLAMA_API_BASE: string;
    OLLAMA_API_MODEL_NAME: string;
}

export interface LanguageModelConfig {
    openai: OpenAIConfig;
    zhipuai: ZhipuAIConfig;
    ollama: OllamaConfig;
}

export interface LiveStreamingConfig {
    B_ROOM_ID: string;
    B_COOKIE: string;
}

export interface GlobalConfig {
    characterConfig: CharacterConfig;
    ttsConfig: TTSConfig;
    conversationConfig: ConversationConfig;
    memoryStorageConfig: MemoryStorageConfig;
    languageModelConfig: LanguageModelConfig;
    liveStreamingConfig: LiveStreamingConfig;
    enableProxy: boolean;
    enableLive: boolean;
    httpProxy: string;
    httpsProxy: string;
    socks5Proxy: string;
    background_id: number;
    background_url: string;
    custom_role_template_type?: string;
}

// 定义formData初始状态 shape
export const initialFormData = {
    "liveStreamingConfig": {
        "B_ROOM_ID": "27892212",
        "B_COOKIE": ""
    },
    "enableProxy": false,
    "enableLive": false,
    "httpProxy": "http://host.docker.internal:23457",
    "httpsProxy": "https://host.docker.internal:23457",
    "socks5Proxy": "socks5://host.docker.internal:23457",
    "languageModelConfig": {
        "openai": {
            "OPENAI_API_KEY": "sk-",
            "OPENAI_BASE_URL": ""
        },
        "ollama": {
            "OLLAMA_API_BASE": "http://localhost:11434",
            "OLLAMA_API_MODEL_NAME": "qwen:7b"
        },
        "zhipuai":  {
            "ZHIPUAI_API_KEY": "sk"
        }
    },
    "characterConfig": {
        "character": 1,
        "character_name": "爱莉",
        "yourName": "yuki129",
        "vrmModel": "\u308f\u305f\u3042\u3081_03.vrm",
        "vrmModelType": "system"
    },
    "conversationConfig": {
        "conversationType": "default",
        "languageModel": "openai"
    },
    "memoryStorageConfig": {
        "milvusMemory": {
            "host": "127.0.0.1",
            "port": "19530",
            "user": "user",
            "password": "Milvus",
            "dbName": "default"
        },
        "zep_memory": {
            "zep_url": "http://localhost:8881",
            "zep_optional_api_key": "optional_api_key"
        },
        "enableLongMemory": false,
        "enableSummary": false,
        "languageModelForSummary": "openai",
        "enableReflection": false,
        "languageModelForReflection": "openai"
    },
    "custom_role_template_type": "zh",
    "background_id": 1,
    "background_url": "",
    "ttsConfig": {
        "ttsType": "Edge",
        "ttsVoiceId": "zh-CN-XiaoyiNeural"
    }
}

export async function getConfig() {
    try {
        const chatRes = await getRequest("/chatbot/config/get", {});
        if (chatRes.code !== 0) {
            throw new Error(chatRes.message || "Failed to get config");
        }
        
        console.log("Raw config response:", chatRes);
        
        // 检查响应格式并提取配置
        if (chatRes.data && typeof chatRes.data.config === 'string') {
            try {
                // 从字符串解析JSON
                const configObj = JSON.parse(chatRes.data.config);
                console.log("Parsed config:", configObj);
                return configObj;
            } catch (e) {
                console.error("Error parsing config JSON:", e);
                throw new Error("Invalid config format");
            }
        } else if (chatRes.data && typeof chatRes.data.config === 'object') {
            // 已经是对象格式
            console.log("Config is already an object:", chatRes.data.config);
            return chatRes.data.config;
        } else if (chatRes.response) {
            // 直接返回response字段
            console.log("Using response field:", chatRes.response);
            return chatRes.response;
        }
        
        console.error("Unexpected config format:", chatRes);
        return {}; // 返回空对象作为默认值
    } catch (error) {
        console.error("Error getting config:", error);
        throw error;
    }
}

export async function saveConfig(config: GlobalConfig) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    try {
        const chatRes = await postRequest("/chatbot/config/save", headers, config);
        if (chatRes.code !== 0) {
            console.error("Save config failed:", chatRes);
            throw new Error(chatRes.message || "Failed to save config");
        }
        console.log("Config saved successfully:", chatRes);
        return chatRes.response;
    } catch (error) {
        console.error("Error saving config:", error);
        throw error;
    }
}