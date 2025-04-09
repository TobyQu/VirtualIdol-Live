import { useState } from "react"
import { cn } from "@/lib/utils"
import { Mic, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

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
      "relative bg-background p-3",
      className
    )}>
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant={isMicRecording ? "default" : "secondary"}
            className="flex-none"
            disabled={isChatProcessing}
            onClick={onClickMicButton}
          >
            <Mic className="h-4 w-4" />
            <span className="sr-only">使用麦克风</span>
          </Button>

          <textarea
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-background text-foreground text-sm rounded-md border border-input hover:border-accent focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            value={input}
            onKeyDown={handleKeyDown}
            disabled={isChatProcessing}
          />

          <Button
            type="button"
            size="icon"
            variant="default"
            className="flex-none"
            disabled={isChatProcessing || !input.trim()}
            onClick={handleSendClick}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">发送消息</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 