import { useContext, useCallback, useEffect, useState, useRef } from "react";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { buildVrmModelUrl, generateMediaUrl } from "@/features/media/mediaApi";
import { GlobalConfig, getConfig, initialFormData } from "@/features/config/configApi";

type LoadingStage = {
  id: string;
  label: string;
  completed: boolean;
};

type Props = {
  globalConfig: GlobalConfig;
  onLoadingStateChange?: (isLoading: boolean, stages: LoadingStage[]) => void;
};

export default function VrmViewer({
  globalConfig,
  onLoadingStateChange
}: Props) {
  const { viewer, updateConfig } = useContext(ViewerContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { id: 'background', label: '加载背景', completed: false },
    { id: 'vrm', label: '加载3D模型', completed: false },
    { id: 'animation', label: '加载动画', completed: false }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const lastLoadedModel = useRef('');

  // 更新配置
  useEffect(() => {
    if (viewer) {
      // 使用配置中的相机距离，如果没有则使用默认值 8.0
      const cameraDistance = globalConfig?.characterConfig?.cameraDistance || 8.0;
      updateConfig({
        ...globalConfig,
        characterConfig: {
          ...globalConfig.characterConfig,
          cameraDistance
        }
      });
    }
  }, [globalConfig, viewer, updateConfig]);

  // 更新加载状态
  const updateLoadingStage = useCallback((stageId: string, completed: boolean) => {
    setLoadingStages(prev => 
      prev.map(stage => 
        stage.id === stageId ? { ...stage, completed } : stage
      )
    );
  }, []);

  // 通知加载状态变化
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(isLoading, loadingStages);
    }
  }, [isLoading, loadingStages, onLoadingStateChange]);

  // 当背景加载完成后调用
  useEffect(() => {
    // 背景图片加载逻辑
    if (globalConfig?.background_url) {
      const img = new Image();
      img.onload = () => {
        updateLoadingStage('background', true);
      };
      img.onerror = () => {
        console.error("背景图片加载失败");
        updateLoadingStage('background', true); // 即使失败也标记为完成，避免卡住加载流程
      };
      img.src = globalConfig.background_url.startsWith('/assets/')
        ? globalConfig.background_url
        : generateMediaUrl(globalConfig.background_url);
    } else {
      // 没有背景图片时，直接标记为完成
      updateLoadingStage('background', true);
    }
  }, [globalConfig?.background_url, updateLoadingStage]);

  // 监听模型加载事件
  useEffect(() => {
    if (!viewer) return;

    const handleVrmLoaded = () => {
      updateLoadingStage('vrm', true);
    };

    const handleAnimationsLoaded = () => {
      updateLoadingStage('animation', true);
      setIsLoading(false);
    };

    // 设置事件监听
    viewer.on('vrmLoaded', handleVrmLoaded);
    viewer.on('animationsLoaded', handleAnimationsLoaded);

    // 清理函数
    return () => {
      viewer.off('vrmLoaded', handleVrmLoaded);
      viewer.off('animationsLoaded', handleAnimationsLoaded);
    };
  }, [viewer, updateLoadingStage]);

  // 当globalConfig变化时重新加载VRM模型
  useEffect(() => {
    if (viewer && viewer.isReady && globalConfig) {
      const currentVrmModel = globalConfig.characterConfig?.vrmModel || '';
      
      if (!currentVrmModel || currentVrmModel === lastLoadedModel.current) {
        return;
      }
      
      lastLoadedModel.current = currentVrmModel;
      
      setIsLoading(true);
      setLoadingStages(prev => prev.map(stage => ({ ...stage, completed: false })));
      updateLoadingStage('background', true);

      const vrmModel = globalConfig.characterConfig?.vrmModel || initialFormData.characterConfig.vrmModel;
      const vrmModelType = globalConfig.characterConfig?.vrmModelType || initialFormData.characterConfig.vrmModelType;
      
      if (vrmModel.startsWith('/assets/')) {
        viewer.loadVrm(vrmModel);
      } else {
        const url = buildVrmModelUrl(vrmModel, vrmModelType);
        viewer.loadVrm(url);
      }
    }
  }, [viewer, globalConfig, updateLoadingStage]);

  // 设置画布
  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (!canvas) return;
      
      viewer.setup(canvas);
      getConfig().then((data: GlobalConfig | null) => {
        // 使用配置数据，如果为空则使用默认值
        const config = data || initialFormData;
        const vrmModel = config.characterConfig?.vrmModel || initialFormData.characterConfig.vrmModel;
        const vrmModelType = config.characterConfig?.vrmModelType || initialFormData.characterConfig.vrmModelType;
        
        // Drag and DropでVRMを差し替え
        canvas.addEventListener("dragover", function (event) {
          event.preventDefault();
        });
        canvas.addEventListener("drop", function (event) {
          event.preventDefault();

          const files = event.dataTransfer?.files;
          if (!files) {
            return;
          }

          const file = files[0];
          if (!file) {
            return;
          }

          const file_type = file.name.split(".").pop();
          if (file_type === "vrm") {
            const blob = new Blob([file], { type: "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);
            
            setIsLoading(true);
            setLoadingStages(prev => prev.map(stage => ({ ...stage, completed: false })));
            updateLoadingStage('background', true);
            
            viewer.loadVrm(url);
          }
        });
      }).catch((error: Error) => {
        console.error("Failed to load config:", error);
        const url = buildVrmModelUrl(
          initialFormData.characterConfig.vrmModel,
          initialFormData.characterConfig.vrmModelType
        );
        viewer.loadVrm(url);
      });
    },
    [viewer, updateLoadingStage]
  );

  useEffect(() => {
    if (!viewer) return;
    
    // 创建ResizeObserver实例监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      // 容器尺寸变化时调用resize方法
      if (viewer && viewer.isReady) {
        viewer.resize();
      }
    });
    
    // 获取当前canvas元素的父容器
    const canvasElement = document.querySelector('canvas');
    if (canvasElement && canvasElement.parentElement) {
      // 监听父容器尺寸变化
      resizeObserver.observe(canvasElement.parentElement);
    }
    
    // 组件卸载时清理
    return () => {
      resizeObserver.disconnect();
    };
  }, [viewer]);

  return (
    <div className="w-full h-full">
      <canvas ref={setupCanvas} className="h-full w-full"></canvas>
    </div>
  );
}
