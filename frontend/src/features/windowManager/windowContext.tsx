import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { DetachedWindowState, WindowManagerContextType, WindowMessageType, ProcessedMessage } from './types';
import { GlobalConfig } from '@/features/config/configApi';
import { Message } from '@/features/messages/messages';

// 创建默认上下文
const defaultContext: WindowManagerContextType = {
  isDetached: false,
  chatWindow: null,
  handleDetachChat: () => {},
  syncChatLog: () => {},
  syncConfig: () => {},
  sendChatMessage: () => {}
};

// 创建上下文
export const WindowManagerContext = createContext<WindowManagerContextType>(defaultContext);

// 自定义Hook，用于在组件中使用窗口管理器功能
export const useWindowManager = () => useContext(WindowManagerContext);

interface WindowManagerProviderProps {
  children: React.ReactNode;
  onChatProcessStart?: (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => Promise<void>;
  chatLog: Message[];
  setChatLog: React.Dispatch<React.SetStateAction<Message[]>>;
  globalConfig: GlobalConfig;
  setGlobalConfig: React.Dispatch<React.SetStateAction<GlobalConfig>>;
}

// 窗口管理器Provider组件
export const WindowManagerProvider: React.FC<WindowManagerProviderProps> = ({
  children,
  onChatProcessStart,
  chatLog,
  setChatLog,
  globalConfig,
  setGlobalConfig
}) => {
  const [windowState, setWindowState] = useState<DetachedWindowState>({
    isDetached: false,
    chatWindow: null
  });
  const [isClient, setIsClient] = useState(false);
  
  // 使用ref存储已处理的消息，避免重复处理
  const processedMessages = useRef<ProcessedMessage[]>([]);
  
  // 清理过期的已处理消息记录
  const cleanupProcessedMessages = () => {
    const now = Date.now();
    const MAX_AGE = 10000; // 10秒过期
    processedMessages.current = processedMessages.current.filter(
      msg => now - msg.timestamp < MAX_AGE
    );
  };
  
  // 添加已处理消息记录
  const addProcessedMessage = (messageKey: string) => {
    cleanupProcessedMessages();
    processedMessages.current.push({
      messageKey,
      timestamp: Date.now()
    });
  };
  
  // 检查消息是否已处理
  const isMessageProcessed = (messageKey?: string) => {
    if (!messageKey) return false;
    return processedMessages.current.some(msg => msg.messageKey === messageKey);
  };

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
    
    // 设置定期清理处理过的消息记录
    const cleanupInterval = setInterval(cleanupProcessedMessages, 30000);
    return () => clearInterval(cleanupInterval);
  }, []);

  // 处理来自分离窗口的消息
  useEffect(() => {
    if (!isClient) return;

    const handleMessage = (event: MessageEvent) => {
      const { data } = event;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case WindowMessageType.CHAT_WINDOW_CLOSED:
          setWindowState({
            isDetached: false,
            chatWindow: null
          });
          break;
        case WindowMessageType.CHAT_MESSAGE:
          // 处理聊天消息
          console.log("收到独立窗口发送的聊天消息");
          
          // 检查消息是否已处理过（通过messageKey）
          if (data.messageKey && isMessageProcessed(data.messageKey)) {
            console.log("忽略重复处理的消息:", data.messageKey);
            return;
          }
          
          // 检查消息是否已存在于聊天记录中，避免重复
          const isDuplicate = chatLog.some(
            msg => msg.role === 'user' && 
                   msg.content === data.content && 
                   msg.user_name === data.user_name
          );

          if (!isDuplicate) {
            // 如果消息包含了聊天记录，先更新本地聊天记录
            if (data.chatLog && Array.isArray(data.chatLog)) {
              setChatLog(data.chatLog);
            }
            
            if (onChatProcessStart && data.content) {
              // 记录已处理的消息
              if (data.messageKey) {
                addProcessedMessage(data.messageKey);
              }
              
              onChatProcessStart(
                globalConfig,
                'user',
                data.user_name || globalConfig?.characterConfig?.yourName || '你',
                data.content
              );
            }
          } else {
            console.log("忽略重复消息:", data.content);
          }
          break;
        case WindowMessageType.CONFIG_UPDATED:
          // 更新配置
          if (data.config) {
            console.log("收到独立窗口更新的配置");
            setGlobalConfig(data.config);
          }
          break;
        case WindowMessageType.CHAT_LOG_UPDATED:
          // 同步聊天记录更新
          if (data.chatLog) {
            console.log("收到独立窗口更新的聊天记录");
            setChatLog(data.chatLog);
          }
          break;
        case WindowMessageType.REQUEST_SYNC_DATA:
          // 向分离窗口同步数据
          syncDataToDetachedWindow();
          break;
      }
    };

    // 主动同步数据到分离窗口
    const syncDataToDetachedWindow = () => {
      if (windowState.isDetached && windowState.chatWindow && !windowState.chatWindow.closed) {
        console.log("向独立窗口发送聊天记录，共", chatLog.length, "条消息");
        windowState.chatWindow.postMessage({
          type: WindowMessageType.SYNC_CHAT_LOG,
          chatLog: chatLog
        }, '*');
        
        console.log("向独立窗口发送配置");
        windowState.chatWindow.postMessage({
          type: WindowMessageType.SYNC_CONFIG,
          config: globalConfig
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    
    // 处理主窗口关闭前的逻辑
    const handleBeforeUnload = () => {
      // 如果有分离窗口，主窗口关闭前先关闭它
      if (windowState.isDetached && windowState.chatWindow && !windowState.chatWindow.closed) {
        // 设置允许关闭标志
        try {
          windowState.chatWindow.isClosingAllowed = true;
          windowState.chatWindow.close();
        } catch (e) {
          console.error('关闭独立窗口失败', e);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isClient, globalConfig, chatLog, windowState, setChatLog, setGlobalConfig, onChatProcessStart]);

  // 专门用于监听聊天记录变化并同步到独立窗口的效果
  useEffect(() => {
    // 只有在有独立窗口且聊天记录不为空时才同步
    if (windowState.isDetached && windowState.chatWindow && !windowState.chatWindow.closed && chatLog.length > 0) {
      console.log("检测到聊天记录更新，同步到独立窗口，共", chatLog.length, "条消息");
      // 延迟50ms发送，确保其他状态更新已完成
      setTimeout(() => {
        syncChatLog(chatLog);
      }, 50);
    }
  }, [chatLog, windowState.isDetached, windowState.chatWindow]);

  // 处理分离和合并聊天窗口
  const handleDetachChat = () => {
    if (windowState.isDetached && windowState.chatWindow) {
      // 如果已经分离，则关闭窗口
      if (!windowState.chatWindow.closed) {
        try {
          // 设置允许关闭标志
          windowState.chatWindow.isClosingAllowed = true;
          windowState.chatWindow.close();
        } catch (e) {
          console.error('关闭独立窗口失败', e);
        }
      }
      setWindowState({
        isDetached: false,
        chatWindow: null
      });
      // 移除全局窗口引用
      if (window.chatWindow) {
        window.chatWindow = null;
      }
    } else {
      // 如果未分离，则打开新窗口，保持手机比例但允许调整大小
      const windowFeatures = 'width=390,height=700,resizable=yes,scrollbars=yes,status=no,location=no,toolbar=no,menubar=no';
      const newWindow = window.open('/chat', 'chatWindow', windowFeatures);
      if (newWindow) {
        setWindowState({
          isDetached: true,
          chatWindow: newWindow
        });
        
        // 设置全局窗口引用，方便其他组件访问
        window.chatWindow = newWindow;
        
        // 窗口加载完成后主动同步数据
        const syncDataToNewWindow = () => {
          try {
            if (newWindow.document.readyState === 'complete') {
              console.log("新窗口加载完成，主动同步数据");
              // 300ms后发送数据，确保新窗口的JS已初始化
              setTimeout(() => {
                if (!newWindow.closed) {
                  syncChatLog(chatLog);
                  syncConfig(globalConfig);
                }
              }, 300);
            } else {
              // 如果窗口还没加载完成，稍后再试
              setTimeout(syncDataToNewWindow, 100);
            }
          } catch (err) {
            // 可能出现跨域访问错误，忽略
            console.log("尝试检查窗口状态时出错，可能是跨域限制");
          }
        };
        
        // 开始尝试同步数据
        syncDataToNewWindow();
        
        // 监听窗口关闭事件
        const checkIfClosed = setInterval(() => {
          if (newWindow.closed) {
            clearInterval(checkIfClosed);
            setWindowState({
              isDetached: false,
              chatWindow: null
            });
            // 清除全局窗口引用
            window.chatWindow = null;
          }
        }, 500); // 每500ms检查一次窗口是否关闭
      }
    }
  };

  // 同步聊天记录到分离窗口
  const syncChatLog = (chatLog: Message[]) => {
    if (windowState.isDetached && windowState.chatWindow && !windowState.chatWindow.closed) {
      console.log("向独立窗口同步聊天记录，共", chatLog.length, "条消息");
      windowState.chatWindow.postMessage({
        type: WindowMessageType.SYNC_CHAT_LOG,
        chatLog: chatLog
      }, '*');
    }
  };

  // 同步配置到分离窗口
  const syncConfig = (config: GlobalConfig) => {
    if (windowState.isDetached && windowState.chatWindow && !windowState.chatWindow.closed) {
      console.log("向独立窗口同步配置");
      windowState.chatWindow.postMessage({
        type: WindowMessageType.SYNC_CONFIG,
        config: config
      }, '*');
    }
  };

  // 发送聊天消息到主窗口
  const sendChatMessage = (content: string, user_name: string, chatLog: Message[]) => {
    if (windowState.chatWindow && windowState.chatWindow.opener) {
      windowState.chatWindow.opener.postMessage({
        type: WindowMessageType.CHAT_MESSAGE,
        content,
        user_name,
        chatLog
      }, '*');
    }
  };

  // 提供上下文值
  const contextValue: WindowManagerContextType = {
    ...windowState,
    handleDetachChat,
    syncChatLog,
    syncConfig,
    sendChatMessage
  };

  return (
    <WindowManagerContext.Provider value={contextValue}>
      {children}
    </WindowManagerContext.Provider>
  );
}; 