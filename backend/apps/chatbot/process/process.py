import logging
import traceback

from rest_framework.generics import get_object_or_404

from ..character import role_dialogue_example
from ..character.character_generation import singleton_character_generation
from ..config import get_sys_config
from ..insight.insight import PortraitObservation
from ..models import RolePackageModel
from ..output.realtime_message_queue import realtime_callback
from ..chat.chat_history_queue import conversation_end_callback
from ..utils.datatime_utils import get_current_time_str

logger = logging.getLogger(__name__)


class ProcessCore():
    portrait_observation: PortraitObservation

    def __init__(self) -> None:
        # 获取配置实例
        self.sys_config = get_sys_config()
        
        # 加载自定义角色生成模块
        self.singleton_character_generation = singleton_character_generation

        # 加载用户画像识别模块
        self.portrait_observation = PortraitObservation(llm_model_driver=self.sys_config.llm_model_driver,
                                                        llm_model_driver_type=self.sys_config.conversation_llm_model_driver_type)

    def chat(self, you_name: str, query: str):
        """处理聊天请求"""
        try:
            # 参数验证
            if not you_name or not query:
                logger.error("聊天参数不完整")
                raise ValueError("聊天参数不完整")
                
            # 获取当前配置实例
            sys_config = get_sys_config()
            if not sys_config:
                logger.error("系统配置未初始化")
                raise RuntimeError("系统配置未初始化")
            
            # 生成角色prompt
            character = self.singleton_character_generation.get_character(
                sys_config.character)
            if not character:
                logger.error("角色生成失败")
                raise RuntimeError("角色生成失败")
                
            role_name = character.role_name
            logger.info(f"开始处理聊天请求: you_name={you_name}, role_name={role_name}, query={query}")

            # 判断是否有角色安装包？如果有动态获取对话示例
            try:
                if character.role_package_id != -1:
                    db_role_package_model = get_object_or_404(RolePackageModel, pk=character.role_package_id)
                    character.examples_of_dialogue = role_dialogue_example.generate(query, you_name, role_name,
                                                                                    db_role_package_model.dataset_json_path,
                                                                                    db_role_package_model.embed_index_idx_path)
            except Exception as e:
                logger.error(f"获取角色对话示例失败: {str(e)}")
                # 继续使用默认对话示例

            prompt = self.singleton_character_generation.output_prompt(
                character)

            # 检索关联的短期记忆和长期记忆
            try:
                short_history = []
                long_history = ""
                
                # 确保记忆驱动存在
                if sys_config.memory_storage_driver is not None:
                    # 限制短期记忆的数量
                    max_short_history = 10  # 设置合理的短期记忆限制
                    short_history = sys_config.memory_storage_driver.search_short_memory(
                        query_text=query, you_name=you_name, role_name=role_name)
                    if len(short_history) > max_short_history:
                        logger.info(f"短期记忆超过{max_short_history}条，进行截断")
                        short_history = short_history[-max_short_history:]
                    
                    # 只有在启用长期记忆功能时才检索长期记忆
                    if sys_config.enable_longMemory and hasattr(sys_config.memory_storage_driver, 'long_memory_storage'):
                        try:
                            long_history = sys_config.memory_storage_driver.search_lang_memory(
                                prompt=query,  # 使用正确的参数名
                                you_name=you_name,
                                role_name=role_name
                            )
                            
                            # 记录长期记忆的长度
                            logger.info(f"检索到的长期记忆长度: {len(long_history)}")
                            
                            # 如果长期记忆为空，记录原因
                            if not long_history:
                                logger.debug("未找到相关的长期记忆")
                            
                            # 设置安全的最大长度限制
                            max_length = 2000  # 明确定义最大长度
                            if len(long_history) > max_length:
                                logger.info(f"长期记忆长度超过{max_length}个字符，进行截断")
                                # 在完整句子处截断
                                truncated = long_history[:max_length]
                                last_period = max(
                                    truncated.rfind('。'),
                                    truncated.rfind('！'),
                                    truncated.rfind('？'),
                                    truncated.rfind('\n')
                                )
                                if last_period > 0:
                                    long_history = truncated[:last_period + 1]
                                else:
                                    long_history = truncated
                                logger.info(f"截断后的长期记忆长度: {len(long_history)}")
                        except Exception as mem_err:
                            logger.error(f"检索长期记忆失败: {str(mem_err)}")
                            stack_trace = traceback.format_exc()
                            logger.error(f"详细错误信息: {stack_trace}")
                            long_history = ""
                else:
                    logger.warning("记忆驱动未初始化，跳过记忆检索")
            except Exception as e:
                logger.error(f"检索记忆失败: {str(e)}")
                stack_trace = traceback.format_exc()
                logger.error(f"详细错误信息: {stack_trace}")
                short_history = []
                long_history = ""

            current_time = get_current_time_str()
            logger.info(f"格式化prompt前: 长期记忆长度={len(long_history)}")
            
            # 计算prompt的预期长度
            estimated_prompt_length = len(prompt) + len(you_name) + len(long_history) + len(current_time)
            logger.info(f"预估prompt总长度: {estimated_prompt_length}")
            
            # 如果预估长度过长，提前截断长期记忆
            max_prompt_length = 7500  # 设置一个安全的prompt长度限制
            if estimated_prompt_length > max_prompt_length:
                required_reduction = estimated_prompt_length - max_prompt_length
                if len(long_history) > required_reduction:
                    logger.warning(f"预估prompt长度({estimated_prompt_length})超过限制({max_prompt_length})，截断长期记忆")
                    # 在完整句子处截断
                    truncated = long_history[:-required_reduction]
                    last_period = max(
                        truncated.rfind('。'),
                        truncated.rfind('！'),
                        truncated.rfind('？'),
                        truncated.rfind('\n')
                    )
                    if last_period > 0:
                        long_history = truncated[:last_period + 1]
                    else:
                        long_history = truncated
                    logger.info(f"截断后的长期记忆长度: {len(long_history)}")
            
            try:
                prompt = prompt.format(
                    you_name=you_name, long_history=long_history, current_time=current_time)
                logger.info(f"格式化prompt后: prompt长度={len(prompt)}")
            except Exception as format_err:
                logger.error(f"格式化prompt失败: {str(format_err)}")
                # 使用基础prompt
                prompt = f"你好，{role_name}。现在是{current_time}。"
                logger.info("使用基础prompt继续")

            # 调用大语言模型流式生成对话
            try:
                # 为防止litellm的truncate错误，确保prompt长度合理
                if len(prompt) > max_prompt_length:
                    logger.warning(f"最终prompt长度({len(prompt)})仍然超过限制({max_prompt_length})，进行截断")
                    # 保留最后的查询和基本信息
                    base_info = f"你好，{role_name}。现在是{current_time}。"
                    query_info = f"\n{you_name}说：{query}"
                    max_history_length = max_prompt_length - len(base_info) - len(query_info) - 100  # 预留一些空间
                    if max_history_length > 0:
                        prompt = base_info + prompt[-max_history_length:] + query_info
                    else:
                        prompt = base_info + query_info
                    logger.info(f"截断后的prompt长度: {len(prompt)}")
                
                if not sys_config.llm_model_driver:
                    raise RuntimeError("LLM模型驱动未初始化")
                    
                sys_config.llm_model_driver.chatStream(
                    prompt=prompt,
                    type=sys_config.conversation_llm_model_driver_type,
                    role_name=role_name,
                    you_name=you_name,
                    query=query,
                    history=short_history,
                    realtime_callback=realtime_callback,
                    conversation_end_callback=conversation_end_callback
                )
                logger.info("聊天请求处理完成")
                
            except ValueError as ve:
                if "truncate" in str(ve).lower():
                    # 特殊处理truncate错误
                    logger.error(f"LLM调用时出现truncate错误: {str(ve)}")
                    realtime_callback(
                        role_name=role_name, 
                        you_name=you_name, 
                        content="抱歉，我遇到了模型限制问题，请重试或联系管理员", 
                        end_bool=True
                    )
                else:
                    # 其他ValueError错误
                    raise ve
            except Exception as e:
                logger.error(f"LLM调用失败: {str(e)}")
                raise e
            
        except Exception as e:
            error_message = "我的大脑出现了问题，请通知开发者修复我!"
            logger.error(f"聊天处理出错: {str(e)}", exc_info=True)
            
            # 确保即使出错也能给用户返回响应
            role_name = getattr(character, 'role_name', '助手') if 'character' in locals() else '助手'
            realtime_callback(
                role_name=role_name,
                you_name=you_name, 
                content=error_message, 
                end_bool=True
            )
            # 重新抛出异常，让上层处理
            raise
