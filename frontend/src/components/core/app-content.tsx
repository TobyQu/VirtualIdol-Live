import { useContext, useEffect, useRef } from "react";
import { GlobalConfig } from "@/features/config/configApi";
import { Message } from "@/features/messages/messages";
import { KoeiroParam } from "@/features/constants/koeiroParam";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { SubtitleBubble } from "@/components/3d/subtitle-bubble";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatContainer } from "@/components/chat/chat-container";
import { Card, CardContent } from "@/components/ui/card";
import { AnimationSettings } from "@/components/settings/animation-settings";
import { SettingsSheet } from "@/components/settings/settings-sheet";
import { SYSTEM_PROMPT } from "@/features/constants/systemPromptConstants";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/core/loading-spinner";
import dynamic from 'next/dynamic';
import { VRMViewer } from "@/components/3d/vrm-viewer";

// 动态导入 ResizablePanelGroup 组件，避免服务器端渲染问题
const ResizablePanelGroup = dynamic(
  () => import('@/components/ui/resizable').then((mod) => mod.ResizablePanelGroup),
  { ssr: false }
);

const ResizablePanel = dynamic(
  () => import('@/components/ui/resizable').then((mod) => mod.ResizablePanel),
  { ssr: false }
);

const ResizableHandle = dynamic(
  () => import('@/components/ui/resizable').then((mod) => mod.ResizableHandle),
  { ssr: false }
);

