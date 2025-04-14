import logging
from .process import ProcessCore
from ..config import get_sys_config  # 改为使用函数获取配置

logger = logging.getLogger(__name__)

# 使用全局变量保存单例实例
_process_core_instance = None

def get_process_core():
    """
    延迟加载ProcessCore单例，避免在Django应用初始化前访问SysConfig
    只有在第一次调用时才会创建实例
    """
    global _process_core_instance
    if _process_core_instance is None:
        logger.info("初始化ProcessCore实例...")
        _process_core_instance = ProcessCore()
        logger.info("ProcessCore实例初始化完成")
    return _process_core_instance

# 为了向后兼容，提供process_core变量
process_core = None

# 启动直播功能的函数，将在apps.py的ready()方法中调用
def initialize_live_service():
    """在Django应用完全初始化后启动直播服务"""
    from ..insight.bilibili_api.bili_live_client import lazy_bilibili_live
    
    # 获取SysConfig实例
    config = get_sys_config()
    
    # 加载直播配置
    sys_config_json = config.get()
    try:
        enableLive = sys_config_json.get("enableLive", False)
        if enableLive:
            logger.info("正在初始化直播服务...")
            lazy_bilibili_live(sys_config_json, config)
            logger.info("直播服务初始化完成")
    except Exception as e:
        logger.error(f"加载直播配置出错: {str(e)}")
        # 如果配置不存在，添加默认值
        if "enableLive" not in sys_config_json:
            sys_config_json["enableLive"] = False
            # 保存回配置
            config.save(sys_config_json)
    
    logger.info("=> Load SysConfig Success")
