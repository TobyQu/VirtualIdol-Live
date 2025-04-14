# 定义默认应用配置
default_app_config = 'apps.chatbot.apps.ChatbotConfig'

# 注意：消息队列任务类将在 apps.py 中的 ready() 方法中通过动态导入启动
# 不要在这里直接导入任务类，以避免循环导入问题
