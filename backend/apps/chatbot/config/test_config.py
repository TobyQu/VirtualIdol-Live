import os
import json
import logging
import django
import sys

# 设置Django环境
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 导入配置相关模块
from .config_manager import get_config_manager, SystemConfig
from . import get_sys_config, get_config, USE_NEW_CONFIG

def test_config_manager():
    """测试配置管理器"""
    logger.info("=== 测试配置管理器 ===")
    
    # 获取配置管理器实例
    config_manager = get_config_manager()
    
    # 加载配置
    config = config_manager.load()
    logger.info(f"配置版本: {config.version}")
    logger.info(f"角色名称: {config.characterConfig.character_name}")
    
    # 更新配置
    test_config = {
        "characterConfig": {
            "character_name": "测试角色"
        }
    }
    updated_config = config_manager.update_config(test_config)
    logger.info(f"更新后角色名称: {updated_config.characterConfig.character_name}")
    
    # 重置配置
    reset_config = {
        "characterConfig": {
            "character_name": "爱莉"
        }
    }
    config_manager.update_config(reset_config)
    logger.info("配置已重置")

def test_sys_config():
    """测试新的SysConfig类"""
    logger.info("=== 测试SysConfig系统 ===")
    
    # 检查当前使用的配置系统
    logger.info(f"当前使用的配置系统: {'新版' if USE_NEW_CONFIG else '旧版'}")
    
    # 获取系统配置实例
    sys_config = get_sys_config()
    logger.info(f"角色名称: {sys_config.character_name}")
    logger.info(f"用户名称: {sys_config.your_name}")
    logger.info(f"对话模型类型: {sys_config.conversation_llm_model_driver_type}")
    
    # 测试获取配置字典
    config_dict = sys_config.get()
    logger.info(f"配置字典包含 {len(config_dict)} 个顶级键")
    
    # 测试更新配置
    test_config = {
        "characterConfig": {
            "yourName": "测试用户"
        }
    }
    sys_config.save(test_config)
    logger.info(f"更新后用户名称: {sys_config.your_name}")
    
    # 重置配置
    reset_config = {
        "characterConfig": {
            "yourName": "用户"
        }
    }
    sys_config.save(reset_config)
    logger.info("配置已重置")

def test_get_config():
    """测试get_config函数"""
    logger.info("=== 测试get_config函数 ===")
    
    # 获取配置对象
    config = get_config()
    logger.info(f"配置版本: {config.version}")
    logger.info(f"角色名称: {config.characterConfig.character_name}")
    logger.info(f"用户名称: {config.characterConfig.yourName}")

if __name__ == "__main__":
    logger.info("开始测试新的配置系统...")
    
    try:
        # 运行测试
        test_config_manager()
        test_sys_config()
        test_get_config()
        
        logger.info("测试完成!")
    except Exception as e:
        logger.error(f"测试过程中出错: {str(e)}", exc_info=True) 