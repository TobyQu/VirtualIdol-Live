# 动画资源文档

本文档介绍项目中使用的3D人物动画资源，包括动画文件的来源、获取方法和使用说明。

## 动画文件列表

项目中使用的主要动画文件包括：

### 日常动作 (daily)
- `idle_01.fbx` - 日常待机 1
- `idle_02.fbx` - 日常待机 2
- `idle_03.fbx` - 日常待机 3
- `idle_happy_01.fbx` - 愉快待机 1
- `idle_happy_02.fbx` - 愉快待机 2
- `idle_happy_03.fbx` - 愉快待机 3
- `standing_greeting.fbx` - 站立问候
- `thinking.fbx` - 思考
- `talking_01.fbx` - 说话 1
- `talking_02.fbx` - 说话 2
- `sitting.fbx` - 坐姿
- `kiss_01.fbx` - 亲吻

### 表情动作 (emote)
- `excited.fbx` - 兴奋
- `angry.fbx` - 愤怒

### 舞蹈动作 (dance)
- `silly_dancing.fbx` - 滑稽舞蹈
- `rumba_dancing.fbx` - 伦巴舞

### 其他动作 (根目录)
- `idle_loop.vrma` - 循环待机

## 动画分类说明

项目中的动画按照功能和用途分为几个不同的目录：

1. **日常动作 (daily)**：包含日常生活中的常见动作，如站立、待机、思考等
2. **表情动作 (emote)**：包含各种情绪表达的动作，如兴奋、愤怒等
3. **舞蹈动作 (dance)**：包含各种舞蹈相关动作，如滑稽舞蹈、伦巴舞等
4. **其他动作**：放置在根目录的特殊动作

## 动画资源来源

这些动画文件可以从以下几个来源获取：

### 1. Mixamo平台
- Mixamo是Adobe旗下的3D动画平台，提供大量免费的角色动画
- 网址：[https://www.mixamo.com](https://www.mixamo.com)
- 您可以在该平台上找到项目中使用的许多动画，如idle、walking、talking等
- Mixamo提供FBX格式下载，正好与项目使用的格式匹配

### 2. Ready Player Me
- 一些VRM和动画可能来自ReadyPlayerMe平台
- 网址：[https://readyplayer.me](https://readyplayer.me)

### 3. VRoid Hub
- VRM模型和一些基础动画的来源
- 网址：[https://hub.vroid.com](https://hub.vroid.com)

### 4. Sketchfab
- 提供多种3D模型和动画
- 网址：[https://sketchfab.com](https://sketchfab.com)
- 有些模型提供商也会附带基本动画

## 获取动画文件的方法

### 直接使用Mixamo
1. 在Mixamo上注册账号并登录
2. 搜索相应动画名称（如"idle"、"thinking"等）
3. 选择喜欢的动画，调整参数
4. 下载为FBX格式（推荐设置：无皮肤，30帧/秒，无压缩）
5. 将下载的文件放入项目的`public/assets/animations/daily`或`public/assets/animations/emote`目录

### 其他模型资源市场
- Unity Asset Store：[https://assetstore.unity.com](https://assetstore.unity.com)
- Unreal Marketplace：[https://www.unrealengine.com/marketplace](https://www.unrealengine.com/marketplace)
- CGTrader：[https://www.cgtrader.com](https://www.cgtrader.com)

## VRM动画转换与兼容性

项目使用了混合动画系统，特别是通过`loadMixamoAnimation`函数将Mixamo的FBX动画转换为VRM模型可用的格式。这种转换可以通过以下工具实现：

- VRM Animation Tools：[https://github.com/vrm-c/UniVRM](https://github.com/vrm-c/UniVRM)
- Three.js VRM动画适配器（项目内使用了自定义工具）

## 使用动画的步骤

1. 下载FBX格式的动画文件
2. 放入项目中对应目录（如`public/assets/animations/daily/`）
3. 重启应用或刷新页面，让系统自动加载新的动画文件
4. 在动作选项卡中找到并播放新添加的动画

## 注意事项

- **版权和许可证**：使用这些资源时需要注意版权和许可证。Mixamo的动画对个人项目免费，但商业使用可能需要额外许可。其他平台上的资源可能有不同的使用条款。
- **文件大小**：FBX动画文件通常较大（1-3MB），可能影响加载性能
- **动画兼容性**：并非所有动画都能完美适配所有VRM模型，可能需要调整或修改
- **动画名称**：为保持一致性，建议使用小写字母和下划线命名动画文件（如`idle_01.fbx`）

## 动画加载机制

项目中的动画加载流程：

1. 加载VRM模型后，系统首先加载一个基础动画（idle_01）
2. 然后在后台异步加载其他动画文件
3. 当点击动作选项卡中的动画时，系统会检查该动画是否已加载
4. 如果尚未加载，系统会尝试即时加载该动画
5. 加载成功后即可播放动画

## 自定义动画

您也可以自制动画并添加到项目中：

1. 使用Blender或Maya等3D软件创建动画
2. 导出为FBX格式
3. 确保骨骼结构与VRM模型兼容
4. 添加到项目相应目录中
5. 在动画设置中添加相应的中文名称映射

---

如有更多问题或需要更详细的信息，请参考项目代码或联系开发团队。 