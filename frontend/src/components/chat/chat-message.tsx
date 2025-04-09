import { cn } from "@/lib/utils"
import { Message } from "@/features/messages/messages"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

interface ChatMessageProps {
  message: Message
  isLast?: boolean
  isLoading?: boolean
}

export function ChatMessage({ message, isLast, isLoading = false }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  
  return (
    <div
      className={cn(
        "group relative flex mb-4",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5",
          isAssistant 
            ? "bg-accent/60 border border-accent text-accent-foreground rounded-tl-none" 
            : "bg-primary text-primary-foreground rounded-tr-none"
        )}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
          
          {isAssistant && isLoading && isLast && (
            <div className="mt-2 pt-2 border-t border-accent/30">
              <div className="flex items-center">
                <div className="mr-2 flex items-center">
                  <div className="animate-spin h-3 w-3 border-2 border-accent-foreground/70 border-t-transparent rounded-full"></div>
                </div>
                <span className="text-xs text-accent-foreground/80">我还有话说</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 