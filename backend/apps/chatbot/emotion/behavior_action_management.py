# 行为动作文件在 domain-vrm/public
# 可以从https://www.mixamo.com/下载


import random
import re
import logging
import os
import json
from typing import Dict, Optional
from ..llms.llm_model_strategy import LlmModelDriver
from openai import OpenAI

# 获取logger
logger = logging.getLogger(__name__)


class BehaviorActionMessage():
    '''行为消息体，用于控制模型的行为动作和表情'''
    emote: str
    action: str

    def __init__(self, emote: str, action: str) -> None:
        self.emote = emote
        self.action = action
        logger.debug(f"创建行为消息: emote={emote}, action={action}")

    def to_dict(self):
        return {
            "emote": self.emote,
            "action": self.action
        }


class IdleActionManagement():
    '''闲置动作控制管理'''
    idle_action: []
    emote: []

    def __init__(self) -> None:
        self.idle_action = [
            "standing_greeting",
            "idle_01",
            "idle_02",
            "idle_03",
            "idle_happy_01",
            "idle_happy_02",
            "idle_happy_03", 
            "thinking",
            "talking_01",
            "talking_02",
            "sitting"
        ]
        self.emote = ["neutral", "happy", "relaxed"]
        logger.info(f"IdleActionManagement初始化: {len(self.idle_action)}个动作, {len(self.emote)}个表情")

    def random_action(self) -> BehaviorActionMessage:
        # 使用random.choice()函数选择一个随机元素
        random_idle_action = random.choice(self.idle_action)
        random_emote = random.choice(self.emote)
        logger.info(f"生成随机动作: emote={random_emote}, action={random_idle_action}")
        return BehaviorActionMessage(random_emote, random_idle_action)


