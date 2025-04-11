# 从旧配置系统迁移到新配置系统

本文档提供了从旧配置系统迁移到新配置系统的详细指南。

## 迁移概述

新配置系统已经设计为与旧系统保持向后兼容，但仍建议进行有计划的迁移，以确保平稳过渡。

## 迁移步骤

### 1. 备份现有配置

在开始迁移前，请备份当前的配置：

```bash
# 备份数据库配置(如果使用SQLite)
cp backend/storage/db/db.sqlite3 backend/storage/db/db.sqlite3.backup

# 备份配置文件
cp backend/apps/chatbot/config/sys_config.json backend/apps/chatbot/config/sys_config.json.backup
```

### 2. 安装新系统所需依赖

新配置系统依赖于 Pydantic 库，确保已安装：

```bash
pip install pydantic>=2.0.0
```

### 3. 启用新配置系统

新配置系统默认启用，但您可以通过环境变量控制：

```bash
# 启用新配置系统（默认）
export USE_NEW_CONFIG=true

# 使用旧配置系统（如果需要）
export USE_NEW_CONFIG=false
```

### 4. 使用新的导入路径

从应用代码中使用新的配置系统：

```python
# 旧方式 - 仍然支持，但不推荐
from backend.apps.chatbot.config import singleton_sys_config

# 新方式 - 获取SysConfig实例
from backend.apps.chatbot.config import get_sys_config
sys_config = get_sys_config()

# 新方式 - 直接获取配置对象
from backend.apps.chatbot.config import get_config
config = get_config()
```

### 5. 测试配置系统

运行提供的测试脚本以验证配置系统是否正常工作：

```bash
python -m backend.apps.chatbot.config.test_config
```

### 6. 分阶段迁移应用代码

1. **识别配置使用点**：
   - 查找所有使用 `singleton_sys_config` 的地方
   - 查找所有调用原始配置文件的地方

2. **更新导入**：
   ```python
   # 变更前
   from backend.apps.chatbot.config import singleton_sys_config
   
   # 变更后
   from backend.apps.chatbot.config import get_sys_config
   sys_config = get_sys_config()
   ```

3. **利用新功能**：
   - 使用 `get_config()` 获取类型安全的配置对象
   - 利用 Pydantic 模型的类型检查功能

### 7. 完全迁移后的清理

一旦所有代码都迁移到新配置系统，可以考虑移除旧系统：

1. 设置 `USE_NEW_CONFIG=true` 为默认值
2. 将 `sys_config.py` 重命名为 `old_sys_config.py`
3. 将 `new_sys_config.py` 重命名为 `sys_config.py`

## 向后兼容性注意事项

1. `singleton_sys_config` 变量仍然可用，但现在指向 `get_sys_config()` 的结果
2. 旧的 `SysConfig` 类通过环境变量仍可启用
3. 配置文件格式保持兼容

## 故障排除

### 问题：启动时配置加载失败

**症状**：应用启动时出现配置加载错误

**解决方案**：
1. 检查配置文件和数据库中的配置格式是否有效
2. 临时设置 `USE_NEW_CONFIG=false` 回退到旧配置系统
3. 检查日志中的详细错误信息

### 问题：配置验证错误

**症状**：出现 Pydantic 验证错误

**解决方案**：
1. 检查配置值是否符合模型定义的类型要求
2. 更新配置以匹配模型要求
3. 如有必要，调整模型定义以兼容现有配置

### 问题：使用旧API的代码报错

**症状**：调用旧配置API的代码出现错误

**解决方案**：
1. 确保正确导入了配置模块
2. 使用新的API访问配置
3. 检查调用代码中的属性名是否匹配新配置模型

## 联系支持

如有任何迁移问题，请联系项目维护团队获取支持。 