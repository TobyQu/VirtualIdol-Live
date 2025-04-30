import { Message } from "@/features/messages/messages"
import { ChatMessage } from "./chat-message"
import { useEffect, useRef } from "react"
import { MessageCircle } from "lucide-react"

interface ChatListProps {
  messages: Message[]
  isLoading?: boolean
}

export function ChatList({ messages, isLoading = false }: ChatListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAutoScrollEnabled = useRef(true)

  // 调试 - 记录加载状态的变化
  useEffect(() => {
    console.log("ChatList received loading state:", isLoading);
  }, [isLoading]);

  // 滚动到底部函数
  const scrollToBottom = () => {
    if (isAutoScrollEnabled.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  // 监听滚动事件，判断用户是否手动滚动
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      // 计算滚动距离底部的位置
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      isAutoScrollEnabled.current = isAtBottom
    }
    
    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // 监听容器大小变化
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (isAutoScrollEnabled.current) {
        scrollToBottom()
      }
    })
    
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    return () => {
      observer.disconnect()
    }
  }, [])

  // 初次渲染后触发滚动
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background h-full">
        <div className="text-center max-w-sm p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">欢迎使用虚拟角色聊天</h3>
          <p className="text-sm text-gray-500">开始与您的虚拟伙伴对话吧</p>
        </div>
      </div>
    )
  }

  // 确保我们有一个AI消息来显示加载状态
  let lastAIMessageIndex = -1; // 初始化为-1表示未找到
  
  // 寻找最后一个助手消息的索引
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAIMessageIndex = i;
      break;
    }
  }
  
  // 如果最后一条消息是用户消息且正在加载，应该显示未来将添加的助手消息的加载状态
  const lastMessageIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";
  const shouldShowLoadingIndicator = isLoading && (lastAIMessageIndex === -1 || lastMessageIsUser);

  return (
    <div 
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'scroll',
        display: 'block',
        position: 'relative',
        backgroundColor: 'var(--background)'
      }}
      className="scroll-pt-2"
    >
      <div className="flex flex-col pt-4 pb-6">
        <div className="w-full max-w-3xl mx-auto px-4 space-y-6">
          {messages.map((message, index) => (
            <ChatMessage 
              key={`${index}-${message.role}-${message.content.length}`}
              message={message} 
              isLast={index === messages.length - 1} 
              isLoading={isLoading && index === lastAIMessageIndex && !lastMessageIsUser}
            />
          ))}
          
          {/* 固定的加载指示器 - 当最后一条消息是用户消息且正在加载时显示 */}
          {shouldShowLoadingIndicator && (
            <div className="flex justify-start mb-4">
              <div className="bg-accent/60 border border-accent text-accent-foreground rounded-lg rounded-tl-none px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-accent-foreground/70 border-t-transparent rounded-full"></div>
                  <span className="text-accent-foreground">正在思考中...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
} 