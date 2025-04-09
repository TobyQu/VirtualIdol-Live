import { useState, useEffect } from "react";
import { ChatContainer } from "@/components/chat-container";
import { SettingsSheet } from "@/components/settings-sheet";
import { GlobalConfig, getConfig, initialFormData } from "@/features/config/configApi";
import { useRouter } from "next/router";
import { KoeiroParam, DEFAULT_PARAM } from "@/features/constants/koeiroParam";
import { Message } from "@/features/messages/messages";
import { SYSTEM_PROMPT } from "@/features/constants/systemPromptConstants";
import Head from "next/head";
import { PanelLeftClose } from "lucide-react";

// 为Window对象添加isClosingAllowed属性
declare global {
  interface Window {
    isClosingAllowed: boolean;
    _closeOverridden?: boolean;
  }
}

export default function ChatPage() {
  const router = useRouter();
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(initialFormData);
  const [openAiKey, setOpenAiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [koeiroParam, setKoeiroParam] = useState<KoeiroParam>(DEFAULT_PARAM);
  const [chatProcessing, setChatProcessing] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [synced, setSynced] = useState(false);

  // 请求主窗口同步数据的函数
  const requestSyncData = () => {
    if (window.opener) {
      console.log("请求主窗口同步数据");
      window.opener.postMessage({
        type: 'REQUEST_SYNC_DATA'
      }, '*');
    }
  };

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);

    // 设置窗口比例固定，但大小可调整
    if (typeof window !== 'undefined') {
      // 添加固定比例的类到html元素
      document.documentElement.classList.add('fixed-ratio-window');
      
      // 监听窗口大小变化，保持比例
      const maintainAspectRatio = () => {
        const aspectRatio = 9/16; // 手机比例约为 9:16
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // 当前比例
        const currentRatio = width / height;
        
        // 设置CSS变量，用于内容区域调整
        document.documentElement.style.setProperty('--window-width', `${width}px`);
        document.documentElement.style.setProperty('--window-height', `${height}px`);
        
        // 根据当前窗口比例决定内容区域大小
        if (currentRatio > aspectRatio) {
          // 窗口偏宽 - 以高度为基准计算内容宽度
          document.documentElement.style.setProperty('--content-width', `${height * aspectRatio}px`);
          document.documentElement.style.setProperty('--content-height', `${height}px`);
          document.documentElement.setAttribute('data-ratio', 'wide');
        } else {
          // 窗口偏高 - 以宽度为基准计算内容高度
          document.documentElement.style.setProperty('--content-width', `${width}px`);
          document.documentElement.style.setProperty('--content-height', `${width / aspectRatio}px`);
          document.documentElement.setAttribute('data-ratio', 'tall');
        }
      };
      
      // 初始调整
      maintainAspectRatio();
      
      // 窗口大小变化时保持比例
      window.addEventListener('resize', maintainAspectRatio);
      
      // 设置全局标记为允许关闭
      window.isClosingAllowed = true;
      
      // 从父窗口获取最新的聊天记录
      const handleMessage = (event: MessageEvent) => {
        const { data } = event;
        console.log("接收到消息", data);
        
        if (data?.type === 'SYNC_CHAT_LOG' && Array.isArray(data.chatLog)) {
          console.log("同步聊天记录", data.chatLog.length, "条消息");
          
          // 确保只有在收到更多消息时才更新
          // 这样可以避免在用户在此窗口发送消息后被父窗口的旧记录覆盖
          if (data.chatLog.length >= chatLog.length) {
            setChatLog(data.chatLog);
            setSynced(true);
            
            // 同时更新localStorage，确保一致性
            if (window.localStorage.getItem("chatVRMParams")) {
              try {
                const params = JSON.parse(
                  window.localStorage.getItem("chatVRMParams") as string
                );
                window.localStorage.setItem(
                  "chatVRMParams",
                  JSON.stringify({...params, chatLog: data.chatLog})
                );
              } catch (error) {
                console.error("更新localStorage失败", error);
              }
            }
          } else {
            console.log("忽略旧聊天记录，当前", chatLog.length, "条，收到", data.chatLog.length, "条");
          }
        }
        if (data?.type === 'SYNC_CONFIG' && data.config) {
          console.log("同步配置");
          setGlobalConfig(data.config);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // 立即请求数据同步
      requestSyncData();
      
      // 如果5秒内没有收到同步数据，再次请求
      const syncTimeout = setTimeout(() => {
        if (!synced) {
          console.log("5秒内未收到同步数据，再次请求");
          requestSyncData();
        }
      }, 5000);
      
      // 从localStorage获取配置，作为备用
      if (window.localStorage.getItem("chatVRMParams")) {
        try {
          const params = JSON.parse(
            window.localStorage.getItem("chatVRMParams") as string
          );
          setSystemPrompt(params.systemPrompt || SYSTEM_PROMPT);
          setKoeiroParam(params.koeiroParam || DEFAULT_PARAM);
          
          // 只有在没有从父窗口同步到数据时才使用localStorage中的聊天记录
          if (!synced && params.chatLog && Array.isArray(params.chatLog)) {
            console.log("使用localStorage中的聊天记录", params.chatLog.length, "条消息");
            setChatLog(params.chatLog);
          }
        } catch (error) {
          console.error("解析localStorage数据失败", error);
        }
      }
      
      return () => {
        clearTimeout(syncTimeout);
        window.removeEventListener('message', handleMessage);
        window.removeEventListener('resize', maintainAspectRatio);
        document.documentElement.classList.remove('fixed-ratio-window');
        document.documentElement.removeAttribute('data-ratio');
      };
    }

    // 获取配置
    getConfig().then(data => {
      setGlobalConfig(data);
    }).catch(error => {
      console.error("Error fetching configuration:", error);
      setGlobalConfig(initialFormData);
    });
  }, [synced]);

  // 组件挂载后每隔30秒请求一次同步，确保数据不会过时
  useEffect(() => {
    if (!isClient) return;
    
    const intervalId = setInterval(() => {
      requestSyncData();
    }, 30000); // 每30秒同步一次
    
    return () => clearInterval(intervalId);
  }, [isClient]);

  const handleChangeChatLog = (targetIndex: number, text: string) => {
    const newChatLog = chatLog.map((v: Message, i) => {
      return i === targetIndex ? { role: v.role, content: text, user_name: v.user_name } : v;
    });
    setChatLog(newChatLog);
    
    // 同步到父窗口
    if (window.opener) {
      window.opener.postMessage({
        type: 'CHAT_LOG_UPDATED',
        chatLog: newChatLog
      }, '*');
    }
  };

  const handleSendChat = async (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => {
    // 先在本地显示消息
    const updatedChatLog: Message[] = [
      ...chatLog,
      { role: "user" as const, content, user_name }
    ];
    setChatLog(updatedChatLog);
    
    // 向父窗口发送消息，让父窗口处理聊天
    if (window.opener) {
      window.opener.postMessage({
        type: 'CHAT_MESSAGE',
        content,
        user_name,
        chatLog: updatedChatLog
      }, '*');
    }
  };

  const handleCloseWindow = () => {
    // 通知父窗口已关闭
    if (window.opener) {
      window.opener.postMessage({
        type: 'CHAT_WINDOW_CLOSED'
      }, '*');
    }
    window.close();
  };

  const onChangeGlobalConfig = (config: GlobalConfig) => {
    setGlobalConfig(config);
    // 将更新后的配置同步到主窗口
    if (window.opener) {
      window.opener.postMessage({
        type: 'CONFIG_UPDATED',
        config
      }, '*');
    }
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
        <style>{`
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
          }
        `}</style>
      </Head>
      <div className="h-full w-full flex flex-col bg-white/90 shadow-lg detached-chat-window">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-medium text-gray-800">
            {globalConfig?.characterConfig?.character_name || "虚拟角色"}
          </h2>
          <div className="flex items-center gap-2">
          <button 
              onClick={handleCloseWindow}
              className="px-3 py-1 text-sm font-medium bg-gray-200 hover:bg-gray-300 rounded-md flex items-center gap-1"
              title="返回主窗口"
            >
              <PanelLeftClose className="w-4 h-4" />
              <span className="sr-only">返回主窗口</span>
            </button>
            <SettingsSheet
              globalConfig={globalConfig}
              openAiKey={openAiKey}
              systemPrompt={systemPrompt}
              chatLog={chatLog}
              koeiroParam={koeiroParam}
              assistantMessage={assistantMessage}
              onChangeAiKey={setOpenAiKey}
              onChangeBackgroundImageUrl={() => {}}
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
          {isClient && (
            <ChatContainer
              chatLog={chatLog}
              isChatProcessing={chatProcessing}
              onChatProcessStart={handleSendChat}
              globalConfig={globalConfig}
            />
          )}
        </div>
      </div>
    </>
  );
} 