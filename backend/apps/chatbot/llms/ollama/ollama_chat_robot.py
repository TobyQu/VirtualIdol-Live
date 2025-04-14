import logging
import os
from typing import List

from litellm import completion

from ...utils.chat_message_utils import format_chat_text
from ...utils.str_utils import remove_spaces_and_tabs
from ...memory.chat_history import ChatHistroy

logger = logging.getLogger(__name__)


class OllamaGeneration:
    model_name: str
    temperature: float = 0.7
    ollama_api_base: str

    def __init__(self) -> None:
        from dotenv import load_dotenv
        load_dotenv()
        self.ollama_api_base = os.environ['OLLAMA_API_BASE']
        self.model_name = "ollama/" + os.environ['OLLAMA_API_MODEL_NAME']
        self.max_tokens = 2048  # 设置默认最大token数

    def chat(self, prompt: str, role_name: str, you_name: str, query: str, short_history: list[ChatHistroy],
             long_history: str) -> str:
        try:
            prompt = prompt + query
            messages = [{"content": prompt, "role": "user"}]
            
            # 准备参数，不包含可能导致truncate错误的参数
            completion_params = {
                "model": self.model_name,
                "messages": messages,
                "temperature": self.temperature,
                # 不设置max_tokens，避免truncate错误
                # "max_tokens": self.max_tokens,
            }
            
            # 添加API基础URL（如果存在）
            if self.ollama_api_base:
                completion_params["api_base"] = self.ollama_api_base
            
            # 执行调用
            response = completion(**completion_params)
            
            llm_result_text = response.choices[0].message.content if response.choices else ""
            return llm_result_text
        except Exception as e:
            logger.error(f"Ollama chat error: {str(e)}")
            return "抱歉，发生了错误，请稍后重试。"

    async def chatStream(self,
                         prompt: str,
                         role_name: str,
                         you_name: str,
                         query: str,
                         history: list[str, str],
                         realtime_callback=None,
                         conversation_end_callback=None):

        messages = []
        messages.append({'role': 'system', 'content': prompt})
        for item in history:
            message = {"role": "user", "content": item["human"]}
            messages.append(message)
            message = {"role": "assistant", "content": item["ai"]}
            messages.append(message)
        messages.append({'role': 'user', 'content': you_name + "说" + query})

        try:
            # 准备参数，移除可能导致truncate错误的参数
            completion_params = {
                "model": self.model_name,
                "messages": messages,
                "stream": True,
                "temperature": self.temperature,
                # 不设置max_tokens，避免truncate错误
                # "max_tokens": self.max_tokens,
            }
            
            # 添加API基础URL（如果存在）
            if self.ollama_api_base:
                completion_params["api_base"] = self.ollama_api_base

            # 执行调用
            response = completion(**completion_params)

            answer = ''
            for event in response:
                # 处理应答事件
                if not isinstance(event, dict):
                    event = event.model_dump()
                
                if isinstance(event.get('choices', []), list) and len(event['choices']) > 0:
                    delta = event["choices"][0].get('delta', {})
                    event_text = delta.get('content', '')
                    
                    if isinstance(event_text, str) and event_text != "":
                        content = remove_spaces_and_tabs(event_text)
                        if content == "":
                            continue
                        answer += content
                        if realtime_callback:
                            realtime_callback(role_name, you_name, content, False)

            # 格式化最终答案
            answer = format_chat_text(role_name, you_name, answer)
            if conversation_end_callback:
                realtime_callback(role_name, you_name, "", True)
                conversation_end_callback(role_name, answer, you_name, query)
                
        except Exception as e:
            logger.error(f"Ollama Stream chat error: {str(e)}")
            if realtime_callback:
                realtime_callback(role_name, you_name, "抱歉，发生了错误，请稍后重试。", True)
            if conversation_end_callback:
                conversation_end_callback(role_name, "抱歉，发生了错误，请稍后重试。", you_name, query)
