import json
import logging
import traceback
from typing import Any, Dict, List

# 使用接口模块中的接口
from ..config.interfaces import SysConfigInterface

from .faiss.faiss_storage_impl import FAISSStorage
from .local.local_storage_impl import LocalStorage
from ..utils.snowflake_utils import SnowFlake

logger = logging.getLogger(__name__)


class MemoryStorageDriver:
    sys_config: SysConfigInterface  # 使用接口定义
    short_memory_storage: LocalStorage
    long_memory_storage: FAISSStorage
    snow_flake: SnowFlake = SnowFlake(data_center_id=5, worker_id=5)

    def __init__(self, memory_storage_config: dict[str, str], sys_config: SysConfigInterface) -> None:
        # 使用接口类型
        self.sys_config = sys_config
        
        # 初始化雪花ID生成器
        self.snow_flake = SnowFlake(data_center_id=5, worker_id=5)
        
        # 初始化短期记忆存储
        try:
            self.short_memory_storage = LocalStorage(memory_storage_config)
            logger.info("短期记忆存储初始化成功")
        except Exception as short_err:
            logger.error(f"短期记忆存储初始化失败: {str(short_err)}")
            # 创建一个空的存储对象，避免空引用
            from types import SimpleNamespace
            self.short_memory_storage = SimpleNamespace()
            self.short_memory_storage.pageQuery = lambda *args, **kwargs: []
            self.short_memory_storage.save = lambda *args, **kwargs: False
            self.short_memory_storage.clear = lambda *args, **kwargs: False
        
        # 长期记忆存储初始化
        self.long_memory_storage = None
        if sys_config.enable_longMemory:
            try:
                self.long_memory_storage = FAISSStorage(memory_storage_config)
                logger.info("长期记忆存储初始化成功")
            except Exception as e:
                logger.error(f"长期记忆存储初始化失败: {str(e)}")
                stack_trace = traceback.format_exc()
                logger.error(f"详细错误信息: {stack_trace}")
                # 禁用长期记忆功能
                sys_config.enable_longMemory = False
                logger.warning("由于初始化失败，长期记忆功能已禁用")

    def search_short_memory(self, query_text: str, you_name: str, role_name: str) -> list[Dict[str, str]]:
        """查询短期记忆"""
        try:
            # 使用更新后的参数调用search方法
            local_memory = self.short_memory_storage.pageQuery(
                page_num=1, 
                page_size=self.sys_config.local_memory_num
            )
            
            # 转换为字典列表
            dict_list = []
            for json_string in local_memory:
                try:
                    json_dict = json.loads(json_string)
                    dict_list.append(json_dict)
                except json.JSONDecodeError:
                    logger.warning(f"无法解析JSON字符串: {json_string}")
                    
            return dict_list
            
        except Exception as e:
            logger.error(f"查询短期记忆失败: {str(e)}")
            return []

    def search_lang_memory(self, prompt: str, you_name: str, role_name: str, max_length: int = 800) -> str:
        """查询长期记忆"""
        # 检查长期记忆是否启用
        if not self.sys_config.enable_longMemory:
            logger.debug("长期记忆功能未启用")
            return ""
            
        if not prompt:
            logger.debug("提示词为空，跳过长期记忆检索")
            return ""
            
        if not hasattr(self, 'long_memory_storage') or self.long_memory_storage is None:
            logger.warning("长期记忆存储未初始化")
            return ""
        
        try:
            # 查询长期记忆 - 使用修改后的参数列表
            memories_result = self.long_memory_storage.search(
                query_text=prompt,
                limit=self.sys_config.search_memory_size
            )
            
            # 日志记录
            memory_count = len(memories_result) if memories_result else 0
            if memory_count > 0:
                logger.info(f"为提示词找到 {memory_count} 条长期记忆")
            else:
                logger.debug("未找到相关长期记忆")
                return ""
            
            # 格式化记忆用于提示
            lang_memories_text = ""
            total_length = 0
            
            for memory in memories_result:
                memory_text = f"回忆: {memory}\n"
                memory_length = len(memory_text)
                
                # 检查是否会超过最大长度
                if total_length + memory_length > max_length:
                    logger.debug(f"达到最大长度限制({max_length})，停止添加更多记忆")
                    break
                    
                lang_memories_text += memory_text
                total_length += memory_length
            
            if total_length > 0:
                logger.info(f"最终返回的长期记忆长度: {total_length}")
            
            return lang_memories_text
            
        except Exception as e:
            # 增强错误处理，避免因搜索失败而影响整个对话流程
            stack_trace = traceback.format_exc()
            logger.error(f"长期记忆搜索失败: {str(e)}\n{stack_trace}")
            return ""  # 返回空字符串，不影响主对话流程

    def save(self, you_name: str, query_text: str, role_name: str, answer_text: str) -> None:
        """保存对话记忆"""
        try:
            # 存储短期记忆
            pk = self.get_current_entity_id()
            local_history = {
                "ai": self.__format_role_history(role_name=role_name, answer_text=answer_text),
                "human": self.__format_you_history(you_name=you_name, query_text=query_text)
            }
            
            # 使用命名参数调用短期记忆存储
            self.short_memory_storage.save(
                text=json.dumps(local_history),
                sender=you_name,
                owner=role_name,
                importance_score=1
            )

            # 是否开启长期记忆
            if self.sys_config.enable_longMemory and hasattr(self, 'long_memory_storage') and self.long_memory_storage is not None:
                try:
                    # 将当前对话语句生成摘要
                    history = self.format_history(
                        you_name=you_name, query_text=query_text, role_name=role_name, answer_text=answer_text)
                    importance_score = 3
                    if self.sys_config.enable_summary:
                        memory_summary = MemorySummary(self.sys_config)
                        history = memory_summary.summary(
                            llm_model_type=self.sys_config.summary_llm_model_driver_type, input=history)
                        # 计算记忆的重要程度
                        memory_importance = MemoryImportance(self.sys_config)
                        importance_score = memory_importance.importance(
                            self.sys_config.summary_llm_model_driver_type, input=history)
                    
                    # 使用更新后的参数列表调用save方法
                    self.long_memory_storage.save(
                        text=history,
                        sender=you_name,
                        owner=role_name,
                        importance_score=importance_score
                    )
                except Exception as e:
                    stack_trace = traceback.format_exc()
                    logger.error(f"保存长期记忆失败: {str(e)}")
                    logger.error(f"详细错误信息: {stack_trace}")
                    # 确保错误不会阻止系统运行
        except Exception as e:
            logger.error(f"保存对话记忆失败: {str(e)}")

    def format_history(self, you_name: str, query_text: str, role_name: str, answer_text: str):
        you_history = self.__format_you_history(
            you_name=you_name, query_text=query_text)
        role_history = self.__format_role_history(
            role_name=role_name, answer_text=answer_text)
        chat_history = you_history + ';' + role_history
        return chat_history

    def __format_you_history(self, you_name: str, query_text: str):
        you_history = f"{you_name}说{query_text}"
        return you_history

    def __format_role_history(self, role_name: str, answer_text: str):
        role_history = f"{role_name}说{answer_text}"
        return role_history

    def get_current_entity_id(self) -> int:
        '''生成唯一标识'''
        return self.snow_flake.task()

    def clear(self, owner: str) -> None:
        self.long_memory_storage.clear(owner)
        self.short_memory_storage.clear(owner)


