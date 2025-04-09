import { useCallback, useState, useEffect } from "react"
import { Message } from "@/features/messages/messages"
import { ChatList } from "./chat/chat-list"
import { ChatInput } from "./chat/chat-input"
import { GlobalConfig } from "@/features/config/configApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle } from "lucide-react"

interface ChatContainerProps {
  chatLog: Message[]
  isChatProcessing: boolean
  onChatProcessStart: (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => void
  globalConfig: GlobalConfig
}

export function ChatContainer({
  chatLog,
  isChatProcessing,
  onChatProcessStart,
  globalConfig
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

  // 记录加载状态的变化，用于调试
  useEffect(() => {
    console.log("Chat processing state:", isChatProcessing);
  }, [isChatProcessing]);

  return (
    <Card className="flex flex-col h-full border-0 rounded-none shadow-none bg-background">
      <CardHeader className="px-4 py-3 border-b bg-card">
        <div className="flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-primary" />
          <CardTitle className="text-base font-medium">与 {characterName} 的对话</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full">
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