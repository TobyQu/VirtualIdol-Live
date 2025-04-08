from abc import ABC, abstractmethod
import logging
import os
from .minimax_tts import MinimaxTTS, minimax_voices, EMOTIONS

logger = logging.getLogger(__name__)


class BaseTTS(ABC):
    '''合成语音统一抽象类'''

    @abstractmethod
    def synthesis(self, text: str, voice_id: str, **kwargs) -> str:
        '''合成语音'''
        pass

    @abstractmethod
    def get_voices(self, limit=30) -> list[dict[str, str]]:
        '''获取声音列表'''
        pass


class MinimaxTTSWrapper(BaseTTS):
    '''Minimax TTS包装类'''
    client: MinimaxTTS

    def __init__(self):
        self.client = MinimaxTTS()

    def synthesis(self, text: str, voice_id: str, **kwargs) -> str:
        emotion = kwargs.get("emotion", "neutral")
        stream = kwargs.get("stream", False)
        return self.client.create_audio(text=text, voice_id=voice_id, emotion=emotion, stream=stream)

    def get_voices(self, limit=30) -> list[dict[str, str]]:
        return minimax_voices[:limit]


class TTSDriver:
    '''TTS驱动类'''

    def __init__(self):
        self.minimax_tts = MinimaxTTSWrapper()
        self.tts_map = {
            "minimax": self.minimax_tts
        }

    def synthesis(self, text: str, tts_type: str, voice_id: str, **kwargs) -> str:
        logger.info(f"Synthesis text={text}, tts_type={tts_type}, voice_id={voice_id}, kwargs={kwargs}")
        
        try:
            # 检查TTS类型是否存在
            if tts_type not in self.tts_map:
                logger.warning(f"不支持的TTS类型: {tts_type}，强制使用minimax")
                tts_type = "minimax"
                
            tts = self.tts_map[tts_type]
            
            # 调用对应的TTS合成
            result = tts.synthesis(text, voice_id, **kwargs)
            
            # 记录结果类型以便调试
            if isinstance(result, bytes):
                logger.info(f"Synthesis result type: bytes, size: {len(result)} bytes")
            else:
                logger.info(f"Synthesis result type: {type(result)}")
                
            return result
        except Exception as e:
            logger.error(f"语音合成错误: {str(e)}")
            return None

    def get_voices(self, tts_type: str = None) -> dict[str, list[dict[str, str]]]:
        try:
            result = {}
            
            if tts_type is None or tts_type not in self.tts_map:
                # 获取所有TTS类型的语音 (实际只有minimax)
                for key, tts in self.tts_map.items():
                    result[key] = tts.get_voices()
            else:
                # 获取指定TTS类型的语音
                result[tts_type] = self.tts_map[tts_type].get_voices()
                
            return result
        except Exception as e:
            logger.error(f"获取语音列表错误: {str(e)}")
            return {}
    
    def get_emotions(self) -> list[str]:
        """获取支持的情绪列表"""
        return EMOTIONS
