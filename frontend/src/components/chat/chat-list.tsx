import { Message } from "@/features/messages/messages"
import { ChatMessage } from "./chat-message"
import { ScrollArea } from "../ui/scroll-area"
import { useEffect, useRef } from "react"

interface ChatListProps {
  messages: Message[]
}

export function ChatList({ messages }: ChatListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <div className="text-center max-w-sm p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">欢迎使用虚拟角色聊天</h3>
          <p className="text-sm text-gray-500">开始与您的虚拟伙伴对话吧</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden bg-gray-50/50">
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="flex flex-col py-4">
          <div className="w-full max-w-3xl mx-auto px-4 space-y-6">
            {messages.map((message, index) => (
              <ChatMessage 
                key={index} 
                message={message} 
                isLast={index === messages.length - 1} 
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
} 