import faiss
import numpy as np
import time
import os
import sqlite3
from ..base_storage import BaseStorage
from ...utils.snowflake_utils import SnowFlake
from ...memory.embedding import Embedding
import logging

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
                self.index = faiss.IndexFlatL2(self.dimension)
        else:
            logger.info(f"创建新的FAISS索引: {self.index_path}")
            self.index = faiss.IndexFlatL2(self.dimension)
        
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
                importance_score INTEGER
            )
        ''')
        self.conn.commit()
        logger.info(f"SQLite元数据存储初始化完成: {self.metadata_db}")
    
    def search(self, query_text: str, limit: int, sender: str, owner: str) -> list[str]:
        """搜索相关记忆"""
        # 获取查询向量
        query_vector = self._get_embedding(query_text)
        
        # 搜索相似向量
        D, I = self.index.search(np.array([query_vector], dtype=np.float32), limit*3)  # 获取更多候选，便于后续过滤
        
        # 获取匹配的记忆项
        memories = []
        for i, idx in enumerate(I[0]):
            if idx != -1:  # FAISS可能返回-1表示无匹配项
                self.cursor.execute(
                    "SELECT id, text, sender, owner, timestamp, importance_score FROM memory_metadata WHERE rowid=?",
                    (int(idx)+1,)  # FAISS索引从0开始，SQLite rowid从1开始
                )
                result = self.cursor.fetchone()
                if result and result[3] == owner and result[2] == sender:
                    memory = {
                        "id": result[0],
                        "text": result[1],
                        "sender": result[2],
                        "owner": result[3],
                        "timestamp": result[4],
                        "importance_score": result[5],
                        "relevance": 1 - D[0][i]  # 相似度分数
                    }
                    memories.append(memory)
                    
                    if len(memories) >= limit:
                        break
        
        # 计算时效性和规范化分数
        self._compute_recency(memories)
        self._normalize_scores(memories)
        
        # 排序获取最高分的记忆
        memories = sorted(memories, key=lambda m: m["total_score"], reverse=True)
        
        if len(memories) > 0:
            memories_text = [item['text'] for item in memories]
            memories_size = 5
            memories_text = memories_text[:memories_size] if len(memories_text) >= memories_size else memories_text
            return memories_text
        else:
            return []
    
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
        
        # 添加到FAISS索引
        self.index.add(np.array([embedding], dtype=np.float32))
        index_id = self.index.ntotal - 1  # 新添加向量的ID
        
        # 保存元数据到SQLite
        timestamp = time.time()
        self.cursor.execute(
            "INSERT INTO memory_metadata VALUES (?, ?, ?, ?, ?, ?)",
            (pk, query_text, sender, owner, timestamp, importance_score)
        )
        self.conn.commit()
        
        # 定期保存索引（每10条记录保存一次）
        if self.index.ntotal % 10 == 0:
            self._save_index()
    
    def clear(self, owner: str) -> None:
        """清除指定owner的记忆"""
        # 由于FAISS不支持直接删除，我们需要:
        # 1. 删除SQLite中的数据
        # 2. 重建FAISS索引
        
        # 获取需要保留的记录
        self.cursor.execute(
            "SELECT id, text, sender, owner, timestamp, importance_score FROM memory_metadata WHERE owner != ?",
            (owner,)
        )
        remaining_records = self.cursor.fetchall()
        
        # 清空SQLite表格中指定owner的数据
        self.cursor.execute("DELETE FROM memory_metadata WHERE owner = ?", (owner,))
        self.conn.commit()
        
        # 如果没有剩余记录，直接清空索引
        if not remaining_records:
            self.index = faiss.IndexFlatL2(self.dimension)
            self._save_index()
            return
            
        # 重建FAISS索引
        new_index = faiss.IndexFlatL2(self.dimension)
        for record in remaining_records:
            embedding = self._get_embedding(record[1])  # 获取文本的向量表示
            new_index.add(np.array([embedding], dtype=np.float32))
        
        # 替换旧索引
        self.index = new_index
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
            memory["total_score"] = memory["relevance"] + memory["importance_score"] + memory["recency"]
    
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