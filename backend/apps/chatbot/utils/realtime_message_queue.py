import time
import re
import logging

logger = logging.getLogger(__name__)

class RealtimeMessageQueue:
    def __init__(self, max_wait_time, max_buffer_size, role_prefixes, sentence_end_markers, callback):
        self._max_wait_time = max_wait_time
        self._max_buffer_size = max_buffer_size
        self._role_prefixes = role_prefixes
        self._sentence_end_markers = sentence_end_markers
        self._callback = callback
        self._buffer = ""
        self._last_send_time = time.time()
        self._debug_mode = False  # 默认关闭详细日志

    def _process_buffer(self):
        """处理缓冲区中的消息"""
        if not self._buffer:
            return

        # 检查是否满足发送条件
        if self._should_send():
            # 格式化消息
            formatted_message = self._format_message()
            if formatted_message:
                # 处理消息文本
                processed_text = self._process_message_text(formatted_message)
                if processed_text:
                    # 发送消息
                    self._send_message(processed_text)
                    # 清空缓冲区
                    self._buffer = ""
                    self._last_send_time = time.time()
                    logger.info(f"消息已发送: {processed_text[:30]}..." if len(processed_text) > 30 else f"消息已发送: {processed_text}")

    def _should_send(self) -> bool:
        """判断是否应该发送消息"""
        current_time = time.time()
        time_since_last_send = current_time - self._last_send_time
        
        # 超过最大等待时间
        if time_since_last_send >= self._max_wait_time:
            if self._debug_mode:
                logger.debug("超过最大等待时间，准备发送消息")
            return True
            
        # 达到最大缓冲区大小
        if len(self._buffer) >= self._max_buffer_size:
            if self._debug_mode:
                logger.debug("达到最大缓冲区大小，准备发送消息")
            return True
            
        # 遇到句子结束标记
        if any(marker in self._buffer for marker in self._sentence_end_markers):
            if self._debug_mode:
                logger.debug("检测到句子结束标记，准备发送消息")
            return True
            
        return False

    def _format_message(self) -> str:
        """格式化消息"""
        if not self._buffer:
            return ""
            
        # 移除角色名称前缀
        message = self._buffer
        for prefix in self._role_prefixes:
            if message.startswith(prefix):
                message = message[len(prefix):].strip()
                break
                
        return message

    def _process_message_text(self, text: str) -> str:
        """处理消息文本"""
        if not text:
            return ""
            
        # 移除多余的空格和换行
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _send_message(self, message: str):
        """发送消息"""
        if not message:
            return
            
        # 发送消息到回调函数
        if self._callback:
            self._callback(message)
            
    # 添加一个新的方法用于处理流式回调
    def handle_stream_callback(self, role_name, you_name, content, end_bool):
        """处理流式回调"""
        # 只在首次接收到回调时记录日志
        if not self._buffer:
            logger.debug(f"开始接收流式回调: {role_name}")
            self._buffer = ""
            
        # 添加到缓冲区
        self._buffer += content
        
        # 只处理但不记录每个字符的添加
        self._process_buffer()
        
        # 如果是最后一个回调
        if end_bool:
            logger.debug(f"流式回调结束: {role_name}")
            
    # 用于替换原来的函数，保持向后兼容
    def receive_callback(self, role_name, you_name, content, end_bool):
        return self.handle_stream_callback(role_name, you_name, content, end_bool) 