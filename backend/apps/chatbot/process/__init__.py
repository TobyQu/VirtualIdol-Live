import logging
from .process import ProcessCore
from ..config import singleton_sys_config

logger = logging.getLogger(__name__)

# 单例 process_core
process_core = ProcessCore()

from ..insight.bilibili_api.bili_live_client import lazy_bilibili_live
# 加载直播配置
sys_config_json = singleton_sys_config.get()
try:
    enableLive = sys_config_json.get("enableLive", False)
    if enableLive:
        lazy_bilibili_live(sys_config_json, singleton_sys_config)
except Exception as e:
    logger.error(f"加载直播配置出错: {str(e)}")
    # 如果配置不存在，添加默认值
    if "enableLive" not in sys_config_json:
        sys_config_json["enableLive"] = False
        # 保存回配置
        singleton_sys_config.save(sys_config_json)
        
logger.info("=> Load SysConfig Success")
