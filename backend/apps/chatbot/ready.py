import logging
from .output.realtime_message_queue import RealtimeMessageQueryJobTask
from django.db import connections

logger = logging.getLogger(__name__)

def ready():
    """初始化应用"""
    
    logger.info("========== 应用启动，初始化准备 ==========")
    
    # 初始化默认角色
    init_default_role()
    
    # 其他初始化操作...
    
    logger.info("========== 初始化完成 ==========")


def init_default_role():
    """确保默认角色（爱莉）存在于数据库中"""
    from .models import CustomRoleModel
    from .character.sys.aili_zh import aili_zh
    
    try:
        # 检查ID为1的默认角色是否存在
        default_role = CustomRoleModel.objects.filter(id=1).first()
        if default_role is None:
            logger.info("默认角色（爱莉）不存在，正在创建...")
            
            # 创建默认角色，指定ID为1
            try:
                custom_role = CustomRoleModel(
                    id=1,
                    role_name=aili_zh.role_name,
                    persona=aili_zh.persona,
                    personality=aili_zh.personality,
                    scenario=aili_zh.scenario,
                    examples_of_dialogue=aili_zh.examples_of_dialogue,
                    custom_role_template_type=aili_zh.custom_role_template_type,
                    role_package_id=-1
                )
                custom_role.save()
                logger.info(f"已成功创建默认角色: ID={custom_role.id}, 名称={custom_role.role_name}")
            except Exception as e:
                logger.error(f"创建默认角色失败: {str(e)}")
        else:
            logger.info(f"默认角色已存在: ID={default_role.id}, 名称={default_role.role_name}")
    except Exception as e:
        logger.error(f"初始化默认角色时发生错误: {str(e)}")

def startup():
    """
    启动必要的服务
    """
    import sys
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # 1. 首先初始化SysConfig
        logger.info("1. 初始化SysConfig...")
        from .config import _singleton_instance, get_sys_config
        # 初始化SysConfig实例
        config_instance = get_sys_config()
        # 设置singleton_sys_config为实例化的对象，保持向后兼容
        sys.modules['apps.chatbot.config'].singleton_sys_config = config_instance
        logger.info("SysConfig初始化成功")
        
        # 1.1. 确保长期记忆模块初始化
        logger.info("1.1. 检查并确保长期记忆模块初始化...")
        try:
            if config_instance.enable_longMemory:
                logger.info("长期记忆功能已启用，检查长期记忆模块是否正确初始化")
                
                # 检查长期记忆是否已经初始化
                memory_initialized = (hasattr(config_instance, 'memory_storage_driver') and 
                                     config_instance.memory_storage_driver is not None)
                                     
                long_memory_initialized = False
                if memory_initialized:
                    long_memory_initialized = (hasattr(config_instance.memory_storage_driver, 'long_memory_storage') and 
                                              config_instance.memory_storage_driver.long_memory_storage is not None)
                
                if not memory_initialized or not long_memory_initialized:
                    logger.warning("长期记忆功能已启用但未正确初始化，尝试重新初始化")
                    config_instance._init_memory_storage()
                    
                    # 再次检查初始化结果
                    memory_initialized = (hasattr(config_instance, 'memory_storage_driver') and 
                                         config_instance.memory_storage_driver is not None)
                    long_memory_initialized = False
                    if memory_initialized:
                        long_memory_initialized = (hasattr(config_instance.memory_storage_driver, 'long_memory_storage') and 
                                                  config_instance.memory_storage_driver.long_memory_storage is not None)
                    
                    logger.info(f"长期记忆模块初始化结果: 记忆驱动={memory_initialized}, 长期记忆={long_memory_initialized}")
                else:
                    logger.info("长期记忆模块已正确初始化")
            else:
                logger.info("长期记忆功能未启用，跳过初始化检查")
        except Exception as e:
            logger.error(f"检查长期记忆模块状态时出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
        
        # 2. 初始化ProcessCore
        logger.info("2. 初始化ProcessCore...")
        from .process import _process_core_instance, get_process_core
        process_instance = get_process_core()
        # 设置process_core为实例化的对象，保持向后兼容
        sys.modules['apps.chatbot.process'].process_core = process_instance
        logger.info("ProcessCore初始化成功")
        
        # 3. 初始化直播服务
        logger.info("3. 初始化直播服务...")
        from .process import initialize_live_service
        initialize_live_service()
        logger.info("直播服务初始化完成")
        
        # 4. 启动WebSocket消息队列
        logger.info("4. 启动RealtimeMessageQueryJobTask...")
        from .output.realtime_message_queue import RealtimeMessageQueryJobTask
        RealtimeMessageQueryJobTask.start()
        logger.info("RealtimeMessageQueryJobTask启动成功")
        
        # 5. 启动聊天历史记忆队列
        logger.info("5. 启动ChatHistoryMessageQueryJobTask...")
        from .chat.chat_history_queue import ChatHistoryMessageQueryJobTask
        ChatHistoryMessageQueryJobTask.start()
        logger.info("ChatHistoryMessageQueryJobTask启动成功")
        
        logger.info("所有服务启动完成")
    except Exception as e:
        logger.error(f"启动服务失败: {str(e)}")
        import traceback
        logger.error(traceback.format_exc()) 