class MemorySummary:
    sys_config: SysConfigInterface  # 使用接口定义
    prompt: str

    def __init__(self, sys_config: SysConfigInterface) -> None:
        self.sys_config = sys_config
        self.prompt = '''
               <s>[INST] <<SYS>>          
                Please help me extract key information about the content of the conversation, here is an example of extracting key information:
                input:"alan说你好，爱莉，很高兴认识你，我是一名程序员，我喜欢吃川菜，;爱莉说我们是兼容的
                output:{"summary"："alan向爱莉表示自己是一名程序员，alan喜欢吃川菜，爱莉认为和alan是兼容的"}
                Please export the conversation summary in Chinese.
                Please use JSON format strictly and output the result:
                {"Summary": "A summary of the conversation you generated"}
                <</SYS>>
        '''

    def summary(self, llm_model_type: str, input: str) -> str:
        try:
            # 限制输入长度，避免超出模型处理能力
            max_length = 2000  # 明确定义最大长度
            if len(input) > max_length:
                logger.info(f"输入长度超过{max_length}，进行截断：{len(input)} -> {max_length}")
                input = input[:max_length]
            
            result = self.sys_config.llm_model_driver.chat(
                prompt=self.prompt, 
                type=llm_model_type, 
                role_name="",
                you_name="", 
                query=f"input:{input}", 
                short_history=[],
                long_history=""
            )
            
            logger.debug(f"=> summary: {result}")
            summary = input
            
            if result:
                # 寻找 JSON 子串的开始和结束位置
                start_idx = result.find('{')
                end_idx = result.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    json_str = result[start_idx:end_idx + 1]
                    try:
                        json_data = json.loads(json_str)
                        summary = json_data["Summary"]
                    except json.JSONDecodeError as e:
                        logger.warning(f"JSON解析错误: {str(e)}, 使用原始输入作为摘要")
                else:
                    logger.warning("未找到匹配的JSON字符串，使用原始输入作为摘要")
            
            return summary
        except Exception as e:
            logger.error(f"生成摘要时出错: {str(e)}", exc_info=True)
            # 出错时返回原始输入作为摘要
            return input


