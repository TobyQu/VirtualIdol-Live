"""
提供对话历史记录的简单数据结构
"""
import logging

logger = logging.getLogger(__name__)


class ChatHistroy:
    """
    对话历史记录数据结构
    role: 消息发送者角色（'human' 或 'ai'）
    content: 消息内容
    """
    role: str
    content: str

    def __init__(self, role: str, content: str) -> None:
        self.role = role
        self.content = content 