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
        return MemoryStorageDriver(memory_storage_config=default_memory_storage_config, sys_config=sys_cofnig)


class SysConfig:
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
        self.load()

    def get(self):
        sys_config_obj = None
        sys_config_json = "{}"
        try:
            # 首先从文件中读取
            with open(config_path, 'r') as f:
                sys_config_json = json.load(f)
                logger.debug(f"从文件读取配置成功: {config_path}")
            
            # 然后尝试从数据库读取
            try:
                sys_config_obj = SysConfigModel.objects.filter(
                    code=sys_code).first()
                logger.debug(f"从数据库查询配置结果: {sys_config_obj}")
                
                if sys_config_obj == None:
                    logger.info("数据库中不存在配置，将创建新配置")
                    sys_config_model = SysConfigModel(
                        code=sys_code,
                        config=json.dumps(sys_config_json, ensure_ascii=False)
                    )
                    sys_config_model.save()
                    logger.info(f"成功将配置保存到数据库，代码: {sys_code}")
                else:
                    logger.info(f"从数据库读取配置成功，代码: {sys_code}")
                    # 确保配置是有效的JSON
                    try:
                        sys_config_json = json.loads(sys_config_obj.config)
                        logger.debug(f"解析数据库配置为JSON成功，键数量: {len(sys_config_json)}")
                    except json.JSONDecodeError as je:
                        logger.error(f"数据库中的配置不是有效的JSON: {je}")
                        # 如果数据库中的配置无效，使用文件中的配置
                        logger.info("将使用文件中的配置作为备份")
            except Exception as db_err:
                logger.error(f"从数据库加载配置时出错: {str(db_err)}")
                logger.info("将使用文件中的配置作为备份")
        except Exception as e:
            logger.error(f"加载系统配置时出错: {str(e)}")
            
        return sys_config_json

    def save(self, sys_config_json: any):
        try:
            # 确保获取的是字符串形式的配置
            if isinstance(sys_config_json, dict):
                config_str = json.dumps(sys_config_json, ensure_ascii=False)
            else:
                config_str = str(sys_config_json)
                
            logger.info(f"尝试保存配置到数据库, 代码: {sys_code}")
            logger.debug(f"配置内容前100个字符: {config_str[:100]}...")
            
            # 保存到数据库
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
                
            # 同时保存到文件作为备份
            with open(config_path, 'w') as f:
                if isinstance(sys_config_json, dict):
                    json.dump(sys_config_json, f, indent=2, ensure_ascii=False)
                else:
                    f.write(config_str)
            logger.info(f"配置已成功保存到文件: {config_path}")
            
        except Exception as e:
            logger.error(f"保存配置时出错: {str(e)}", exc_info=True)
            raise e

    def load(self):
        logger.debug(
            "======================== Load SysConfig ========================")

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
                result = CustomRoleModel.objects.all()
                if len(result) == 0:
                    logger.debug("=> load default character")
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
                    logger.info(f"已创建默认角色: ID={custom_role.id}, 名称={custom_role.role_name}")
                    character = custom_role.id
                    character_name = custom_role.role_name
                else:
                    # 加载角色配置
                    try:
                        character = sys_config_json["characterConfig"]["character"]
                        yourName = sys_config_json["characterConfig"]["yourName"]
                        character_name = sys_config_json["characterConfig"]["character_name"]
                        
                        # 验证角色ID是否存在
                        try:
                            from django.core.exceptions import ObjectDoesNotExist
                            CustomRoleModel.objects.get(pk=character)
                            logger.debug(f"已验证角色ID {character} 存在")
                        except ObjectDoesNotExist:
                            # 获取第一个可用角色
                            try:
                                first_role = CustomRoleModel.objects.first()
                                if first_role:
                                    character = first_role.id
                                    character_name = first_role.role_name
                                    logger.warning(f"配置中的角色ID {character} 不存在，已切换到第一个可用角色: ID={first_role.id}, 名称={first_role.role_name}")
                                else:
                                    logger.error("没有可用角色，将重新创建默认角色")
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
                                    character = custom_role.id
                                    character_name = custom_role.role_name
                                    logger.info(f"已创建并使用默认角色: ID={custom_role.id}, 名称={custom_role.role_name}")
                            except Exception as role_err:
                                logger.error(f"获取可用角色失败: {str(role_err)}")
                                character = 1
                                character_name = "爱莉"
                        
                    except KeyError:
                        # 如果配置项不存在，使用默认值
                        logger.error("characterConfig不存在或不完整，使用默认值")
                        # 尝试获取第一个可用角色
                        try:
                            first_role = CustomRoleModel.objects.first()
                            if first_role:
                                character = first_role.id
                                character_name = first_role.role_name
                            else:
                                character = 1
                                character_name = "爱莉"
                        except Exception:
                            character = 1
                            character_name = "爱莉"
                            
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
            # 创建默认配置以便保存
            if "languageModelConfig" not in sys_config_json:
                sys_config_json["languageModelConfig"] = {
                    "openai": {
                        "OPENAI_API_KEY": "sk-",
                        "OPENAI_BASE_URL": ""
                    },
                    "ollama": {
                        "OLLAMA_API_BASE": "http://localhost:11434",
                        "OLLAMA_API_MODEL_NAME": "qwen:7b"
                    },
                    "zhipuai": {
                        "ZHIPUAI_API_KEY": "SK-"
                    }
                }
            # 保存更新后的配置
            with open(config_path, 'w') as f:
                json.dump(sys_config_json, f, indent=2, ensure_ascii=False)

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
            # 创建默认配置
            sys_config_json["enableProxy"] = enableProxy
            sys_config_json["httpProxy"] = "http://host.docker.internal:23457"
            sys_config_json["httpsProxy"] = "https://host.docker.internal:23457" 
            sys_config_json["socks5Proxy"] = "socks5://host.docker.internal:23457"
            # 保存更新后的配置
            with open(config_path, 'w') as f:
                json.dump(sys_config_json, f, indent=2, ensure_ascii=False)

        # 加载对话模块配置
        logger.debug("=> Chat Config")
        self.llm_model_driver = LlmModelDriver()
        try:
            self.conversation_llm_model_driver_type = sys_config_json["conversationConfig"]["languageModel"]
            logger.debug(f"conversation_llm_model_driver_type:" + self.conversation_llm_model_driver_type)
        except KeyError:
            logger.error("conversationConfig不存在或不完整，使用默认值")
            self.conversation_llm_model_driver_type = "openai"
            # 创建默认配置
            if "conversationConfig" not in sys_config_json:
                sys_config_json["conversationConfig"] = {}
            sys_config_json["conversationConfig"]["conversationType"] = "default"
            sys_config_json["conversationConfig"]["languageModel"] = "openai"
            # 保存更新后的配置
            with open(config_path, 'w') as f:
                json.dump(sys_config_json, f, indent=2, ensure_ascii=False)

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
            # 创建默认配置
            if "memoryStorageConfig" not in sys_config_json:
                sys_config_json["memoryStorageConfig"] = {
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
                }
            # 保存更新后的配置
            with open(config_path, 'w') as f:
                json.dump(sys_config_json, f, indent=2, ensure_ascii=False)

        # 懒加载记忆模块
        try:
            self.memory_storage_driver = lazy_memory_storage(
                sys_config_json=sys_config_json, sys_cofnig=self)
        except Exception as e:
            logger.error(f"init memory_storage error: {str(e)}")
            # 如果初始化失败，设置为None
            self.memory_storage_driver = None

        logger.info("=> Load SysConfig Success")

        # 加载直播配置
        # if self.bili_live_client != None:
        #     self.bili_live_client.stop()
        # room_id = str(sys_config_json["liveStreamingConfig"]["B_STATION_ID"])
        # print("=> liveStreaming Config")
        # self.room_id = room_id
        # self.bili_live_client = BiliLiveClient(room_id=room_id)
        # # 创建后台线程
        # background_thread = threading.Thread(
        #     target=asyncio.run(self.bili_live_client.start()))
        # # 将后台线程设置为守护线程，以便在主线程结束时自动退出
        # background_thread.daemon = True
        # # 启动后台线程
        # background_thread.start()
