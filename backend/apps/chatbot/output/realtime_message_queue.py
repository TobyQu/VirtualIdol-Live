import logging
import queue
import re
import threading
import traceback
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from ..utils.chat_message_utils import format_chat_text
from ..utils.str_utils import remove_special_characters, remove_emojis
from ..emotion.emotion_manage import GenerationEmote
import threading

# 聊天消息通道
chat_channel = "chat_channel"
# 创建一个线程安全的队列
chat_queue = queue.SimpleQueue()
logger = logging.getLogger(__name__)


class RealtimeMessage():
    type: str
    user_name: str
    content: str
    emote: str
    action: str
    expand: str

    def __init__(self, type: str, user_name: str, content: str, emote: str, expand: str = None,
                 action: str = None) -> None:
        self.type = type
        self.user_name = user_name
        self.content = content
        self.emote = emote
        self.action = action
        self.expand = expand

    def to_dict(self):
        return {
            "type": self.type,
            "user_name": self.user_name,
            "content": self.content,
            "emote": self.emote,
            "action": self.action,
            "expand": self.expand
        }


def put_message(message: RealtimeMessage):
    global chat_queue
    logger.info(f"将消息添加到队列: {message.to_dict()}")
    chat_queue.put(message)


def send_message():
    global chat_queue
    channel_layer = get_channel_layer()
    send_message_exe = async_to_sync(channel_layer.group_send)

    while True:
        try:
            message = chat_queue.get()
            if (message is not None and message != ''):
                logger.info(f"从队列获取消息并发送到WebSocket: {message.to_dict()}")
                chat_message = {"type": "chat_message",
                                "message": message.to_dict()}
                send_message_exe(chat_channel, chat_message)
                logger.info(f"消息已发送到通道: {chat_channel}")
            else:
                logger.warning("从队列获取到空消息")
        except Exception as e:
            logger.error(f"发送消息时出错: {str(e)}")
            traceback.print_exc()


def realtime_callback(role_name: str, you_name: str, content: str, end_bool: bool):
    logger.info(f"收到回调 - role_name: {role_name}, you_name: {you_name}, content: {content}, end_bool: {end_bool}")
    
    if not hasattr(realtime_callback, "message_buffer"):
        realtime_callback.message_buffer = ""
        logger.info("初始化消息缓冲区")

    realtime_callback.message_buffer += content
    logger.info(f"当前缓冲区内容: {realtime_callback.message_buffer}")
    
    # 如果 content 以结束标点符号或空结尾，打印并清空缓冲区
    if re.match(r"^(.+[。．！？\n]|.{10,}[、,])", realtime_callback.message_buffer) or end_bool:
        logger.info("缓冲区满足发送条件，准备发送")
        
        realtime_callback.message_buffer = format_chat_text(
            role_name, you_name, realtime_callback.message_buffer)
        logger.info(f"格式化后的消息: {realtime_callback.message_buffer}")

        # 删除表情符号和一些特定的特殊符号，防止语音合成失败
        message_text = realtime_callback.message_buffer
        message_text = remove_emojis(message_text)
        message_text = remove_special_characters(message_text)
        logger.info(f"处理后的消息文本: {message_text}")

        # 生成人物表情
        try:
            # 在这里动态导入配置，避免循环依赖
            from ..config import get_sys_config
            sys_config = get_sys_config()
            
            generation_emote = GenerationEmote(llm_model_driver=sys_config.llm_model_driver,
                                              llm_model_driver_type=sys_config.conversation_llm_model_driver_type)
            emote = generation_emote.generation_emote(
                query=message_text)
            logger.info(f"生成表情: {emote}")
        except Exception as e:
            logger.error(f"生成表情时出错: {str(e)}")
            emote = "neutral"  # 使用默认表情

        # 发送文本消息
        logger.info(f"创建并发送实时消息 - user_name: {you_name}, content: {message_text}, emote: {emote}")
        put_message(RealtimeMessage(
            type="user", user_name=you_name, content=message_text, emote=emote))
        realtime_callback.message_buffer = ""
        logger.info("缓冲区已清空")


class RealtimeMessageQueryJobTask():

    @staticmethod
    def start():
        # 创建后台线程
        logger.info("启动实时消息查询任务线程")
        background_thread = threading.Thread(target=send_message)
        background_thread.daemon = True
        # 启动后台线程
        background_thread.start()
        logger.info("=> Start RealtimeMessageQueryJobTask Success")
