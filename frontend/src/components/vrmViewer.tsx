import { useContext, useCallback, useEffect } from "react";
import { ViewerContext } from "../features/vrmViewer/viewerContext";
import { buildVrmModelUrl, generateMediaUrl } from "@/features/media/mediaApi";
import { GlobalConfig, getConfig, initialFormData } from "@/features/config/configApi";
import { buildUrl } from "@/utils/buildUrl";

type Props = {
  globalConfig: GlobalConfig;
};

export default function VrmViewer({
  globalConfig,
}: Props) {

  const { viewer } = useContext(ViewerContext);

  // 当globalConfig变化时重新加载VRM模型
  useEffect(() => {
    if (viewer && viewer.isReady && globalConfig) {
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
  }, [viewer, globalConfig]);

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
    [viewer]
  );

  return (
    <div className={"w-full h-full"} >
      <canvas ref={canvasRef} className={"h-full w-full"}></canvas>
    </div>
  );
}
