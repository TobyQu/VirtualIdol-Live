# VirtualWife 项目 API 迁移日志

本文档记录 VirtualWife 项目从 Python 后端迁移到 NextJS 过程中的详细日志。

## 2023.11.11 - 角色管理 API 迁移

### 迁移内容

已完成角色管理相关 API 的迁移：
1. `/chatbot/customrole/list/` - 获取自定义角色列表
2. `/chatbot/customrole/create/` - 创建自定义角色
3. `/chatbot/customrole/edit/<int:pk>/` - 编辑自定义角色
4. `/chatbot/customrole/detail/<int:pk>/` - 获取自定义角色详情
5. `/chatbot/customrole/delete/<int:pk>/` - 删除自定义角色

### 实现细节

#### 1. 角色数据存储方案

- **存储媒介**: 使用 JSON 文件存储角色数据
- **文件路径**: `/data/roles.json`
- **数据结构**: 与原 Python 实现的 CustomRoleModel 保持一致

我们创建了专用的角色存储工具 `roleStorage.ts`，提供以下功能：
- 完整的角色管理 CRUD 操作
- 缓存机制，减少文件 I/O 操作
- 安全的文件写入（使用临时文件和原子重命名）
- 自动备份
- 统一的错误处理

#### 2. API 路径和实现

- **获取角色列表 API**: `/api/v1/chatbot/customrole/list`
  - 方法: GET
  - 响应: 角色列表数组

- **获取角色详情 API**: `/api/v1/chatbot/customrole/detail/[id]`
  - 方法: GET
  - 参数: 角色ID
  - 响应: 角色详细信息

- **创建角色 API**: `/api/v1/chatbot/customrole/create`
  - 方法: POST
  - 请求体: 角色信息
  - 响应: 创建状态

- **编辑角色 API**: `/api/v1/chatbot/customrole/edit/[id]`
  - 方法: POST
  - 参数: 角色ID
  - 请求体: 更新的角色信息
  - 响应: 更新状态

- **删除角色 API**: `/api/v1/chatbot/customrole/delete/[id]`
  - 方法: POST
  - 参数: 角色ID
  - 响应: 删除状态

#### 3. 前端适配

- 更新了 `customRoleApi.ts` 中的函数，使用新的 API 路径
- 修改了错误处理，提供更具体的错误信息
- 统一使用数字状态码 `200` 代替原来的字符串 `"200"`

### 技术选择

- 使用 NextJS 内置的文件系统 API (`fs`) 读取和写入角色数据
- 与配置 API 采用相同的存储模式，便于维护和扩展
- 实现简单的内存缓存机制，减少文件 I/O 操作

### 优势和改进

相比原 Python 实现，本次迁移有以下改进：

1. **数据一致性**:
   - 使用原子文件操作确保数据一致性
   - 自动备份机制防止数据丢失

2. **错误处理**:
   - 更详细的错误信息和状态码
   - 统一的错误响应格式

3. **代码组织**:
   - 将角色数据管理逻辑抽象到独立模块
   - 使用 TypeScript 类型系统增强代码稳定性

### 下一步计划

1. 实现角色包相关 API
2. 添加测试用例确保功能稳定性
3. 考虑添加数据验证机制

## 2023.11.10 - 配置相关 API 迁移

### 迁移内容

已完成配置相关 API 的迁移：
1. `/chatbot/config/get/` - 获取系统配置
2. `/chatbot/config/save/` - 保存系统配置

### 实现细节

#### 1. 配置存储方案

- **存储媒介**: 使用 JSON 文件存储配置数据
- **文件路径**: `/data/config.json`
- **默认配置**: 包含与原 Python 实现相同的默认配置结构

我们创建了专用的配置存储工具 `configStorage.ts`，提供以下功能：
- 缓存机制，减少文件 I/O 操作
- 安全的文件写入（使用临时文件和原子重命名）
- 自动备份
- 统一的错误处理

#### 2. API 路径和实现