class IntentActionParser():
    '''意图动作解析器，使用阿里云意图理解模型'''
    
    def __init__(self, llm_model_driver: LlmModelDriver, llm_model_driver_type: str) -> None:
        self.llm_model_driver = llm_model_driver
        self.llm_model_driver_type = llm_model_driver_type
        
        # 是否启用阿里云百炼
        self.enable_bailian = False
        try:
            # 从环境变量中获取阿里云百炼API配置
            self.dashscope_api_key = os.environ.get("DASHSCOPE_API_KEY", "")
            # 如果配置了API密钥，则启用百炼
            if self.dashscope_api_key:
                self.enable_bailian = True
                # 初始化OpenAI客户端
                self.client = OpenAI(
                    api_key=self.dashscope_api_key,
                    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
                )
                logger.info("已配置阿里云百炼API，将优先使用百炼意图理解")
        except Exception as e:
            logger.error(f"初始化阿里云百炼配置失败: {str(e)}")
            self.enable_bailian = False
        
        # 动作意图映射
        self.intent_action_map = {
            "思考": "thinking",
            "打招呼": "standing_greeting",
            "坐下": "sitting",
            "站立": "standing_greeting",
            "高兴": "idle_happy_03",
            "说话": "talking_01",
            "跳舞": "silly_dancing",
            "舞蹈": "silly_dancing",
            "伦巴": "rumba_dancing",
            "街舞": "bboy_hip_hop",
            "嘻哈": "bboy_hip_hop",
            "旋转": "flair",
            "爵士": "jazz_dancing",
            "芭蕾": "ballet_dancing",
            "拉丁": "latin_dance",
            "探戈": "tango_dancing",
            "华尔兹": "waltz_dancing",
            "现代舞": "contemporary_dance",
            "机械舞": "robot_dance",
            "摇摆舞": "swing_dance",
            "民族舞": "folk_dance",
            "踢踏舞": "tap_dance",
            "僵尸舞": "zombie_dancing",
            "杰克逊的经典舞蹈": "zombie_dancing",
        }
        
        # 表情意图映射
        self.intent_emotion_map = {
            "高兴": "happy",
            "放松": "relaxed",
            "思考": "neutral",
            "愤怒": "angry",
            "惊讶": "surprised",
            "害羞": "shy",
            "兴奋": "excited"
        }
        
        # 定义工具
        self.tools = [
            {
                "name": "detect_action_intent",
                "description": "检测用户输入中的动作意图，如思考、打招呼、坐下、站立、说话、跳舞等。包括各类舞蹈动作：伦巴、街舞、爵士、芭蕾、拉丁、探戈、华尔兹、现代舞、机械舞、摇摆舞、民族舞、踢踏舞、僵尸舞、杰克逊的经典舞蹈等。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action_intent": {
                            "type": "string",
                            "description": "检测到的动作意图，包括：思考、打招呼、坐下、站立、高兴、说话、跳舞、伦巴、街舞、嘻哈、旋转、爵士、芭蕾、拉丁、探戈、华尔兹、现代舞、机械舞、摇摆舞、民族舞、踢踏舞、僵尸舞、杰克逊的经典舞蹈等。",
                        }
                    },
                    "required": ["action_intent"]
                }
            },
            {
                "name": "detect_emotion_intent",
                "description": "检测用户输入中的表情意图，如高兴、放松、思考、愤怒、惊讶、害羞、兴奋等。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "emotion_intent": {
                            "type": "string",
                            "description": "检测到的表情意图，如高兴、放松、思考、愤怒、惊讶、害羞、兴奋等。",
                        }
                    },
                    "required": ["emotion_intent"]
                }
            }
        ]

    def parse_intent(self, text: str) -> Dict[str, str]:
        """解析意图，根据配置使用不同的解析方式"""
        if self.enable_bailian:
            # 使用阿里云百炼API解析意图
            return self._parse_intent_with_bailian(text)
        else:
            # 使用LLM模型解析意图
            return self._parse_intent_with_llm(text)
    
    def _parse_intent_with_bailian(self, text: str) -> Dict[str, str]:
        """使用阿里云百炼API解析意图"""
        try:
            logger.info("使用阿里云百炼解析意图")
            
            # 构建系统提示词
            tools_string = json.dumps(self.tools, ensure_ascii=False)
            system_prompt = f"""你是一个意图理解AI助手，需要从用户输入中识别出动作和表情意图。
            你可以调用工具来辅助理解意图。可用工具如下:
            {tools_string}
            
            动作意图可以包括：思考、打招呼、坐下、站立、高兴、说话、跳舞、伦巴、街舞、嘻哈、旋转、爵士、芭蕾、拉丁、探戈、华尔兹、现代舞、机械舞、摇摆舞、民族舞、踢踏舞等。
            表情意图可以包括：高兴、放松、思考、愤怒、惊讶、害羞、兴奋等。
            
            注意：如果用户提到具体的舞蹈类型（如街舞、芭蕾等），优先返回具体的舞蹈类型，而不是泛泛的"跳舞"。例如，当用户说"跳街舞"时，应返回"街舞"而不是"跳舞"。
            
            Response in INTENT_MODE."""
            
            # 先检查文本是否包含具体舞蹈类型的关键词
            # 按照关键词长度排序，优先匹配更长的关键词，避免部分匹配
            sorted_dance_types = sorted(
                [k for k in self.intent_action_map.keys() if k != "跳舞" and k != "舞蹈"],
                key=len,
                reverse=True
            )
            
            direct_match = None
            for dance_type in sorted_dance_types:
                if dance_type in text:
                    direct_match = dance_type
                    logger.info(f"直接匹配到舞蹈类型: {dance_type}")
                    break
                    
            # 如果直接匹配到了具体舞蹈类型，优先使用
            if direct_match:
                logger.info(f"优先使用直接匹配的舞蹈类型: {direct_match}")
                return {
                    "action_intent": direct_match,
                    "emotion_intent": ""
                }
            
            # 构建消息
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ]
            
            # 调用百炼API
            response = self.client.chat.completions.create(
                model="tongyi-intent-detect-v3",
                messages=messages,
                temperature=0.1
            )
            
            # 解析响应
            result = response.choices[0].message.content
            logger.debug(f"百炼API原始响应: {result}")
            
            # 解析结果
            action_intent = ""
            emotion_intent = ""
            
            # 尝试从结果中提取意图
            if "detect_action_intent" in result:
                # 提取 action_intent
                action_match = re.search(r'"action_intent"\s*:\s*"([^"]+)"', result)
                if action_match:
                    action_intent = action_match.group(1)
            
            if "detect_emotion_intent" in result:
                # 提取 emotion_intent
                emotion_match = re.search(r'"emotion_intent"\s*:\s*"([^"]+)"', result)
                if emotion_match:
                    emotion_intent = emotion_match.group(1)
            
            logger.info(f"百炼API解析结果: action_intent={action_intent}, emotion_intent={emotion_intent}")
            return {
                "action_intent": action_intent,
                "emotion_intent": emotion_intent
            }
                
        except Exception as e:
            logger.error(f"使用阿里云百炼解析意图失败: {str(e)}")
            # 出错时回退到LLM解析
            return self._parse_intent_with_llm(text)

    def _parse_intent_with_llm(self, text: str) -> Dict[str, str]:
        """使用LLM模型解析意图"""
        try:
            logger.info("使用LLM模型解析意图")
            prompt = self.intent_prompt + f"\n用户输入: {text}"
            result = self.llm_model_driver.chat(
                prompt=prompt,
                type=self.llm_model_driver_type,
                role_name="",
                you_name="",
                query="",
                short_history=[],
                long_history=""
            )
            
            # 解析JSON结果
            import json
            start_idx = result.find('{')
            end_idx = result.rfind('}')
            if start_idx != -1 and end_idx != -1:
                json_str = result[start_idx:end_idx + 1]
                intent_data = json.loads(json_str)
                return {
                    "action_intent": intent_data.get("action_intent", ""),
                    "emotion_intent": intent_data.get("emotion_intent", "")
                }
            return {"action_intent": "", "emotion_intent": ""}
        except Exception as e:
            logger.error(f"意图解析失败: {str(e)}")
            return {"action_intent": "", "emotion_intent": ""}

    def map_intent_to_action(self, action_intent: str, emotion_intent: str) -> BehaviorActionMessage:
        """将意图映射到具体的动作和表情"""
        # 默认值
        action = "idle_01"
        emotion = "neutral"
        
        # 映射动作
        if action_intent in self.intent_action_map:
            action = self.intent_action_map[action_intent]
            
        # 映射表情
        if emotion_intent in self.intent_emotion_map:
            emotion = self.intent_emotion_map[emotion_intent]
            
        return BehaviorActionMessage(emotion, action)


