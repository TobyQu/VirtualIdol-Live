import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
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
    const [displayedSubtitle, setDisplayedSubtitle] = useState("");
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>("/assets/backgrounds/bg-c.png");
    const [isClient, setIsClient] = useState(false);
    const [loadingStages, setLoadingStages] = useState<Array<{id: string; label: string; completed: boolean}>>([
        { id: 'background', label: '加载背景', completed: false },
        { id: 'vrm', label: '加载3D模型', completed: false },
        { id: 'animation', label: '加载动画', completed: false }
    ]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetached, setIsDetached] = useState(false);
    const [chatWindow, setChatWindow] = useState<Window | null>(null);
    const typingDelay = 100; // 每个字的延迟时间，可以根据需要进行调整
    const MAX_SUBTITLES = 30;
    
    // 处理加载状态变化
    const handleLoadingStateChange = useCallback((loading: boolean, stages: Array<{id: string; label: string; completed: boolean}>) => {
        setIsLoading(loading);
        setLoadingStages(stages);
    }, []);
    
    const handleSubtitle = (newSubtitle: string) => {

        setDisplayedSubtitle((prevSubtitle: string) => {
            const updatedSubtitle = prevSubtitle + newSubtitle;
            if (updatedSubtitle.length > MAX_SUBTITLES) {
                const startIndex = updatedSubtitle.length - MAX_SUBTITLES;
                return updatedSubtitle.substring(startIndex);
            }
            return updatedSubtitle;
        });
    };

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
        const aiTalks = textsToScreenplay([aiText], koeiroParam, emote);
        aiTextLog += aiText;
        // 文ごとに音声を生成 & 再生、返答を表示
        const currentAssistantMessage = sentences.join(" ");
        setSubtitle(aiTextLog);
        handleSpeakAi(globalConfig, aiTalks[0], () => {
            setAssistantMessage(currentAssistantMessage);
            // handleSubtitle(aiText + " "); // 添加空格以区分不同的字幕
            startTypewriterEffect(aiTextLog);

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
        const aiTalks = textsToScreenplay([aiText], koeiroParam, emote);
        aiTextLog += aiText;
        // 文ごとに音声を生成 & 再生、返答を表示
        setSubtitle(aiTextLog);
        handleSpeakAi(globalConfig, aiTalks[0], () => {

            // 如果有，则播放相应动作
            if (action != null && action != '') {
                handleBehaviorAction(
                    "behavior_action",
                    action,
                    emote,
                );
            }

            // setAssistantMessage(currentAssistantMessage);
            startTypewriterEffect(aiTextLog);
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

        viewer.model?.emote(emote as EmotionType)
        viewer.model?.loadFBX(buildUrl(content))
    }

    const startTypewriterEffect = (text: string) => {
        let currentIndex = 0;
        const subtitleInterval = setInterval(() => {
            const newSubtitle = text[currentIndex];
            handleSubtitle(newSubtitle);
            currentIndex++;
            if (currentIndex >= text.length) {
                clearInterval(subtitleInterval);
            }
        }, 100); // 每个字符的间隔时间
    };

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

            // 如果有独立窗口，将用户消息同步到独立窗口
            if (isDetached && chatWindow && !chatWindow.closed) {
                chatWindow.postMessage({
                    type: 'SYNC_CHAT_LOG',
                    chatLog: messageLog
                }, '*');
            }

            // 调用AI获取回复
            const response = await chat(content, yourName).catch(
                (e) => {
                    console.error(e);
                    return null;
                }
            );

            // 获取当前最新聊天记录（可能已经包含了AI回复）
            const currentChatLog = JSON.parse(window.localStorage.getItem("chatVRMParams") as string)?.chatLog || [];
            
            console.log("AI回复后，检查聊天记录，当前有", currentChatLog.length, "条消息");
            
            // 如果聊天记录已更新且有独立窗口，立即同步
            if (currentChatLog.length > messageLog.length && isDetached && chatWindow && !chatWindow.closed) {
                console.log("检测到聊天记录已包含AI回复，立即同步到独立窗口");
                chatWindow.postMessage({
                    type: 'SYNC_CHAT_LOG',
                    chatLog: currentChatLog
                }, '*');
                
                // 同时更新本地状态，保持一致性
                setChatLog(currentChatLog);
            }
            
            // 等待一段时间后再次检查和同步（以防万一AI回复晚于此处执行）
            setTimeout(() => {
                if (isDetached && chatWindow && !chatWindow.closed) {
                    const latestChatLog = JSON.parse(window.localStorage.getItem("chatVRMParams") as string)?.chatLog || [];
                    if (latestChatLog.length > messageLog.length) {
                        console.log("延迟检查：聊天记录已更新，同步到独立窗口");
                        chatWindow.postMessage({
                            type: 'SYNC_CHAT_LOG',
                            chatLog: latestChatLog
                        }, '*');
                        
                        // 同时更新本地状态
                        setChatLog(latestChatLog);
                    }
                }
            }, 2000); // 延迟2秒检查

            console.log("Chat processing state changing to false")
            setChatProcessing(false);
        },
        [systemPrompt, chatLog, setChatLog, handleSpeakAi, setImageUrl, openAiKey, koeiroParam, isDetached, chatWindow]
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

    // 处理来自分离窗口的消息
    useEffect(() => {
        if (!isClient) return;

        const handleMessage = (event: MessageEvent) => {
            const { data } = event;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'CHAT_WINDOW_CLOSED') {
                setIsDetached(false);
                setChatWindow(null);
            } else if (data.type === 'CHAT_MESSAGE' && data.content) {
                // 处理聊天消息
                console.log("收到独立窗口发送的聊天消息");
                // 如果消息包含了聊天记录，先更新本地聊天记录
                if (data.chatLog && Array.isArray(data.chatLog)) {
                    setChatLog(data.chatLog);
                }
                
                handleSendChat(
                    globalConfig,
                    'user',
                    data.user_name || globalConfig?.characterConfig?.yourName || '你',
                    data.content
                );
            } else if (data.type === 'CONFIG_UPDATED' && data.config) {
                // 更新配置
                console.log("收到独立窗口更新的配置");
                setGlobalConfig(data.config);
                webGlobalConfig = data.config;
            } else if (data.type === 'CHAT_LOG_UPDATED' && data.chatLog) {
                // 同步聊天记录更新
                console.log("收到独立窗口更新的聊天记录");
                setChatLog(data.chatLog);
            } else if (data.type === 'REQUEST_SYNC_DATA') {
                // 向分离窗口同步数据
                console.log("收到独立窗口请求同步数据");
                if (chatWindow && !chatWindow.closed) {
                    console.log("向独立窗口发送聊天记录，共", chatLog.length, "条消息");
                    chatWindow.postMessage({
                        type: 'SYNC_CHAT_LOG',
                        chatLog: chatLog
                    }, '*');
                    
                    console.log("向独立窗口发送配置");
                    chatWindow.postMessage({
                        type: 'SYNC_CONFIG',
                        config: globalConfig
                    }, '*');
                }
            }
        };

        window.addEventListener('message', handleMessage);
        
        // 处理主窗口关闭前的逻辑
        const handleBeforeUnload = () => {
            // 如果有分离窗口，主窗口关闭前先关闭它
            if (isDetached && chatWindow && !chatWindow.closed) {
                // 设置允许关闭标志（如果独立窗口实现了此功能）
                try {
                    chatWindow.isClosingAllowed = true;
                    chatWindow.close();
                } catch (e) {
                    console.error('关闭独立窗口失败', e);
                }
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isClient, globalConfig, chatLog, isDetached, chatWindow]);

    // 专门用于监听聊天记录变化并同步到独立窗口的效果
    useEffect(() => {
        // 只有在有独立窗口且聊天记录不为空时才同步
        if (isDetached && chatWindow && !chatWindow.closed && chatLog.length > 0) {
            console.log("检测到聊天记录更新，同步到独立窗口，共", chatLog.length, "条消息");
            // 延迟50ms发送，确保其他状态更新已完成
            setTimeout(() => {
                if (chatWindow && !chatWindow.closed) {
                    chatWindow.postMessage({
                        type: 'SYNC_CHAT_LOG',
                        chatLog: chatLog
                    }, '*');
                }
            }, 50);
        }
    }, [chatLog, isDetached, chatWindow]);

    // 处理分离和合并聊天窗口
    const handleDetachChat = () => {
        if (isDetached && chatWindow) {
            // 如果已经分离，则关闭窗口
            if (!chatWindow.closed) {
                try {
                    // 设置允许关闭标志
                    chatWindow.isClosingAllowed = true;
                    chatWindow.close();
                } catch (e) {
                    console.error('关闭独立窗口失败', e);
                }
            }
            setIsDetached(false);
            setChatWindow(null);
        } else {
            // 如果未分离，则打开新窗口，保持手机比例但允许调整大小
            const windowFeatures = 'width=390,height=700,resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no';
            const newWindow = window.open('/chat', 'chatWindow', windowFeatures);
            if (newWindow) {
                setIsDetached(true);
                setChatWindow(newWindow);
                
                // 窗口加载完成后主动同步数据
                const syncDataToNewWindow = () => {
                    try {
                        if (newWindow.document.readyState === 'complete') {
                            console.log("新窗口加载完成，主动同步数据");
                            // 300ms后发送数据，确保新窗口的JS已初始化
                            setTimeout(() => {
                                if (!newWindow.closed) {
                                    console.log("向新窗口同步聊天记录，共", chatLog.length, "条消息");
                                    newWindow.postMessage({
                                        type: 'SYNC_CHAT_LOG',
                                        chatLog: chatLog
                                    }, '*');
                                    
                                    console.log("向新窗口同步配置");
                                    newWindow.postMessage({
                                        type: 'SYNC_CONFIG',
                                        config: globalConfig
                                    }, '*');
                                }
                            }, 300);
                        } else {
                            // 如果窗口还没加载完成，稍后再试
                            setTimeout(syncDataToNewWindow, 100);
                        }
                    } catch (err) {
                        // 可能出现跨域访问错误，忽略
                        console.log("尝试检查窗口状态时出错，可能是跨域限制");
                    }
                };
                
                // 开始尝试同步数据
                syncDataToNewWindow();
                
                // 监听窗口关闭事件
                const checkIfClosed = setInterval(() => {
                    if (newWindow.closed) {
                        clearInterval(checkIfClosed);
                        setIsDetached(false);
                        setChatWindow(null);
                    }
                }, 500); // 每500ms检查一次窗口是否关闭
            }
        }
    };

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
                        {/* VrmViewer 区域 (默认70%，当聊天被分离时为100%) */}
                        <ResizablePanel defaultSize={isDetached ? 100 : 70} minSize={40}>
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
                                <VrmViewer 
                                    globalConfig={globalConfig}
                                    onLoadingStateChange={handleLoadingStateChange}
                                />
                                <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 z-10" style={{
                                    fontFamily: "fzfs",
                                    fontSize: "24px",
                                    color: "#555",
                                }}>
                                    {displayedSubtitle}
                                </div>
                            </div>
                        </ResizablePanel>
                        
                        {/* 只有在未分离时才显示聊天区域 */}
                        {!isDetached && (
                            <>
                                {/* 分割手柄 */}
                                <ResizableHandle withHandle />
                                
                                {/* 聊天区域 (默认30%) */}
                                <ResizablePanel defaultSize={30} minSize={20}>
                                    <div className="h-full flex flex-col bg-white/90 shadow-lg">
                                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                            <h2 className="text-lg font-medium text-gray-800">
                                                {globalConfig?.characterConfig?.character_name || "虚拟角色"}
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                <DetachButton 
                                                    onDetach={handleDetachChat}
                                                    isDetached={isDetached}
                                                />
                                                <SettingsSheet
                                                    globalConfig={globalConfig}
                                                    openAiKey={openAiKey}
                                                    systemPrompt={systemPrompt}
                                                    chatLog={chatLog}
                                                    koeiroParam={koeiroParam}
                                                    assistantMessage={assistantMessage}
                                                    onChangeAiKey={setOpenAiKey}
                                                    onChangeBackgroundImageUrl={data =>
                                                        setBackgroundImageUrl(generateMediaUrl(data))
                                                    }
                                                    onChangeSystemPrompt={setSystemPrompt}
                                                    onChangeChatLog={handleChangeChatLog}
                                                    onChangeKoeiromapParam={setKoeiroParam}
                                                    onChangeGlobalConfig={onChangeGlobalConfig}
                                                    handleClickResetChatLog={() => setChatLog([])}
                                                    handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <ChatContainer
                                                chatLog={chatLog}
                                                isChatProcessing={chatProcessing}
                                                onChatProcessStart={handleSendChat}
                                                globalConfig={globalConfig}
                                            />
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
    )
}
