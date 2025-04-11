"""
接口定义模块，用于解决循环导入问题
这个模块定义了系统中各个组件之间的接口，
使得不同组件可以通过接口进行交互，而不是直接依赖
"""

from typing import Any, Dict, List, Protocol, TypeVar, Callable, Optional


class LlmModelDriverInterface(Protocol):
    """语言模型驱动接口"""
    
    def chat(self, prompt: str, type: str, role_name: str, you_name: str, query: str,
             short_history: list, long_history: str) -> str:
        """聊天API"""
        ...
    
    def chatStream(self, prompt: str, type: str, role_name: str, you_name: str, query: str,
                  history: list, realtime_callback=None, conversation_end_callback=None) -> None:
        """流式聊天API"""
        ...


class MemoryDriverInterface(Protocol):
    """记忆驱动接口"""
    
    def search_short_memory(self, query_text: str, you_name: str, role_name: str) -> list[Dict[str, str]]:
        """搜索短期记忆"""
        ...
    
    def search_lang_memory(self, query_text: str, you_name: str, role_name: str) -> str:
        """搜索长期记忆"""
        ...
    
    def save(self, you_name: str, query_text: str, role_name: str, answer_text: str) -> None:
        """保存记忆"""
        ...
    
    def clear(self, owner: str) -> None:
        """清空记忆"""
        ...


class SysConfigInterface(Protocol):
    """系统配置接口"""
    
    # 必要的属性
    llm_model_driver: LlmModelDriverInterface
    conversation_llm_model_driver_type: str
    enable_summary: bool
    enable_longMemory: bool
    summary_llm_model_driver_type: str
    enable_reflection: bool
    reflection_llm_model_driver_type: str
    memory_storage_driver: Optional[MemoryDriverInterface]
    character: int
    character_name: str
    your_name: str
    local_memory_num: int
    
    # 必要的方法
    def get(self) -> Dict[str, Any]:
        """获取配置字典"""
        ...
    
    def save(self, sys_config_json: Dict[str, Any]) -> None:
        """保存配置"""
        ...


# 各种工厂方法类型定义
MemoryStorageDriverFactory = Callable[[Dict[str, str], Any], Any] 