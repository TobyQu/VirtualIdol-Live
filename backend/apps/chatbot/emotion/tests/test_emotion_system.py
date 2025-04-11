import unittest
import time
from ..emotion_system import EmotionSystem, EmotionType
from ..emotion_adapter import EmotionAdapter

class TestEmotionSystem(unittest.TestCase):
    def setUp(self):
        self.system = EmotionSystem()
    
    def test_analyze_text(self):
        # 测试开心情绪
        scores = self.system.analyze_text("我今天很开心，太棒了！")
        self.assertGreater(scores[EmotionType.HAPPY], 0)
        
        # 测试悲伤情绪
        scores = self.system.analyze_text("我很难过，想哭")
        self.assertGreater(scores[EmotionType.SAD], 0)
        
        # 测试愤怒情绪
        scores = self.system.analyze_text("我生气了，很烦")
        self.assertGreater(scores[EmotionType.ANGRY], 0)
    
    def test_update_emotion(self):
        # 测试情绪更新
        state = self.system.update_emotion("我很开心！")
        self.assertEqual(state.emotion, EmotionType.HAPPY)
        self.assertGreater(state.intensity, 0)
        
        # 测试情绪转换
        state = self.system.update_emotion("我很难过")
        self.assertEqual(state.emotion, EmotionType.SAD)
        self.assertLess(state.intensity, 1.0)  # 由于转换规则，强度应该降低
    
    def test_emotion_decay(self):
        # 设置一个非中性情绪
        self.system.update_emotion("我很开心！")
        
        # 等待一段时间
        time.sleep(2)
        
        # 获取当前情绪
        state = self.system.get_current_emotion()
        self.assertLess(state.intensity, 1.0)  # 强度应该衰减
    
    def test_user_preferences(self):
        # 测试偏好跟踪
        self.system.track_user_preference(EmotionType.HAPPY, "好的，我理解", 1)
        self.system.track_user_preference(EmotionType.HAPPY, "好的，我理解", 1)
        self.system.track_user_preference(EmotionType.HAPPY, "我明白了", 0)
        
        # 获取最优响应
        response = self.system.get_optimal_response(EmotionType.HAPPY)
        self.assertEqual(response, "好的，我理解")
    
    def test_state_persistence(self):
        # 设置一些状态
        self.system.update_emotion("我很开心！")
        self.system.track_user_preference(EmotionType.HAPPY, "好的", 1)
        
        # 保存状态
        state = self.system.to_dict()
        
        # 创建新系统并加载状态
        new_system = EmotionSystem.from_dict(state)
        
        # 验证状态
        self.assertEqual(new_system.current_state.emotion, EmotionType.HAPPY)
        self.assertIn("好的", new_system.user_preferences['emotion_responses'][EmotionType.HAPPY])

class TestEmotionAdapter(unittest.TestCase):
    def setUp(self):
        # 模拟LLM驱动
        class MockLLMDriver:
            def chat(self, *args, **kwargs):
                return '{"intent": "test_intent", "respond": "test_response", "emote": "happy"}'
        
        self.adapter = EmotionAdapter(MockLLMDriver(), "mock")
    
    def test_recognize_emotion(self):
        intent = self.adapter.recognize_emotion("user", "我很开心！")
        self.assertEqual(intent, "test_intent")
    
    def test_generate_response(self):
        response = self.adapter.generate_response("test_intent", "user", "我很开心！", "")
        self.assertEqual(response, "test_response")
    
    def test_generate_emote(self):
        emote = self.adapter.generate_emote("我很开心！")
        self.assertEqual(emote, "happy")
    
    def test_state_management(self):
        # 测试状态保存和加载
        state = self.adapter.save_state()
        self.adapter.load_state(state)
        
        # 验证状态
        current_state = self.adapter.get_emotion_state()
        self.assertIn('emotion', current_state)
        self.assertIn('intensity', current_state)
        self.assertIn('last_update', current_state)

if __name__ == '__main__':
    unittest.main() 