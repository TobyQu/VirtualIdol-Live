# 长期记忆模块

本模块提供虚拟伴侣的长期记忆功能，使AI助手能够记住过去的对话内容，并在适当的时候召回相关信息。

## 架构设计

记忆系统采用双层架构：

1. **短期记忆**：基于本地数据库存储最近的对话历史
2. **长期记忆**：使用FAISS向量存储实现语义化记忆检索

## 主要组件

### 1. 存储驱动 (MemoryStorageDriver)

负责协调短期和长期记忆的存储和检索，实现了以下功能：
- 保存对话到短期和长期记忆
- 检索相关记忆
- 清理记忆

### 2. 本地存储 (LocalStorage)

使用Django的ORM模型存储短期记忆，提供简单的分页查询功能。

### 3. FAISS向量存储 (FAISSStorage)

使用FAISS实现高效的向量相似度搜索，具有以下特点：
- 完全本地化部署，无需外部服务
- 基于SQLite存储元数据
- 高效的向量检索
- 综合评分机制（相关性、时效性、重要性）

### 4. 文本嵌入 (Embedding)

使用预训练中文模型将文本转换为向量表示：
- 模型：`hfl/chinese-roberta-wwm-ext`
- 向量维度：768

### 5. 记忆处理工具

包含两个辅助工具类：
- **MemorySummary**：生成对话摘要，减少存储空间并提高检索质量
- **MemoryImportance**：评估记忆的重要程度，用于记忆排序

## 使用方法

在系统配置中启用长期记忆功能：
```python
sys_config.enable_longMemory = True
```

启用摘要生成功能（可选）：
```python
sys_config.enable_summary = True 
sys_config.summary_llm_model_driver_type = "openai"  # 用于摘要的LLM模型
```

## 存储位置

FAISS索引和元数据默认存储在以下位置：
- 索引文件：`storage/memory/memory.index`
- 元数据：`storage/memory/memory_metadata.db`

可以通过前端设置页面修改存储路径。 