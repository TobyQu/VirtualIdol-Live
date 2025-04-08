import { useState } from "react"
import { cn } from "@/lib/utils"
import { Mic, Send } from "lucide-react"

interface ChatInputProps {
  className?: string
  placeholder?: string
  isChatProcessing: boolean
  isMicRecording: boolean
  onClickSendButton: (message: string) => void
  onClickMicButton: () => void
}

export function ChatInput({
  className,
  placeholder = "输入你想说的事情...",
  isChatProcessing,
  isMicRecording,
  onClickSendButton,
  onClickMicButton
}: ChatInputProps) {
  const [input, setInput] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isChatProcessing) {
        onClickSendButton(input)
        setInput("")
      }
    }
  }

  const handleSendClick = () => {
    if (input.trim() && !isChatProcessing) {
      onClickSendButton(input)
      setInput("")
    }
  }

  return (
    <div className={cn(
      "relative border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
      className
    )}>
      <div className="max-w-3xl mx-auto p-4">
        <div className="relative flex items-center">
          <button
            className={cn(
              "absolute left-4 p-1 rounded-full transition-colors",
              isMicRecording 
                ? "text-blue-500 hover:text-blue-600 bg-blue-50" 
                : "text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            )}
            disabled={isChatProcessing}
            onClick={onClickMicButton}
          >
            <Mic className="h-5 w-5" />
          </button>
          <textarea
            placeholder={placeholder}
            className="w-full pl-12 pr-12 py-3 bg-white text-gray-900 text-[15px] rounded-xl border border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] max-h-[120px] resize-none shadow-sm"
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            value={input}
            onKeyDown={handleKeyDown}
            disabled={isChatProcessing}
          />
          <button
            className={cn(
              "absolute right-4 p-1 rounded-full transition-colors",
              input.trim() && !isChatProcessing
                ? "text-blue-500 hover:text-blue-600 bg-blue-50"
                : "text-gray-400"
            )}
            disabled={isChatProcessing || !input.trim()}
            onClick={handleSendClick}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
} 