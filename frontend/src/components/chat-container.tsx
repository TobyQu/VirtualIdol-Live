import { useCallback, useState, useEffect } from "react"
import { Message } from "@/features/messages/messages"
import { ChatList } from "./chat/chat-list"
import { ChatInput } from "./chat/chat-input"
import { GlobalConfig } from "@/features/config/configApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WindowMessageType } from "@/features/windowManager/types"

// 为Window对象添加chatWindow属性的声明
declare global {
  interface Window {
    chatWindow?: Window | null;
  }
}

interface ChatContainerProps {
  chatLog: Message[]
  isChatProcessing: boolean
  onChatProcessStart: (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => void
  globalConfig: GlobalConfig
  isDetachedWindow?: boolean
  onResetChat?: () => void
  onChatStateUpdate?: (isProcessing: boolean) => void
}

export function ChatContainer({
  chatLog,
  isChatProcessing,
  onChatProcessStart,
  globalConfig,
  isDetachedWindow = false,
  onResetChat,
  onChatStateUpdate
}: ChatContainerProps) {
  const [isMicRecording, setIsMicRecording] = useState(false)
  const [userMessage, setUserMessage] = useState("")
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null)

  // 处理音频识别结果
  const handleRecognitionResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript
      setUserMessage(text)
      // 发言结束时
      if (event.results[0].isFinal) {
        // 开始生成回复
        onChatProcessStart(globalConfig, "", "", text)
      }
    },
    [onChatProcessStart, globalConfig]
  )

  // 无声音继续时结束识别
  const handleRecognitionEnd = useCallback(() => {
    setIsMicRecording(false)
  }, [])

  useEffect(() => {
    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition;

    // 非语音识别支持环境处理
    if (!SpeechRecognition) {
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-cn";
    recognition.interimResults = true; // 返回中间结果
    recognition.continuous = false; // 语音结束时停止识别

    recognition.addEventListener("result", handleRecognitionResult);
    recognition.addEventListener("end", handleRecognitionEnd);

    setSpeechRecognition(recognition);
  }, [handleRecognitionResult, handleRecognitionEnd]);

  const handleClickMicButton = useCallback(() => {
    if (isMicRecording) {
      speechRecognition?.abort()
      setIsMicRecording(false)
      return
    }

    speechRecognition?.start()
    setIsMicRecording(true)
  }, [isMicRecording, speechRecognition])

  const handleClickSendButton = useCallback((message: string) => {
    if (message.trim()) {
      onChatProcessStart(globalConfig, "", "", message)
      setUserMessage("")
    }
  }, [onChatProcessStart, globalConfig])

  const characterName = globalConfig?.characterConfig?.character_name || "虚拟角色";

  // 记录加载状态的变化，用于调试并同步到其他窗口
  useEffect(() => {
    console.log("Chat processing state:", isChatProcessing);
    
    // 如果是主窗口，同步处理状态到分离窗口
    if (!isDetachedWindow) {
      // 获取可能的分离窗口
      const chatWindows: Window[] = [];
      
      // 尝试安全地访问window.chatWindow
      try {
        if (window.chatWindow && !window.chatWindow.closed) {
          chatWindows.push(window.chatWindow);
        }
      } catch (e) {
        console.warn("访问chatWindow时出错:", e);
      }
      
      // 向所有相关窗口广播当前处理状态
      for (const win of chatWindows) {
        if (win && !win.closed) {
          try {
            win.postMessage({
              type: WindowMessageType.CHAT_PROCESSING_STATE,
              isProcessing: isChatProcessing
            }, '*');
          } catch (e) {
            console.error("同步处理状态失败", e);
          }
        }
      }
    }
  }, [isChatProcessing, isDetachedWindow]);

  // 监听来自主窗口的处理状态同步消息
  useEffect(() => {
    if (!isDetachedWindow) return; // 只在分离窗口中监听
    
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === WindowMessageType.CHAT_PROCESSING_STATE) {
        // 使用回调函数更新分离窗口的处理状态
        onChatStateUpdate?.(event.data.isProcessing);
      }
    };
    
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [isDetachedWindow]);

  const handleResetChat = useCallback(() => {
    if (onResetChat) {
      onResetChat();
    }
  }, [onResetChat]);

  return (
    <Card className="flex flex-col h-full border-0 rounded-none shadow-none bg-background">
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="sticky top-0 z-10 flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{characterName}的对话</span>
          </div>
          {onResetChat && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetChat} 
              className="h-8 px-2 text-muted-foreground hover:text-destructive transition-colors focus:outline-none focus:ring-1 focus:ring-primary/20"
              title="清空聊天记录"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="h-[calc(100%-48px)]">
          <ChatList messages={chatLog} isLoading={isChatProcessing} />
        </div>
      </CardContent>
      <div className="flex-none border-t">
        <ChatInput
          isChatProcessing={isChatProcessing}
          isMicRecording={isMicRecording}
          onClickSendButton={handleClickSendButton}
          onClickMicButton={handleClickMicButton}
        />
      </div>
    </Card>
  )
} 