from django.apps import AppConfig
import logging
import os

logger = logging.getLogger(__name__)

class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.chatbot'

    def ready(self):
        """
        应用准备完成时调用
        """
        # 避免在manage.py migrate等命令时执行，只在服务器启动时执行
        if os.environ.get('RUN_MAIN', None) == 'true' or not os.environ.get('RUN_MAIN'):
            logger.info("应用已准备就绪，初始化系统...")
            
            try:
                from .ready import ready
                ready()
            except Exception as e:
                logger.error(f"应用初始化失败: {str(e)}")
            
            # 启动所需的服务
            try:
                from .ready import startup
                startup()
            except Exception as e:
                logger.error(f"启动服务失败: {str(e)}") 