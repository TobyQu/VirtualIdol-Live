# VirtualIdol Live

VirtualIdol Live是一个浏览器端3D虚拟伴侣应用，让用户可以与个性化的3D人物进行互动和对话。

## 功能特点

- 支持导入VRM模型文件，打造专属虚拟伴侣
- 语音识别与合成，实现自然交流体验
- 基于大语言模型的对话系统，提供智能回复
- 表情与动作系统，展现丰富情感表达
- 个性化设置，定制您理想的虚拟伴侣

## 技术栈

- 用户语音识别：Web Speech API
- 对话生成：大型语言模型API
- 语音合成：多种TTS引擎支持
- 3D角色渲染：three.js和@pixiv/three-vrm
- 前端框架：Next.js

## 本地开发

克隆此仓库到本地：

```bash
git clone <repository-url>
cd VirtualIdol Live/frontend
```

安装依赖：

```bash
bun install
```

启动开发服务器：

```bash
bun run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 配置

在使用前，您需要设置相关API密钥和配置。请参考`.env.example`文件创建您自己的`.env.local`文件。

## 许可证

本项目采用 [LICENSE] 许可证。