// AppContent组件接口定义
export interface AppContentProps {
    isClient: boolean;
    isLoading: boolean;
    loadingStages: Array<{id: string; label: string; completed: boolean}>;
    handleLoadingStateChange: (loading: boolean, stages: Array<{id: string; label: string; completed: boolean}>) => void;
    globalConfig: GlobalConfig;
    backgroundImageUrl: string;
    subtitle: string;
    currentEmote: string;
    typingDelay: number;
    openAiKey: string;
    setOpenAiKey: (key: string) => void;
    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;
    chatLog: Message[];
    koeiroParam: KoeiroParam;
    assistantMessage: string;
    handleChangeChatLog: (targetIndex: number, text: string) => void;
    setKoeiroParam: (param: KoeiroParam) => void;
    onChangeGlobalConfig: (config: GlobalConfig) => void;
    chatProcessing: boolean;
    handleSendChat: (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => Promise<void>;
    setBackgroundImageUrl: (url: string) => void;
    setChatLog: React.Dispatch<React.SetStateAction<Message[]>>;
}

// 创建稳定的VrmViewer包装组件
export const StableVrmViewer = ({ globalConfig, onLoadingStateChange }: {
    globalConfig: GlobalConfig;
    onLoadingStateChange: (loading: boolean, stages: Array<{id: string; label: string; completed: boolean}>) => void;
}) => {
    const { viewer } = useContext(ViewerContext);
    
    // 监听窗口大小变化
    useEffect(() => {
        if (!viewer) return;
        
        // 初始调整
        viewer.resize();
        
        // 创建窗口大小变化处理函数
        const handleResize = () => {
            if (viewer) {
                viewer.resize();
            }
        };
        
        // 添加窗口大小变化监听
        window.addEventListener('resize', handleResize);
        
        // 清理函数
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [viewer]);
    
    return (
        <VRMViewer
            globalConfig={globalConfig}
            onLoadingStateChange={onLoadingStateChange}
        />
    );
};

// AppContent组件，内部使用useWindowManager
export function AppContent({ 
    isClient,
    isLoading,
    loadingStages,
    handleLoadingStateChange,
    globalConfig,
    backgroundImageUrl,
    subtitle,
    currentEmote,
    typingDelay,
    openAiKey,
    setOpenAiKey,
    systemPrompt,
    setSystemPrompt,
    chatLog,
    koeiroParam,
    assistantMessage,
    handleChangeChatLog,
    setKoeiroParam,
    onChangeGlobalConfig,
    chatProcessing,
    handleSendChat,
    setBackgroundImageUrl,
    setChatLog
}: AppContentProps) {
    // 创建Panel引用
    const viewerPanelRef = useRef<any>(null);
    const vrmViewerRef = useRef<any>(null);
    const { viewer } = useContext(ViewerContext);

    // 创建ResizeObserver来监听VrmViewer容器的大小变化
    useEffect(() => {
        if (!vrmViewerRef.current || !viewer) return;
        
        const resizeObserver = new ResizeObserver(() => {
            // 容器大小变化时调用viewer的resize方法
            viewer.resize();
        });
        
        // 开始观察容器大小变化
        resizeObserver.observe(vrmViewerRef.current);
        
        // 清理函数
        return () => {
            resizeObserver.disconnect();
        };
    }, [viewer, vrmViewerRef.current]);

    return (
        <div
            style={{
                width: '100%',
                height: '100vh',
                position: 'relative',
                zIndex: 1,
            }}>
            
            {isClient ? (
                <>
                    <ResizablePanelGroup
                        direction="horizontal"
                        className="h-screen w-full"
                    >
                        {/* VrmViewer 区域 */}
                        <ResizablePanel 
                            ref={viewerPanelRef}
                            defaultSize={70} 
                            minSize={40} 
                            className="viewer-panel"
                        >
                            <div className="relative h-full" style={{
                                backgroundImage: `url(${backgroundImageUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}>
                                {/* LoadingSpinner位于VrmViewer区域内部中央 */}
                                {isLoading && (
                                    <LoadingSpinner 
                                        isLoading={isLoading} 
                                        stages={loadingStages} 
                                        message="正在加载虚拟角色..." 
                                    />
                                )}
                                <div ref={vrmViewerRef} className="absolute inset-0 w-full h-full">
                                    <StableVrmViewer 
                                        globalConfig={globalConfig}
                                        onLoadingStateChange={handleLoadingStateChange}
                                    />
                                </div>
                                <SubtitleBubble 
                                    key={subtitle} // 添加key属性，确保文本变化时组件重新挂载
                                    text={subtitle || ""}  // 确保传递空字符串而非undefined
                                    emote={currentEmote}
                                    position="top"
                                    typingDelay={typingDelay}
                                    maxChunkLength={80}
                                    autoHideDelay={5000}
                                />
                            </div>
                        </ResizablePanel>
                        
                        {/* 分割手柄 */}
                        <ResizableHandle  />
                        
                        {/* 聊天区域 (默认30%) */}
                        <ResizablePanel 
                            defaultSize={30} 
                            minSize={20}
                            className="flex flex-col"
                        >
                            <div className="h-full flex flex-col bg-white/90 shadow-lg">
                                <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                    <h2 className="text-lg font-medium text-gray-800">
                                       调试窗口
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <Tabs defaultValue="chat" className="h-full flex flex-col">
                                        <TabsList className="flex bg-gray-50 border-b border-gray-200 justify-between items-center p-0 m-0 rounded-none">
                                            <TabsTrigger 
                                              value="chat" 
                                              className="flex-1 py-3 px-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:border-b-[3px] data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold font-medium transition-colors"
                                            >
                                              聊天
                                            </TabsTrigger>
                                            <TabsTrigger 
                                              value="action" 
                                              className="flex-1 py-3 px-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:border-b-[3px] data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold font-medium transition-colors"
                                            >
                                              动作
                                            </TabsTrigger>
                                            <TabsTrigger 
                                              value="settings" 
                                              className="flex-1 py-3 px-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:border-b-[3px] data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold font-medium transition-colors"
                                            >
                                              设置
                                            </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="chat" className="flex-1 overflow-hidden p-0 mt-0 h-[calc(100%-48px)]">
                                            <ChatContainer
                                                chatLog={chatLog}
                                                isChatProcessing={chatProcessing}
                                                onChatProcessStart={handleSendChat}
                                                globalConfig={globalConfig}
                                                onResetChat={() => setChatLog([])}
                                            />
                                        </TabsContent>
                                        <TabsContent value="action" className="flex-1 overflow-auto p-4 mt-0">
                                           <Card className="border-0 shadow-none">
                                             <CardContent className="p-0">
                                               <AnimationSettings />
                                             </CardContent>
                                           </Card>
                                        </TabsContent>
                                        <TabsContent value="settings" className="flex-1 overflow-auto p-0 mt-0">
                                            <SettingsSheet
                                                globalConfig={globalConfig}
                                                openAiKey={openAiKey}
                                                systemPrompt={systemPrompt}
                                                chatLog={chatLog}
                                                koeiroParam={koeiroParam}
                                                assistantMessage={assistantMessage}
                                                onChangeAiKey={setOpenAiKey}
                                                onChangeBackgroundImageUrl={setBackgroundImageUrl}
                                                onChangeSystemPrompt={setSystemPrompt}
                                                onChangeChatLog={handleChangeChatLog}
                                                onChangeKoeiroParam={setKoeiroParam}
                                                onChangeGlobalConfig={onChangeGlobalConfig}
                                                handleClickResetChatLog={() => setChatLog([])}
                                                handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full">
                    <Button disabled className="m-2">Loading...</Button>
                </div>
            )}
        </div>
    );
} 