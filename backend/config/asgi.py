"""
ASGI config for VirtualWife project.
"""

import os
import logging

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.chatbot.routing import websocket_urlpatterns

# 配置日志
logger = logging.getLogger(__name__)

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# 初始化WebSocket消息队列服务
try:
    logger.info("正在初始化WebSocket服务...")
    from apps.chatbot.output.realtime_message_queue import RealtimeMessageQueryJobTask
    RealtimeMessageQueryJobTask.start()
    logger.info("WebSocket服务启动成功")
except Exception as e:
    logger.error(f"启动WebSocket服务失败: {str(e)}")

# 创建ASGI应用
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
}) 