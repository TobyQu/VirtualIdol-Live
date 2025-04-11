import json
import logging
from typing import Optional
from .emotion_system import EmotionSystem, EmotionType
from .emotion_manage import EmotionRecognition, EmotionRespond, GenerationEmote

logger = logging.getLogger(__name__)

class EmotionAdapter:
    """情感系统适配器，用于集成新旧系统"""
    
    def __init__(self, llm_model_driver, llm_model_driver_type: str):
        self.emotion_system = EmotionSystem()
        self.llm_recognizer = EmotionRecognition(llm_model_driver, llm_model_driver_type)
        self.llm_responder = EmotionRespond(llm_model_driver, llm_model_driver_type)
        self.llm_emote = GenerationEmote(llm_model_driver, llm_model_driver_type)
    
    def recognize_emotion(self, you_name: str, query: str) -> str:
        """识别情绪，结合新旧系统"""
        # 使用轻量级系统分析
        emotion_state = self.emotion_system.update_emotion(query)
        
        # 使用LLM进行更深入的分析
        intent = self.llm_recognizer.recognition(you_name, query)
        
        # 记录用户交互
        self.emotion_system.track_user_preference(
            emotion_state.emotion,
            intent,
            1  # 默认反馈分数
        )
        
        return intent
    
    def generate_response(self, intent: str, you_name: str, query: str, long_history: str) -> str:
        """生成响应，结合新旧系统"""
        # 获取当前情绪状态
        current_state = self.emotion_system.get_current_emotion()
        
        # 获取最优响应
        optimal_response = self.emotion_system.get_optimal_response(current_state.emotion)
        
        if optimal_response:
            # 如果有历史最优响应，使用它
            return optimal_response
        else:
            # 否则使用LLM生成响应
            return self.llm_responder.respond(intent, you_name, query, long_history)
    
    def generate_emote(self, query: str) -> str:
        """生成表情，结合新旧系统"""
        # 使用轻量级系统分析
        emotion_state = self.emotion_system.update_emotion(query)
        
        # 使用LLM进行表情生成
        llm_emote = self.llm_emote.generation_emote(query)
        
        # 如果LLM生成的表情与系统分析一致，使用LLM的结果
        if llm_emote == emotion_state.emotion.value:
            return llm_emote
        
        # 否则使用系统分析的结果
        return emotion_state.emotion.value
    
    def get_emotion_state(self) -> dict:
        """获取当前情绪状态"""
        state = self.emotion_system.get_current_emotion()
        return {
            'emotion': state.emotion.value,
            'intensity': state.intensity,
            'last_update': state.last_update
        }
    
    def save_state(self) -> dict:
        """保存系统状态"""
        return self.emotion_system.to_dict()
    
    def load_state(self, state: dict):
        """加载系统状态"""
        self.emotion_system = EmotionSystem.from_dict(state)
    
    def update_user_preference(self, emotion: str, response: str, feedback: int):
        """更新用户偏好"""
        try:
            emotion_type = EmotionType(emotion)
            self.emotion_system.track_user_preference(emotion_type, response, feedback)
        except ValueError:
            logger.warning(f"Invalid emotion type: {emotion}") 