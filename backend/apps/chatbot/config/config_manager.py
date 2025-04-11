import json
import logging
import os
from typing import Any, Dict, Optional, Union
from enum import Enum
from functools import lru_cache
from django.db import DatabaseError
from pydantic import BaseModel, Field, ValidationError

from ..models import SysConfigModel

logger = logging.getLogger(__name__)

# 配置存储位置定义
class ConfigSource(Enum):
    """配置来源枚举"""
    DATABASE = "database"  # 数据库
    FILE = "file"          # 文件
    DEFAULT = "default"    # 默认配置

# 配置版本管理
CONFIG_VERSION = "1.0.0"

# 配置常量
CONFIG_CODE = "adminSettings"
CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(CONFIG_DIR, 'sys_config.json')


# 使用Pydantic创建配置模型进行验证
class CharacterConfig(BaseModel):
    """角色配置模型"""
    character: int = Field(default=1, description="角色ID")
    character_name: str = Field(default="爱莉", description="角色名称")
    yourName: str = Field(default="用户", description="用户名称")
    vrmModel: str = Field(default="/assets/vrm/default.vrm", description="VRM模型路径")
    vrmModelType: str = Field(default="system", description="VRM模型类型")


class OpenAIConfig(BaseModel):
    """OpenAI配置模型"""
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API密钥")
    OPENAI_BASE_URL: str = Field(default="", description="OpenAI API基础URL")


class OllamaConfig(BaseModel):
    """Ollama配置模型"""
    OLLAMA_API_BASE: str = Field(default="http://localhost:11434", description="Ollama API基础地址")
    OLLAMA_API_MODEL_NAME: str = Field(default="qwen:7b", description="Ollama模型名称")


class ZhipuAIConfig(BaseModel):
    """智谱AI配置模型"""
    ZHIPUAI_API_KEY: str = Field(default="SK-", description="智谱AI API密钥")


class LanguageModelConfig(BaseModel):
    """语言模型配置"""
    openai: OpenAIConfig = Field(default_factory=OpenAIConfig)
    ollama: OllamaConfig = Field(default_factory=OllamaConfig)
    zhipuai: ZhipuAIConfig = Field(default_factory=ZhipuAIConfig)


class ConversationConfig(BaseModel):
    """对话配置模型"""
    conversationType: str = Field(default="default", description="对话类型")
    languageModel: str = Field(default="openai", description="使用的语言模型类型")


class ZepMemoryConfig(BaseModel):
    """Zep记忆配置"""
    zep_url: str = Field(default="http://localhost:8881", description="Zep服务地址")
    zep_optional_api_key: str = Field(default="optional_api_key", description="Zep API密钥(可选)")


class FaissMemoryConfig(BaseModel):
    """FAISS记忆配置"""
    dataDir: str = Field(default="storage/memory", description="FAISS数据存储目录")


class MemoryStorageConfig(BaseModel):
    """记忆存储配置"""
    zep_memory: ZepMemoryConfig = Field(default_factory=ZepMemoryConfig)
    faissMemory: FaissMemoryConfig = Field(default_factory=FaissMemoryConfig)
    enableLongMemory: bool = Field(default=False, description="是否启用长期记忆")
    enableSummary: bool = Field(default=False, description="是否启用摘要功能")
    languageModelForSummary: str = Field(default="openai", description="用于生成摘要的语言模型")
    enableReflection: bool = Field(default=False, description="是否启用反思功能")
    languageModelForReflection: str = Field(default="openai", description="用于反思的语言模型")


class LiveStreamingConfig(BaseModel):
    """直播配置"""
    B_ROOM_ID: str = Field(default="", description="直播间ID")
    B_COOKIE: str = Field(default="", description="直播平台Cookie")


class TTSConfig(BaseModel):
    """语音合成配置"""
    ttsVoiceId: str = Field(default="female-shaonv", description="语音ID")
    emotion: str = Field(default="neutral", description="情感类型")
    ttsType: str = Field(default="minimax", description="TTS服务类型")


