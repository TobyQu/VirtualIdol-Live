import json
import logging
import os

from ..llms.llm_model_strategy import LlmModelDriver
from ..models import CustomRoleModel, SysConfigModel
from ..character.sys.aili_zh import aili_zh
from ..reflection.reflection import ImportanceRating, PortraitAnalysis

config_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(config_dir, 'sys_config.json')
sys_code = "adminSettings"

logger = logging.getLogger(__name__)


def lazy_memory_storage(sys_config_json: any, sys_cofnig: any):
    from ..memory.memory_storage import MemoryStorageDriver
    try:
        # 检查配置是否完整
        if not sys_config_json.get("memoryStorageConfig"):
            logger.warning("记忆模块配置缺失，跳过初始化")
            return None
            
        # 加载记忆模块配置
        memory_storage_config = {
            "data_dir": sys_config_json.get("memoryStorageConfig", {}).get("faissMemory", {}).get("dataDir", "storage/memory"),
        }
        logger.debug(f"=> memory_storage_config:{memory_storage_config}")
        # 加载记忆模块驱动
        return MemoryStorageDriver(memory_storage_config=memory_storage_config, sys_config=sys_cofnig)
    except KeyError as e:
        logger.error(f"记忆模块配置不完整: {str(e)}")
        # 使用默认配置
        default_memory_storage_config = {
            "data_dir": "storage/memory"
        }
        logger.debug(f"=> 使用默认memory_storage_config:{default_memory_storage_config}")
        try:
            return MemoryStorageDriver(memory_storage_config=default_memory_storage_config, sys_config=sys_cofnig)
        except Exception as inner_e:
            logger.error(f"使用默认配置初始化记忆模块失败: {str(inner_e)}")
            return None
    except Exception as e:
        logger.error(f"初始化记忆模块失败: {str(e)}")
        return None


