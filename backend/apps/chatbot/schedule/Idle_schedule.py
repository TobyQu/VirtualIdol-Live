import logging
import threading
from ..emotion.behavior_action_management import IdleActionManagement
from ..output.realtime_message_queue import RealtimeMessage, put_message

logger = logging.getLogger(__name__)

def idle_action_job():
    """生成随机闲置动作并发送到消息队列"""
    try:
        logger.info("开始执行闲置动作生成任务")
        # 创建 IdleActionManagement 实例
        manager = IdleActionManagement()
        # 调用 random_action 获取随机动作
        random_action = manager.random_action()
        logger.info(f"生成随机闲置动作: action='{random_action.action}', emote='{random_action.emote}'")
        
        # 将动作消息放入队列
        action_message = RealtimeMessage(
            type="behavior_action", 
            user_name="", 
            content=random_action.action, 
            emote=random_action.emote
        )
        logger.info(f"创建闲置动作消息: type='behavior_action', action='{random_action.action}', emote='{random_action.emote}'")
        
        put_message(action_message)
        logger.info("闲置动作消息已加入队列")
    except Exception as e:
        logger.error(f"生成或发送闲置动作时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

def run_idle_action_job(interval, idle_action_job):
    """启动定时任务，定期执行闲置动作"""
    logger.info(f"设置闲置动作定时任务，间隔: {interval}秒")
    threading.Timer(interval, run_idle_action_job, [interval, idle_action_job]).start()
    idle_action_job()

