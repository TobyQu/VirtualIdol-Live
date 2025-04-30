import { useCallback, useState, useEffect } from "react"
import { Message } from "@/features/messages/messages"
import { ChatList } from "./chat-list"
import { ChatInput } from "./chat-input"
import { GlobalConfig } from "@/features/config/configApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatContainerProps {
  chatLog: Message[]
  isChatProcessing: boolean
  onChatProcessStart: (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => void
  globalConfig: GlobalConfig
  onResetChat?: () => void
}

export function ChatContainer({
  chatLog,
  isChatProcessing,
  onChatProcessStart,
  globalConfig,
  onResetChat,
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

  // 记录当前聊天处理状态和消息
  useEffect(() => {
    console.log("Chat processing state:", isChatProcessing);
    if (chatLog.length > 0) {
      const lastMessage = chatLog[chatLog.length - 1];
      console.log(`Last message: role=${lastMessage.role}, content preview=${lastMessage.content.substring(0, 20)}...`);
    }
  }, [isChatProcessing, chatLog]);

  const handleResetChat = useCallback(() => {
    if (onResetChat) {
      onResetChat();
    }
  }, [onResetChat]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none sticky top-0 z-10 flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {globalConfig?.characterConfig?.character_name || "虚拟角色"}的对话
          </span>
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden chat-scroll-container">
        <div className="p-4 min-h-full">
          <ChatList messages={chatLog} isLoading={isChatProcessing} />
        </div>
      </div>
      <div className="flex-none border-t">
        <ChatInput
          isChatProcessing={isChatProcessing}
          isMicRecording={isMicRecording}
          onClickSendButton={handleClickSendButton}
          onClickMicButton={handleClickMicButton}
        />
      </div>
    </div>
  )
} 