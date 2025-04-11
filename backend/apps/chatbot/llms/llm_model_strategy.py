from __future__ import annotations
from abc import ABC, abstractmethod
import threading
import asyncio
from typing import List, Dict, Optional
import logging
from datetime import datetime

from .base import BaseLlmGeneration, LlmResponse, LlmMetrics
from .ollama.ollama_chat_robot import OllamaGeneration
from .openai.openai_chat_robot import OpenAIGeneration
from .zhipuai.zhipuai_chat_robot import ZhipuAIGeneration
from ..memory.zep.zep_memory import ChatHistroy

logger = logging.getLogger(__name__)

class LlmModelStrategy(ABC):
    """LLM模型策略接口"""

    @abstractmethod
    def chat(self, prompt: str, role_name: str, you_name: str, query: str, short_history: list[ChatHistroy],
             long_history: str) -> str:
        pass

    @abstractmethod
    async def chatStream(self,
                         prompt: str,
                         role_name: str,
                         you_name: str,
                         query: str,
                         history: list[ChatHistroy],
                         realtime_callback=None,
                         conversation_end_callback=None):
        pass

class LlmLoadBalancer:
    """负载均衡器，用于管理多个模型实例"""
    
    def __init__(self, model_type: str, num_instances: int = 3):
        self.model_type = model_type
        self.instances = []
        self.current_index = 0
        self.lock = threading.Lock()
        
        # 创建多个模型实例
        for _ in range(num_instances):
            if model_type == "openai":
                self.instances.append(OpenAIGeneration())
            elif model_type == "ollama":
                self.instances.append(OllamaGeneration())
            elif model_type == "zhipuai":
                self.instances.append(ZhipuAIGeneration())
                
    def get_instance(self) -> BaseLlmGeneration:
        """获取下一个可用的模型实例"""
        with self.lock:
            instance = self.instances[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.instances)
            return instance
            
    def get_all_instances(self) -> List[BaseLlmGeneration]:
        """获取所有模型实例"""
        return self.instances

class LlmMonitor:
    """监控和统计类，用于收集和分析模型使用情况"""
    
    def __init__(self):
        self.metrics = {
            "openai": LlmMetrics(),
            "ollama": LlmMetrics(),
            "zhipuai": LlmMetrics()
        }
        self.lock = threading.Lock()
        
    def record_request(self, model_type: str, success: bool, tokens_used: int = 0, 
                      response_time: float = 0.0, error: Optional[str] = None):
        """记录请求信息"""
        with self.lock:
            metrics = self.metrics[model_type]
            metrics.total_requests += 1
            if success:
                metrics.successful_requests += 1
                metrics.total_tokens += tokens_used
                # 更新平均响应时间
                metrics.average_response_time = (
                    (metrics.average_response_time * (metrics.successful_requests - 1) + response_time)
                    / metrics.successful_requests
                )
            else:
                metrics.failed_requests += 1
                metrics.last_error = error
                metrics.last_error_time = datetime.now()
                
    def get_metrics(self, model_type: str) -> LlmMetrics:
        """获取指定模型的统计信息"""
        return self.metrics.get(model_type, LlmMetrics())
        
    def get_all_metrics(self) -> Dict[str, LlmMetrics]:
        """获取所有模型的统计信息"""
        return self.metrics

class LlmModelDriver:
    """模型驱动类，使用负载均衡器管理模型实例"""

    def __init__(self):
        self.load_balancers = {
            "openai": LlmLoadBalancer("openai"),
            "ollama": LlmLoadBalancer("ollama"),
            "zhipuai": LlmLoadBalancer("zhipuai")
        }
        self.monitor = LlmMonitor()
        self.chat_stream_lock = threading.Lock()

    def chat(self, prompt: str, type: str, role_name: str, you_name: str, query: str,
             short_history: list[ChatHistroy], long_history: str) -> str:
        start_time = datetime.now()
        try:
            load_balancer = self.load_balancers.get(type)
            if not load_balancer:
                raise ValueError(f"Unknown model type: {type}")
                
            instance = load_balancer.get_instance()
            result = instance.chat(
                prompt=prompt,
                role_name=role_name,
                you_name=you_name,
                query=query,
                short_history=short_history,
                long_history=long_history
            )
            
            response_time = (datetime.now() - start_time).total_seconds()
            self.monitor.record_request(
                type,
                success=True,
                response_time=response_time
            )
            return result
        except Exception as e:
            error_msg = str(e)
            self.monitor.record_request(
                type,
                success=False,
                error=error_msg
            )
            logger.error(f"Chat error: {error_msg}")
            return "抱歉，发生了错误，请稍后重试。"

    def chatStream(self,
                   prompt: str,
                   type: str,
                   role_name: str,
                   you_name: str,
                   query: str,
                   history: list[ChatHistroy],
                   realtime_callback=None,
                   conversation_end_callback=None):
        start_time = datetime.now()
        try:
            load_balancer = self.load_balancers.get(type)
            if not load_balancer:
                raise ValueError(f"Unknown model type: {type}")
                
            instance = load_balancer.get_instance()
            asyncio.run(instance.chatStream(
                prompt=prompt,
                role_name=role_name,
                you_name=you_name,
                query=query,
                history=history,
                realtime_callback=realtime_callback,
                conversation_end_callback=conversation_end_callback
            ))
            
            response_time = (datetime.now() - start_time).total_seconds()
            self.monitor.record_request(
                type,
                success=True,
                response_time=response_time
            )
        except Exception as e:
            error_msg = str(e)
            self.monitor.record_request(
                type,
                success=False,
                error=error_msg
            )
            logger.error(f"Stream chat error: {error_msg}")
            if realtime_callback:
                realtime_callback(role_name, you_name, "抱歉，发生了错误，请稍后重试。", True)
            if conversation_end_callback:
                conversation_end_callback(role_name, "抱歉，发生了错误，请稍后重试。", you_name, query)

    def get_strategy(self, type: str) -> LlmModelStrategy:
        load_balancer = self.load_balancers.get(type)
        if not load_balancer:
            raise ValueError(f"Unknown model type: {type}")
        return load_balancer.get_instance()
        
    def get_metrics(self, model_type: str) -> LlmMetrics:
        """获取指定模型的统计信息"""
        return self.monitor.get_metrics(model_type)
        
    def get_all_metrics(self) -> Dict[str, LlmMetrics]:
        """获取所有模型的统计信息"""
        return self.monitor.get_all_metrics()
