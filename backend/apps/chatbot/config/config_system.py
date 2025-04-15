import logging
from typing import Dict, Any, Optional, List
import os

# 在导入其他模块之前设置日志级别
# 禁用所有可能产生冗长日志的模块
logging.getLogger("litellm").setLevel(logging.ERROR)
logging.getLogger("litellm.utils").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.ERROR)
logging.getLogger("httpcore").setLevel(logging.ERROR)
logging.getLogger("urllib3").setLevel(logging.ERROR)
logging.getLogger("requests").setLevel(logging.ERROR)
logging.getLogger("aiohttp").setLevel(logging.ERROR)
logging.getLogger("asyncio").setLevel(logging.ERROR)

# 设置根日志记录器的级别
logging.getLogger().setLevel(logging.INFO)

from ..llms.llm_model_strategy import LlmModelDriver
from ..reflection.reflection import ImportanceRating, PortraitAnalysis
from .config_manager import get_config_manager, SystemConfig
from .interfaces import MemoryStorageDriverFactory, SysConfigInterface

logger = logging.getLogger(__name__)


# 记忆模块驱动工厂
def get_memory_storage_driver() -> MemoryStorageDriverFactory:
    """获取记忆存储驱动工厂函数，解决循环导入问题"""
    from ..memory.memory_storage import MemoryStorageDriver
    return MemoryStorageDriver


