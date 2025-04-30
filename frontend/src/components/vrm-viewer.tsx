import { memo } from "react";
import VrmViewer from "@/components/vrmViewer";
import { GlobalConfig } from "@/features/config/configApi";

interface VRMViewerProps {
    globalConfig: GlobalConfig;
    onLoadingStateChange: (loading: boolean, stages: Array<{id: string; label: string; completed: boolean}>) => void;
}

// 将现有的VrmViewer组件包装为一个稳定的组件
export const VRMViewer = memo(({ 
    globalConfig, 
    onLoadingStateChange 
}: VRMViewerProps) => {
    return (
        <VrmViewer 
            globalConfig={globalConfig}
            onLoadingStateChange={onLoadingStateChange}
        />
    );
}, (prevProps, nextProps) => {
    // 只有在globalConfig中的VRM模型真正变化时才重新渲染
    return prevProps.globalConfig?.characterConfig?.vrmModel === nextProps.globalConfig?.characterConfig?.vrmModel;
}); 