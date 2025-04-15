import {createContext, useCallback, useContext, useEffect, useRef, useState, memo} from "react";
import VrmViewer from "@/components/vrmViewer";
import {ViewerContext} from "@/features/vrmViewer/viewerContext";
import {EmotionType, Message, Screenplay, textsToScreenplay,} from "@/features/messages/messages";
import {speakCharacter} from "@/features/messages/speakCharacter";
import {MessageInputContainer} from "@/components/messageInputContainer";
import {SYSTEM_PROMPT} from "@/features/constants/systemPromptConstants";
import {DEFAULT_PARAM, KoeiroParam} from "@/features/constants/koeiroParam";
import {chat} from "@/features/chat/openAiChat";
import {connect} from "@/features/blivedm/blivedm";
// import { PhotoFrame } from '@/features/game/photoFrame';
// import { M_PLUS_2, Montserrat } from "next/font/google";
import {Introduction} from "@/components/introduction";
import {SettingsSheet} from "@/components/settings-sheet";
import {Meta} from "@/components/meta";
import {GlobalConfig, getConfig, initialFormData} from "@/features/config/configApi";
import {buildUrl} from "@/utils/buildUrl";
import {generateMediaUrl, vrmModelData} from "@/features/media/mediaApi";
import {ChatContainer} from "@/components/chat-container";
import dynamic from 'next/dynamic';
import { LoadingSpinner } from "@/components/loading-spinner";
import { DetachButton } from "@/components/detach-button";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { SubtitleBubble } from "@/components/subtitle-bubble";
import { WindowManagerProvider, useWindowManager } from "@/features/windowManager/windowContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Head from "next/head";
import { AnimationSettings } from "@/components/settings/animation-settings";
import { Card, CardContent } from "@/components/ui/card";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GlobalChat } from '@/features/websocket/websocket';
import { useRouter } from "next/router";
import axios from "axios";

// 为Window对象添加isClosingAllowed属性
declare global {
  interface Window {
    isClosingAllowed: boolean;
    _closeOverridden?: boolean;
  }
}

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

// const m_plus_2 = M_PLUS_2({
//   variable: "--font-m-plus-2",
//   display: "swap",
//   preload: false,
// });

// const montserrat = Montserrat({
//   variable: "--font-montserrat",
//   display: "swap",
//   subsets: ["latin"],
// });

let socketInstance: WebSocket | null = null;
let bind_message_event = false;
// 使用断言确保webGlobalConfig类型兼容
let webGlobalConfig = initialFormData as unknown as GlobalConfig;

