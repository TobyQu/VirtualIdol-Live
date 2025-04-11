import faiss
import numpy as np
import time
import os
import sqlite3
from ..base_storage import BaseStorage
from ...utils.snowflake_utils import SnowFlake
from ...memory.embedding import Embedding
import logging
import jieba.analyse

logger = logging.getLogger(__name__)

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
        self.embedding = Embedding()
        
        # 初始化FAISS索引
        if os.path.exists(self.index_path):
            logger.info(f"加载现有FAISS索引: {self.index_path}")
            try:
                self.index = faiss.read_index(self.index_path)
                logger.info(f"成功加载FAISS索引，包含 {self.index.ntotal} 条记录")
            except Exception as e:
                logger.error(f"加载索引失败: {str(e)}，创建新索引")
                # 使用IVF索引提高检索效率
                nlist = 100  # 聚类中心数量
                quantizer = faiss.IndexFlatL2(self.dimension)
                self.index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
                self.index.train(np.random.rand(1000, self.dimension).astype('float32'))
        else:
            logger.info(f"创建新的FAISS索引: {self.index_path}")
            nlist = 100
            quantizer = faiss.IndexFlatL2(self.dimension)
            self.index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
            self.index.train(np.random.rand(1000, self.dimension).astype('float32'))
        
        # 初始化SQLite元数据存储
        self.conn = sqlite3.connect(self.metadata_db)
        self.cursor = self.conn.cursor()
        self.cursor.execute('''
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
        self.conn.commit()
        logger.info(f"SQLite元数据存储初始化完成: {self.metadata_db}")
        
        # 初始化缓存
        self.cache = {}
        self.cache_size = 1000  # 缓存大小
        self.cache_ttl = 3600  # 缓存过期时间（秒）
        
        # 关键词提取器
        self.keyword_extractor = jieba.analyse.TFIDF()

    def _extract_keywords(self, text: str) -> str:
        """提取文本关键词"""
        keywords = self.keyword_extractor.extract_tags(text, topK=5)
        return ",".join(keywords)

    def search(self, query_text: str, limit: int, sender: str, owner: str) -> list[str]:
        """搜索相关记忆"""
        # 检查缓存
        cache_key = f"{query_text}_{sender}_{owner}"
        if cache_key in self.cache:
            cached_result = self.cache[cache_key]
            if time.time() - cached_result["timestamp"] < self.cache_ttl:
                return cached_result["result"]
        
        # 获取查询向量
        query_vector = self._get_embedding(query_text)
        
        # 提取查询关键词
        query_keywords = set(self._extract_keywords(query_text).split(","))
        
        # 搜索相似向量
        self.index.nprobe = 10  # 增加搜索范围
        D, I = self.index.search(np.array([query_vector], dtype=np.float32), limit*5)  # 获取更多候选
        
        # 获取匹配的记忆项
        memories = []
        for i, idx in enumerate(I[0]):
            if idx != -1:
                # 尝试从缓存获取
                memory = self.cache.get(idx)
                if memory is None:
                    self.cursor.execute(
                        "SELECT id, text, sender, owner, timestamp, importance_score, keywords FROM memory_metadata WHERE vector_id=?",
                        (int(idx),)
                    )
                    result = self.cursor.fetchone()
                    if result:
                        memory = {
                            "id": result[0],
                            "text": result[1],
                            "sender": result[2],
                            "owner": result[3],
                            "timestamp": result[4],
                            "importance_score": result[5],
                            "keywords": set(result[6].split(",")) if result[6] else set(),
                            "relevance": 1 - D[0][i]
                        }
                        self._update_cache(result[0], memory)
                
                if memory and memory["owner"] == owner and memory["sender"] == sender:
                    # 计算关键词匹配度
                    keyword_overlap = len(query_keywords & memory["keywords"])
                    memory["keyword_score"] = keyword_overlap / max(len(query_keywords), 1)
                    
                    memories.append(memory)
                    if len(memories) >= limit*3:  # 保留更多候选用于后续排序
                        break
        
        # 计算时效性和规范化分数
        self._compute_recency(memories)
        self._normalize_scores(memories)
        
        # 排序获取最高分的记忆
        memories = sorted(memories, key=lambda m: m["total_score"], reverse=True)
        
        result = []
        if len(memories) > 0:
            memories_text = [item['text'] for item in memories]
            memories_size = 5
            result = memories_text[:memories_size] if len(memories_text) >= memories_size else memories_text
        
        # 更新缓存
        self._update_cache(cache_key, {
            "result": result,
            "timestamp": time.time()
        })
        
        return result
    
    def pageQuery(self, page_num: int, page_size: int, expr: str = None) -> list[str]:
        """分页查询记忆"""
        offset = (page_num - 1) * page_size
        limit = page_size
        
        # 从expr中提取owner条件
        owner = None
        if expr and "owner" in expr:
            try:
                owner = expr.split("=")[1].strip("'\"")
            except:
                logger.warning(f"无法从表达式解析owner: {expr}")
        
        # 查询分页数据
        if owner:
            self.cursor.execute(
                "SELECT text FROM memory_metadata WHERE owner=? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                (owner, limit, offset)
            )
        else:
            self.cursor.execute(
                "SELECT text FROM memory_metadata ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                (limit, offset)
            )
            
        results = [row[0] for row in self.cursor.fetchall()]
        return results
    
    def save(self, pk: int, query_text: str, sender: str, owner: str, importance_score: int) -> None:
        """保存记忆"""
        # 获取向量嵌入
        embedding = self._get_embedding(query_text)
        
        # 提取关键词
        keywords = self._extract_keywords(query_text)
        
        # 添加到FAISS索引
        vector_id = pk  # 使用主键作为向量ID
        self.index.add_with_ids(np.array([embedding], dtype=np.float32), np.array([vector_id], dtype=np.int64))
        
        # 保存元数据到SQLite
        timestamp = time.time()
        self.cursor.execute(
            "INSERT INTO memory_metadata VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (pk, query_text, sender, owner, timestamp, importance_score, vector_id, keywords)
        )
        self.conn.commit()
        
        # 更新缓存
        self._update_cache(pk, {
            "text": query_text,
            "sender": sender,
            "owner": owner,
            "timestamp": timestamp,
            "importance_score": importance_score,
            "vector_id": vector_id,
            "keywords": keywords
        })
        
        # 定期保存索引（每100条记录保存一次）
        if self.index.ntotal % 100 == 0:
            self._save_index()
    
    def clear(self, owner: str) -> None:
        """清除指定owner的记忆"""
        # 获取需要删除的向量ID
        self.cursor.execute(
            "SELECT vector_id FROM memory_metadata WHERE owner = ?",
            (owner,)
        )
        vector_ids = [row[0] for row in self.cursor.fetchall()]
        
        if vector_ids:
            # 从FAISS索引中删除向量
            self.index.remove_ids(np.array(vector_ids, dtype=np.int64))
            
            # 从SQLite中删除元数据
            self.cursor.execute("DELETE FROM memory_metadata WHERE owner = ?", (owner,))
            self.conn.commit()
            
            # 清理缓存
            for key in list(self.cache.keys()):
                if isinstance(key, int) and key in vector_ids:
                    del self.cache[key]
            
            # 保存更新后的索引
            self._save_index()
        
        logger.info(f"已清除owner={owner}的所有记忆")
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """获取文本的向量表示"""
        embedding = self.embedding.get_embedding_from_language_model(text)
        return np.array(embedding, dtype=np.float32)
    
    def _compute_recency(self, memories):
        """计算时效性分数"""
        current_time = time.time()
        for memory in memories:
            time_diff = current_time - memory["timestamp"]
            memory["recency"] = 0.99 ** (time_diff / 3600)  # 指数衰减
    
    def _normalize_scores(self, memories):
        """规范化分数"""
        for memory in memories:
            # 综合评分：相关性(40%) + 重要性(30%) + 时效性(20%) + 关键词匹配度(10%)
            memory["total_score"] = (
                memory["relevance"] * 0.4 +
                memory["importance_score"] * 0.3 +
                memory["recency"] * 0.2 +
                memory.get("keyword_score", 0) * 0.1
            )
    
    def _save_index(self):
        """保存FAISS索引"""
        try:
            faiss.write_index(self.index, self.index_path)
            logger.info(f"FAISS索引已保存，包含 {self.index.ntotal} 条记录")
        except Exception as e:
            logger.error(f"保存FAISS索引失败: {str(e)}")
    
    def __del__(self):
        """清理资源"""
        try:
            if hasattr(self, 'conn'):
                self.conn.close()
            self._save_index()
        except:
            pass
    
    def _update_cache(self, key, value):
        """更新缓存"""
        if len(self.cache) >= self.cache_size:
            # 删除最旧的缓存项
            oldest_key = min(self.cache.items(), key=lambda x: x[1]["timestamp"])[0]
            del self.cache[oldest_key]
        self.cache[key] = value 