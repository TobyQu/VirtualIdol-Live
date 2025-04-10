# 定义默认应用配置
default_app_config = 'apps.chatbot.apps.ChatbotConfig'

# 注意：RealtimeMessageQueryJobTask 将在 apps.py 中的 ready() 方法中启动
# 这里导入但不要调用 start() 方法，以避免在Django初始化之前启动线程
from .output.realtime_message_queue import RealtimeMessageQueryJobTask