// AppContent组件接口定义
interface AppContentProps {
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
const StableVrmViewer = memo(({ globalConfig, onLoadingStateChange }: {
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
        <VrmViewer 
            globalConfig={globalConfig}
            onLoadingStateChange={onLoadingStateChange}
        />
    );
}, (prevProps, nextProps) => {
    // 只有在globalConfig中的VRM模型真正变化时才重新渲染
    return prevProps.globalConfig?.characterConfig?.vrmModel === nextProps.globalConfig?.characterConfig?.vrmModel;
});

// 主应用界面组件，包含WindowManagerProvider
export default function Home() {
    const {viewer} = useContext(ViewerContext);
    const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
    const [openAiKey, setOpenAiKey] = useState("");
    const [koeiroParam, setKoeiroParam] = useState<KoeiroParam>(DEFAULT_PARAM);
    const [chatProcessing, setChatProcessing] = useState(false);
    const [chatLog, setChatLog] = useState<Message[]>([]);
    const [assistantMessage, setAssistantMessage] = useState("");
    const [imageUrl, setImageUrl] = useState('');
    const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(initialFormData);
    const [subtitle, setSubtitle] = useState("");
    const [currentEmote, setCurrentEmote] = useState<string>("neutral");
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>("/assets/backgrounds/bg-c.png");
    const [isClient, setIsClient] = useState(false);
    const [showDebugMenu, setShowDebugMenu] = useState(false);
    const [loadingStages, setLoadingStages] = useState<Array<{id: string; label: string; completed: boolean}>>([
        { id: 'background', label: '加载背景', completed: false },
        { id: 'vrm', label: '加载模型', completed: false },
        { id: 'animation', label: '加载动画', completed: false }
    ]);
    const [isLoading, setIsLoading] = useState(true);
    const typingDelay = 100; // 每个字的延迟时间，可以根据需要进行调整
    
    // 处理加载状态变化
    const handleLoadingStateChange = useCallback((loading: boolean, stages: Array<{id: string; label: string; completed: boolean}>) => {
        setIsLoading(loading);
        setLoadingStages(stages);
    }, []);
    
    // 检查是否在客户端
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (socketInstance != null) {
            socketInstance.close()
        }
        if (!bind_message_event) {
            console.log(">>>> setupWebSocket")
            bind_message_event = true;
            setupWebSocket(); // Set up WebSocket when component mounts
        }
        getConfig().then(data => {
            console.log("Successfully fetched config:", data);
            webGlobalConfig = data
            setGlobalConfig(data)
            if (data?.background_url && data?.background_url !== '') {
                setBackgroundImageUrl(generateMediaUrl(data.background_url))
            }
        }).catch(error => {
            console.error("Error fetching configuration:", error);
            // 使用默认配置
            webGlobalConfig = initialFormData;
            setGlobalConfig(initialFormData);
        })
        if (window.localStorage.getItem("chatVRMParams")) {
            const params = JSON.parse(
                window.localStorage.getItem("chatVRMParams") as string
            );
            setSystemPrompt(params.systemPrompt);
            setKoeiroParam(params.koeiroParam);
            setChatLog(params.chatLog);
        }
    }, []);


    useEffect(() => {
        process.nextTick(() =>
            window.localStorage.setItem(
                "chatVRMParams",
                JSON.stringify({systemPrompt, koeiroParam, chatLog})
            )
        );
    }, [systemPrompt, koeiroParam, chatLog]);

    const handleChangeChatLog = useCallback(
        (targetIndex: number, text: string) => {
            const newChatLog = chatLog.map((v: Message, i) => {
                return i === targetIndex ? {role: v.role, content: text, user_name: v.user_name} : v;
            });
            setChatLog(newChatLog);
        },
        [chatLog]
    );

    /**
     * 文ごとに音声を直列でリクエストしながら再生する
     */
    const handleSpeakAi = useCallback(
        async (
            globalConfig: GlobalConfig,
            screenplay: Screenplay,
            onStart?: () => void,
            onEnd?: () => void
        ) => {
            speakCharacter(globalConfig, screenplay, viewer, onStart, onEnd);
        },
        [viewer]
    );

    const handleUserMessage = useCallback((
        globalConfig: GlobalConfig,
        type: string,
        user_name: string,
        content: string,
        emote: string) => {

        console.log("RobotMessage:" + content + " emote:" + emote)
        // 如果content为空，不进行处理
        // 如果与上一句content完全相同，不进行处理
        if (content == null || content == '' || content == ' ') {
            return
        }
        let aiTextLog = "";
        const sentences = new Array<string>();
        const aiText = content;
        
        // 确保aiText不为null
        if (!aiText) {
            console.warn("handleUserMessage: 收到空内容，终止处理");
            return;
        }
        
        const aiTalks = textsToScreenplay([aiText], koeiroParam, emote);
        aiTextLog += aiText;
        
        // 检查aiTalks是否为空或无效
        if (!aiTalks || aiTalks.length === 0) {
            console.warn("[handleUserMessage] 无效的aiTalks:", aiTalks);
            return;
        }
        
        // 确保情绪被正确设置
        if (emote && aiTalks[0]) {
            aiTalks[0].talk.emotion = emote;
        }
        
        // 文ごとに音声を生成 & 再生、返答を表示
        const currentAssistantMessage = sentences.join(" ");
        setSubtitle("");  // 先清空字幕，防止文本叠加
        setCurrentEmote(emote || "neutral");
        
        handleSpeakAi(globalConfig, aiTalks[0], () => {
            setAssistantMessage(currentAssistantMessage);
            // 确保aiTextLog不为undefined
            const safeText = aiTextLog ? aiTextLog.toString() : "";
            startTypewriterEffect(safeText);

            // アシスタントの返答をログに追加
            const params = JSON.parse(
                window.localStorage.getItem("chatVRMParams") as string
            );
            const messageLogAssistant: Message[] = [
                ...params.chatLog,
                {role: "assistant", content: aiTextLog, "user_name": user_name},
            ];
            setChatLog(messageLogAssistant);
        });
    }, [])

    const handleDanmakuMessage = (
        globalConfig: GlobalConfig,
        type: string,
        user_name: string,
        content: string,
        emote: string,
        action: string) => {

        console.log("DanmakuMessage:" + content + " emote:" + emote)
        // 如果与上一句content完全相同，不进行处理
        if (content == null || content == '' || content == ' ') {
            return
        }

        let aiTextLog = "";
        const sentences = new Array<string>();
        const aiText = content;
        
        // 确保aiText不为null
        if (!aiText) {
            console.warn("handleDanmakuMessage: 收到空内容，终止处理");
            return;
        }
        
        const aiTalks = textsToScreenplay([aiText], koeiroParam, emote);
        aiTextLog += aiText;
        
        // 检查aiTalks是否为空或无效
        if (!aiTalks || aiTalks.length === 0) {
            console.warn("[handleDanmakuMessage] 无效的aiTalks:", aiTalks);
            return;
        }
        
        // 确保情绪被正确设置
        if (emote && aiTalks[0]) {
            aiTalks[0].talk.emotion = emote;
        }
        
        // 文ごとに音声を生成 & 再生、返答を表示
        setSubtitle("");  // 先清空字幕，防止文本叠加
        setCurrentEmote(emote || "neutral");
        
        handleSpeakAi(globalConfig, aiTalks[0], () => {
            setAssistantMessage(aiTextLog);
            // 确保aiTextLog不为undefined
            const safeText = aiTextLog ? aiTextLog.toString() : "";
            startTypewriterEffect(safeText);

            // 如果有，则播放相应动作
            if (action != null && action != '') {
                handleBehaviorAction(
                    "behavior_action",
                    action,
                    emote,
                );
            }

            // アシスタントの返答をログに追加
            const params = JSON.parse(
                window.localStorage.getItem("chatVRMParams") as string
            );
            const messageLog: Message[] = [
                ...params.chatLog,
                {role: "user", content: content, "user_name": user_name},
            ];
            setChatLog(messageLog);

        }, () => {
            // 语音播放完后需要恢复到原动画
            if (action != null && action != '') {
                handleBehaviorAction(
                    "behavior_action",
                    "idle_01",
                    "neutral",
                );
            }
        });
    }

    const handleBehaviorAction = (
        type: string,
        content: string,
        emote: string) => {

        console.log("BehaviorActionMessage:" + content + " emote:" + emote)

        viewer.model?.emote(emote as VRMEmotionType)
        viewer.model?.loadFBX(buildUrl(content))
    }

    // 简化的打字机效果函数，只负责设置字幕文本，实际效果由SubtitleBubble组件实现
    const startTypewriterEffect = useCallback((text: string) => {
        // 检查并确保不传递undefined
        if (!text || text === "undefined") {
            console.log("[startTypewriterEffect] 收到无效文本，已忽略：", text);
            return;
        }
        
        // 先清空字幕，触发组件重置
        setSubtitle("");
        
        // 通过setTimeout延迟设置新字幕，确保状态更新
        setTimeout(() => {
            // 当接收到新的文本时，直接更新字幕状态，SubtitleBubble组件会负责显示效果
            console.log("[startTypewriterEffect] 设置字幕：", text);
            setSubtitle(text);
        }, 50);
    }, []);

    /**
     * アシスタントとの会話を行う
     */
    const handleSendChat = useCallback(
        async (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => {

            console.log("UserMessage:" + content)
            console.log("Chat processing state changing to true")
            setChatProcessing(true);

            // handleBehaviorAction(
            //     "behavior_action",
            //     "thinking",
            //     "happy",
            // );

            const yourName = user_name == null || user_name == '' ? globalConfig?.characterConfig?.yourName : user_name
            // ユーザーの発言を追加して表示
            const messageLog: Message[] = [
                ...chatLog,
                {role: "user", content: content, "user_name": yourName},
            ];
            setChatLog(messageLog);

            // 调用AI获取回复
            const response = await chat(content, yourName).catch(
                (e) => {
                    console.error(e);
                    return null;
                }
            );

            if (response) {
                console.log("AI回复:", response.text);
                console.log("情绪状态:", response.emotion);
                
                // 获取情绪类型并更新组件状态
                const emotionType = response.emotion?.type || "neutral";
                setCurrentEmote(emotionType);
                
                // 创建一个包含情绪信息的新aiTalks数组
                let aiTextLog = "";
                const sentences = new Array<string>();
                const aiText = response.text;
                const aiTalks = textsToScreenplay([aiText], koeiroParam, emotionType);
                
                // 为aiTalks添加情绪信息
                if (aiTalks && aiTalks.length > 0) {
                    aiTalks[0].talk.emotion = emotionType;
                }
                
                aiTextLog += aiText;
                
                // 文ごとに音声を生成 & 再生、返答を表示
                const currentAssistantMessage = sentences.join(" ");
                setSubtitle("");  // 先清空字幕，防止文本叠加
                
                // 播放声音并显示文本
                if (aiTalks && aiTalks.length > 0) {
                    handleSpeakAi(globalConfig, aiTalks[0], () => {
                        setAssistantMessage(currentAssistantMessage);
                        // 确保aiTextLog不为undefined
                        const safeText = aiTextLog ? aiTextLog.toString() : "";
                        startTypewriterEffect(safeText);
                        
                        // アシスタントの返答をログに追加
                        const messageLogAssistant: Message[] = [
                            ...messageLog,
                            {role: "assistant", content: aiTextLog, "user_name": globalConfig?.characterConfig?.character_name || "AI"},
                        ];
                        setChatLog(messageLogAssistant);
                    });
                }
            }

            console.log("Chat processing state changing to false")
            setChatProcessing(false);
        },
        [systemPrompt, chatLog, setChatLog, handleSpeakAi, setImageUrl, openAiKey, koeiroParam]
    );

    let lastSwitchTime = 0;

    const onChangeGlobalConfig = useCallback((
        config: GlobalConfig) => {
        setGlobalConfig(config);
        webGlobalConfig = config as unknown as typeof initialFormData;
    }, [])

    const handleWebSocketMessage = (event: MessageEvent) => {
        const data = event.data;
        const chatMessage = JSON.parse(data);
        const type = chatMessage.message.type;
        if (type === "user") {
            handleUserMessage(
                webGlobalConfig,
                chatMessage.message.type,
                chatMessage.message.user_name,
                chatMessage.message.content,
                chatMessage.message.emote,
            );
        } else if (type === "behavior_action") {
            handleBehaviorAction(
                chatMessage.message.type,
                chatMessage.message.content,
                chatMessage.message.emote,
            );
        } else if (type === "danmaku" || type === "welcome") {
            handleDanmakuMessage(
                webGlobalConfig,
                chatMessage.message.type,
                chatMessage.message.user_name,
                chatMessage.message.content,
                chatMessage.message.emote,
                chatMessage.message.action
            );
        }
    };

    const setupWebSocket = () => {
        connect().then((webSocket) => {
            socketInstance = webSocket;
            socketInstance.onmessage = handleWebSocketMessage; // Set onmessage listener
            socketInstance.onclose = (event) => {
                console.log('WebSocket connection closed:', event);
                console.log('Reconnecting...');
                setupWebSocket(); // 重新调用connect()函数进行连接
            };
        });
    }

    return (
        <div className="h-screen flex flex-col items-center justify-center">
            

            <WindowManagerProvider
                onChatProcessStart={handleSendChat}
                chatLog={chatLog}
                setChatLog={setChatLog}
                globalConfig={globalConfig}
                setGlobalConfig={setGlobalConfig}
            >
                <AppContent 
                    isClient={isClient}
                    isLoading={isLoading}
                    loadingStages={loadingStages}
                    handleLoadingStateChange={handleLoadingStateChange}
                    globalConfig={globalConfig}
                    backgroundImageUrl={backgroundImageUrl}
                    subtitle={subtitle}
                    currentEmote={currentEmote}
                    typingDelay={typingDelay}
                    openAiKey={openAiKey}
                    setOpenAiKey={setOpenAiKey}
                    systemPrompt={systemPrompt}
                    setSystemPrompt={setSystemPrompt}
                    chatLog={chatLog}
                    koeiroParam={koeiroParam}
                    assistantMessage={assistantMessage}
                    handleChangeChatLog={handleChangeChatLog}
                    setKoeiroParam={setKoeiroParam}
                    onChangeGlobalConfig={onChangeGlobalConfig}
                    chatProcessing={chatProcessing}
                    handleSendChat={handleSendChat}
                    setBackgroundImageUrl={(url: string) => setBackgroundImageUrl(generateMediaUrl(url))}
                    setChatLog={setChatLog}
                />
            </WindowManagerProvider>
        </div>
    );
}

