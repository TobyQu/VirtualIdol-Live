import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {ViewerContext} from "@/features/vrmViewer/viewerContext";
import {Message, Screenplay} from "@/features/messages/messages";
import {SYSTEM_PROMPT} from "@/features/constants/systemPromptConstants";
import {DEFAULT_PARAM, KoeiroParam} from "@/features/constants/koeiroParam";
import {GlobalConfig, getConfig, initialFormData} from "@/features/config/configApi";
import {generateMediaUrl} from "@/features/media/mediaApi";
import {Introduction} from "@/components/core/introduction";
import {Meta} from "@/components/core/meta";
import {AppContent, AppContentProps} from "@/components/core/app-content";
import {CharacterResponseService} from "@/features/character/characterResponseService";

// 扩展GlobalConfig类型添加koeiroParam
interface ExtendedGlobalConfig extends GlobalConfig {
  koeiroParam?: KoeiroParam;
}

// 使用断言确保webGlobalConfig类型兼容
let webGlobalConfig = initialFormData as unknown as ExtendedGlobalConfig;

/**
 * 主应用界面组件
 */
export default function Home() {
    const {viewer} = useContext(ViewerContext);
    
    // 状态定义
    const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
    const [openAiKey, setOpenAiKey] = useState("");
    const [koeiroParam, setKoeiroParam] = useState<KoeiroParam>(DEFAULT_PARAM);
    const [chatProcessing, setChatProcessing] = useState(false);
    const [chatLog, setChatLog] = useState<Message[]>([]);
    const [assistantMessage, setAssistantMessage] = useState("");
    const [globalConfig, setGlobalConfig] = useState<ExtendedGlobalConfig>(initialFormData as unknown as ExtendedGlobalConfig);
    const [subtitle, setSubtitle] = useState("");
    const [currentEmote, setCurrentEmote] = useState<string>("neutral");
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>("/assets/backgrounds/bg-c.png");
    const [isClient, setIsClient] = useState(false);
    const [loadingStages, setLoadingStages] = useState<Array<{id: string; label: string; completed: boolean}>>([
        { id: 'background', label: '加载背景', completed: false },
        { id: 'vrm', label: '加载模型', completed: false },
        { id: 'animation', label: '加载动画', completed: false }
    ]);
    const [isLoading, setIsLoading] = useState(true);
    const typingDelay = 100; // 每个字的延迟时间
    
    // 服务引用
    const characterResponseServiceRef = useRef<CharacterResponseService | null>(null);
    const chatServiceRef = useRef<any>(null); // 用于缓存ChatService实例
    
    /**
     * 处理加载状态变化
     */
    const handleLoadingStateChange = useCallback((loading: boolean, stages: Array<{id: string; label: string; completed: boolean}>) => {
        setIsLoading(loading);
        setLoadingStages(stages);
    }, []);
    
    /**
     * 客户端检测
     */
    useEffect(() => {
        setIsClient(true);
    }, []);

    /**
     * koeiroParam同步到globalConfig
     */
    useEffect(() => {
        setGlobalConfig(prev => ({...prev, koeiroParam}));
    }, [koeiroParam]);

    /**
     * 处理角色说话
     */
    const handleSpeakAi = useCallback(
        async (
            globalConfig: GlobalConfig,
            screenplay: Screenplay,
            onStart?: () => void,
            onEnd?: () => void
        ) => {
            if (characterResponseServiceRef.current) {
                characterResponseServiceRef.current.speakCharacter(globalConfig, screenplay, onStart, onEnd);
            }
        },
        []
    );

    /**
     * 初始化字符响应服务
     */
    const initCharacterResponseService = useCallback(() => {
        if (!viewer || characterResponseServiceRef.current) return;
        
        characterResponseServiceRef.current = new CharacterResponseService(
            setSubtitle,
            setCurrentEmote,
            (role: string, content: string, userName: string) => {
                const params = JSON.parse(
                    window.localStorage.getItem("chatVRMParams") as string
                );
                const newMessageLog: Message[] = [
                    ...params.chatLog,
                    { role: role, content: content, user_name: userName },
                ];
                setChatLog(newMessageLog);
            },
            viewer
        );
    }, [viewer]);

    /**
     * 文本打字机效果处理
     */
    const handleTypewriterEffect = useCallback((text: string) => {
        if (characterResponseServiceRef.current) {
            characterResponseServiceRef.current.startTypewriterEffect(text);
        }
    }, []);

    /**
     * 获取或初始化ChatService实例
     */
    const getChatService = useCallback(async () => {
        if (!chatServiceRef.current) {
            const { ChatService } = await import("@/features/chat/chatService");
            chatServiceRef.current = new ChatService(
                setChatProcessing,
                setChatLog,
                handleTypewriterEffect,
                setCurrentEmote,
                handleSpeakAi,
                setSubtitle
            );
        }
        return chatServiceRef.current;
    }, [handleSpeakAi, handleTypewriterEffect]);
    
    /**
     * 初始化服务
     */
    useEffect(() => {
        // 仅在viewer加载后初始化
        if (!viewer) return;

        // 初始化字符响应服务
        initCharacterResponseService();

        // 加载配置
        const loadConfig = async () => {
            try {
                const data = await getConfig();
                console.log("Successfully fetched config:", data);
                // 合并koeiroParam到配置中
                const configWithKoeiro = {...data, koeiroParam: data.koeiroParam || koeiroParam} as ExtendedGlobalConfig;
                webGlobalConfig = configWithKoeiro;
                setGlobalConfig(configWithKoeiro);
                if (data?.background_url && data?.background_url !== '') {
                    setBackgroundImageUrl(generateMediaUrl(data.background_url));
                }
            } catch (error) {
                console.error("Error fetching configuration:", error);
                // 使用默认配置
                const defaultWithKoeiro = {...initialFormData, koeiroParam} as unknown as ExtendedGlobalConfig;
                webGlobalConfig = defaultWithKoeiro;
                setGlobalConfig(defaultWithKoeiro);
            }
        };

        // 恢复本地存储的参数
        const restoreLocalStorageParams = () => {
            if (window.localStorage.getItem("chatVRMParams")) {
                try {
                    const params = JSON.parse(
                        window.localStorage.getItem("chatVRMParams") as string
                    );
                    setSystemPrompt(params.systemPrompt);
                    if (params.koeiroParam) {
                        setKoeiroParam(params.koeiroParam);
                    }
                    if (params.chatLog && Array.isArray(params.chatLog)) {
                        setChatLog(params.chatLog);
                    }
                } catch (error) {
                    console.error("解析本地存储参数失败:", error);
                }
            }
        };

        // 初始化所有内容
        loadConfig();
        restoreLocalStorageParams();

        // 预加载聊天服务
        getChatService().catch(err => console.error("Failed to preload chat service:", err));

    }, [viewer, initCharacterResponseService, getChatService]);

    /**
     * 保存参数到本地存储
     */
    useEffect(() => {
        process.nextTick(() =>
            window.localStorage.setItem(
                "chatVRMParams",
                JSON.stringify({systemPrompt, koeiroParam, chatLog})
            )
        );
    }, [systemPrompt, koeiroParam, chatLog]);

    /**
     * 处理聊天日志变更
     */
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
     * 处理聊天发送
     */
    const handleSendChat = useCallback(
        async (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => {
            console.log("UserMessage:" + content);
            console.log("Chat processing state changing to true");
            setChatProcessing(true);

            const yourName = user_name == null || user_name == '' ? globalConfig?.characterConfig?.yourName : user_name;
            // 不再在这里添加用户消息到聊天记录，而是通过ChatService处理
            
            try {
                // 获取ChatService实例
                const chatService = await getChatService();
                // 执行聊天请求
                await chatService.handleSendChat(globalConfig, content, chatLog);
            } catch (error) {
                console.error("Chat error:", error);
                setChatProcessing(false);
            }
        },
        [chatLog, getChatService]
    );

    /**
     * 处理全局配置变更
     */
    const onChangeGlobalConfig = useCallback((
        config: GlobalConfig) => {
        const configWithKoeiro = {...config, koeiroParam} as ExtendedGlobalConfig;
        setGlobalConfig(configWithKoeiro);
        webGlobalConfig = configWithKoeiro;
    }, [koeiroParam]);

    /**
     * 设置背景图片URL
     */
    const handleSetBackgroundImageUrl = useCallback((url: string) => {
        setBackgroundImageUrl(generateMediaUrl(url));
    }, []);

    /**
     * 重置聊天记录
     */
    const handleResetChatLog = useCallback(() => {
        setChatLog([]);
    }, []);

    return (
        <div className="h-screen flex flex-col items-center justify-center">
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
                setBackgroundImageUrl={handleSetBackgroundImageUrl}
                setChatLog={handleResetChatLog}
            />
            <Meta/>
            <Introduction openAiKey={openAiKey} onChangeAiKey={setOpenAiKey}/>
        </div>
    );
}
