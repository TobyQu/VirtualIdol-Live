import json
import logging
import time
import re
from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class EmotionType(Enum):
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    FEARFUL = "fearful"
    DISGUSTED = "disgusted"
    SURPRISED = "surprised"
    NEUTRAL = "neutral"

@dataclass
class EmotionState:
    emotion: EmotionType
    intensity: float
    last_update: float

class EmotionSystem:
    """轻量级情感系统"""
    
    def __init__(self):
        # 情绪关键词和权重
        self.emotion_keywords = {
            EmotionType.HAPPY: {
                'keywords': ['开心', '高兴', '快乐', '喜欢', '好', '棒', '赞'],
                'weight': 1.0
            },
            EmotionType.SAD: {
                'keywords': ['难过', '伤心', '失望', '痛苦', '哭', '难受'],
                'weight': 1.0
            },
            EmotionType.ANGRY: {
                'keywords': ['生气', '愤怒', '恼火', '讨厌', '烦', '气'],
                'weight': 1.0
            },
            EmotionType.FEARFUL: {
                'keywords': ['害怕', '担心', '恐惧', '紧张', '慌'],
                'weight': 1.0
            },
            EmotionType.DISGUSTED: {
                'keywords': ['恶心', '厌恶', '反感', '讨厌', '烦'],
                'weight': 1.0
            },
            EmotionType.SURPRISED: {
                'keywords': ['惊讶', '惊喜', '意外', '震惊', '哇'],
                'weight': 1.0
            }
        }
        
        # 情绪状态
        self.current_state = EmotionState(
            emotion=EmotionType.NEUTRAL,
            intensity=0.5,
            last_update=time.time()
        )
        
        # 用户偏好
        self.user_preferences = {
            'emotion_responses': {},
            'interaction_patterns': {}
        }
        
        # 情绪转换规则
        self.transition_rules = {
            (EmotionType.HAPPY, EmotionType.SAD): 0.3,
            (EmotionType.SAD, EmotionType.HAPPY): 0.4,
            (EmotionType.ANGRY, EmotionType.NEUTRAL): 0.5,
            (EmotionType.FEARFUL, EmotionType.NEUTRAL): 0.6,
            (EmotionType.DISGUSTED, EmotionType.NEUTRAL): 0.5,
            (EmotionType.SURPRISED, EmotionType.NEUTRAL): 0.7
        }
    
    def analyze_text(self, text: str) -> Dict[EmotionType, float]:
        """分析文本中的情绪"""
        scores = {emotion: 0.0 for emotion in EmotionType}
        
        for emotion, data in self.emotion_keywords.items():
            for keyword in data['keywords']:
                if keyword in text:
                    scores[emotion] += data['weight']
        
        # 归一化分数
        total_score = sum(scores.values())
        if total_score > 0:
            scores = {k: v/total_score for k, v in scores.items()}
        
        return scores
    
    def update_emotion(self, text: str) -> EmotionState:
        """更新当前情绪状态"""
        scores = self.analyze_text(text)
        
        # 获取最高分的情绪
        max_emotion = max(scores.items(), key=lambda x: x[1])
        
        # 计算情绪强度
        intensity = max_emotion[1]
        
        # 应用情绪转换规则
        if self.current_state.emotion != max_emotion[0]:
            transition_key = (self.current_state.emotion, max_emotion[0])
            if transition_key in self.transition_rules:
                intensity *= self.transition_rules[transition_key]
        
        # 更新状态
        self.current_state = EmotionState(
            emotion=max_emotion[0],
            intensity=intensity,
            last_update=time.time()
        )
        
        return self.current_state
    
    def get_current_emotion(self) -> EmotionState:
        """获取当前情绪状态"""
        # 应用情绪衰减
        time_diff = time.time() - self.current_state.last_update
        decay_rate = 0.1  # 每秒衰减率
        decayed_intensity = max(0, self.current_state.intensity - time_diff * decay_rate)
        
        if decayed_intensity < 0.1:
            return EmotionState(
                emotion=EmotionType.NEUTRAL,
                intensity=0.5,
                last_update=time.time()
            )
        
        return self.current_state
    
    def track_user_preference(self, emotion: EmotionType, response: str, feedback: int):
        """跟踪用户偏好"""
        if emotion not in self.user_preferences['emotion_responses']:
            self.user_preferences['emotion_responses'][emotion] = {}
        
        if response not in self.user_preferences['emotion_responses'][emotion]:
            self.user_preferences['emotion_responses'][emotion][response] = {
                'count': 0,
                'total_score': 0
            }
        
        self.user_preferences['emotion_responses'][emotion][response]['count'] += 1
        self.user_preferences['emotion_responses'][emotion][response]['total_score'] += feedback
    
    def get_optimal_response(self, emotion: EmotionType) -> Optional[str]:
        """获取最优响应"""
        if emotion not in self.user_preferences['emotion_responses']:
            return None
        
        responses = self.user_preferences['emotion_responses'][emotion]
        if not responses:
            return None
        
        return max(responses.items(), 
                  key=lambda x: x[1]['total_score'] / x[1]['count'])[0]
    
    def to_dict(self) -> dict:
        """转换为字典格式"""
        return {
            'current_state': {
                'emotion': self.current_state.emotion.value,
                'intensity': self.current_state.intensity,
                'last_update': self.current_state.last_update
            },
            'user_preferences': self.user_preferences
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'EmotionSystem':
        """从字典创建实例"""
        system = cls()
        if 'current_state' in data:
            system.current_state = EmotionState(
                emotion=EmotionType(data['current_state']['emotion']),
                intensity=data['current_state']['intensity'],
                last_update=data['current_state']['last_update']
            )
        if 'user_preferences' in data:
            system.user_preferences = data['user_preferences']
        return system 