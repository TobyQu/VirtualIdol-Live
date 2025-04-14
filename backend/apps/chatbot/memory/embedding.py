import numpy as np
import hashlib
import logging

logger = logging.getLogger(__name__)

class Embedding:
    """简单的文本嵌入类，使用哈希函数生成伪向量，无需外部模型"""

    def __init__(self):
        self.dimension = 768  # 保持与原始模型相同的维度
        logger.info("初始化简单嵌入模型（无需下载外部模型）")
        
    def get_embedding_from_language_model(self, text: str):
        """
        使用哈希函数将文本转换为固定维度的向量
        这是一个简单的替代方案，不需要下载外部模型
        注意：这不是真正的语义向量，仅用于避免系统崩溃
        """
        try:
            if not text:
                return np.zeros(self.dimension, dtype=np.float32)
                
            # 将文本转换为UTF-8字节
            text_bytes = text.encode('utf-8')
            
            # 使用哈希函数生成伪随机向量
            vector = np.zeros(self.dimension, dtype=np.float32)
            
            # 将文本分成若干段，每段生成一个哈希值
            chunk_size = max(1, len(text) // 100)  # 确保至少有一个块
            chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
            
            for i, chunk in enumerate(chunks):
                # 使用不同的哈希种子处理每个块
                h = hashlib.sha256((chunk + str(i)).encode('utf-8')).digest()
                
                # 将哈希值转换为浮点数并填充向量的一部分
                for j in range(min(32, self.dimension // len(chunks))):
                    if i * 32 + j < self.dimension:
                        # 将字节值转换为-1到1之间的浮点数
                        vector[i * 32 + j] = (h[j] / 128.0) - 1.0
            
            # 规范化向量
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = vector / norm
                
            logger.debug(f"为文本生成了长度为{self.dimension}的伪向量")
            return vector
            
        except Exception as e:
            logger.error(f"生成向量失败: {str(e)}")
            return np.zeros(self.dimension, dtype=np.float32)