class SystemConfig(BaseModel):
    """系统配置根模型"""
    version: str = Field(default=CONFIG_VERSION, description="配置版本")
    characterConfig: CharacterConfig = Field(default_factory=CharacterConfig)
    languageModelConfig: LanguageModelConfig = Field(default_factory=LanguageModelConfig)
    enableProxy: bool = Field(default=False, description="是否启用代理")
    httpProxy: str = Field(default="http://host.docker.internal:23457", description="HTTP代理")
    httpsProxy: str = Field(default="https://host.docker.internal:23457", description="HTTPS代理")
    socks5Proxy: str = Field(default="socks5://host.docker.internal:23457", description="SOCKS5代理")
    conversationConfig: ConversationConfig = Field(default_factory=ConversationConfig)
    memoryStorageConfig: MemoryStorageConfig = Field(default_factory=MemoryStorageConfig)
    background_url: str = Field(default="/assets/backgrounds/default.png", description="背景图片URL")
    enableLive: bool = Field(default=False, description="是否启用直播功能")
    liveStreamingConfig: LiveStreamingConfig = Field(default_factory=LiveStreamingConfig)
    ttsConfig: TTSConfig = Field(default_factory=TTSConfig)


class ConfigManager:
    """配置管理器类，负责配置的加载、验证、保存和应用"""
    
    def __init__(self):
        """初始化配置管理器"""
        self._config: Optional[SystemConfig] = None
        self._config_source: ConfigSource = ConfigSource.DEFAULT
        self._loaded = False
    
    def load(self, force_reload: bool = False) -> SystemConfig:
        """
        加载配置，优先从数据库读取，其次从文件加载，最后使用默认配置
        
        Args:
            force_reload: 是否强制重新加载
            
        Returns:
            加载的系统配置对象
        """
        if self._loaded and not force_reload:
            return self._config
        
        config_dict = {}
        
        # 尝试从数据库加载
        try:
            db_config = self._load_from_db()
            if db_config:
                config_dict = db_config
                self._config_source = ConfigSource.DATABASE
                logger.info("从数据库加载配置成功")
            else:
                # 尝试从文件加载
                file_config = self._load_from_file()
                if file_config:
                    config_dict = file_config
                    self._config_source = ConfigSource.FILE
                    logger.info("从文件加载配置成功")
                else:
                    # 使用默认配置
                    config_dict = self._create_default_config()
                    self._config_source = ConfigSource.DEFAULT
                    logger.info("使用默认配置")
                    
                    # 保存默认配置到文件和数据库
                    self._save_to_file(config_dict)
                    self._save_to_db(config_dict)
        except Exception as e:
            logger.error(f"加载配置时发生错误: {str(e)}")
            config_dict = self._create_default_config()
            self._config_source = ConfigSource.DEFAULT
            logger.info("由于错误使用默认配置")
        
        # 验证并创建配置对象
        try:
            # 确保配置包含版本号
            if "version" not in config_dict:
                config_dict["version"] = CONFIG_VERSION
                
            self._config = SystemConfig(**config_dict)
            self._loaded = True
            
            logger.info(f"配置已加载 (来源: {self._config_source.value}, 版本: {self._config.version})")
            return self._config
        except ValidationError as e:
            logger.error(f"配置验证失败: {str(e)}")
            # 如果验证失败，使用默认配置
            self._config = SystemConfig()
            self._config_source = ConfigSource.DEFAULT
            self._loaded = True
            return self._config
    
    def save(self, config: Optional[SystemConfig] = None) -> bool:
        """
        保存配置到持久化存储
        
        Args:
            config: 要保存的配置对象，如果为None则保存当前加载的配置
            
        Returns:
            是否保存成功
        """
        if config is None:
            if not self._loaded:
                logger.error("尝试保存配置但当前没有加载配置")
                return False
            config = self._config
        
        # 更新版本号
        config_dict = config.model_dump()
        config_dict["version"] = CONFIG_VERSION
        
        # 首先保存到数据库
        db_success = self._save_to_db(config_dict)
        
        # 然后保存到文件(作为备份)
        file_success = self._save_to_file(config_dict)
        
        # 如果两者都成功，更新当前配置
        if db_success or file_success:
            self._config = config
            self._loaded = True
            return True
        
        return False
    
    def get_config(self) -> SystemConfig:
        """
        获取当前配置
        
        Returns:
            当前系统配置对象
        """
        if not self._loaded:
            return self.load()
        return self._config
    
    def update_config(self, config_dict: Dict[str, Any]) -> SystemConfig:
        """
        更新部分配置
        
        Args:
            config_dict: 包含要更新的配置键值对
            
        Returns:
            更新后的系统配置对象
        """
        if not self._loaded:
            self.load()
            
        # 转换当前配置为字典
        current_config = self._config.model_dump()
        
        # 递归更新配置
        def update_nested_dict(d, u):
            for k, v in u.items():
                if isinstance(v, dict) and k in d and isinstance(d[k], dict):
                    d[k] = update_nested_dict(d[k], v)
                else:
                    d[k] = v
            return d
        
        # 更新配置
        updated_config = update_nested_dict(current_config, config_dict)
        
        try:
            # 验证并创建新配置对象
            new_config = SystemConfig(**updated_config)
            
            # 保存新配置
            if self.save(new_config):
                return new_config
            else:
                logger.error("保存更新后的配置失败")
                return self._config
        except ValidationError as e:
            logger.error(f"更新配置验证失败: {str(e)}")
            return self._config
    
    def apply_environment_variables(self):
        """应用配置到环境变量"""
        if not self._loaded:
            self.load()
        
        config = self._config
        
        # 应用语言模型环境变量
        os.environ['TOKENIZERS_PARALLELISM'] = "false"
        
        # OpenAI
        os.environ['OPENAI_API_KEY'] = config.languageModelConfig.openai.OPENAI_API_KEY
        os.environ['OPENAI_BASE_URL'] = config.languageModelConfig.openai.OPENAI_BASE_URL
        
        # Ollama
        os.environ['OLLAMA_API_BASE'] = config.languageModelConfig.ollama.OLLAMA_API_BASE
        os.environ['OLLAMA_API_MODEL_NAME'] = config.languageModelConfig.ollama.OLLAMA_API_MODEL_NAME
        
        # ZhipuAI
        os.environ['ZHIPUAI_API_KEY'] = config.languageModelConfig.zhipuai.ZHIPUAI_API_KEY
        
        # 代理设置
        if config.enableProxy:
            os.environ['HTTP_PROXY'] = config.httpProxy
            os.environ['HTTPS_PROXY'] = config.httpsProxy
            os.environ['SOCKS5_PROXY'] = config.socks5Proxy
        else:
            os.environ['HTTP_PROXY'] = ""
            os.environ['HTTPS_PROXY'] = ""
            os.environ['SOCKS5_PROXY'] = ""
        
        logger.info("配置已应用到环境变量")
        return True
    
    def _load_from_db(self) -> Optional[Dict[str, Any]]:
        """从数据库加载配置"""
        try:
            config_obj = SysConfigModel.objects.filter(code=CONFIG_CODE).first()
            if not config_obj:
                return None
            
            try:
                config_dict = json.loads(config_obj.config)
                return config_dict
            except json.JSONDecodeError:
                logger.error("数据库中的配置格式无效")
                return None
        except DatabaseError as e:
            logger.warning(f"从数据库加载配置失败: {str(e)}")
            return None
    
    def _load_from_file(self) -> Optional[Dict[str, Any]]:
        """从文件加载配置"""
        try:
            if not os.path.exists(CONFIG_PATH):
                return None
            
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                config_dict = json.load(f)
                return config_dict
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"从文件加载配置失败: {str(e)}")
            return None
    
    def _save_to_db(self, config_dict: Dict[str, Any]) -> bool:
        """保存配置到数据库"""
        try:
            config_str = json.dumps(config_dict, ensure_ascii=False)
            
            try:
                config_obj = SysConfigModel.objects.get(code=CONFIG_CODE)
                config_obj.config = config_str
                config_obj.save()
                logger.info("配置已更新到数据库")
            except SysConfigModel.DoesNotExist:
                SysConfigModel.objects.create(
                    code=CONFIG_CODE,
                    config=config_str
                )
                logger.info("配置已创建到数据库")
            
            return True
        except Exception as e:
            logger.error(f"保存配置到数据库失败: {str(e)}")
            return False
    
    def _save_to_file(self, config_dict: Dict[str, Any]) -> bool:
        """保存配置到文件"""
        try:
            with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                json.dump(config_dict, f, indent=2, ensure_ascii=False)
            logger.info(f"配置已保存到文件: {CONFIG_PATH}")
            return True
        except IOError as e:
            logger.error(f"保存配置到文件失败: {str(e)}")
            return False
    
    def _create_default_config(self) -> Dict[str, Any]:
        """创建默认配置"""
        default_config = SystemConfig()
        return default_config.model_dump()


# 单例模式实现
@lru_cache(maxsize=1)
def get_config_manager() -> ConfigManager:
    """获取配置管理器实例（单例模式）"""
    return ConfigManager() 