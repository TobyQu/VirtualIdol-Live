import { useCallback, useEffect, useState, memo, useRef } from "react";

// 字幕组件的属性定义
interface SubtitleBubbleProps {
  text: string;            // 需要显示的文本
  emote?: string;          // 情绪状态
  onComplete?: () => void; // 显示完成的回调
  typingDelay?: number;    // 打字速度延迟
  maxChunkLength?: number; // 每个文本块的最大长度
  position?: "top" | "bottom"; // 气泡位置
  autoHideDelay?: number;  // 自动隐藏延迟时间(ms)
}

// 未包装的组件实现
const SubtitleBubbleBase: React.FC<SubtitleBubbleProps> = ({
  text,
  emote = "neutral",
  onComplete,
  typingDelay = 100,
  maxChunkLength = 60,
  position = "bottom",
  autoHideDelay = 4000,
}) => {
  const [displayedSubtitle, setDisplayedSubtitle] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [textChunks, setTextChunks] = useState<string[]>([]);
  
  // 用于保存定时器ID，以便清理
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 清理所有定时器
  const clearAllTimers = useCallback(() => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // 分割长文本为多个部分
  const splitTextIntoChunks = useCallback((text: string, maxLength: number = maxChunkLength): string[] => {
    // 移除text中的undefined
    text = String(text || "").replace(/undefined/g, "");
    
    if (!text || text.length <= 0) return [];
    if (text.length <= maxLength) return [text];
    
    const chunks: string[] = [];
    
    // 优先按句子分割
    const sentences = text.match(/[^，。？！,.?!]+[，。？！,.?!]?/g) || [];
    
    if (sentences.length === 0) {
      // 如果没有句子标点，则按固定长度分割
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
      }
      return chunks;
    }
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        
        // 处理特别长的句子
        if (sentence.length > maxLength) {
          let tempSentence = sentence;
          while (tempSentence.length > maxLength) {
            chunks.push(tempSentence.substring(0, maxLength));
            tempSentence = tempSentence.substring(maxLength);
          }
          currentChunk = tempSentence;
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    
    console.log("[SubtitleBubble] 将文本分割为", chunks.length, "个块:", chunks);
    return chunks;
  }, [maxChunkLength]);

  // 当文本变化时，重新分割并重置状态
  useEffect(() => {
    // 日志
    console.log("[SubtitleBubble] 收到新文本:", text);
    
    // 清理现有的定时器和状态
    clearAllTimers();
    setIsTyping(false);
    
    // 处理无效文本
    if (!text || text === "undefined" || text.length === 0) {
      setTextChunks([]);
      setCurrentChunk(0);
      setDisplayedSubtitle("");
      return;
    }
    
    // 处理文本中可能包含的undefined值
    const safeText = String(text).replace(/undefined/g, "");
    
    // 分割文本，准备打字效果
    const chunks = splitTextIntoChunks(safeText);
    setTextChunks(chunks);
    setCurrentChunk(0);
    
    // 如果有文本需要显示，开始打字效果
    if (chunks.length > 0) {
      setIsTyping(true);
    }
  }, [text, splitTextIntoChunks, clearAllTimers]);

  // 打字机效果
  useEffect(() => {
    if (!isTyping || textChunks.length === 0 || currentChunk >= textChunks.length) {
      return;
    }
    
    console.log(`[SubtitleBubble] 当前状态: isTyping=${isTyping}, currentChunk=${currentChunk}/${textChunks.length}`);
    
    // 清理之前的打字效果
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    
    // 清理之前可能存在的自动隐藏定时器
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    
    // 重置当前显示的文本
    setDisplayedSubtitle("");
    
    // 当前需要显示的文本
    const chunk = textChunks[currentChunk];
    let charIndex = 0;
    
    console.log(`[SubtitleBubble] 开始显示第 ${currentChunk+1}/${textChunks.length} 段文本: "${chunk}"`);
    
    // 开始逐字显示
    typingTimerRef.current = setInterval(() => {
      if (charIndex < chunk.length) {
        const newChar = chunk[charIndex];
        setDisplayedSubtitle(prev => {
          const newText = prev + newChar;
          // console.log(`[SubtitleBubble] 显示字符: "${newChar}", 当前文本: "${newText}"`);
          return newText;
        });
        charIndex++;
      } else {
        // 当前块显示完毕
        console.log(`[SubtitleBubble] 完成显示第 ${currentChunk+1}/${textChunks.length} 段文本`);
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        
        // 是否还有下一块
        if (currentChunk < textChunks.length - 1) {
          // 延迟后显示下一块
          console.log(`[SubtitleBubble] 将在1.5秒后显示下一段文本`);
          chunkTimerRef.current = setTimeout(() => {
            setCurrentChunk(prev => prev + 1);
          }, 1500); // 每个气泡显示完后暂停1.5秒
        } else {
          // 所有文本显示完毕
          console.log(`[SubtitleBubble] 所有文本显示完毕，将在 ${autoHideDelay}ms 后隐藏`);
          setIsTyping(false);
          
          // 如果提供了完成回调，调用它
          if (onComplete) {
            onComplete();
          }
          
          // 延迟后隐藏字幕
          hideTimerRef.current = setTimeout(() => {
            console.log(`[SubtitleBubble] 自动隐藏字幕`);
            setDisplayedSubtitle("");
          }, autoHideDelay);
        }
      }
    }, typingDelay);
    
    // 清理函数
    return () => {
      clearAllTimers();
    };
  }, [isTyping, textChunks, currentChunk, typingDelay, autoHideDelay, onComplete, clearAllTimers]);

  // 强制隐藏机制
  useEffect(() => {
    // 设置一个强制隐藏的定时器，防止字幕一直显示
    const maxDisplayTime = Math.max(10000, autoHideDelay * 2); // 最少10秒，或者自动隐藏时间的2倍
    
    const forcedHideTimer = setTimeout(() => {
      if (displayedSubtitle) {
        console.log('[SubtitleBubble] 强制隐藏长时间显示的字幕，已显示时间超过', maxDisplayTime, 'ms');
        setDisplayedSubtitle("");
        setIsTyping(false);
        setCurrentChunk(0);
        setTextChunks([]);
      }
    }, maxDisplayTime);
    
    return () => {
      clearTimeout(forcedHideTimer);
    };
  }, [displayedSubtitle, autoHideDelay, text]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // 如果没有内容则不显示
  if (!displayedSubtitle) return null;

  // 根据位置确定样式类
  const positionClass = position === "top" 
    ? "top-28" 
    : "bottom-32";

  return (
    <div 
      className={`absolute ${positionClass} left-1/2 transform -translate-x-1/2 z-10 max-w-md`}
      style={{
        animation: 'fadeIn 0.3s ease-out',
        transition: 'all 0.3s ease',
        filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.1))',
        minWidth: '260px',
        maxWidth: '80%'
      }}
    >
      <div className="relative rounded-2xl bg-white" 
        style={{
          borderWidth: '3px',
          borderColor: '#FF8000',
          boxShadow: 'inset 0 0 0 1px #FFCC00',
          padding: '10px 16px',
          borderRadius: '16px'
        }}>
        {/* 文本内容 */}
        <p style={{
          fontFamily: "fzfs",
          fontSize: "18px",
          color: 'black',
          lineHeight: "1.5",
          margin: 0,
          padding: 0,
          wordBreak: "break-word",
          textAlign: 'center'
        }}>
          {displayedSubtitle}
        </p>
        
        {/* 气泡尖角 - 使用position值决定朝向 */}
        {position === "top" ? (
          <div className="absolute left-1/2 transform -translate-x-1/2" style={{ top: '-13px' }}>
            <svg width="26" height="13" viewBox="0 0 26 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 13L13 2L24 13H2Z" fill="white"/>
              <path d="M1 13L13 1L25 13" stroke="#FF8000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <div className="absolute left-1/2 transform -translate-x-1/2" style={{ bottom: '-13px' }}>
            <svg width="26" height="13" viewBox="0 0 26 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 0L13 11L24 0H2Z" fill="white"/>
              <path d="M1 0L13 12L25 0" stroke="#FF8000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      {/* 添加全局动画样式 */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, ${position === "top" ? "-15px" : "15px"}); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

// 比较函数 - 只在真正需要重新渲染时重新渲染
function areEqual(prevProps: SubtitleBubbleProps, nextProps: SubtitleBubbleProps) {
  // 检查关键属性的变化
  return (
    prevProps.text === nextProps.text && 
    prevProps.emote === nextProps.emote &&
    prevProps.position === nextProps.position &&
    prevProps.typingDelay === nextProps.typingDelay
  );
}

// 使用memo包装组件，只在属性真正变化时重新渲染
export const SubtitleBubble = memo(SubtitleBubbleBase, areEqual); 