class ChatActionParser():
    '''聊天动作解析器，从AI聊天内容中解析动作指令'''
    
    def __init__(self, llm_model_driver: LlmModelDriver, llm_model_driver_type: str) -> None:
        self.intent_parser = IntentActionParser(llm_model_driver, llm_model_driver_type)
        
        # 保留原有的关键词映射作为备选
        self.action_map = {
            "思考": "thinking",
            "想一想": "thinking",
            "思索": "thinking",
            "让我想想": "thinking",
            "我在想": "thinking",
            "点头": "idle_happy_01",
            "摇头": "idle_happy_02",
            "挥手": "standing_greeting",
            "打招呼": "standing_greeting",
            "问候": "standing_greeting",
            "你好": "standing_greeting",
            "欢迎": "standing_greeting",
            "坐下": "sitting",
            "坐一坐": "sitting",
            "休息": "sitting",
            "坐着": "sitting",
            "坐": "sitting",
            "站起来": "standing_greeting",
            "站起": "standing_greeting",
            "起身": "standing_greeting",
            "站着": "standing_greeting",
            "站立": "standing_greeting",
            "高兴": "idle_happy_03",
            "开心": "idle_happy_03",
            "笑": "idle_happy_03",
            "微笑": "idle_happy_02",
            "说话": "talking_01",
            "讲话": "talking_02",
            "聊天": "talking_01",
            "兴奋": "excited",
            "激动": "excited",
            "愤怒": "angry",
            "生气": "angry",
            "发怒": "angry",
            "跳舞": "silly_dancing",
            "舞蹈": "silly_dancing",
            "伦巴": "rumba_dancing",
            "街舞": "bboy_hip_hop",
            "嘻哈": "bboy_hip_hop",
            "僵尸舞": "zombie_dancing",
            "杰克逊的经典舞蹈": "zombie_dancing",
            "旋转": "flair",
            "爵士": "jazz_dancing",
            "爵士舞": "jazz_dancing",
            "芭蕾": "ballet_dancing",
            "芭蕾舞": "ballet_dancing",
            "拉丁": "latin_dance",
            "拉丁舞": "latin_dance",
            "探戈": "tango_dancing",
            "华尔兹": "waltz_dancing",
            "现代舞": "contemporary_dance",
            "机械舞": "robot_dance",
            "摇摆": "swing_dance",
            "摇摆舞": "swing_dance",
            "民族舞": "folk_dance",
            "踢踏舞": "tap_dance"
        }
        
        self.emotion_map = {
            "高兴": "happy",
            "开心": "happy",
            "激动": "happy",
            "兴奋": "happy",
            "欢喜": "happy",
            "笑": "happy",
            "放松": "relaxed",
            "平静": "relaxed",
            "平和": "relaxed",
            "舒适": "relaxed",
            "思考": "neutral",
            "正常": "neutral",
            "普通": "neutral",
            "愤怒": "angry",
            "生气": "angry",
            "发怒": "angry",
            "惊讶": "surprised",
            "吃惊": "surprised",
            "震惊": "surprised",
            "害羞": "shy",
            "羞涩": "shy",
            "腼腆": "shy"
        }

    @staticmethod
    def _find_keyword_in_text(text, keyword_map):
        """在文本中查找关键词"""
        for keyword, mapped_value in keyword_map.items():
            if keyword in text:
                return keyword, mapped_value
        return None, None

    def parse_action(self, text: str) -> BehaviorActionMessage:
        """从文本中解析动作和表情"""
        logger.info(f"开始解析文本中的动作和表情: text='{text}'")
        
        # 先检查是否包含具体舞蹈类型的关键词
        dance_keywords = []
        for keyword in self.action_map.keys():
            if "舞" in keyword or keyword in ["伦巴", "探戈", "嘻哈"]:
                dance_keywords.append(keyword)
        
        # 按长度排序，优先匹配更长的关键词
        dance_keywords = sorted(dance_keywords, key=len, reverse=True)
        
        # 直接匹配舞蹈类型
        for dance_keyword in dance_keywords:
            if dance_keyword in text:
                action = self.action_map[dance_keyword]
                emotion = "happy"  # 跳舞时通常是开心的表情
                logger.info(f"直接匹配到舞蹈类型: '{dance_keyword}' -> 动作: '{action}', 表情: '{emotion}'")
                return BehaviorActionMessage(emotion, action)
        
        # 如果没有直接匹配到舞蹈类型，则使用意图理解模型
        intents = self.intent_parser.parse_intent(text)
        if intents["action_intent"] or intents["emotion_intent"]:
            logger.info(f"意图理解结果: action_intent={intents['action_intent']}, emotion_intent={intents['emotion_intent']}")
            return self.intent_parser.map_intent_to_action(intents["action_intent"], intents["emotion_intent"])
            
        # 如果意图理解失败，回退到关键词匹配
        action = "idle_01"
        emotion = "neutral"
        
        found_keyword, found_action = self._find_keyword_in_text(text, self.action_map)
        if found_keyword:
            action = found_action
            logger.info(f"找到动作关键词: '{found_keyword}' -> 动作: '{found_action}'")
            
        found_keyword, found_emotion = self._find_keyword_in_text(text, self.emotion_map)
        if found_keyword:
            emotion = found_emotion
            logger.info(f"找到表情关键词: '{found_keyword}' -> 表情: '{found_emotion}'")
            
        logger.info(f"解析结果: action='{action}', emotion='{emotion}'")
        return BehaviorActionMessage(emotion, action)

    def parse_action_command(self, text: str) -> BehaviorActionMessage:
        """解析特定格式的动作命令"""
        logger.info(f"开始解析动作命令: text='{text}'")
        
        # 先检查是否包含具体舞蹈类型的关键词
        dance_keywords = []
        for keyword in self.action_map.keys():
            if "舞" in keyword or keyword in ["伦巴", "探戈", "嘻哈"]:
                dance_keywords.append(keyword)
        
        # 按长度排序，优先匹配更长的关键词
        dance_keywords = sorted(dance_keywords, key=len, reverse=True)
        
        # 直接匹配舞蹈类型
        for dance_keyword in dance_keywords:
            if dance_keyword in text:
                action = self.action_map[dance_keyword]
                emotion = "happy"  # 跳舞时通常是开心的表情
                logger.info(f"直接匹配到舞蹈类型: '{dance_keyword}' -> 动作: '{action}', 表情: '{emotion}'")
                return BehaviorActionMessage(emotion, action)
        
        # 尝试多种格式匹配
        pattern1 = r'\[动作:([\w\d_]+),表情:([\w\d_]+)\]'
        match1 = re.search(pattern1, text)
        if match1:
            action = match1.group(1)
            emotion = match1.group(2)
            logger.info(f"匹配到格式1 [动作:xxx,表情:yyy]: action='{action}', emotion='{emotion}'")
            return BehaviorActionMessage(emotion, action)
            
        pattern2 = r'\[(.*?)\]'
        matches = re.findall(pattern2, text)
        if matches:
            for match in matches:
                found_keyword, found_action = self._find_keyword_in_text(match, self.action_map)
                if found_keyword:
                    emotion = "neutral"
                    found_emo_keyword, found_emo = self._find_keyword_in_text(match, self.emotion_map)
                    if found_emo_keyword:
                        emotion = found_emo
                    return BehaviorActionMessage(emotion, found_action)
                    
        # 如果没有匹配特定格式，则使用意图理解或关键词解析
        return self.parse_action(text)
    



