import logging
from functools import lru_cache
import os

logger = logging.getLogger(__name__)

# 使用全局变量来存储单例实例
_singleton_instance = None

# 是否使用简化配置（开发模式）
USE_LITE_CONFIG = os.environ.get('USE_LITE_CONFIG', 'false').lower() == 'true'

# 是否使用新的配置系统
USE_NEW_CONFIG = os.environ.get('USE_NEW_CONFIG', 'true').lower() == 'true'

@lru_cache(maxsize=1)
def get_sys_config():
    """
    延迟加载SysConfig单例，避免在Django应用初始化前访问数据库
    只有在第一次调用时才会创建实例
    """
    global _singleton_instance
    
    if _singleton_instance is None:
        if USE_NEW_CONFIG:
            # 使用新版配置系统
            from .config_system import SysConfig
            logger.info("使用新版配置系统初始化...")
        else:
            # 使用旧版配置系统（兼容性）
            from .sys_config import SysConfig
            logger.info("使用旧版配置系统初始化...")
            
        _singleton_instance = SysConfig()
        
        # 根据配置模式输出日志
        if USE_LITE_CONFIG:
            logger.info("SysConfig已初始化（轻量模式）")
        else:
            logger.info("SysConfig已初始化（完整模式）")
            
    return _singleton_instance

# 从配置管理器获取配置
@lru_cache(maxsize=1)
def get_config():
    """
    获取配置对象
    返回一个代表系统配置的Pydantic模型实例
    """
    from .config_manager import get_config_manager
    config_manager = get_config_manager()
    return config_manager.get_config()

# 为了向后兼容，从get_sys_config导入单例实例
singleton_sys_config = get_sys_config()


