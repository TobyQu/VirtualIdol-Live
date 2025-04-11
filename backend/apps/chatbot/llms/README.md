# LLM模型调用框架重构说明

## 1. 重构目的

本次重构主要针对大语言模型调用框架进行优化，主要目标包括：

1. 解决循环导入问题
2. 提高代码可维护性
3. 增强错误处理能力
4. 实现负载均衡和限流
5. 添加监控统计功能

## 2. 主要改进

### 2.1 代码结构优化

重构后的目录结构：
```
llms/
├── __init__.py          # 模块导出
├── base.py              # 基础类和数据结构
├── llm_model_strategy.py # 策略模式和驱动类
├── openai/              # OpenAI实现
│   └── openai_chat_robot.py
├── ollama/              # Ollama实现
│   └── ollama_chat_robot.py
└── zhipuai/             # 智谱AI实现
    └── zhipuai_chat_robot.py
```

### 2.2 核心类说明

#### 2.2.1 基础类（base.py）

- `LlmResponse`: 统一响应数据结构
- `LlmMetrics`: 监控指标数据结构
- `BaseLlmGeneration`: 基础生成类，提供共享功能

#### 2.2.2 策略类（llm_model_strategy.py）

- `LlmModelStrategy`: 策略接口
- `LlmLoadBalancer`: 负载均衡器
- `LlmMonitor`: 监控统计
- `LlmModelDriver`: 模型驱动

### 2.3 功能增强

#### 2.3.1 错误处理
- 统一的错误处理机制
- 详细的错误日志记录
- 友好的错误提示

#### 2.3.2 限流保护
- 并发请求数限制
- 请求间隔控制
- 信号量保护

#### 2.3.3 负载均衡
- 多实例管理
- 轮询调度
- 线程安全

#### 2.3.4 监控统计
- 请求成功率统计
- 响应时间统计
- 令牌使用统计
- 错误追踪

## 3. 使用说明

### 3.1 基本使用

```python
from chatbot.llms import LlmModelDriver

# 创建驱动实例
driver = LlmModelDriver()

# 普通对话
response = driver.chat(
    prompt="你的提示词",
    type="openai",  # 或 "ollama", "zhipuai"
    role_name="助手",
    you_name="用户",
    query="用户的问题",
    short_history=history,
    long_history=long_history
)

# 流式对话
driver.chatStream(
    prompt="你的提示词",
    type="openai",
    role_name="助手",
    you_name="用户",
    query="用户的问题",
    history=history,
    realtime_callback=callback,
    conversation_end_callback=end_callback
)
```

### 3.2 监控统计

```python
# 获取特定模型的统计信息
metrics = driver.get_metrics("openai")
print(f"总请求数: {metrics.total_requests}")
print(f"成功率: {metrics.successful_requests / metrics.total_requests * 100}%")
print(f"平均响应时间: {metrics.average_response_time}秒")

# 获取所有模型的统计信息
all_metrics = driver.get_all_metrics()
```

## 4. 最佳实践

1. **错误处理**
   - 始终使用try-except捕获异常
   - 记录详细的错误日志
   - 提供友好的错误提示

2. **性能优化**
   - 合理设置并发限制
   - 监控响应时间
   - 及时处理异常情况

3. **监控告警**
   - 设置成功率阈值
   - 监控响应时间
   - 关注错误率变化

## 5. 后续优化计划

1. 添加更多负载均衡策略
2. 实现自动扩缩容
3. 增加更多监控指标
4. 优化错误重试机制
5. 添加性能分析工具 