// AppContent组件，内部使用useWindowManager
function AppContent({ 
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
    // 现在可以在这里安全地使用useWindowManager钩子
    const { isDetached, handleDetachChat } = useWindowManager();
    // 创建Panel引用
    const viewerPanelRef = useRef<any>(null);
    const vrmViewerRef = useRef<any>(null);
    const prevDetachedState = useRef(isDetached);
    const { viewer } = useContext(ViewerContext);

    // 监听分离状态变化，手动调整Panel尺寸和布局
    useEffect(() => {
        // 如果分离状态发生变化
        if (prevDetachedState.current !== isDetached) {
            prevDetachedState.current = isDetached;
            
            // 延迟一点执行以确保不影响VrmViewer的稳定性
            setTimeout(() => {
                // 如果有分割面板组，需要重新设置布局
                if (viewerPanelRef.current) {
                    try {
                        // 尝试强制设置尺寸
                        if (typeof viewerPanelRef.current.resize === 'function') {
                            viewerPanelRef.current.resize(isDetached ? 100 : 70);
                        }
                    } catch (e) {
                        console.error("调整面板尺寸时出错:", e);
                    }
                }
                
                // 强制调用viewer的resize方法以适应新的大小
                if (viewer) {
                    // 多次触发resize，确保布局正确更新后能够重新调整
                    const resizeTimes = [100, 300, 500, 800, 1200];
                    resizeTimes.forEach(delay => {
                        setTimeout(() => {
                            viewer.resize();
                        }, delay);
                    });
                }
            }, 100);
        }
    }, [isDetached, viewer]);

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
            <Meta/>
            <Introduction openAiKey={openAiKey} onChangeAiKey={setOpenAiKey}/>
            
            {isClient ? (
                <>
                    <ResizablePanelGroup
                        direction="horizontal"
                        className="h-screen w-full"
                    >
                        {/* VrmViewer 区域 */}
                        <ResizablePanel 
                            ref={viewerPanelRef}
                            defaultSize={isDetached ? 100 : 70} 
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
                        
                        {/* 只有在未分离时才显示聊天区域 */}
                        {!isDetached && (
                            <>
                                {/* 分割手柄 */}
                                <ResizableHandle  />
                                
                                {/* 聊天区域 (默认30%) */}
                                <ResizablePanel 
                                    defaultSize={30} 
                                    minSize={20}
                                    className="chat-panel"
                                >
                                    <div className="h-full flex flex-col bg-white/90 shadow-lg">
                                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                            <h2 className="text-lg font-medium text-gray-800">
                                               调试窗口
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                <DetachButton 
                                                    onDetach={handleDetachChat}
                                                    isDetached={isDetached}
                                                />
                                            </div>
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
                                                <TabsContent value="chat" className="flex-1 overflow-hidden p-0 mt-0">
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
                                                        onChangeKoeiromapParam={setKoeiroParam}
                                                        onChangeGlobalConfig={onChangeGlobalConfig}
                                                        handleClickResetChatLog={() => setChatLog([])}
                                                        handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
                                                        isDetachedWindow={isDetached}
                                                    />
                                                </TabsContent>
                                            </Tabs>
                                        </div>
                                    </div>
                                </ResizablePanel>
                            </>
                        )}
                    </ResizablePanelGroup>
                </>
            ) : null}
            
            {/* 仅在聊天区域分离时显示的悬浮按钮，用于恢复聊天区域 */}
            {isDetached && (
                <div className="fixed bottom-4 right-4 z-50">
                    <Button 
                        onClick={handleDetachChat}
                        className="bg-primary text-white shadow-lg"
                    >
                        <Maximize2 className="h-4 w-4 mr-2" />
                        恢复聊天窗口
                    </Button>
                </div>
            )}
            
        </div>
    );
}
