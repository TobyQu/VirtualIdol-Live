# 导入必要的模块
from .output.realtime_message_queue import RealtimeMessageQueryJobTask

# 启动实时消息队列任务
default_app_config = 'apps.chatbot.apps.ChatbotConfig'

# 初始化WebSocket消息队列
RealtimeMessageQueryJobTask.start()
