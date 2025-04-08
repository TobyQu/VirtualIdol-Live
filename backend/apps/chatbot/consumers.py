import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .output.realtime_message_queue import chat_channel

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """建立 WebSocket 连接"""
        logger.info("WebSocket 连接建立")
        # 加入聊天频道组
        await self.channel_layer.group_add(
            chat_channel,
            self.channel_name
        )
        # 接受连接
        await self.accept()
        # 发送连接成功消息
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': '连接成功'
        }))

    async def disconnect(self, close_code):
        """断开 WebSocket 连接"""
        logger.info(f"WebSocket 连接断开，关闭代码：{close_code}")
        # 离开聊天频道组
        await self.channel_layer.group_discard(
            chat_channel,
            self.channel_name
        )

    async def receive(self, text_data):
        """接收并处理 WebSocket 消息"""
        try:
            if not text_data:
                logger.warning("收到空消息")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': '消息不能为空'
                }))
                return

            # 尝试解析 JSON 数据
            try:
                text_data_json = json.loads(text_data)
            except json.JSONDecodeError as e:
                logger.error(f"JSON 解析错误: {str(e)}, 原始数据: {text_data}")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': '无效的 JSON 格式'
                }))
                return

            # 获取消息类型和内容
            message_type = text_data_json.get('type', 'message')
            message = text_data_json.get('message', '')
            
            logger.info(f"收到消息 - 类型: {message_type}, 内容: {message}")

            # 根据消息类型处理
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': 'pong'
                }))
            else:
                # 发送消息回客户端
                await self.send(text_data=json.dumps({
                    'type': message_type,
                    'message': message
                }))

        except Exception as e:
            logger.error(f"处理消息时出错: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': '服务器内部错误'
            }))
            
    async def chat_message(self, event):
        """
        处理来自chat_channel的消息并发送给客户端
        """
        logger.info(f"发送聊天消息到客户端: {event}")
        # 将消息发送到WebSocket
        await self.send(text_data=json.dumps(event)) 