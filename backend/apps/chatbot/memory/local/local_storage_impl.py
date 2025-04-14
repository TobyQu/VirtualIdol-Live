import datetime
import logging
import jieba
import jieba.analyse
import json
from django.db.models import Q
from ..base_storage import BaseStorage
from ...models import LocalMemoryModel

# TODO 搜索方式待整改
logger = logging.getLogger(__name__)


class LocalStorage(BaseStorage):

    def __init__(self, memory_storage_config: dict[str, str]):
        logger.info("=> Load LocalStorage Success")

    def search(self, query_text: str, limit: int = 10, sender: str = None, owner: str = None) -> list[str]:
        """
        搜索相关记忆
        Args:
            query_text: 查询文本
            limit: 返回结果数量限制
            sender: 发送者（可选）
            owner: 所有者（可选）
        Returns:
            List[str]: 记忆文本列表
        """
        try:
            # 构建查询条件
            query = Q()
            
            # 添加所有者过滤条件
            if owner:
                query &= Q(owner=owner)
                
            # 添加发送者过滤条件
            if sender:
                query &= Q(sender=sender)
                
            # 执行查询，并按时间戳排序
            results = LocalMemoryModel.objects.filter(query).order_by('-timestamp')[:limit]
            
            # 提取查询结果的 text 字段
            result_texts = [result.text for result in results]
            
            logger.debug(f"短期记忆搜索返回 {len(result_texts)} 条结果")
            return result_texts
            
        except Exception as e:
            logger.error(f"短期记忆搜索失败: {str(e)}")
            return []

    def pageQueryByOwner(self, page_num: int, page_size: int, owner: str) -> list[str]:
        # 计算分页偏移量
        offset = (page_num - 1) * page_size

        # 分页查询，并提取 text 字段
        results = LocalMemoryModel.objects.filter(owner=owner).order_by('-timestamp').values_list(
            'text', flat=True)[offset:offset + page_size]
        results = list(results)
        results.reverse()
        return results

    def pageQuery(self, page_num: int, page_size: int) -> list[str]:
        # 计算分页偏移量
        offset = (page_num - 1) * page_size

        # 分页查询，并提取 text 字段
        results = LocalMemoryModel.objects.order_by('-timestamp').values_list(
            'text', flat=True)[offset:offset + page_size]
        results = list(results)
        results.reverse()
        return results

    def save(self, text: str, sender: str, owner: str, importance_score: int = 1) -> bool:
        """
        保存记忆
        Args:
            text: 记忆文本
            sender: 发送者
            owner: 所有者
            importance_score: 重要性分数
        Returns:
            bool: 是否保存成功
        """
        try:
            # 生成唯一ID
            pk = int(datetime.datetime.now().timestamp() * 1000)
            
            # 分词处理
            query_words = jieba.cut(text, cut_all=False)
            query_tags = list(query_words)
            keywords = jieba.analyse.extract_tags(" ".join(query_tags), topK=20)
            
            # 获取当前时间戳
            current_timestamp = datetime.datetime.now().isoformat()
            
            # 创建并保存记录
            local_memory_model = LocalMemoryModel(
                id=pk,
                text=text,
                tags=",".join(keywords),  # 设置标签
                sender=sender,
                owner=owner,
                timestamp=current_timestamp
            )
            local_memory_model.save()
            
            logger.debug(f"成功保存本地记忆: id={pk}, sender={sender}, owner={owner}")
            return True
            
        except Exception as e:
            logger.error(f"保存本地记忆失败: {str(e)}")
            return False

    def clear(self, owner: str) -> bool:
        """
        清空指定所有者的记忆
        Args:
            owner: 所有者
        Returns:
            bool: 是否清除成功
        """
        try:
            # 清除指定 owner 的记录
            count, _ = LocalMemoryModel.objects.filter(owner=owner).delete()
            logger.info(f"清除了 {count} 条本地记忆, owner={owner}")
            return True
        except Exception as e:
            logger.error(f"清除本地记忆失败: {str(e)}")
            return False