class SysConfig(SysConfigInterface):
    """
    系统配置类，使用新的配置管理系统实现
    提供与原系统兼容的接口，同时增加了配置验证和版本控制
    """
    # 类型注解 - 已经通过实现接口SysConfigInterface来定义
    
    def __init__(self) -> None:
        """初始化系统配置"""
        # 初始化组件
        self.bilibili_live_listener = None
        self.thread_pool_manager = None
        self.llm_model_driver = LlmModelDriver()
        self.memory_storage_driver = None
        
        # 记忆搜索配置
        self.search_memory_size = 3  # 默认搜索返回的记忆条数
        
        # 应用litellm补丁，防止truncate错误
        try:
            import litellm
            import litellm.utils
            
            # 禁用litellm的HTTP请求日志
            litellm.set_verbose = False
            litellm.set_debug = False
            
            # 禁用litellm的请求日志
            litellm.success_callback = []
            litellm.failure_callback = []
            
            litellm.set_max_tokens = False
            
            # 覆盖litellm的truncation检查
            def no_truncate(*args, **kwargs):
                return {}
            
            litellm.utils.truncate_messages = no_truncate
            logger.info("成功应用litellm补丁，禁用truncate功能")
        except Exception as e:
            logger.warning(f"应用litellm补丁失败: {str(e)}")
        
        # 获取配置管理器
        self.config_manager = get_config_manager()
        
        # 根据环境变量决定使用哪种加载方式
        use_lite_mode = os.environ.get('USE_LITE_CONFIG', 'false').lower() == 'true'
        if use_lite_mode:
            logger.info("使用轻量配置模式初始化...")
            self._load_lite()
        else:
            logger.info("使用完整配置模式初始化...")
            self._load()
    
    def get(self) -> Dict[str, Any]:
        """
        获取配置
        保持与原始接口兼容，但使用新的配置管理系统
        """
        # 获取当前配置
        config = self.config_manager.get_config()
        
        # 返回模型转换为字典
        return config.model_dump()
    
    def save(self, sys_config_json: Dict[str, Any]) -> None:
        """
        保存配置
        保持与原始接口兼容，但使用新的配置管理系统
        """
        # 使用配置管理器更新配置
        self.config_manager.update_config(sys_config_json)
        
        # 重新加载配置到当前实例
        self._reload_config_to_instance()
    
    def _load_lite(self) -> None:
        """
        简化的加载函数，只处理基本配置，不进行复杂初始化
        使用新的配置管理系统实现
        """
        logger.info("正在加载简化版配置...")
        
        # 加载配置
        config = self.config_manager.load()
        
        # 应用环境变量
        self.config_manager.apply_environment_variables()
        
        # 加载基本设置到实例变量
        self._load_config_to_instance(config)
        
        logger.info("简化版配置加载完成")
    
    def _load(self) -> None:
        """
        完整的配置加载功能，包含所有必要的组件初始化
        使用新的配置管理系统实现
        """
        logger.debug("======================== Load SysConfig ========================")
        
        # 加载配置
        config = self.config_manager.load()
        
        # 应用环境变量
        self.config_manager.apply_environment_variables()
        
        # 加载基本设置到实例变量
        self._load_config_to_instance(config)
        
        # 初始化角色
        self._init_character()
        
        # 懒加载记忆模块
        self._init_memory_storage()
        
        logger.info("完整版配置加载完成")
    
    def _load_config_to_instance(self, config: SystemConfig) -> None:
        """将配置对象中的值加载到当前实例的属性中"""
        # 角色配置
        self.character = config.characterConfig.character
        self.character_name = config.characterConfig.character_name
        self.your_name = config.characterConfig.yourName
        
        # 对话配置
        self.conversation_llm_model_driver_type = config.conversationConfig.languageModel
        
        # 记忆配置
        memory_config = config.memoryStorageConfig
        self.enable_summary = memory_config.enableSummary
        self.enable_longMemory = memory_config.enableLongMemory
        self.enable_reflection = memory_config.enableReflection
        
        # 设置本地记忆数量
        self.local_memory_num = memory_config.local_memory_num
        
        if self.enable_summary:
            self.summary_llm_model_driver_type = memory_config.languageModelForSummary
        else:
            self.summary_llm_model_driver_type = "openai"
            
        if self.enable_reflection:
            self.reflection_llm_model_driver_type = memory_config.languageModelForReflection
        else:
            self.reflection_llm_model_driver_type = "openai"
    
    def _reload_config_to_instance(self) -> None:
        """重新加载配置到当前实例"""
        # 重新加载配置
        config = self.config_manager.load(force_reload=True)
        
        # 应用环境变量
        self.config_manager.apply_environment_variables()
        
        # 加载基本设置到实例变量
        self._load_config_to_instance(config)
    
    def _init_character(self) -> None:
        """初始化角色，支持从数据库加载和创建默认角色"""
        from django.db.utils import OperationalError, ProgrammingError
        from django.db import connection
        from ..models import CustomRoleModel
        from ..character.sys.aili_zh import aili_zh
        
        # 获取当前配置
        config = self.config_manager.get_config()
        config_dict = config.model_dump()
        
        try:
            # 检查数据库表是否存在
            tables = connection.introspection.table_names()
            if 'apps_customrolemodel' not in tables:
                logger.warning("表 'apps_customrolemodel' 不存在，跳过角色初始化")
                return
            
            result = CustomRoleModel.objects.all()
            if len(result) == 0:
                # 创建默认角色
                logger.debug("=> load default character")
                custom_role = CustomRoleModel(
                    role_name=aili_zh.role_name,
                    persona=aili_zh.persona,
                    personality=aili_zh.personality,
                    scenario=aili_zh.scenario,
                    examples_of_dialogue=aili_zh.examples_of_dialogue,
                    custom_role_template_type=aili_zh.custom_role_template_type,
                    role_package_id=-1
                )
                custom_role.save()
                logger.info(f"已创建默认角色: ID={custom_role.id}, 名称={custom_role.role_name}")
                
                # 更新配置
                if "characterConfig" not in config_dict:
                    config_dict["characterConfig"] = {}
                
                config_dict["characterConfig"]["character"] = custom_role.id
                config_dict["characterConfig"]["character_name"] = custom_role.role_name
                
                # 保存配置
                self.config_manager.update_config(config_dict)
                
                # 更新实例属性
                self.character = custom_role.id
                self.character_name = custom_role.role_name
        except (OperationalError, ProgrammingError) as db_err:
            logger.warning(f"数据库表访问错误，使用默认配置: {str(db_err)}")
        except Exception as e:
            logger.error(f"=> load default character ERROR: {str(e)}")
    
    def _init_memory_storage(self) -> None:
        """初始化记忆存储，使用工厂方法"""
        if not self.enable_longMemory and not self.enable_summary and not self.enable_reflection:
            logger.info("记忆功能未启用，跳过记忆模块初始化")
            self.memory_storage_driver = None
            return
        
        try:
            # 获取当前配置
            config = self.config_manager.get_config()
            
            # 创建记忆存储配置
            data_dir = config.memoryStorageConfig.faissMemory.dataDir
            # 确保数据目录存在
            os.makedirs(data_dir, exist_ok=True)
            logger.info(f"使用数据目录: {data_dir}")
            
            memory_storage_config = {
                "data_dir": data_dir,
            }
            
            # 使用工厂方法获取MemoryStorageDriver类并创建实例
            logger.info("开始获取MemoryStorageDriver类")
            MemoryStorageDriver = get_memory_storage_driver()
            logger.info("开始创建MemoryStorageDriver实例")
            
            try:
                self.memory_storage_driver = MemoryStorageDriver(
                    memory_storage_config=memory_storage_config, 
                    sys_config=self
                )
                
                # 验证初始化结果
                if hasattr(self.memory_storage_driver, 'long_memory_storage') and self.memory_storage_driver.long_memory_storage is not None:
                    # 检查索引文件是否正确初始化
                    faiss_storage = self.memory_storage_driver.long_memory_storage
                    
                    if hasattr(faiss_storage, 'index') and faiss_storage.index is not None:
                        logger.info(f"FAISS索引初始化成功，包含 {faiss_storage.index.ntotal} 条记录")
                        logger.info("长期记忆存储初始化成功")
                    else:
                        logger.error("FAISS索引对象初始化失败")
                        raise RuntimeError("FAISS索引对象初始化失败")
                else:
                    logger.warning("记忆驱动初始化成功，但长期记忆未能正确初始化")
                    if self.enable_longMemory:
                        logger.error("长期记忆功能已启用但初始化失败，这可能导致后续问题")
                
                logger.info("记忆模块初始化成功")
            except Exception as inner_e:
                logger.error(f"MemoryStorageDriver实例化失败: {str(inner_e)}")
                import traceback
                logger.error(traceback.format_exc())
                
                # 如果启用了长期记忆，记录更详细的错误信息
                if self.enable_longMemory:
                    logger.error(f"长期记忆功能已启用但初始化失败，这将导致聊天功能问题")
                
                # 重置驱动实例
                self.memory_storage_driver = None
                raise inner_e
                
        except ImportError as ie:
            logger.error(f"导入记忆模块失败: {str(ie)}")
            import traceback
            logger.error(traceback.format_exc())
            self.memory_storage_driver = None
        except Exception as e:
            logger.error(f"初始化记忆模块失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            self.memory_storage_driver = None
    
    # 为了兼容性保留但不实际使用的方法
    def _create_default_config(self) -> Dict[str, Any]:
        """创建默认配置（为兼容性保留）"""
        # 使用配置管理器创建默认配置
        return self.config_manager.get_config().model_dump()
    
    def _save_to_db(self, config_data: Dict[str, Any]) -> None:
        """保存配置到数据库（为兼容性保留）"""
        # 使用配置管理器保存到数据库
        self.config_manager.update_config(config_data) 