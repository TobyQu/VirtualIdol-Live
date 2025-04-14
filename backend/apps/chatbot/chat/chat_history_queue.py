import json
import logging
import queue
import threading
import traceback
# 避免循环导入，不直接导入singleton_sys_config
from ..config import get_sys_config
from ..memory.chat_history import ChatHistroy
from ..service import portal_user_service

logger = logging.getLogger(__name__)

# 创建一个线程安全的优先级队列
chat_history_queue = queue.SimpleQueue()


class ChatHistoryMessage():
    '''定义聊天历史消息队列'''
    role_name: str
    role_message: str
    you_name: str
    you_message: str

    def __init__(self, role_name: str, role_message: str, you_name: str, you_message: str) -> None:
        self.role_name = role_name
        self.role_message = role_message
        self.you_name = you_name
        self.you_message = you_message

    def to_dict(self):
        return {
            "role_name": self.role_name,
            "role_message": self.role_message,
            "you_name": self.you_name,
            "you_message": self.you_message
        }


def put_message(message: ChatHistoryMessage):
    global chat_history_queue
    chat_history_queue.put(message)

def send_message():
    global chat_history_queue
    
    while True:
        try:
            message = chat_history_queue.get()
            if (message != None and message != ''):
                try:
                    logger.info(f"处理聊天历史消息: {message.you_name} -> {message.role_name}")
                    
                    # 获取系统配置
                    sys_config = get_sys_config()
                    
                    # 检查记忆驱动是否已初始化
                    if sys_config.memory_storage_driver is None:
                        logger.warning("记忆驱动未初始化，无法保存聊天历史")
                        continue
                    
                    # 保存到记忆系统
                    sys_config.memory_storage_driver.save(
                        message.you_name, message.you_message, message.role_name, message.role_message)
                    
                    logger.info(f"聊天历史已成功保存到记忆系统")
                except Exception as e:
                    logger.error(f"保存聊天历史到记忆系统失败: {str(e)}")
                    traceback.print_exc()
        except Exception as e:
            logger.error(f"处理聊天历史队列消息时出错: {str(e)}")
            traceback.print_exc()

# def send_message():
#     global chat_history_queue
#     while True:
#         try:
#             message = chat_history_queue.get()
#             if (message != None and message != ''):
#                 # 判断当前记忆的重要性
#                 memory = f"{message.you_name}说{message.you_message}"
#                 rating = singleton_sys_config.importance_rating.rating(memory)
#                 # 存储到记忆库中
#                 singleton_sys_config.memory_storage_driver.save(
#                     message.you_name, message.you_message, message.role_name, message.role_message)
#
#                 # 如果当前重要性大于5，进行一次人物画像更新
#                 if rating > 5:
#                     portal_user = portal_user_service.get_and_create(message.you_name)
#                     user_id =  str(portal_user.id)
#                     channel_id = str(portal_user.id)
#                     user = singleton_sys_config.memory_storage_driver.chat_histroy_service.zep_service.get_user(user_id)
#                     portrait = user.metadata["portrait"]
#                     recently_memory = singleton_sys_config.memory_storage_driver.chat_histroy_service.zep_service.get_memorys(
#                         channel_id=channel_id, limit=10)
#                     recently_memory.reverse()
#                     recently_memory_str = format_histroy(recently_memory)
#                     portrait = singleton_sys_config.portrait_analysis.analysis(message.you_name, portrait,
#                                                                                recently_memory_str)
#                     # 获取最新的人物画像信息，并且进行更新
#                     user = singleton_sys_config.memory_storage_driver.chat_histroy_service.zep_service.get_user(
#                         user_id)
#                     user.metadata["portrait"] = portrait
#                     singleton_sys_config.memory_storage_driver.chat_histroy_service.zep_service.update_user(
#                         user_id, user.metadata)
#                     logger.info(f"# user_id:{message.you_name} # update meta_data => {portrait}")
#
#
#         except Exception as e:
#             traceback.print_exc()


def format_histroy(recently_memory: list[ChatHistroy]) -> str:
    chat_histroy_str = []
    for item in recently_memory:
        chat_histroy_str.append(item.content)
    return "\n".join(chat_histroy_str)


def conversation_end_callback(role_name: str, role_message: str, you_name: str, you_message: str):
    """对话结束后的回调函数，将消息放入队列"""
    logger.info(f"对话结束回调触发: {you_name} -> {role_name}")
    # 异步存储记忆
    put_message(ChatHistoryMessage(
        role_name=role_name,
        role_message=role_message,
        you_name=you_name,
        you_message=you_message
    ))


class ChatHistoryMessageQueryJobTask():
    @staticmethod
    def start():
        # 创建后台线程
        background_thread = threading.Thread(target=send_message)
        # 将后台线程设置为守护线程，以便在主线程结束时自动退出
        background_thread.daemon = True
        # 启动后台线程
        background_thread.start()
        logger.info("=> Start ChatHistoryMessageQueryJobTask Success")
