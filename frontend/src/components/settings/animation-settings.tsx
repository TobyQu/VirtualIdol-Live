import React, { useContext, useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { 
  PlayCircle, 
  PauseCircle,
} from "lucide-react";
import { getAssets } from "@/features/media/mediaApi";
import { showSuccess } from "@/lib/toast";

// 动作类型定义
type AnimationCategory = 'daily' | 'emote' | 'dance' | 'root';
type AnimationFile = {
  name: string;
  path: string;
  size: number;
  category: AnimationCategory;
  displayName?: string;
  chineseName?: string;
};

// 动作中文名称映射
const animationChineseNames: Record<string, string> = {
  // 日常动作
  "idle_01": "日常待机 1",
  "idle_02": "日常待机 2",
  "idle_03": "日常待机 3",
  "idle_happy_01": "愉快待机 1",
  "idle_happy_02": "愉快待机 2",
  "idle_happy_03": "愉快待机 3",
  "idle_loop": "循环待机",
  "standing_greeting": "站立问候",
  "thinking": "思考",
  "talking_01": "说话 1",
  "talking_02": "说话 2",
  "sitting": "坐姿",
  "kiss_01": "亲吻",
  
  // 表情动作
  "excited": "兴奋",
  "angry": "愤怒",
  
  // 舞蹈动作
  "silly_dancing": "滑稽舞蹈",
  "rumba_dancing": "伦巴舞",
};

export function AnimationSettings() {
  const [animations, setAnimations] = useState<AnimationFile[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const { viewer } = useContext(ViewerContext);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationsLoaded, setAnimationsLoaded] = useState(false);

  // 加载动画资源
  useEffect(() => {
    const loadAnimations = async () => {
      try {
        const data = await getAssets();
        
        // 将动画文件处理为更易于使用的格式
        const processedAnimations: AnimationFile[] = [];
        
        // 处理根目录的动画
        if (data.animation) {
          data.animation
            .filter(file => file.size > 0)
            .forEach(file => {
              const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
              const animFile: AnimationFile = {
                ...file,
                category: 'root',
                displayName: formatAnimationName(file.name),
                chineseName: animationChineseNames[nameWithoutExt] || formatAnimationName(file.name)
              };
              processedAnimations.push(animFile);
            });
        }
        
        // 获取daily目录下的动画
        try {
          const dailyData = await fetch('/api/list-animations?dir=daily');
          const dailyAnimations = await dailyData.json();
          
          if (dailyAnimations && dailyAnimations.length > 0) {
            dailyAnimations
              .filter((file: any) => file.size > 0)
              .forEach((file: any) => {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                const animFile: AnimationFile = {
                  ...file,
                  category: 'daily',
                  displayName: formatAnimationName(file.name),
                  chineseName: animationChineseNames[nameWithoutExt] || formatAnimationName(file.name)
                };
                processedAnimations.push(animFile);
              });
          }
        } catch (err) {
          console.error("加载daily动画失败:", err);
        }
        
        // 获取emote目录下的动画
        try {
          const emoteData = await fetch('/api/list-animations?dir=emote');
          const emoteAnimations = await emoteData.json();
          
          if (emoteAnimations && emoteAnimations.length > 0) {
            emoteAnimations
              .filter((file: any) => file.size > 0)
              .forEach((file: any) => {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                const animFile: AnimationFile = {
                  ...file,
                  category: 'emote',
                  displayName: formatAnimationName(file.name),
                  chineseName: animationChineseNames[nameWithoutExt] || formatAnimationName(file.name)
                };
                processedAnimations.push(animFile);
              });
          }
        } catch (err) {
          console.error("加载emote动画失败:", err);
        }
        
        // 获取dance目录下的动画
        try {
          const danceData = await fetch('/api/list-animations?dir=dance');
          const danceAnimations = await danceData.json();
          
          if (danceAnimations && danceAnimations.length > 0) {
            danceAnimations
              .filter((file: any) => file.size > 0)
              .forEach((file: any) => {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                const animFile: AnimationFile = {
                  ...file,
                  category: 'dance',
                  displayName: formatAnimationName(file.name),
                  chineseName: animationChineseNames[nameWithoutExt] || formatAnimationName(file.name)
                };
                processedAnimations.push(animFile);
              });
          }
        } catch (err) {
          console.error("加载dance动画失败:", err);
        }
        
        setAnimations(processedAnimations);
      } catch (error) {
        console.error("加载动画资源失败:", error);
      }
    };
    
    loadAnimations();
    
    // 监听动画加载完成事件
    if (viewer) {
      const handleAnimationsLoaded = () => {
        console.log("动画加载完成，刷新动画列表");
        setAnimationsLoaded(true);
        // 重新加载动画列表
        loadAnimations();
      };
      
      // 添加事件监听
      viewer.on('animationsLoaded', handleAnimationsLoaded);
      
      // 组件卸载时移除事件监听
      return () => {
        viewer.off('animationsLoaded', handleAnimationsLoaded);
      };
    }
  }, [viewer]);

  // 添加定时刷新机制
  useEffect(() => {
    // 每2秒刷新一次UI状态，用于更新动画加载状态
    const refreshInterval = setInterval(() => {
      // 通过强制刷新state来触发重新渲染
      setAnimations(prevAnimations => [...prevAnimations]);
    }, 2000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // 格式化动画名称为更友好的显示形式
  const formatAnimationName = (filename: string): string => {
    // 移除文件扩展名
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // 查找中文名称映射
    const chineseName = animationChineseNames[nameWithoutExt];
    if (chineseName) {
      return chineseName;
    }
    
    // 如果没有中文映射，则将下划线替换为空格，并将首字母大写
    return nameWithoutExt
      .replace(/_/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // 播放动画
  const playAnimation = async (animationPath: string, chineseName?: string) => {
    if (!viewer || !viewer.model) {
      showSuccess("模型尚未加载，无法播放动画");
      return;
    }
    
    // 获取动画名称（不带路径和扩展名）
    const animName = animationPath.split('/').pop()?.replace(/\.[^/.]+$/, "");
    
    if (!animName) {
      showSuccess("无效的动画名称");
      return;
    }
    
    // 检查动画是否已加载，如果没有则尝试请求加载
    if (!viewer.model.clipMap.has(animName)) {
      // 显示加载中提示
      showSuccess(`正在尝试加载动画: ${chineseName || formatAnimationName(animName)}，请稍候...`);
      
      // 尝试加载动画
      try {
        // 根据animPath构建对应的FBX路径
        const animDir = animationPath.includes('daily') ? 'daily' : 
                     animationPath.includes('emote') ? 'emote' : 
                     animationPath.includes('dance') ? 'dance' : '';
        
        // 只有路径包含正确目录时才尝试加载
        if (animDir) {
          const fbxPath = `/assets/animations/${animDir}/${animName}.fbx`;
          
          // 尝试加载动画
          await viewer.loadAnimationSafely(animName, fbxPath);
          
          // 检查是否成功加载
          if (viewer.model.clipMap.has(animName)) {
            // 加载成功，播放动画
            viewer.model.loadFBX(animName);
            setCurrentAnimation(animName);
            setIsPlaying(true);
            showSuccess(`成功加载并播放: ${chineseName || formatAnimationName(animName)}`);
            return;
          }
        }
        
        // 没有成功加载
        showSuccess(`动画 ${chineseName || formatAnimationName(animName)} 尚未准备好，请稍后再试`);
      } catch (error) {
        console.error("加载动画失败:", error);
        showSuccess(`加载动画失败，请稍后重试`);
      }
      return;
    }
    
    // 动画已加载，直接播放
    viewer.model.loadFBX(animName);
    setCurrentAnimation(animName);
    setIsPlaying(true);
    showSuccess(`正在播放: ${chineseName || formatAnimationName(animName)}`);
  };

  // 根据动画类别分组
  const dailyAnimations = animations.filter(anim => anim.category === 'daily');
  const emoteAnimations = animations.filter(anim => anim.category === 'emote');
  const danceAnimations = animations.filter(anim => anim.category === 'dance');
  const rootAnimations = animations.filter(anim => anim.category === 'root');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">日常动作</CardTitle>
          <CardDescription>选择一个日常动作来播放</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {dailyAnimations.length > 0 ? (
              dailyAnimations.map((anim) => {
                // 检查动画是否已加载
                const animName = anim.name.replace(/\.[^/.]+$/, "");
                const isLoaded = viewer?.model?.clipMap.has(animName);
                
                return (
                  <div 
                    key={anim.path} 
                    className={`
                      relative border rounded-md p-2 cursor-pointer hover:border-primary transition-colors
                      ${currentAnimation === animName ? 'border-primary bg-primary/5' : 'border-border'}
                      ${!isLoaded ? 'opacity-60' : ''}
                    `}
                    onClick={() => playAnimation(anim.path, anim.chineseName)}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <PlayCircle className="h-8 w-8 mb-2 text-primary" />
                      <span className="text-xs text-center font-medium">{anim.chineseName || anim.displayName}</span>
                      {!isLoaded && (
                        <span className="text-xs text-gray-500 mt-1">加载中...</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center text-sm text-gray-500 py-4">
                正在加载动作，请稍候...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {emoteAnimations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">表情动作</CardTitle>
            <CardDescription>选择一个情绪表达动作来播放</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {emoteAnimations.map((anim) => {
                // 检查动画是否已加载
                const animName = anim.name.replace(/\.[^/.]+$/, "");
                const isLoaded = viewer?.model?.clipMap.has(animName);
                
                return (
                  <div 
                    key={anim.path} 
                    className={`
                      relative border rounded-md p-2 cursor-pointer hover:border-primary transition-colors
                      ${currentAnimation === animName ? 'border-primary bg-primary/5' : 'border-border'}
                      ${!isLoaded ? 'opacity-60' : ''}
                    `}
                    onClick={() => playAnimation(anim.path, anim.chineseName)}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <PlayCircle className="h-8 w-8 mb-2 text-primary" />
                      <span className="text-xs text-center font-medium">{anim.chineseName || anim.displayName}</span>
                      {!isLoaded && (
                        <span className="text-xs text-gray-500 mt-1">加载中...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {danceAnimations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">舞蹈动作</CardTitle>
            <CardDescription>选择一个舞蹈动作来播放</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {danceAnimations.map((anim) => {
                // 检查动画是否已加载
                const animName = anim.name.replace(/\.[^/.]+$/, "");
                const isLoaded = viewer?.model?.clipMap.has(animName);
                
                return (
                  <div 
                    key={anim.path} 
                    className={`
                      relative border rounded-md p-2 cursor-pointer hover:border-primary transition-colors
                      ${currentAnimation === animName ? 'border-primary bg-primary/5' : 'border-border'}
                      ${!isLoaded ? 'opacity-60' : ''}
                    `}
                    onClick={() => playAnimation(anim.path, anim.chineseName)}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <PlayCircle className="h-8 w-8 mb-2 text-primary" />
                      <span className="text-xs text-center font-medium">{anim.chineseName || anim.displayName}</span>
                      {!isLoaded && (
                        <span className="text-xs text-gray-500 mt-1">加载中...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {rootAnimations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">其他动作</CardTitle>
            <CardDescription>选择一个特殊动作来播放</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {rootAnimations.map((anim) => {
                // 检查动画是否已加载
                const animName = anim.name.replace(/\.[^/.]+$/, "");
                const isLoaded = viewer?.model?.clipMap.has(animName);
                
                return (
                  <div 
                    key={anim.path} 
                    className={`
                      relative border rounded-md p-2 cursor-pointer hover:border-primary transition-colors
                      ${currentAnimation === animName ? 'border-primary bg-primary/5' : 'border-border'}
                      ${!isLoaded ? 'opacity-60' : ''}
                    `}
                    onClick={() => playAnimation(anim.path, anim.chineseName)}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <PlayCircle className="h-8 w-8 mb-2 text-primary" />
                      <span className="text-xs text-center font-medium">{anim.chineseName || anim.displayName}</span>
                      {!isLoaded && (
                        <span className="text-xs text-gray-500 mt-1">加载中...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 