class SysConfig:
    """系统配置类，支持开发模式和完整加载模式"""
    llm_model_driver: LlmModelDriver
    conversation_llm_model_driver_type: str
    enable_summary: bool
    enable_longMemory: bool
    summary_llm_model_driver_type: str
    enable_reflection: bool
    reflection_llm_model_driver_type: str
    memory_storage_driver: any
    character: int
    character_name: str
    your_name: str
    room_id: str
    search_memory_size: int = 3
    zep_url: str
    zep_optional_api_key: str
    importance_rating: ImportanceRating
    portrait_analysis: PortraitAnalysis
    local_memory_num: int = 5

    def __init__(self) -> None:
        self.bilibili_live_listener = None
        self.thread_pool_manager = None
        self.llm_model_driver = LlmModelDriver()
        
        # 根据环境变量决定使用哪种加载方式
        use_lite_mode = os.environ.get('USE_LITE_CONFIG', 'false').lower() == 'true'
        if use_lite_mode:
            logger.info("使用轻量配置模式初始化...")
            self.load_lite()
        else:
            logger.info("使用完整配置模式初始化...")
            self.load()

    def get(self):
        """配置获取函数，优先从文件读取，再尝试从数据库读取"""
        sys_config_json = {}
        try:
            # 从文件中读取配置
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    sys_config_json = json.load(f)
                    logger.debug(f"从文件读取配置成功: {config_path}")
            else:
                # 创建默认配置
                logger.info("配置文件不存在，创建默认配置")
                sys_config_json = self._create_default_config()
                with open(config_path, 'w') as f:
                    json.dump(sys_config_json, f, indent=2, ensure_ascii=False)
            
            # 尝试从数据库读取
            try:
                sys_config_obj = SysConfigModel.objects.filter(code=sys_code).first()
                if sys_config_obj:
                    # 使用数据库中的配置
                    try:
                        db_config = json.loads(sys_config_obj.config)
                        sys_config_json = db_config
                        logger.info(f"从数据库读取配置成功，代码: {sys_code}")
                    except json.JSONDecodeError:
                        logger.error("数据库中的配置不是有效的JSON")
                else:
                    # 数据库中没有配置，保存当前配置到数据库
                    logger.info("数据库中不存在配置，将创建新配置")
                    self._save_to_db(sys_config_json)
            except Exception as e:
                logger.warning(f"从数据库加载配置时出错: {str(e)}")
                logger.info("将使用文件中的配置")
        except Exception as e:
            logger.error(f"加载系统配置时出错: {str(e)}")
            sys_config_json = self._create_default_config()
            
        return sys_config_json

    def _create_default_config(self):
        """创建默认配置"""
        return {
            "characterConfig": {
                "character": 1,
                "character_name": "爱莉",
                "yourName": "用户",
                "vrmModel": "/assets/vrm/default.vrm",
                "vrmModelType": "system"
            },
            "languageModelConfig": {
                "openai": {
                    "OPENAI_API_KEY": "",
                    "OPENAI_BASE_URL": ""
                },
                "ollama": {
                    "OLLAMA_API_BASE": "http://localhost:11434",
                    "OLLAMA_API_MODEL_NAME": "qwen:7b"
                },
                "zhipuai": {
                    "ZHIPUAI_API_KEY": "SK-"
                }
            },
            "enableProxy": False,
            "httpProxy": "http://host.docker.internal:23457",
            "httpsProxy": "https://host.docker.internal:23457",
            "socks5Proxy": "socks5://host.docker.internal:23457",
            "conversationConfig": {
                "conversationType": "default",
                "languageModel": "openai"
            },
            "memoryStorageConfig": {
                "zep_memory": {
                    "zep_url": "http://localhost:8881",
                    "zep_optional_api_key": "optional_api_key"
                },
                "faissMemory": {
                    "dataDir": "storage/memory"
                },
                "enableLongMemory": False,
                "enableSummary": False,
                "languageModelForSummary": "openai",
                "enableReflection": False,
                "languageModelForReflection": "openai"
            },
            "background_url": "/assets/backgrounds/default.png",
            "enableLive": False,
            "liveStreamingConfig": {
                "B_ROOM_ID": "",
                "B_COOKIE": ""
            },
            "ttsConfig": {
                "ttsVoiceId": "female-shaonv",
                "emotion": "neutral",
                "ttsType": "minimax"
            }
        }
    
    def _save_to_db(self, config_data):
        """保存配置到数据库"""
        try:
            if isinstance(config_data, dict):
                config_str = json.dumps(config_data, ensure_ascii=False)
            else:
                config_str = str(config_data)
            
            # 创建新配置记录
            SysConfigModel.objects.create(
                code=sys_code,
                config=config_str
            )
            logger.info("配置已保存到数据库")
        except Exception as e:
            logger.warning(f"保存配置到数据库失败: {str(e)}")

    def save(self, sys_config_json: any):
        """保存配置，同时保存到文件和数据库"""
        try:
            # 保存到文件
            with open(config_path, 'w') as f:
                if isinstance(sys_config_json, dict):
                    json.dump(sys_config_json, f, indent=2, ensure_ascii=False)
                else:
                    f.write(str(sys_config_json))
            logger.info(f"配置已保存到文件: {config_path}")
            
            # 尝试保存到数据库
            try:
                if isinstance(sys_config_json, dict):
                    config_str = json.dumps(sys_config_json, ensure_ascii=False)
                else:
                    config_str = str(sys_config_json)
                
                # 查找现有配置
                try:
                    sys_config_obj = SysConfigModel.objects.get(code=sys_code)
                    logger.info(f"更新数据库中的配置, ID: {sys_config_obj.id}")
                    sys_config_obj.config = config_str
                    sys_config_obj.save()
                    logger.info("配置已成功更新到数据库")
                except SysConfigModel.DoesNotExist:
                    logger.info(f"数据库中不存在配置，将创建新配置")
                    SysConfigModel.objects.create(
                        code=sys_code,
                        config=config_str
                    )
                    logger.info("新配置已成功创建并保存到数据库")
            except Exception as e:
                logger.warning(f"保存配置到数据库失败: {str(e)}")
        except Exception as e:
            logger.error(f"保存配置失败: {str(e)}")

    def load_lite(self):
        """简化的加载函数，只处理基本配置，不进行复杂初始化"""
        logger.info("加载简化版配置...")
        sys_config_json = self.get()
        
        # 设置基本环境变量
        os.environ['TOKENIZERS_PARALLELISM'] = "false"
        
        # 设置角色信息
        self.character = 1
        self.character_name = "爱莉"
        self.yourName = "用户"
        
        # 尝试从配置获取角色信息
        if "characterConfig" in sys_config_json:
            try:
                self.character = sys_config_json["characterConfig"].get("character", 1)
                self.character_name = sys_config_json["characterConfig"].get("character_name", "爱莉")
                self.yourName = sys_config_json["characterConfig"].get("yourName", "用户")
            except Exception as e:
                logger.warning(f"加载角色配置失败: {str(e)}")
        
        # 设置LLM环境变量
        if "languageModelConfig" in sys_config_json:
            try:
                # OpenAI
                openai_config = sys_config_json["languageModelConfig"].get("openai", {})
                os.environ['OPENAI_API_KEY'] = openai_config.get("OPENAI_API_KEY", "")
                os.environ['OPENAI_BASE_URL'] = openai_config.get("OPENAI_BASE_URL", "")
                
                # Ollama
                ollama_config = sys_config_json["languageModelConfig"].get("ollama", {})
                os.environ['OLLAMA_API_BASE'] = ollama_config.get("OLLAMA_API_BASE", "http://localhost:11434")
                os.environ['OLLAMA_API_MODEL_NAME'] = ollama_config.get("OLLAMA_API_MODEL_NAME", "qwen:7b")
                
                # ZhipuAI
                zhipuai_config = sys_config_json["languageModelConfig"].get("zhipuai", {})
                os.environ['ZHIPUAI_API_KEY'] = zhipuai_config.get("ZHIPUAI_API_KEY", "SK-")
            except Exception as e:
                logger.warning(f"加载语言模型配置失败: {str(e)}")
        
        # 设置代理
        try:
            enableProxy = sys_config_json.get("enableProxy", False)
            if enableProxy:
                os.environ['HTTP_PROXY'] = sys_config_json.get("httpProxy", "")
                os.environ['HTTPS_PROXY'] = sys_config_json.get("httpsProxy", "")
                os.environ['SOCKS5_PROXY'] = sys_config_json.get("socks5Proxy", "")
            else:
                os.environ['HTTP_PROXY'] = ""
                os.environ['HTTPS_PROXY'] = ""
                os.environ['SOCKS5_PROXY'] = ""
        except Exception as e:
            logger.warning(f"加载代理配置失败: {str(e)}")
        
        # 设置对话配置
        try:
            convo_config = sys_config_json.get("conversationConfig", {})
            self.conversation_llm_model_driver_type = convo_config.get("languageModel", "openai")
        except Exception as e:
            logger.warning(f"加载对话配置失败: {str(e)}")
            self.conversation_llm_model_driver_type = "openai"
        
        # 设置记忆配置
        try:
            memory_config = sys_config_json.get("memoryStorageConfig", {})
            self.enable_summary = memory_config.get("enableSummary", False)
            self.enable_longMemory = memory_config.get("enableLongMemory", False)
            self.enable_reflection = memory_config.get("enableReflection", False)
            
            if self.enable_summary:
                self.summary_llm_model_driver_type = memory_config.get("languageModelForSummary", "openai")
            
            if self.enable_reflection:
                self.reflection_llm_model_driver_type = memory_config.get("languageModelForReflection", "openai")
        except Exception as e:
            logger.warning(f"加载记忆配置失败: {str(e)}")
            self.enable_summary = False
            self.enable_longMemory = False
            self.enable_reflection = False
        
        # 记忆模块设为None，简化启动
        self.memory_storage_driver = None
        
        logger.info("简化版配置加载完成")
        
    def load(self):
        """完整的配置加载功能，包含所有数据库和组件初始化"""
        logger.debug("======================== Load SysConfig ========================")

        sys_config_json = self.get()

        os.environ['TOKENIZERS_PARALLELISM'] = "false"

        # 初始化默认角色 - 使用延迟初始化和错误处理
        try:
            from django.db.utils import OperationalError, ProgrammingError
            from django.db import connection

            # 检查数据库表是否存在
            tables = connection.introspection.table_names()
            if 'apps_customrolemodel' not in tables:
                logger.warning("表 'apps_customrolemodel' 不存在，跳过角色初始化")
                character = 1
                character_name = "爱莉"
                yourName = "用户"
            else:
                # 先尝试获取ID为1的角色（默认角色应该是ID为1）
                try:
                    default_role = CustomRoleModel.objects.filter(id=1).first()
                    if default_role is None:
                        # 如果没有ID为1的角色，检查是否有其他角色
                        result = CustomRoleModel.objects.all()
                        if len(result) == 0:
                            logger.info("数据库中不存在角色，创建默认角色")
                            # 创建一个新的默认角色
                            logger.info("数据库中存在角色但没有ID=1的角色，创建默认角色")
                            from django.db import IntegrityError
                            try:
                                custom_role = CustomRoleModel(
                                    id=1,  # 明确尝试使用ID=1
                                    role_name=aili_zh.role_name,
                                    persona=aili_zh.persona,
                                    personality=aili_zh.personality,
                                    scenario=aili_zh.scenario,
                                    examples_of_dialogue=aili_zh.examples_of_dialogue,
                                    custom_role_template_type=aili_zh.custom_role_template_type,
                                    role_package_id=-1
                                )
                                custom_role.save()
                                logger.info(f"已创建ID为1的默认角色: {custom_role.role_name}")
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
                                logger.info(f"由于ID=1冲突，已创建自动ID的默认角色: ID={custom_role.id}, 名称={custom_role.role_name}")
                            character = custom_role.id
                            character_name = custom_role.role_name
                        else:
                            # 有其他角色但没有ID=1的角色，创建一个新的默认角色
                            logger.info("数据库中存在角色但没有ID=1的角色，创建默认角色")
                            from django.db import IntegrityError
                            try:
                                custom_role = CustomRoleModel(
                                    id=1,  # 明确尝试使用ID=1
                                    role_name=aili_zh.role_name,
                                    persona=aili_zh.persona,
                                    personality=aili_zh.personality,
                                    scenario=aili_zh.scenario,
                                    examples_of_dialogue=aili_zh.examples_of_dialogue,
                                    custom_role_template_type=aili_zh.custom_role_template_type,
                                    role_package_id=-1
                                )
                                custom_role.save()
                                logger.info(f"已创建ID为1的默认角色: {custom_role.role_name}")
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
                                logger.info(f"由于ID=1冲突，已创建自动ID的默认角色: ID={custom_role.id}, 名称={custom_role.role_name}")
                            character = custom_role.id
                            character_name = custom_role.role_name
                    else:
                        # 找到了ID为1的角色
                        character = default_role.id
                        character_name = default_role.role_name
                        
                        # 尝试从配置获取用户名
                        try:
                            yourName = sys_config_json["characterConfig"]["yourName"]
                        except (KeyError, TypeError):
                            yourName = "用户"
                except Exception as e:
                    logger.error(f"获取默认角色时出错: {str(e)}")
                    # 创建一个新的默认角色
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
                    logger.info(f"出错后创建默认角色: ID={custom_role.id}, 名称={custom_role.role_name}")
                    character = custom_role.id
                    character_name = custom_role.role_name
                    yourName = "用户"
        except (OperationalError, ProgrammingError) as db_err:
            logger.warning(f"数据库表访问错误，使用默认配置: {str(db_err)}")
            character = 1
            character_name = "爱莉"
            yourName = "用户"
        except Exception as e:
            logger.error(f"=> load default character ERROR: {str(e)}")
            character = 1
            character_name = "爱莉"
            yourName = "用户"

        # 确保配置字典包含必要的键
        if "characterConfig" not in sys_config_json:
            sys_config_json["characterConfig"] = {}
        
        # 更新配置
        sys_config_json["characterConfig"]["character"] = character
        sys_config_json["characterConfig"]["yourName"] = yourName
        sys_config_json["characterConfig"]["character_name"] = character_name
        
        # 保存更新后的配置，但仅当表存在时才尝试保存到数据库
        try:
            self.save(sys_config_json)
        except Exception as save_err:
            logger.warning(f"保存配置失败，将在下次启动时重试: {str(save_err)}")
            
        logger.debug("=> character Config")
        logger.debug(f"character:{character}")
        logger.debug(f"character_name:{character_name}")
        logger.debug(f"yourName:{yourName}")
        self.character = character
        self.character_name = character_name
        self.yourName = yourName

        # 加载大语言模型配置
        try:
            os.environ['OPENAI_API_KEY'] = sys_config_json["languageModelConfig"]["openai"]["OPENAI_API_KEY"]
            os.environ['OPENAI_BASE_URL'] = sys_config_json["languageModelConfig"]["openai"]["OPENAI_BASE_URL"]
        except KeyError:
            logger.error("languageModelConfig不存在或不完整，使用默认值")
            os.environ['OPENAI_API_KEY'] = "sk-"
            os.environ['OPENAI_BASE_URL'] = ""

        try:
            ollama = sys_config_json["languageModelConfig"].get("ollama")
            if ollama:
                os.environ['OLLAMA_API_BASE'] = ollama.get("OLLAMA_API_BASE", "http://localhost:11434")
                os.environ['OLLAMA_API_MODEL_NAME'] = ollama.get("OLLAMA_API_MODEL_NAME", "qwen:7b")
            else:
                os.environ['OLLAMA_API_BASE'] = "http://localhost:11434"
                os.environ['OLLAMA_API_MODEL_NAME'] = "qwen:7b"

            zhipuai = sys_config_json["languageModelConfig"].get("zhipuai")
            if zhipuai:
                os.environ['ZHIPUAI_API_KEY'] = zhipuai.get("ZHIPUAI_API_KEY", "SK-")
            else:
                os.environ['ZHIPUAI_API_KEY'] = "SK-"
        except Exception as e:
            logger.error(f"加载语言模型配置出错: {str(e)}")
            os.environ['OLLAMA_API_BASE'] = "http://localhost:11434"
            os.environ['OLLAMA_API_MODEL_NAME'] = "qwen:7b"
            os.environ['ZHIPUAI_API_KEY'] = "SK-"

        # 是否开启proxy
        try:
            enableProxy = sys_config_json["enableProxy"]
            logger.debug("=> Proxy Config ")
            logger.debug(f"enableProxy:{enableProxy}")
            if enableProxy:
                os.environ['HTTP_PROXY'] = sys_config_json["httpProxy"]
                os.environ['HTTPS_PROXY'] = sys_config_json["httpsProxy"]
                os.environ['SOCKS5_PROXY'] = sys_config_json["socks5Proxy"]
                logger.debug(f"=> HTTP_PROXY:" + os.environ['HTTP_PROXY'])
                logger.debug(f"=> HTTPS_PROXY:" + os.environ['HTTPS_PROXY'])
                logger.debug(f"=> SOCKS5_PROXY:" + os.environ['SOCKS5_PROXY'])
            else:
                os.environ['HTTP_PROXY'] = ""
                os.environ['HTTPS_PROXY'] = ""
                os.environ['SOCKS5_PROXY'] = ""
        except KeyError:
            logger.error("代理配置不存在，使用默认值")
            enableProxy = False
            os.environ['HTTP_PROXY'] = ""
            os.environ['HTTPS_PROXY'] = ""
            os.environ['SOCKS5_PROXY'] = ""

        # 加载对话模块配置
        logger.debug("=> Chat Config")
        self.llm_model_driver = LlmModelDriver()
        try:
            self.conversation_llm_model_driver_type = sys_config_json["conversationConfig"]["languageModel"]
            logger.debug(f"conversation_llm_model_driver_type:" + self.conversation_llm_model_driver_type)
        except KeyError:
            logger.error("conversationConfig不存在或不完整，使用默认值")
            self.conversation_llm_model_driver_type = "openai"

        # 是否开启记忆摘要
        logger.debug("=> Memory Config")
        try:
            self.enable_summary = sys_config_json["memoryStorageConfig"]["enableSummary"]
            self.enable_longMemory = sys_config_json["memoryStorageConfig"]["enableLongMemory"]
            logger.debug("=> enable_longMemory：" + str(self.enable_longMemory))
            logger.debug("=> enable_summary：" + str(self.enable_summary))
            if (self.enable_summary):
                self.summary_llm_model_driver_type = sys_config_json["memoryStorageConfig"]["languageModelForSummary"]
                logger.debug("=> summary_llm_model_driver_type：" + self.summary_llm_model_driver_type)

            self.enable_reflection = sys_config_json["memoryStorageConfig"]["enableReflection"]
            logger.debug("=> enableReflection：" + str(self.enable_reflection))
            if (self.enable_reflection):
                self.reflection_llm_model_driver_type = sys_config_json["memoryStorageConfig"]["languageModelForReflection"]
                logger.debug("=> reflection_llm_model_driver_type" + self.summary_llm_model_driver_type)
        except KeyError:
            logger.error("memoryStorageConfig不存在或不完整，使用默认值")
            self.enable_summary = False
            self.enable_longMemory = False
            self.enable_reflection = False

        # 懒加载记忆模块
        try:
            self.memory_storage_driver = lazy_memory_storage(
                sys_config_json=sys_config_json, sys_cofnig=self)
        except Exception as e:
            logger.error(f"init memory_storage error: {str(e)}")
            # 如果初始化失败，设置为None
            self.memory_storage_driver = None

        logger.info("完整版配置加载完成")
