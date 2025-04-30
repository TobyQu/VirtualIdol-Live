import { postRequest, getFullApiUrl } from "../httpclient/httpclient";

/**
 * 发送聊天请求到API
 * @param message 用户消息
 * @param you_name 用户名称
 * @returns 返回聊天响应，包含文本内容和情绪状态
 */
export async function chat(
  message: string,
  you_name: string = "User"
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const body = {
    query: message,
    you_name: you_name,
    update_emotion: true // 通知后端更新情绪状态
  };
  
  try {
    console.log("发送聊天请求:", body);
    const chatRes = await postRequest("/api/v1/chat", headers, body);
    console.log("聊天响应:", chatRes);
    
    if (chatRes.code !== 0) {
      throw new Error(chatRes.message || "聊天请求失败");
    }

    // 返回完整响应，包括文本内容和情绪状态
    return {
      text: chatRes.response,
      emotion: chatRes.emotion || { type: "neutral", intensity: 0.5 }
    };
  } catch (error) {
    console.error("聊天请求出错:", error);
    throw error;
  }
}

/**
 * 流式聊天API，返回一个可读流
 * @param message 用户消息
 * @param you_name 用户名称
 * @returns 返回一个包含流式响应的ReadableStream
 */
// 用于跟踪请求状态的对象
const pendingRequests = new Map<string, { timestamp: number, controller?: AbortController }>();

// 单例锁，确保同一时间只有一个请求
let isRequesting = false;

// 定期清理过期的请求记录
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 60000; // 1分钟过期
  
  for (const [key, data] of pendingRequests.entries()) {
    if (now - data.timestamp > MAX_AGE) {
      // 取消仍在进行的请求
      if (data.controller) {
        try {
          data.controller.abort();
        } catch (e) {
          console.warn('取消过期请求失败', e);
        }
      }
      pendingRequests.delete(key);
    }
  }
  
  // 如果没有请求记录，重置全局锁
  if (pendingRequests.size === 0) {
    isRequesting = false;
  }
}, 30000);

export async function chatStream(
  message: string,
  you_name: string = "User"
) {
  // 如果当前有请求正在进行中，拒绝新请求
  if (isRequesting) {
    console.log("已有聊天请求正在进行中，忽略此次请求");
    throw new Error("已有聊天请求正在进行中");
  }
  
  // 生成请求的唯一标识
  const requestId = `${message}_${you_name}_${Date.now()}`;
  
  // 设置全局锁
  isRequesting = true;
  
  // 创建中止控制器
  const controller = new AbortController();
  
  // 添加请求到跟踪记录
  pendingRequests.set(requestId, { timestamp: Date.now(), controller });
  
  // 设置请求超时（15秒）
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn('聊天请求超时');
    // 清理状态
    pendingRequests.delete(requestId);
    isRequesting = pendingRequests.size > 0;
  }, 15000);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const body = {
    query: message,
    you_name: you_name,
    update_emotion: true // 通知后端更新情绪状态
  };
  
  try {
    console.log("发送流式聊天请求:", body);
    
    // 获取完整的API URL，确保不带尾部斜杠
    const endpoint = "/api/v1/chat/stream";
    console.log(`请求完整URL: ${endpoint}`);
    
    // 使用fetch直接调用API，以获取流式响应
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    
    // 清除超时定时器
    clearTimeout(timeoutId);
    
    // 处理HTTP错误
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`聊天请求失败 [${response.status}]: ${response.statusText} - ${errorText}`);
    }
    
    if (!response.body) {
      throw new Error("响应体为空");
    }
    
    // 创建一个新的ReadableStream来处理响应
    return new ReadableStream({
      async start(streamController) {
        // 处理TypeScript的类型检查问题，这里已确认response.body非空
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let responseText = '';
        let emotion = { type: "neutral", intensity: 0.5 };
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6); // 移除 "data: " 前缀
                  if (jsonStr === '[DONE]') continue;
                  
                  const data = JSON.parse(jsonStr);
                  if (data.text) {
                    responseText += data.text;
                    streamController.enqueue({
                      text: data.text, 
                      fullText: responseText,
                      emotion: emotion
                    });
                  }
                } catch (e) {
                  console.warn('解析流式响应失败:', e);
                }
              }
            }
          }
        } catch (error) {
          streamController.error(error);
        } finally {
          console.log("流式聊天完成，总响应:", responseText);
          // 清除当前请求标记和全局锁
          pendingRequests.delete(requestId);
          isRequesting = pendingRequests.size > 0;
          streamController.close();
        }
      },
      cancel() {
        // 流被取消时清除状态
        try {
          controller.abort();
        } catch (e) {
          console.warn('取消流请求失败', e);
        }
        pendingRequests.delete(requestId);
        isRequesting = pendingRequests.size > 0;
        console.log("流式聊天已取消");
      }
    });
  } catch (error) {
    // 发生错误时清除请求标记
    clearTimeout(timeoutId);
    pendingRequests.delete(requestId);
    isRequesting = pendingRequests.size > 0;
    console.error("流式聊天请求出错:", error);
    throw error;
  }
}


