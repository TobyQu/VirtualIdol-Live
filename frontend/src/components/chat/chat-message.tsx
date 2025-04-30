import { cn } from "@/lib/utils"
import { Message } from "@/features/messages/messages"
import { Loader2 } from "lucide-react"
import { useEffect, useState, useRef } from "react"

interface ChatMessageProps {
  message: Message
  isLast?: boolean
  isLoading?: boolean
}

export function ChatMessage({ message, isLast, isLoading = false }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  const [displayText, setDisplayText] = useState<string>("");
  const prevContentRef = useRef<string>("");
  const typewriterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdRef = useRef<string>(`${message.role}-${message.user_name}`);
  
  // 初始化显示文本
  useEffect(() => {
    // 当消息首次加载，或者消息ID变化时
    const currentMessageId = `${message.role}-${message.user_name}`;
    if (currentMessageId !== messageIdRef.current || !displayText) {
      messageIdRef.current = currentMessageId;
      
      // 非助手消息或者非最后一条/非加载状态的助手消息，直接显示全部
      if (!isAssistant || (!isLoading && !isLast)) {
        setDisplayText(message.content);
        prevContentRef.current = message.content;
      } 
      // 否则保持空白，等待打字效果
      else if (isAssistant && (isLoading || isLast)) {
        setDisplayText("");
        prevContentRef.current = "";
      }
    }
  }, [message.role, message.user_name, isAssistant, isLast, isLoading]);
  
  // 打字机效果
  useEffect(() => {
    // 日志输出帮助调试
    if (isAssistant && isLast) {
      console.log(`ChatMessage: content=${message.content.substring(0, 20)}..., isLoading=${isLoading}, displayText=${displayText.length}`);
    }
    
    // 非助手消息，直接显示
    if (!isAssistant) {
      setDisplayText(message.content);
      return;
    }
    
    // 内容没变化，不处理
    if (message.content === prevContentRef.current && displayText.length > 0) {
      return;
    }
    
    // 获取新内容
    const newContent = message.content;
    prevContentRef.current = newContent;
    
    // 内容发生了跳跃变化（不是递增的），重置显示
    if (newContent && !newContent.startsWith(displayText)) {
      setDisplayText("");
    }
    
    // 已显示长度
    const currentLength = displayText.length;
    
    // 如果还有更多内容要显示，用打字机效果逐字显示
    if (currentLength < newContent.length) {
      // 清理现有定时器
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
      
      // 设置新的定时器，显示下一个字符
      typewriterTimeoutRef.current = setTimeout(() => {
        const nextChar = currentLength + 1;
        setDisplayText(newContent.substring(0, nextChar));
      }, 20); // 调整打字速度
      
      return () => {
        if (typewriterTimeoutRef.current) {
          clearTimeout(typewriterTimeoutRef.current);
        }
      };
    }
  }, [message.content, displayText, isAssistant, isLast, isLoading]);
  
  // 非加载状态时，如果内容不完整，直接跳到完整内容
  useEffect(() => {
    if (!isLoading && isAssistant && displayText !== message.content) {
      // 消息已经完成加载，但显示的内容不完整，直接显示全部
      setDisplayText(message.content);
    }
  }, [isLoading, isAssistant, message.content, displayText]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (typewriterTimeoutRef.current) {
        clearTimeout(typewriterTimeoutRef.current);
      }
    };
  }, []);
  
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
          {isAssistant ? displayText : message.content}
          
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