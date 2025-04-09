import { useContext, useCallback, useEffect, useState, useRef } from "react";
import { ViewerContext } from "../features/vrmViewer/viewerContext";
import { buildVrmModelUrl, generateMediaUrl } from "@/features/media/mediaApi";
import { GlobalConfig, getConfig, initialFormData } from "@/features/config/configApi";
import { buildUrl } from "@/utils/buildUrl";

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
  const { viewer } = useContext(ViewerContext);
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { id: 'background', label: '加载背景', completed: false },
    { id: 'vrm', label: '加载3D模型', completed: false },
    { id: 'animation', label: '加载动画', completed: false }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const lastLoadedModel = useRef('');

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
      // 存储当前的模型路径
      const currentVrmModel = globalConfig.characterConfig?.vrmModel || '';
      
      // 检查模型是否真的变化了，如果没有变化则不重新加载
      if (!currentVrmModel || currentVrmModel === lastLoadedModel.current) {
        return;
      }
      
      // 更新已加载模型的记录
      lastLoadedModel.current = currentVrmModel;
      
      // 重置加载状态
      setIsLoading(true);
      setLoadingStages(prev => prev.map(stage => ({ ...stage, completed: false })));
      updateLoadingStage('background', true); // 背景已经在另一个effect中处理

      const vrmModel = globalConfig.characterConfig?.vrmModel || initialFormData.characterConfig.vrmModel;
      const vrmModelType = globalConfig.characterConfig?.vrmModelType || initialFormData.characterConfig.vrmModelType;
      
      // 如果vrmModel以"/assets/"开头，则是assets目录中的文件
      if (vrmModel.startsWith('/assets/')) {
        viewer.loadVrm(vrmModel);
      } else {
        const url = buildVrmModelUrl(vrmModel, vrmModelType);
        viewer.loadVrm(url);
      }
    }
  }, [viewer, globalConfig, updateLoadingStage]);

  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (canvas) {
        viewer.setup(canvas);
        getConfig().then(data => {
          // 使用配置数据，如果为空则使用默认值
          const config = data || initialFormData;
          const vrmModel = config.characterConfig?.vrmModel || initialFormData.characterConfig.vrmModel;
          const vrmModelType = config.characterConfig?.vrmModelType || initialFormData.characterConfig.vrmModelType;
          
          // 如果vrmModel以"/assets/"开头，则是assets目录中的文件
          if (vrmModel.startsWith('/assets/')) {
            viewer.loadVrm(vrmModel);
          } else {
            const url = buildVrmModelUrl(vrmModel, vrmModelType);
            viewer.loadVrm(url);
          }
          
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
              
              // 重置加载状态
              setIsLoading(true);
              setLoadingStages(prev => prev.map(stage => ({ ...stage, completed: false })));
              updateLoadingStage('background', true); // 背景不需要重新加载
              
              viewer.loadVrm(url);
            }
          });
        }).catch(error => {
          console.error("Failed to load config:", error);
          // 使用默认值
          const url = buildVrmModelUrl(
            initialFormData.characterConfig.vrmModel,
            initialFormData.characterConfig.vrmModelType
          );
          viewer.loadVrm(url);
        });
      }
    },
    [viewer, updateLoadingStage]
  );

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="h-full w-full"></canvas>
    </div>
  );
}
