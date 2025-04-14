import faiss
import numpy as np
import time
import os
import sqlite3
import threading
from ..base_storage import BaseStorage
from ...utils.snowflake_utils import SnowFlake
from ...memory.embedding import Embedding
import logging
import jieba.analyse
import traceback
from typing import List
import datetime

logger = logging.getLogger(__name__)

class ThreadSafeSQLite:
    """线程安全的SQLite连接管理器"""
    
    def __init__(self, db_path):
        self.db_path = db_path
        self._local = threading.local()
        
    def _get_conn(self):
        if not hasattr(self._local, 'conn'):
            self._local.conn = sqlite3.connect(self.db_path)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn
        
    def _get_cursor(self):
        if not hasattr(self._local, 'cursor'):
            self._local.cursor = self._get_conn().cursor()
        return self._local.cursor
        
    def execute(self, sql, params=None):
        cursor = self._get_cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        return cursor
        
    def commit(self):
        self._get_conn().commit()
        
    def close(self):
        if hasattr(self._local, 'cursor'):
            self._local.cursor.close()
            delattr(self._local, 'cursor')
        if hasattr(self._local, 'conn'):
            self._local.conn.close()
            delattr(self._local, 'conn')

class FAISSStorage(BaseStorage):
    """FAISS向量存储记忆模块，替代Milvus实现"""
    
    def __init__(self, memory_storage_config: dict[str, str]):
        # 配置参数
        data_dir = memory_storage_config.get("data_dir", "storage/memory")
        self.index_path = os.path.join(data_dir, "memory.index")
        self.metadata_db = os.path.join(data_dir, "memory_metadata.db")
        self.dimension = 768  # 与现有embedding维度匹配
        
        # 创建存储目录
        os.makedirs(data_dir, exist_ok=True)
        
        # 初始化向量嵌入模型
        try:
            self.embedding = Embedding()
            logger.info("成功初始化嵌入模型")
        except Exception as emb_err:
            logger.error(f"初始化嵌入模型失败: {str(emb_err)}")
            raise  # 重新抛出异常，因为没有嵌入模型就无法继续
        
        # 初始化FAISS索引
        try:
            if os.path.exists(self.index_path):
                logger.info(f"加载现有FAISS索引: {self.index_path}")
                try:
                    self.index = faiss.read_index(self.index_path)
                    logger.info(f"成功加载FAISS索引，包含 {self.index.ntotal} 条记录")
                except Exception as e:
                    logger.error(f"加载索引失败: {str(e)}，创建新索引")
                    self._create_new_index()
            else:
                logger.info(f"索引文件不存在，创建新的FAISS索引")
                self._create_new_index()
                
            # 确保索引已训练
            if hasattr(self.index, 'is_trained') and not self.index.is_trained:
                logger.info("索引未训练，执行训练操作")
                self.index.train(np.random.rand(max(1000, self.index.ntotal*2), self.dimension).astype('float32'))
                
            logger.info(f"FAISS索引准备就绪，当前记录数: {self.index.ntotal}")
        except Exception as idx_err:
            logger.error(f"初始化FAISS索引失败: {str(idx_err)}")
            # 尝试使用最简单的索引类型
            logger.info("尝试使用基础IndexFlatL2索引")
            self.index = faiss.IndexFlatL2(self.dimension)
        
        # 初始化线程安全的SQLite连接
        self.db = ThreadSafeSQLite(self.metadata_db)
        self.db.execute('''
            CREATE TABLE IF NOT EXISTS memory_metadata (
                id INTEGER PRIMARY KEY,
                text TEXT,
                sender TEXT,
                owner TEXT,
                timestamp REAL,
                importance_score INTEGER,
                vector_id INTEGER UNIQUE,
                keywords TEXT  -- 存储关键词
            )
        ''')
        self.db.commit()
        logger.info(f"SQLite元数据存储初始化完成: {self.metadata_db}")
        
        # 初始化缓存
        self.cache = {}
        self.cache_size = 1000  # 缓存大小
        self.cache_ttl = 3600  # 缓存过期时间（秒）
        
        # 关键词提取器
        self.keyword_extractor = jieba.analyse.TFIDF()

    def _create_new_index(self):
        """创建新的FAISS索引"""
        try:
            # 尝试创建IVF索引（需要训练）
            nlist = 100  # 聚类中心数量
            quantizer = faiss.IndexFlatL2(self.dimension)
            self.index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
            
            # 使用随机数据训练索引
            logger.info("使用随机数据训练索引")
            train_vectors = np.random.rand(1000, self.dimension).astype('float32')
            self.index.train(train_vectors)
            logger.info("索引训练完成")
        except Exception as e:
            logger.error(f"创建IVF索引失败: {str(e)}，使用基础索引")
            # 使用不需要训练的基础索引
            self.index = faiss.IndexFlatL2(self.dimension)
            logger.info("已创建基础IndexFlatL2索引")

    def _extract_keywords(self, text: str) -> str:
        """提取文本关键词"""
        keywords = self.keyword_extractor.extract_tags(text, topK=5)
        return ",".join(keywords)

    def search(self, query_text: str, limit: int = 3) -> list[str]:
        """搜索相关记忆"""
        # 参数验证
        if not query_text:
            logger.warning("查询文本为空，跳过搜索")
            return []
            
        if limit <= 0:
            logger.warning(f"无效的limit值: {limit}，使用默认值3")
            limit = 3
            
        if not hasattr(self, 'index') or self.index is None:
            logger.error("FAISS索引未初始化")
            return []
            
        if hasattr(self.index, 'ntotal') and self.index.ntotal == 0:
            logger.debug("FAISS索引为空，没有记忆可搜索")
            return []
        
        # 检查缓存
        cache_key = f"{query_text}_{limit}"
        if cache_key in self.cache:
            cached_result = self.cache[cache_key]
            if time.time() - cached_result["timestamp"] < self.cache_ttl:
                logger.debug("使用缓存的搜索结果")
                return cached_result["result"]
        
        try:
            # 获取查询向量
            query_vector = self._get_embedding(query_text)
            if query_vector is None or np.isnan(query_vector).any():
                logger.error("获取查询向量失败，可能是文本无法正确嵌入")
                return []
                
            if not isinstance(query_vector, np.ndarray):
                query_vector = np.array(query_vector, dtype=np.float32)
                
            # 确保向量是2D的，shape为(1, dimension)
            if query_vector.ndim == 1:
                query_vector = query_vector.reshape(1, -1)
                
            # 确保向量是float32类型
            if query_vector.dtype != np.float32:
                query_vector = query_vector.astype(np.float32)
            
            # 提取查询关键词
            try:
                query_keywords = set(self._extract_keywords(query_text).split(","))
            except Exception as kw_err:
                logger.warning(f"关键词提取失败: {str(kw_err)}")
                query_keywords = set()
            
            # 设置搜索参数
            actual_limit = min(limit * 5, 100)  # 限制候选项数量
            if hasattr(self.index, 'nprobe'):
                try:
                    # 只有IVF类型的索引才有nprobe属性
                    self.index.nprobe = min(10, self.index.nlist // 2)  # 设置合理的nprobe值
                except Exception:
                    # 忽略错误，使用默认值
                    pass
            
            # 执行搜索
            try:
                D, I = self.index.search(query_vector, actual_limit)
            except Exception as search_err:
                logger.error(f"FAISS搜索失败: {str(search_err)}")
                return []
            
            # 获取匹配的记忆项
            memories = []
            for i, idx in enumerate(I[0]):
                if idx == -1 or i >= len(D[0]):  # 跳过无效索引
                    continue
                    
                # 尝试从缓存获取
                memory = self.cache.get(idx)
                if memory is None:
                    try:
                        cursor = self.db.execute(
                            "SELECT id, text, sender, owner, timestamp, importance_score, keywords FROM memory_metadata WHERE vector_id=?",
                            (int(idx),)
                        )
                        result = cursor.fetchone()
                        if result:
                            memory = {
                                "id": result[0],
                                "text": result[1],
                                "sender": result[2],
                                "owner": result[3],
                                "timestamp": result[4],
                                "importance_score": result[5],
                                "keywords": set(result[6].split(",")) if result[6] else set(),
                                "relevance": max(0, min(1, 1 - D[0][i]))  # 确保分数在0到1之间
                            }
                            self._update_cache(result[0], memory)
                    except Exception as db_err:
                        logger.error(f"数据库查询失败: {str(db_err)}")
                        continue
                
                if memory and isinstance(memory, dict) and "text" in memory:
                    # 计算关键词匹配度
                    keyword_overlap = len(query_keywords & memory.get("keywords", set())) if query_keywords else 0
                    memory["keyword_score"] = keyword_overlap / max(len(query_keywords), 1) if query_keywords else 0
                    
                    memories.append(memory)
                    if len(memories) >= limit*3:  # 保留更多候选用于后续排序
                        break
            
            if not memories:
                logger.debug("未找到匹配的记忆")
                return []
            
            # 计算时效性和规范化分数
            try:
                self._compute_recency(memories)
                self._normalize_scores(memories)
            except Exception as score_err:
                logger.warning(f"计算分数失败: {str(score_err)}")
                # 降级为简单排序
                memories = sorted(memories, key=lambda m: m.get("relevance", 0), reverse=True)
            else:
                # 排序获取最高分的记忆
                memories = sorted(memories, key=lambda m: m.get("total_score", 0), reverse=True)
            
            result = []
            if len(memories) > 0:
                try:
                    memories_text = [item.get('text', '') for item in memories if item.get('text')]
                    memories_size = min(limit, len(memories_text))  # 确保不会超出列表范围
                    result = memories_text[:memories_size]
                except Exception as extract_err:
                    logger.error(f"提取记忆文本失败: {str(extract_err)}")
                    return []
                    
                logger.info(f"返回 {len(result)} 条记忆结果")
            
            # 更新缓存
            self._update_cache(cache_key, {
                "result": result,
                "timestamp": time.time()
            })
            
            return result
            
        except Exception as e:
            logger.error(f"向量搜索失败: {str(e)}")
            stack_trace = traceback.format_exc()
            logger.error(f"详细错误信息: {stack_trace}")
            return []  # 返回空列表，确保不影响主流程

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
        if not text:
            logger.warning("尝试保存空文本，已跳过")
            return False
            
        if not hasattr(self, 'index') or self.index is None:
            logger.error("FAISS索引未初始化，无法保存")
            return False
            
        try:
            # 获取向量嵌入
            vector = self._get_embedding(text)
            if vector is None or (isinstance(vector, np.ndarray) and np.isnan(vector).any()):
                logger.error("获取向量嵌入失败，跳过保存")
                return False
                
            # 确保向量是numpy数组且类型正确
            if not isinstance(vector, np.ndarray):
                vector = np.array(vector, dtype=np.float32)
                
            # 确保向量是2D的，shape为(1, dimension)
            if vector.ndim == 1:
                vector = vector.reshape(1, -1)
                
            # 确保向量是float32类型
            if vector.dtype != np.float32:
                vector = vector.astype(np.float32)
            
            # 生成全局唯一ID
            try:
                timestamp = int(time.time() * 1000000)
                random_part = np.random.randint(0, 1000000)
                pk = timestamp + random_part
                vector_id = pk  # 使用相同的ID作为向量ID
            except Exception as id_err:
                logger.error(f"生成ID失败: {str(id_err)}")
                return False
            
            # 提取关键词
            try:
                keywords = self._extract_keywords(text)
                if not keywords:
                    keywords = " ".join(text.split()[:5])  # 使用前5个词作为关键词
                    logger.warning("关键词提取失败，使用文本开头作为关键词")
            except Exception as kw_err:
                logger.error(f"提取关键词失败: {str(kw_err)}")
                keywords = ""  # 使用空字符串
            
            # 添加向量到FAISS索引
            try:
                self.index.add(vector)
            except Exception as idx_err:
                logger.error(f"添加向量到索引失败: {str(idx_err)}")
                return False
            
            # 保存元数据到SQLite
            try:
                self.db.execute(
                    "INSERT INTO memory_metadata (id, text, sender, owner, timestamp, importance_score, vector_id, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (pk, text, sender, owner, time.time(), importance_score, vector_id, keywords)
                )
                self.db.commit()
            except sqlite3.IntegrityError as sql_err:
                logger.error(f"SQL完整性错误，可能是ID冲突: {str(sql_err)}")
                try:
                    # 尝试使用不同的ID重新插入
                    pk = int(time.time() * 1000000) + np.random.randint(1000000, 2000000)
                    vector_id = pk
                    self.db.execute(
                        "INSERT INTO memory_metadata (id, text, sender, owner, timestamp, importance_score, vector_id, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        (pk, text, sender, owner, time.time(), importance_score, vector_id, keywords)
                    )
                    self.db.commit()
                except Exception as retry_err:
                    logger.error(f"重试插入数据库失败: {str(retry_err)}")
                    return False
            except Exception as db_err:
                logger.error(f"保存到数据库失败: {str(db_err)}")
                return False
            
            # 定期保存索引
            try:
                if hasattr(self.index, 'ntotal') and self.index.ntotal % 100 == 0:  # 每100条记录保存一次
                    faiss.write_index(self.index, self.index_path)
                    logger.info(f"保存FAISS索引，当前记录数: {self.index.ntotal}")
            except Exception as save_err:
                logger.warning(f"保存索引文件失败: {str(save_err)}")
                # 继续执行，这不是致命错误
            
            logger.info(f"成功保存长期记忆: id={pk}, sender={sender}, owner={owner}, vector_id={vector_id}")
            return True
            
        except Exception as e:
            logger.error(f"保存记忆失败: {str(e)}")
            stack_trace = traceback.format_exc()
            logger.error(f"详细错误信息: {stack_trace}")
            return False

    def _get_embedding(self, text: str) -> np.ndarray:
        """获取文本的向量嵌入"""
        try:
            return self.embedding.get_embedding_from_language_model(text)
        except Exception as e:
            logger.error(f"获取向量嵌入失败: {str(e)}")
            # 返回零向量作为后备
            return np.zeros(self.dimension, dtype=np.float32)

    def _update_cache(self, key, value):
        """更新缓存"""
        self.cache[key] = value
        if len(self.cache) > self.cache_size:
            # 移除最旧的缓存项
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k].get("timestamp", 0))
            del self.cache[oldest_key]

    def _compute_recency(self, memories):
        """计算记忆的时效性分数"""
        current_time = time.time()
        for memory in memories:
            age = current_time - memory["timestamp"]
            memory["recency_score"] = 1.0 / (1.0 + age / 86400)  # 使用一天作为时间单位

    def _normalize_scores(self, memories):
        """规范化并组合各项分数"""
        for memory in memories:
            # 组合相关性、关键词匹配度和时效性
            memory["total_score"] = (
                0.5 * memory["relevance"] +
                0.3 * memory["keyword_score"] +
                0.2 * memory["recency_score"]
            )

    def __del__(self):
        """清理资源"""
        try:
            # 保存最终的索引
            if hasattr(self, 'index') and self.index is not None:
                faiss.write_index(self.index, self.index_path)
            # 关闭数据库连接
            if hasattr(self, 'db'):
                self.db.close()
        except Exception as e:
            logger.error(f"清理资源时出错: {str(e)}")
            
    def pageQuery(self, page_num: int, page_size: int, owner: str = None) -> List[str]:
        """
        分页查询记忆
        Args:
            page_num: 页码（从1开始）
            page_size: 每页记录数
            owner: 所有者（可选）
        Returns:
            List[str]: 记忆文本列表
        """
        try:
            offset = (page_num - 1) * page_size
            
            # 构建SQL查询
            sql = "SELECT text FROM memory_metadata"
            params = []
            
            if owner:
                sql += " WHERE owner = ?"
                params.append(owner)
                
            sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([page_size, offset])
            
            # 执行查询
            cursor = self.db.execute(sql, params)
            results = [row[0] for row in cursor.fetchall()]
            
            logger.debug(f"分页查询返回 {len(results)} 条记录")
            return results
            
        except Exception as e:
            logger.error(f"分页查询失败: {str(e)}")
            stack_trace = traceback.format_exc()
            logger.error(f"详细错误信息: {stack_trace}")
            return []  # 返回空列表
    
    def clear(self, owner: str) -> bool:
        """
        清除指定所有者的记忆
        Args:
            owner: 所有者
        Returns:
            bool: 是否清除成功
        """
        try:
            # 查询需要删除的向量ID
            cursor = self.db.execute(
                "SELECT vector_id FROM memory_metadata WHERE owner = ?",
                (owner,)
            )
            vector_ids = [row[0] for row in cursor.fetchall()]
            
            if not vector_ids:
                logger.info(f"未找到所有者 {owner} 的记忆")
                return True  # 没有记录也算成功
                
            # 从数据库中删除元数据
            self.db.execute("DELETE FROM memory_metadata WHERE owner = ?", (owner,))
            self.db.commit()
            
            # 清理缓存
            keys_to_remove = []
            for key in self.cache:
                if isinstance(self.cache[key], dict) and self.cache[key].get("owner") == owner:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self.cache[key]
                
            # 如果支持删除向量，则从索引中删除
            try:
                if hasattr(self.index, 'remove_ids'):
                    self.index.remove_ids(np.array(vector_ids, dtype=np.int64))
                    # 保存更新后的索引
                    faiss.write_index(self.index, self.index_path)
                    logger.info(f"从索引中移除了 {len(vector_ids)} 条向量")
            except Exception as idx_err:
                # FAISS的某些索引类型不支持移除操作，这是可接受的
                logger.warning(f"无法从索引中移除向量: {str(idx_err)}")
                
            logger.info(f"成功清除所有者 {owner} 的所有记忆")
            return True
            
        except Exception as e:
            logger.error(f"清除记忆失败: {str(e)}")
            stack_trace = traceback.format_exc()
            logger.error(f"详细错误信息: {stack_trace}")
            return False 