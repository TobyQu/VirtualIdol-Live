import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

# 使用全局变量来存储单例实例
_singleton_instance = None

@lru_cache(maxsize=1)
def get_sys_config():
    """
    延迟加载SysConfig单例，避免在Django应用初始化前访问数据库
    只有在第一次调用时才会创建实例
    """
    global _singleton_instance
    if _singleton_instance is None:
        from .sys_config import SysConfig
        _singleton_instance = SysConfig()
        logger.info("SysConfig单例已初始化")
    return _singleton_instance

# 为了向后兼容，保持原有的导入方式
singleton_sys_config = None


