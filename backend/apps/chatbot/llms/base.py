from __future__ import annotations
from abc import ABC, abstractmethod
import asyncio
from typing import Optional
import logging
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class LlmResponse:
    content: str
    model: str
    timestamp: datetime
    tokens_used: Optional[int] = None
    error: Optional[str] = None

@dataclass
class LlmMetrics:
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_tokens: int = 0
    average_response_time: float = 0.0
    last_error: Optional[str] = None
    last_error_time: Optional[datetime] = None

class BaseLlmGeneration(ABC):
    """大语言模型生成的基类，提供共享功能和错误处理"""
    
    def __init__(self):
        self._rate_limit_semaphore = asyncio.Semaphore(10)  # 限制并发请求数
        self._last_request_time = datetime.min
        self._min_request_interval = 0.1  # 最小请求间隔（秒）
        
    async def _rate_limit(self):
        """实现请求限流"""
        async with self._rate_limit_semaphore:
            now = datetime.now()
            time_since_last = (now - self._last_request_time).total_seconds()
            if time_since_last < self._min_request_interval:
                await asyncio.sleep(self._min_request_interval - time_since_last)
            self._last_request_time = datetime.now()
            
    def _validate_response(self, response: LlmResponse) -> bool:
        """验证模型响应"""
        if response.error:
            logger.error(f"Model response error: {response.error}")
            return False
        if not response.content:
            logger.warning("Empty response from model")
            return False
        return True
        
    def _handle_error(self, error: Exception) -> LlmResponse:
        """统一错误处理"""
        error_msg = str(error)
        logger.error(f"LLM generation error: {error_msg}")
        return LlmResponse(
            content="",
            model=self.__class__.__name__,
            timestamp=datetime.now(),
            error=error_msg
        ) 