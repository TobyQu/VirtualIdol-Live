import logging
from .output.realtime_message_queue import RealtimeMessageQueryJobTask

logger = logging.getLogger(__name__)

def startup():
    """
    在Django应用启动时运行的函数，初始化WebSocket和消息队列
    """
    try:
        logger.info("初始化WebSocket实时消息队列服务...")
        RealtimeMessageQueryJobTask.start()
        logger.info("WebSocket实时消息队列服务启动成功")
    except Exception as e:
        logger.error(f"启动WebSocket服务时出错: {str(e)}", exc_info=True) 