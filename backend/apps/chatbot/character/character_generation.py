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
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # 首先检查指定的role_id
            try:
                character_model = CustomRoleModel.objects.get(pk=role_id)
            except CustomRoleModel.DoesNotExist:
                logger.error(f"找不到ID为{role_id}的角色，尝试获取ID为1的默认角色")
                # 尝试获取ID为1的默认角色
                try:
                    character_model = CustomRoleModel.objects.get(pk=1)
                    logger.info(f"成功获取ID为1的默认角色: {character_model.role_name}")
                except CustomRoleModel.DoesNotExist:
                    logger.error("找不到ID为1的默认角色，尝试获取第一个可用角色")
                    # 尝试获取第一个角色
                    character_model = CustomRoleModel.objects.first()
                    
                    # 如果仍然没有角色，使用内置默认角色并尝试创建数据库记录
                    if not character_model:
                        logger.error("数据库中不存在任何角色，使用内置默认角色")
                        
                        # 尝试创建默认角色到数据库
                        try:
                            # 检查是否能直接创建ID为1的角色
                            from django.db import IntegrityError
                            try:
                                custom_role = CustomRoleModel(
                                    id=1,  # 明确指定ID为1
                                    role_name=aili_zh.role_name,
                                    persona=aili_zh.persona,
                                    personality=aili_zh.personality,
                                    scenario=aili_zh.scenario,
                                    examples_of_dialogue=aili_zh.examples_of_dialogue,
                                    custom_role_template_type=aili_zh.custom_role_template_type,
                                    role_package_id=-1
                                )
                                custom_role.save()
                                logger.info(f"已在get_character中创建ID为1的默认角色")
                            except IntegrityError:
                                # 如果ID=1已被使用但查询不到，创建一个新的角色
                                custom_role = CustomRoleModel(
                                    role_name=aili_zh.role_name,
                                    persona=aili_zh.persona,
                                    personality=aili_zh.personality,
                                    scenario=aili_zh.scenario,
                                    examples_of_dialogue=aili_zh.examples_of_dialogue,
                                    custom_role_template_type=aili_zh.custom_role_template_type,
                                    role_package_id=-1
                                )
                                custom_role.save()
                                logger.info(f"已在get_character中创建自动ID的默认角色: ID={custom_role.id}")
                            
                            character_model = custom_role
                        except Exception as create_err:
                            logger.error(f"创建默认角色失败: {str(create_err)}")
                            return aili_zh
                
            character = Character(
                role_name=character_model.role_name,
                persona=character_model.persona,
                personality=character_model.personality,
                scenario=character_model.scenario,
                examples_of_dialogue=character_model.examples_of_dialogue,
                custom_role_template_type=character_model.custom_role_template_type,
                role_package_id=character_model.role_package_id
            )
            return character
        except Exception as e:
            # 如果发生任何错误，使用默认角色
            logger.error(f"获取角色时发生错误，使用默认角色: {str(e)}")
            return aili_zh

    def output_prompt(self, character: Character) -> str:
        '''获取角色定义prompt'''
        character_template = self.character_template_dict[
            character.custom_role_template_type]
        return character_template.format(character)


singleton_character_generation = CharacterGeneration()
