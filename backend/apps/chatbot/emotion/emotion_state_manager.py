import logging
from typing import Optional
from ..models import EmotionStateModel
from .emotion_system import EmotionSystem

logger = logging.getLogger(__name__)

class EmotionStateManager:
    """情感状态管理器，处理持久化存储"""
    
    def __init__(self, user_id: int, role_id: int):
        self.user_id = user_id
        self.role_id = role_id
        self.emotion_system = EmotionSystem()
        self._load_state()
    
    def _load_state(self):
        """从数据库加载状态"""
        try:
            state_model = EmotionStateModel.get_or_create_state(self.user_id, self.role_id)
            state_data = state_model.get_emotion_state()
            if state_data:
                self.emotion_system = EmotionSystem.from_dict(state_data)
        except Exception as e:
            logger.error(f"加载情感状态失败: {str(e)}")
    
    def _save_state(self):
        """保存状态到数据库"""
        try:
            state_model = EmotionStateModel.get_or_create_state(self.user_id, self.role_id)
            state_data = self.emotion_system.to_dict()
            state_model.set_emotion_state(state_data)
        except Exception as e:
            logger.error(f"保存情感状态失败: {str(e)}")
    
    def update_emotion(self, text: str):
        """更新情绪状态"""
        self.emotion_system.update_emotion(text)
        self._save_state()
    
    def get_current_emotion(self):
        """获取当前情绪状态"""
        return self.emotion_system.get_current_emotion()
    
    def track_user_preference(self, emotion: str, response: str, feedback: int):
        """跟踪用户偏好"""
        self.emotion_system.track_user_preference(emotion, response, feedback)
        self._save_state()
    
    def get_optimal_response(self, emotion: str) -> Optional[str]:
        """获取最优响应"""
        return self.emotion_system.get_optimal_response(emotion)
    
    def analyze_text(self, text: str):
        """分析文本情绪"""
        return self.emotion_system.analyze_text(text)
    
    @classmethod
    def get_manager(cls, user_id: int, role_id: int) -> 'EmotionStateManager':
        """获取或创建情感状态管理器"""
        return cls(user_id, role_id) 