from django.apps import AppConfig
import logging
import sys

logger = logging.getLogger(__name__)

class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.chatbot'

    def ready(self):
        """
        当Django应用完全加载后，初始化系统组件
        按照正确的顺序初始化各个组件，避免依赖问题
        """
        logger.info("Chatbot应用已加载，开始初始化组件...")
        try:
            # 1. 首先初始化SysConfig
            logger.info("1. 初始化SysConfig...")
            from .config import _singleton_instance, get_sys_config
            # 初始化SysConfig实例
            config_instance = get_sys_config()
            # 设置singleton_sys_config为实例化的对象，保持向后兼容
            sys.modules['apps.chatbot.config'].singleton_sys_config = config_instance
            logger.info("SysConfig初始化成功")
            
            # 2. 初始化ProcessCore
            logger.info("2. 初始化ProcessCore...")
            from .process import _process_core_instance, get_process_core
            process_instance = get_process_core()
            # 设置process_core为实例化的对象，保持向后兼容
            sys.modules['apps.chatbot.process'].process_core = process_instance
            logger.info("ProcessCore初始化成功")
            
            # 3. 初始化直播服务
            logger.info("3. 初始化直播服务...")
            from .process import initialize_live_service
            initialize_live_service()
            logger.info("直播服务初始化完成")
            
            # 4. 启动WebSocket消息队列
            logger.info("4. 启动RealtimeMessageQueryJobTask...")
            from .output.realtime_message_queue import RealtimeMessageQueryJobTask
            RealtimeMessageQueryJobTask.start()
            logger.info("RealtimeMessageQueryJobTask启动成功")
            
            logger.info("所有组件初始化完成")
        except Exception as e:
            logger.error(f"应用初始化失败: {str(e)}", exc_info=True) 