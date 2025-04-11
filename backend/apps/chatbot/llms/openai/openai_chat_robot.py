import logging
import os
from typing import List
from datetime import datetime

from litellm import completion

from ...utils.chat_message_utils import format_chat_text
from ...utils.str_utils import remove_spaces_and_tabs
from ...memory.zep.zep_memory import ChatHistroy
from ..base import BaseLlmGeneration, LlmResponse

logger = logging.getLogger(__name__)


class OpenAIGeneration(BaseLlmGeneration):
    model_name: str = "gpt-3.5-turbo"
    temperature: float = 0.7
    openai_api_key: str
    openai_base_url: str

    def __init__(self) -> None:
        super().__init__()
        from dotenv import load_dotenv
        load_dotenv()
        self.openai_api_key = os.environ['OPENAI_API_KEY']
        self.openai_base_url = os.environ['OPENAI_BASE_URL']

    def chat(self, prompt: str, role_name: str, you_name: str, query: str, short_history: list[ChatHistroy],
             long_history: str) -> str:
        try:
            prompt = prompt + query
            messages = [{"content": prompt, "role": "user"}]
            
            completion_params = {
                "model": self.model_name,
                "messages": messages,
                "temperature": self.temperature,
            }
            
            if self.openai_base_url:
                completion_params["api_base"] = self.openai_base_url
                
            response = completion(**completion_params)
            
            llm_result_text = response.choices[0].message.content if response.choices else ""
            
            response_obj = LlmResponse(
                content=llm_result_text,
                model=self.model_name,
                timestamp=datetime.now(),
                tokens_used=response.usage.total_tokens if hasattr(response, 'usage') else None
            )
            
            if not self._validate_response(response_obj):
                return ""
                
            return response_obj.content
            
        except Exception as e:
            response_obj = self._handle_error(e)
            return response_obj.content

    async def chatStream(self,
                         prompt: str,
                         role_name: str,
                         you_name: str,
                         query: str,
                         history: list[str, str],
                         realtime_callback=None,
                         conversation_end_callback=None):
        try:
            await self._rate_limit()
            
            messages = []
            messages.append({'role': 'system', 'content': prompt})
            for item in history:
                message = {"role": "user", "content": item["human"]}
                messages.append(message)
                message = {"role": "assistant", "content": item["ai"]}
                messages.append(message)
            messages.append({'role': 'user', 'content': you_name + "说" + query})

            completion_params = {
                "model": self.model_name,
                "messages": messages,
                "stream": True,
                "temperature": self.temperature,
            }
            
            if self.openai_base_url:
                completion_params["api_base"] = self.openai_base_url

            response = completion(**completion_params)

            answer = ''
            for event in response:
                if not isinstance(event, dict):
                    event = event.model_dump()
                if isinstance(event['choices'], List) and len(event['choices']) > 0:
                    event_text = event["choices"][0]['delta']['content']
                    if isinstance(event_text, str) and event_text != "":
                        content = event_text
                        content = remove_spaces_and_tabs(content)
                        if content == "":
                            continue
                        answer += content
                        if realtime_callback:
                            realtime_callback(role_name, you_name,
                                            content, False)

            answer = format_chat_text(role_name, you_name, answer)
            if conversation_end_callback:
                realtime_callback(role_name, you_name, "", True)
                conversation_end_callback(role_name, answer, you_name, query)
                
        except Exception as e:
            logger.error(f"Stream chat error: {str(e)}")
            if realtime_callback:
                realtime_callback(role_name, you_name, "抱歉，发生了错误，请稍后重试。", True)
            if conversation_end_callback:
                conversation_end_callback(role_name, "抱歉，发生了错误，请稍后重试。", you_name, query)
