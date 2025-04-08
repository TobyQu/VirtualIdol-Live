import { cn } from "@/lib/utils"
import { Message } from "@/features/messages/messages"

interface ChatMessageProps {
  message: Message
  isLast?: boolean
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  
  return (
    <div
      className={cn(
        "group relative flex items-start mb-6",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "flex max-w-[85%] flex-col rounded-2xl px-4 py-3 shadow-sm",
          isAssistant 
            ? "bg-accent border border-gray-200" 
            : "bg-primary text-white"
        )}
      >
        
        <div className="text-[15px] leading-relaxed">{message.content}</div>
      </div>
    </div>
  )
} 