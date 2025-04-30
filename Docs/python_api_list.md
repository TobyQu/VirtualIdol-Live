# Python API 迁移进度文档

本文档列出了 VirtualWife 项目中所有基于 Python 实现的 API 接口，并跟踪它们向 NextJS 的迁移进度。

## 目录

- [聊天模块 (Chatbot)](#聊天模块-chatbot)
- [语音模块 (Speech)](#语音模块-speech)
- [状态图例](#状态图例)
- [API 响应格式](#api-响应格式)
- [迁移注意事项](#迁移到-nextjs-注意事项)
- [迁移日志](#迁移日志)

## 聊天模块 (Chatbot)

API 基础路径：`/chatbot/`

| 状态 | API 路径 | 方法 | 功能描述 | 参数 | NextJS 实现路径 | 备注 |
|------|---------|------|----------|------|----------------|------|
| ✅ | `chat/` | POST | 用户与虚拟角色的聊天接口 | query, you_name, user_id, role_id | /api/v1/chat | 使用Vercel AI SDK实现 |
| ✅ | `memory/clear/` | GET | 清除记忆 | - | /api/v1/chat/memory/clear | 简化实现 |
| ✅ | `customrole/list/` | GET | 获取自定义角色列表 | - | /api/v1/chatbot/customrole/list | 使用JSON文件存储角色数据 |
| ✅ | `customrole/create/` | POST | 创建自定义角色 | - | /api/v1/chatbot/customrole/create | 使用JSON文件存储角色数据 |
| ✅ | `customrole/edit/<int:pk>/` | POST | 编辑自定义角色 | pk | /api/v1/chatbot/customrole/edit/[id] | 使用JSON文件存储角色数据 |
| ✅ | `customrole/detail/<int:pk>/` | GET | 获取自定义角色详情 | pk | /api/v1/chatbot/customrole/detail/[id] | 使用JSON文件存储角色数据 |
| ✅ | `customrole/delete/<int:pk>/` | POST | 删除自定义角色 | pk | /api/v1/chatbot/customrole/delete/[id] | 使用JSON文件存储角色数据 |
| ✅ | `config/get/` | GET | 获取系统配置 | - | /api/v1/chatbot/config/get | 使用v1版本路径，并在前端HTTP客户端中添加了特殊处理 |
| ✅ | `config/save/` | POST | 保存系统配置 | - | /api/v1/chatbot/config/save | 使用JSON文件存储配置 |
| ✅ | `config/background/delete/<int:pk>/` | POST | 删除背景图片 | pk | | `/api/v1/assets/background` (DELETE) |
| ✅ | `config/background/upload/` | POST | 上传背景图片 | - | | `/api/v1/assets/background` (POST) |
| ✅ | `config/background/show/` | GET | 显示背景图片 | - | | `/api/v1/assets/background` (GET) |
| ✅ | `config/vrm/delete/<int:pk>/` | POST | 删除VRM模型 | pk | | `/api/v1/assets/vrm` (DELETE) |
| ✅ | `config/vrm/upload/` | POST | 上传VRM模型 | - | | `/api/v1/assets/vrm` (POST) |
| ✅ | `config/vrm/user/show/` | GET | 显示用户VRM模型 | - | | `/api/v1/assets/vrm` (GET) |
| ✅ | `config/vrm/system/show/` | GET | 显示系统VRM模型 | - | | `/api/v1/assets/vrm` (GET) |
| ⬜ | `rolepackage/upload/` | POST | 上传角色包 | - | | |
| ✅ | `memory/status/` | GET | 检查记忆状态 | - | /api/v1/chat/memory/status | 简化实现 |
| ✅ | `memory/reinitialize/` | POST | 重新初始化记忆服务 | - | /api/v1/chat/memory/reinitialize | 简化实现 |

## 语音模块 (Speech)

API 基础路径：`/api/speech/`

| 状态 | API 路径 | 方法 | 功能描述 | 参数 | NextJS 实现路径 | 备注 |
|------|---------|------|----------|------|----------------|------|
| ✅ | `tts/generate/` | POST | 根据文本生成音频 | text, voice_id, tts_type, emotion | /api/v1/speech/tts/generate | 实现基于Koeiromap的语音合成，并保留Minimax接口 |
| ✅ | `tts/stream/` | POST | 生成流式音频 | text, voice_id, tts_type, emotion, format | /api/v1/speech/tts/stream | 返回二进制音频数据 |
| ✅ | `tts/voices/` | POST | 获取可用的声音列表 | type | /api/v1/speech/tts/voices | 支持不同TTS引擎的声音列表 |
| ✅ | `tts/emotions/` | GET | 获取支持的情绪列表 | - | /api/v1/speech/tts/emotions | 返回所有支持的情绪类型 |
| ✅ | `translation/` | POST | 文本翻译服务 | text, source_lang, target_lang | /api/v1/speech/translation | 支持多语言翻译 |

## 状态图例

- ⬜ 未开始
- 🟡 进行中
- ✅ 已完成
- ❌ 暂不迁移

## API 响应格式

1. Python 端 API 返回格式：
   ```json
   {
     "code": 0,             // 状态码，0 表示成功
     "message": "success",  // 状态消息
     "response": {}         // 响应数据
   }
   ```

2. 错误响应格式：
   ```json
   {
     "code": 500,
     "message": "服务器错误",
     "response": null
   }
   ```

## 迁移到 NextJS 注意事项

在迁移过程中需要关注以下几点：

1. **路由兼容性**：确保 NextJS API 路由结构与现有 Python API 保持一致
   - Python：`/chatbot/chat/`
   - NextJS：`/api/v1/chatbot/chat`

2. **数据存储**：
   - Python：使用 Django ORM 和数据库
   - NextJS：考虑使用文件系统、数据库或云存储方案

3. **实时通信**：
   - Python：Django Channels
   - NextJS：Socket.io 或 Server-Sent Events

4. **文件处理**：
   - 背景图片、VRM 模型等资源的存储和访问方式
   - 考虑使用 S3 兼容的云存储

5. **鉴权方案**：
   - 当前系统无鉴权要求
   - 可考虑迁移时添加基本的 API 保护机制

6. **域名和环境**：
   - 迁移后的API使用版本化路径（如`/v1/...`）
   - 开发环境中API请求发送到NextJS服务（http://localhost:3000/api）
   - 生产环境中API请求发送到统一域名（/api）

## 迁移日志

| 日期 | 迁移内容 | 状态 | 备注 |
|------|----------|------|------|
| 2023.11.10 | config/get/ | ✅ | 系统配置获取接口，实现在 /api/v1/chatbot/config/get |
| 2023.11.10 | config/save/ | ✅ | 系统配置保存接口，实现在 /api/v1/chatbot/config/save |
| 2023.11.11 | customrole/ 系列API | ✅ | 自定义角色管理相关接口，包括列表、创建、编辑、详情和删除 |
| 2024.02.15 | assets/ 系列API | ✅ | 资产管理相关接口规范化，包括背景图片、VRM模型和动画文件的管理 |
| 2024.05.30 | chat/stream API | ✅ | 支持多种LLM的流式聊天接口 |
| 2024.05.30 | tts 相关API | ✅ | 实现完整的TTS接口，支持Koeiromap |