class MemoryImportance:
    sys_config: SysConfigInterface  # 使用接口定义
    prompt: str
    importance_rules: dict

    def __init__(self, sys_config: SysConfigInterface) -> None:
        self.sys_config = sys_config
        self.importance_rules = {
            # 关键词及其对应的分数
            "keywords": {
                "分手": 9,
                "结婚": 8,
                "求婚": 8,
                "表白": 7,
                "吵架": 6,
                "道歉": 5,
                "礼物": 4,
                "约会": 4,
                "吃饭": 3,
                "睡觉": 2,
                "早安": 1,
                "晚安": 1
            },
            # 情感词及其对应的分数
            "emotions": {
                "爱": 7,
                "喜欢": 6,
                "讨厌": 6,
                "生气": 5,
                "开心": 4,
                "难过": 5,
                "害怕": 4,
                "担心": 4
            },
            # 时间相关词及其对应的分数
            "time_related": {
                "永远": 6,
                "一直": 5,
                "每天": 3,
                "经常": 3,
                "偶尔": 2,
                "今天": 1
            }
        }

    def importance(self, llm_model_type: str, input: str) -> int:
        """基于规则的记忆重要性评分"""
        # 基础分数
        base_score = 3
        
        # 检查关键词
        for keyword, score in self.importance_rules["keywords"].items():
            if keyword in input:
                base_score = max(base_score, score)
        
        # 检查情感词
        emotion_score = 0
        for emotion, score in self.importance_rules["emotions"].items():
            if emotion in input:
                emotion_score += score
        if emotion_score > 0:
            base_score = max(base_score, min(emotion_score // 2, 8))
        
        # 检查时间相关词
        time_score = 0
        for time_word, score in self.importance_rules["time_related"].items():
            if time_word in input:
                time_score += score
        if time_score > 0:
            base_score = max(base_score, min(time_score // 2, 7))
        
        # 检查句子长度
        if len(input) > 50:  # 长文本可能包含更多重要信息
            base_score = min(base_score + 1, 10)
        
        # 检查是否包含问句
        if "？" in input or "?" in input:
            base_score = min(base_score + 1, 10)
        
        # 检查是否包含感叹句
        if "！" in input or "!" in input:
            base_score = min(base_score + 1, 10)
        
        return base_score
