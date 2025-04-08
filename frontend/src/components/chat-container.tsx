import { useCallback, useState, useEffect } from "react"
import { Message } from "@/features/messages/messages"
import { ChatList } from "./chat/chat-list"
import { ChatInput } from "./chat/chat-input"
import { GlobalConfig } from "@/features/config/configApi"

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

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-hidden relative">
        <ChatList messages={chatLog} />
      </div>
      <div className="flex-none">
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