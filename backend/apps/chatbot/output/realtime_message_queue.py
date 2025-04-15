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
from ..emotion.behavior_action_management import ChatActionParser, BehaviorActionMessage
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
    """向队列中添加消息"""
    global chat_queue
    try:
        logger.info(f"添加消息到队列: type='{message.type}', user_name='{message.user_name}', action='{message.action}', emote='{message.emote}'")
        chat_queue.put(message)
        logger.debug("消息已添加到队列")
    except Exception as e:
        logger.error(f"添加消息到队列时出错: {str(e)}")


def send_message():
    """循环发送消息到WebSocket"""
    global chat_queue
    channel_layer = get_channel_layer()
    send_message_exe = async_to_sync(channel_layer.group_send)

    while True:
        try:
            message = chat_queue.get()
            if (message is not None and message != ''):
                logger.info(f"从队列获取消息准备发送: type='{message.type}', user_name='{message.user_name}', action='{message.action}', emote='{message.emote}'")
                chat_message = {"type": "chat_message",
                                "message": message.to_dict()}
                send_message_exe(chat_channel, chat_message)
                logger.debug(f"WebSocket消息已发送: type='{message.type}'")
            else:
                logger.warning("从队列获取到空消息")
        except Exception as e:
            logger.error(f"发送消息时出错: {str(e)}")
            logger.error(traceback.format_exc())


# 创建一个全局的动作解析器实例
_chat_action_parser = None

def get_chat_action_parser():
    """获取或创建一个ChatActionParser实例"""
    global _chat_action_parser
    if _chat_action_parser is None:
        try:
            # 动态导入配置，避免循环依赖
            from ..config import get_sys_config
            sys_config = get_sys_config()
            _chat_action_parser = ChatActionParser(
                llm_model_driver=sys_config.llm_model_driver,
                llm_model_driver_type=sys_config.conversation_llm_model_driver_type
            )
            logger.info("成功初始化ChatActionParser")
        except Exception as e:
            logger.error(f"初始化ChatActionParser失败: {str(e)}")
            # 如果初始化失败，返回一个简单的解析函数
            return None
    return _chat_action_parser

def fallback_parse_action(text: str) -> BehaviorActionMessage:
    """当ChatActionParser初始化失败时的后备解析函数"""
    logger.warning("使用后备的动作解析函数")
    return BehaviorActionMessage("neutral", "idle_01")

def realtime_callback(role_name: str, you_name: str, content: str, end_bool: bool):
    # 只记录开始和结束时的消息，中间流式输出不记录
    if not hasattr(realtime_callback, "message_buffer"):
        realtime_callback.message_buffer = ""
    
    # 增量累积消息
    realtime_callback.message_buffer += content
    
    # 如果是结束消息，则处理完整的消息
    if end_bool:
        message_text = realtime_callback.message_buffer.strip()
        # 进行特殊字符过滤，避免干扰前端显示
        message_text = remove_special_characters(message_text)
        message_text = remove_emojis(message_text)
        message_text = format_chat_text(role_name, you_name, message_text)
        
        # 在完成时记录处理后的消息文本（只显示前30个字符）
        preview = message_text[:30] + "..." if len(message_text) > 30 else message_text
        logger.info(f"处理完成: {preview}")

        # 生成人物表情
        try:
            # 在这里动态导入配置，避免循环依赖
            from ..config import get_sys_config
            sys_config = get_sys_config()
            
            generation_emote = GenerationEmote(llm_model_driver=sys_config.llm_model_driver,
                                              llm_model_driver_type=sys_config.conversation_llm_model_driver_type)
            emote = generation_emote.generation_emote(
                query=message_text)
            logger.debug(f"生成表情: {emote}")
        except Exception as e:
            logger.error(f"生成表情时出错: {str(e)}")
            emote = "neutral"  # 使用默认表情
            
        # 解析并生成动作消息
        try:
            logger.info(f"开始解析消息中的动作指令: '{message_text[:100]}...'")  # 只记录前100个字符
            
            # 获取ChatActionParser实例
            parser = get_chat_action_parser()
            if parser:
                # 使用实例方法解析动作命令
                behavior_action = parser.parse_action_command(message_text)
            else:
                # 如果获取实例失败，使用后备解析函数
                behavior_action = fallback_parse_action(message_text)
            
            # 仅当解析出非默认动作时才发送动作消息
            if behavior_action.action != "idle_01" or behavior_action.emote != "neutral":
                logger.info(f"解析到非默认动作: action='{behavior_action.action}', emote='{behavior_action.emote}'")
                
                # 发送动作消息
                action_message = RealtimeMessage(
                    type="behavior_action", 
                    user_name="", 
                    content=behavior_action.action, 
                    emote=behavior_action.emote)
                logger.info(f"发送动作消息: type='behavior_action', action='{behavior_action.action}', emote='{behavior_action.emote}'")
                put_message(action_message)
            else:
                logger.info(f"使用默认动作，不发送动作消息: action='{behavior_action.action}', emote='{behavior_action.emote}'")
        except Exception as e:
            logger.error(f"解析动作时出错: {str(e)}")
            logger.error(traceback.format_exc())  # 记录堆栈跟踪

        # 发送文本消息
        text_message = RealtimeMessage(
            type="user", user_name=you_name, content=message_text, emote=emote)
        logger.info(f"发送文本消息: type='user', user_name='{you_name}', emote='{emote}', content_length={len(message_text)}")
        put_message(text_message)
        realtime_callback.message_buffer = ""


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
