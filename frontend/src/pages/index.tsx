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
import {GitHubLink} from "@/components/githubLink";
import {Meta} from "@/components/meta";
import {GlobalConfig, getConfig, initialFormData} from "@/features/config/configApi";
import {buildUrl} from "@/utils/buildUrl";
import {generateMediaUrl, vrmModelData} from "@/features/media/mediaApi";
import {ChatContainer} from "@/components/chat-container";
import dynamic from 'next/dynamic';

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
    const typingDelay = 100; // 每个字的延迟时间，可以根据需要进行调整
    const MAX_SUBTITLES = 30;
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

            await chat(content, yourName).catch(
                (e) => {
                    console.error(e);
                    return null;
                }
            );

            // handleBehaviorAction(
            //     "behavior_action",
            //     "idle_01",
            //     "neutral",
            // );

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
        <div
            style={{
                backgroundImage: `url(${backgroundImageUrl})`,
                backgroundSize: 'cover',
                width: '100%',
                height: '100vh',
                position: 'relative',
                zIndex: 1,
            }}>
            <Meta/>
            <Introduction openAiKey={openAiKey} onChangeAiKey={setOpenAiKey}/>
            
            {isClient ? (
                <ResizablePanelGroup
                    direction="horizontal"
                    className="h-screen w-full"
                >
                    {/* VrmViewer 区域 (默认70%) */}
                    <ResizablePanel defaultSize={70} minSize={40}>
                        <div className="relative h-full">
                            <VrmViewer globalConfig={globalConfig}/>
                            <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 z-10" style={{
                                fontFamily: "fzfs",
                                fontSize: "24px",
                                color: "#555",
                            }}>
                                {displayedSubtitle}
                            </div>
                        </div>
                    </ResizablePanel>
                    
                    {/* 分割手柄 */}
                    <ResizableHandle withHandle />
                    
                    {/* 聊天区域 (默认30%) */}
                    <ResizablePanel defaultSize={30} minSize={20}>
                        <div className="h-full flex flex-col bg-white/90 shadow-lg">
                            <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                                <h2 className="text-lg font-medium text-gray-800">
                                    {globalConfig?.characterConfig?.character_name || "虚拟角色"}
                                </h2>
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
                </ResizablePanelGroup>
            ) : null}
            
            <GitHubLink/>
        </div>
    )
}
