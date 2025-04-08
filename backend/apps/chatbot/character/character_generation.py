from django.shortcuts import get_object_or_404
from ..models import CustomRoleModel
# from .character_template_en import EnglishCharacterTemplate
from .character_template_zh import ChineseCharacterTemplate
from .base_character_template import BaseCharacterTemplate
from .character import Character
from .sys.aili_zh import aili_zh


class CharacterGeneration():
    character_template_dict: dict[str, BaseCharacterTemplate] = {}

    def __init__(self) -> None:

        # 加载模型
        # self.character_template_dict["en"] = EnglishCharacterTemplate()
        self.character_template_dict["zh"] = ChineseCharacterTemplate()

    def get_character(self, role_id: int) -> Character:
        '''获取角色定义对象'''
        try:
            character_model = get_object_or_404(CustomRoleModel, pk=role_id)
            character = Character(
                role_name=character_model.role_name,
                persona=character_model.persona,
                personality=character_model.personality,
                scenario=character_model.scenario,
                examples_of_dialogue=character_model.examples_of_dialogue,
                custom_role_template_type=character_model.custom_role_template_type,
                role_package_id=character_model.role_package_id
            )
        except Exception as e:
            # 如果找不到角色，使用默认角色
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"找不到ID为{role_id}的角色，使用默认角色: {str(e)}")
            character = aili_zh
        
        return character

    def output_prompt(self, character: Character) -> str:
        '''获取角色定义prompt'''
        character_template = self.character_template_dict[
            character.custom_role_template_type]
        return character_template.format(character)


singleton_character_generation = CharacterGeneration()
