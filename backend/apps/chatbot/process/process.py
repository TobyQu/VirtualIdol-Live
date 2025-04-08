import logging
import traceback

from rest_framework.generics import get_object_or_404

from ..character import role_dialogue_example
from ..character.character_generation import singleton_character_generation
from ..config import singleton_sys_config
from ..insight.insight import PortraitObservation
from ..models import RolePackageModel
from ..output.realtime_message_queue import realtime_callback
from ..chat.chat_history_queue import conversation_end_callback
from ..emotion.emotion_manage import EmotionRecognition, EmotionRespond, GenerationEmotionRespondChatPropmt
from ..utils.datatime_utils import get_current_time_str

logger = logging.getLogger(__name__)


class ProcessCore():
    generation_emotion_respond_chat_propmt: GenerationEmotionRespondChatPropmt
    portrait_observation: PortraitObservation

    def __init__(self) -> None:

        # 加载自定义角色生成模块
        self.singleton_character_generation = singleton_character_generation
        self.generation_emotion_respond_chat_propmt = GenerationEmotionRespondChatPropmt()

        # 加载用户画像识别模块
        self.portrait_observation = PortraitObservation(llm_model_driver=singleton_sys_config.llm_model_driver,
                                                        llm_model_driver_type=singleton_sys_config.conversation_llm_model_driver_type)

    def chat(self, you_name: str, query: str):
        try:
            # 生成角色prompt
            character = self.singleton_character_generation.get_character(
                singleton_sys_config.character)
            role_name = character.role_name

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
                short_history = singleton_sys_config.memory_storage_driver.search_short_memory(
                    query_text=query, you_name=you_name, role_name=role_name)
                long_history = singleton_sys_config.memory_storage_driver.search_lang_memory(
                    query_text=query, you_name=you_name, role_name=role_name)
            except Exception as e:
                logger.error(f"检索记忆失败: {str(e)}")
                short_history = []
                long_history = ""

            current_time = get_current_time_str()
            prompt = prompt.format(
                you_name=you_name, long_history=long_history, current_time=current_time)

            # 调用大语言模型流式生成对话
            singleton_sys_config.llm_model_driver.chatStream(prompt=prompt,
                                                             type=singleton_sys_config.conversation_llm_model_driver_type,
                                                             role_name=role_name,
                                                             you_name=you_name,
                                                             query=query,
                                                             history=short_history,
                                                             realtime_callback=realtime_callback,
                                                             conversation_end_callback=conversation_end_callback)
        except Exception as e:
            error_message = "我的大脑出现了问题，请通知开发者修复我!"
            traceback.print_exc()
            logger.error(f"聊天处理出错: {str(e)}", exc_info=True)
            
            # 确保即使出错也能给用户返回响应
            role_name = getattr(character, 'role_name', '助手') if 'character' in locals() else '助手'
            realtime_callback(role_name=role_name,
                              you_name=you_name, content=error_message, end_bool=True)
