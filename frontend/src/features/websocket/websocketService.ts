import { connect } from "@/features/blivedm/blivedm";
import { GlobalConfig } from "@/features/config/configApi";

// 消息处理器类型
type MessageHandler = (
  globalConfig: GlobalConfig,
  type: string,
  user_name: string, 
  content: string,
  emote: string,
  action?: string
) => void;

export interface WebSocketHandlers {
  onUserMessage: MessageHandler;
  onBehaviorAction: (type: string, content: string, emote: string) => void;
  onDanmakuMessage: MessageHandler;
}

let socketInstance: WebSocket | null = null;

export function setupWebSocket(handlers: WebSocketHandlers) {
  const handleWebSocketMessage = (event: MessageEvent) => {
    const data = event.data;
    try {
      const chatMessage = JSON.parse(data);
      const type = chatMessage.message.type;
      
      if (type === "user") {
        handlers.onUserMessage(
          chatMessage.globalConfig,
          chatMessage.message.type,
          chatMessage.message.user_name,
          chatMessage.message.content,
          chatMessage.message.emote,
        );
      } else if (type === "behavior_action") {
        handlers.onBehaviorAction(
          chatMessage.message.type,
          chatMessage.message.content,
          chatMessage.message.emote,
        );
      } else if (type === "danmaku" || type === "welcome") {
        handlers.onDanmakuMessage(
          chatMessage.globalConfig,
          chatMessage.message.type,
          chatMessage.message.user_name,
          chatMessage.message.content,
          chatMessage.message.emote,
          chatMessage.message.action
        );
      }
    } catch (error) {
      console.error("处理WebSocket消息出错:", error);
    }
  };

  const initWebSocket = () => {
    connect().then((webSocket: WebSocket) => {
      socketInstance = webSocket;
      if (socketInstance) {
        socketInstance.onmessage = handleWebSocketMessage;
        socketInstance.onclose = (event) => {
          console.log('WebSocket connection closed:', event);
          console.log('Reconnecting...');
          initWebSocket();
        };
      }
    }).catch(error => {
      console.error("WebSocket连接失败:", error);
      // 5秒后重试
      setTimeout(initWebSocket, 5000);
    });
  };

  // 初始化WebSocket连接
  initWebSocket();
  
  return {
    close: () => {
      if (socketInstance) {
        socketInstance.close();
        socketInstance = null;
      }
    }
  };
} 