- **获取配置 API**: `/api/v1/chatbot/config/get`
  - 方法: GET
  - 响应: 与原 Python API 保持一致的 JSON 格式

- **保存配置 API**: `/api/v1/chatbot/config/save`
  - 方法: POST
  - 请求体: 配置 JSON 对象
  - 响应: 成功/失败状态

#### 3. 前端适配

- 修改了 HTTP 客户端，为 v1 版本 API 设置不同的基础 URL
- 在开发环境中，v1 API 请求将发送到 NextJS 服务 (http://localhost:3000/api)
- 在生产环境中，保持统一路径 (/api)
- 更新了 `configApi.ts` 中的获取和保存函数，使用新的 API 路径

### 技术选择

- 使用 NextJS 内置的文件系统 API (`fs`) 读取和写入配置文件
- 实现简单的内存缓存机制，减少文件 I/O 操作
- 采用版本化 API 路径结构，便于后续 API 版本管理

### 优势和改进

相比原 Python 实现，本次迁移有以下改进：

1. **性能优化**:
   - 添加了内存缓存，减少文件读取操作
   - 缓存默认有效期为 1 分钟，可根据需要调整

2. **数据安全**:
   - 实现了安全的文件写入机制，使用临时文件和原子重命名
   - 自动创建配置文件备份，防止数据丢失

3. **代码组织**:
   - 将配置存储逻辑抽象到独立模块，提高可维护性
   - 使用 TypeScript 类型系统增强代码稳定性

### 下一步计划

1. 实现其他配置相关 API，如背景图片和 VRM 模型管理
2. 考虑添加配置验证机制，确保数据完整性
3. 完善错误处理和日志记录

## 2024.2.15 - 资产相关 API 规范化

### 迁移内容

完成了资产相关 API 的规范化重构，将散乱的资产 API 统一到 v1 规范下：

1. 背景图片相关 API:
   - `GET /api/v1/assets/background` - 获取背景图片列表
   - `POST /api/v1/assets/background` - 上传背景图片
   - `DELETE /api/v1/assets/background` - 删除背景图片

2. VRM 模型相关 API:
   - `GET /api/v1/assets/vrm` - 获取 VRM 模型列表
   - `POST /api/v1/assets/vrm` - 上传 VRM 模型
   - `DELETE /api/v1/assets/vrm` - 删除 VRM 模型

3. 动画文件相关 API:
   - `GET /api/v1/assets/animation` - 获取动画文件列表（可按 daily/emote/dance 分类）
   - `POST /api/v1/assets/animation` - 上传动画文件
   - `DELETE /api/v1/assets/animation` - 删除动画文件

4. 综合资产列表 API:
   - `GET /api/v1/assets` - 获取所有资产列表（包括背景、VRM 和动画）

### 实现细节

#### 1. API 结构规范化

- **统一目录结构**: 创建 `/api/v1/assets` 目录，所有资产相关 API 置于此目录下
- **统一命名规范**: 采用 RESTful 风格命名，资源名称使用单数形式
- **统一接口设计**: 每个资源类型通过 HTTP 方法区分操作（GET/POST/DELETE）

#### 2. 废弃和替换的 API

迁移过程中，以下旧 API 已被移除并替换：

- `GET /api/public-assets` → `GET /api/v1/assets`
- `POST /api/save-asset` → `POST /api/v1/assets/{资产类型}`
- `DELETE /api/delete-asset` → `DELETE /api/v1/assets/{资产类型}`
- `GET /api/list-animations` → `GET /api/v1/assets/animation?dir={类别}`

#### 3. 前端适配

- 更新了 `mediaApi.ts` 中的函数，使用新的规范化 API 路径：
  - `getAssets()` → `fetchPublicAssets()`
  - 调整了 `saveAsset()` 和 `deleteAsset()` 函数以适配新的 API 结构
- 修改了使用这些 API 的组件：
  - `animation-settings.tsx`
  - `assets-settings.tsx`
  - `character-settings.tsx`

### 技术选择

- 采用 RESTful API 设计风格，提高 API 的可理解性和一致性
- 使用相同的后端实现逻辑，仅调整路径和接口设计
- 版本化 API 路径（v1），便于后续 API 版本管理和迭代

### 优势和改进

相比原实现，本次规范化有以下改进：

1. **一致性和可维护性**:
   - 统一的 API 路径结构，便于理解和使用
   - 相似资源使用一致的接口设计，减少学习成本
   - 版本化管理，便于后续迭代和兼容性维护

2. **代码组织**:
   - 将相关功能组织在同一目录下，提高代码可发现性
   - 每个资源类型对应独立的处理文件，便于维护和扩展

3. **接口设计**:
   - 统一使用 HTTP 方法表示操作类型，符合 RESTful 设计原则
   - 资源路径更加直观，反映了资源的层次关系

### 下一步计划

1. 完善资产管理功能，如分页、搜索和排序
2. 实现资产元数据管理，如标签和描述
3. 考虑添加资产缓存机制，提高访问性能
4. 完善错误处理和日志记录 

## 2024.5.30 - 聊天流式 API 完善与 TTS API 初步迁移

### 迁移内容

目前项目完成了以下 API 的迁移和优化：

1. **聊天流式 API 的全面改进**：
   - 支持多种大语言模型：OpenAI、Ollama、智谱AI、通义千问(Qwen)
   - 统一使用 Server-Sent Events (SSE) 流式响应格式
   - 完善错误处理和参数验证

2. **TTS API 初步迁移**：
   - 实现了基本的 `/api/tts` 接口，支持集成 Koeiromap 语音合成
   - 前端 ttsApi.ts 中保留了与原 Python 实现的兼容接口

### 迁移状态

#### 已完成迁移的 API:
- 配置管理 API (`/api/v1/chatbot/config/get`, `/api/v1/chatbot/config/save`)
- 角色管理 API (`/api/v1/chatbot/customrole/*`)
- 聊天核心 API (`/api/v1/chat`, `/api/v1/chat/stream`, `/api/v1/chat/memory/*`)
- 资产管理 API (`/api/v1/assets/*`)

#### 待完成迁移的 API:
- **语音合成 API**:
  - `/api/speech/tts/generate/` - 根据文本生成音频
  - `/api/speech/tts/stream/` - 生成流式音频
  - `/api/speech/tts/voices/` - 获取可用的声音列表
  - `/api/speech/tts/emotions/` - 获取支持的情绪列表
- **翻译 API**:
  - `/api/speech/translation/` - 文本翻译服务

### 实现细节

1. **NextJS 全栈架构的优势**
   - 前后端使用 TypeScript，提高代码一致性和类型安全
   - 通过 API 路由，简化服务端功能实现
   - 减少跨域问题，降低部署复杂度

2. **聊天 API 实现规范**
   - 使用 OpenAI 兼容格式设计 API
   - 通过适配器模式支持多种 LLM 服务
   - 统一错误处理和响应格式

3. **TTS API 迁移策略**
   - 初步实现了基于 Koeiromap 的语音合成
   - 保留了与原 Python TTS API 的兼容接口
   - 前端和后端接口设计遵循 RESTful 规范

### 技术选择

1. **流式响应技术**
   - 使用 Server-Sent Events (SSE) 实现实时文本流
   - 统一各种 LLM 提供商的流式响应格式

2. **音频处理**
   - 使用 ArrayBuffer 和二进制数据处理音频流
   - 支持 MP3 格式音频生成

### 下一步计划

1. **完成 TTS API 迁移**
   - 实现 `/api/v1/tts/generate` 和 `/api/v1/tts/stream` 接口
   - 支持 Minimax 等多种语音合成引擎
   - 实现情绪支持和声音列表功能

2. **翻译 API 实现**
   - 实现 `/api/v1/translation` 接口
   - 支持多种语言翻译
   - 与聊天功能集成，提供实时翻译能力

3. **测试与稳定性提升**
   - 为已迁移 API 添加单元测试和集成测试
   - 完善错误处理和日志记录
   - 优化性能和响应速度 