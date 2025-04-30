import { GlobalConfig } from "@/features/config/configApi";
import { Message, textsToScreenplay } from "@/features/messages/messages";
import { chatStream } from "./openAiChat";

export class ChatService {
  private setChatProcessing: (isProcessing: boolean) => void;
  private updateChatLog: (messages: Message[]) => void;
  private startTypewriterEffect: (text: string) => void;
  private setCurrentEmote: (emote: string) => void;
  private handleSpeakAi: (
    globalConfig: GlobalConfig, 
    aiTalks: any, 
    onStart?: () => void, 
    onEnd?: () => void
  ) => void;
  private setSubtitle: (text: string) => void;
  private isProcessingChat = false;
  // 跟踪最后处理的TTS文本段，用于去重
  private lastProcessedSegments: Set<string> = new Set();

  constructor(
    setChatProcessing: (isProcessing: boolean) => void,
    updateChatLog: (messages: Message[]) => void,
    startTypewriterEffect: (text: string) => void,
    setCurrentEmote: (emote: string) => void,
    handleSpeakAi: (globalConfig: GlobalConfig, aiTalks: any, onStart?: () => void, onEnd?: () => void) => void,
    setSubtitle: (text: string) => void
  ) {
    this.setChatProcessing = setChatProcessing;
    this.updateChatLog = updateChatLog;
    this.startTypewriterEffect = startTypewriterEffect;
    this.setCurrentEmote = setCurrentEmote;
    this.handleSpeakAi = handleSpeakAi;
    this.setSubtitle = setSubtitle;
  }

  /**
   * 处理聊天消息发送
   */
  public async handleSendChat(
    globalConfig: GlobalConfig, 
    content: string, 
    currentChatLog: Message[]
  ): Promise<void> {
    // 防止重复发送请求
    if (this.isProcessingChat) {
      console.log("已有聊天请求正在处理中，忽略此次请求");
      return;
    }
    
    // 内容为空检查
    if (!content || content.trim() === '') {
      console.log("消息内容为空，忽略此次请求");
      return;
    }
    
    console.log("UserMessage:", content);
    console.log("Chat processing state changing to true");
    this.setChatProcessing(true);
    this.isProcessingChat = true;
    
    // 清空最近处理过的TTS文本记录，因为开始新的聊天
    this.lastProcessedSegments.clear();

    // 获取用户名称
    const yourName = globalConfig?.characterConfig?.yourName || "User";
    
    // 添加用户消息到聊天记录
    const messageLog: Message[] = [
      ...currentChatLog,
      { role: "user", content: content, user_name: yourName },
    ];
    this.updateChatLog(messageLog);

    try {
      // 清空字幕和设置默认情绪
      this.setSubtitle("");
      this.setCurrentEmote("neutral");
      
      let stream;
      try {
        // 使用流式API获取响应
        console.log("开始流式聊天请求");
        // 将当前消息列表（用户消息已添加）传递给chatStream
        // 但需要去掉最后一条消息，因为它已经在message参数中包含了
        const historyMessages = messageLog.slice(0, -1);
        stream = await chatStream(content, yourName, historyMessages);
        
        if (!stream) {
          throw new Error("无法获取聊天流");
        }
      } catch (streamError) {
        console.error("获取聊天流失败:", streamError);
        // 重置状态并显示错误信息
        this.setChatProcessing(false);
        this.isProcessingChat = false;
        
        // 添加系统错误消息到聊天记录
        const errorMessage: Message = {
          role: "assistant",
          content: "抱歉，我暂时无法回应。请稍后再试。",
          user_name: globalConfig?.characterConfig?.character_name || "AI"
        };
        this.updateChatLog([...messageLog, errorMessage]);
        return;
      }
      
      // 创建读取器来处理流式响应
      const reader = stream.getReader();
      let fullResponse = "";
      let currentEmotion = "neutral";
      let accumulatedText = "";
      
      // 更新消息记录跟踪
      console.log("聊天记录初始状态:", JSON.stringify(messageLog.map(msg => ({ role: msg.role, len: msg.content.length }))));
      
      // 获取koeiroParam，默认为空对象
      const koeiroParam = (globalConfig as any).koeiroParam || {};
      
      // 追踪语音播放是否正在进行
      let isSpeaking = false;
      let speakCompletePromise = Promise.resolve();
      
      // 分段TTS的最小长度（字符数）
      const MIN_SEGMENT_LENGTH = 15; 
      // 分段TTS的最大长度（字符数）
      const MAX_SEGMENT_LENGTH = 50;
      
      // 处理单个TTS段的函数
      const processTTSSegment = async (segment: string, emotion: string) => {
        if (!segment || segment.trim() === '') return;
        
        // 去重检查 - 如果这个片段最近处理过，跳过它
        const safeSegment = String(segment); // 确保segment一定是字符串
        if (this.lastProcessedSegments.has(safeSegment)) {
          console.log(`跳过重复的TTS片段: "${safeSegment}"`);
          return;
        }
        
        // 添加到处理过的片段集合中
        this.lastProcessedSegments.add(safeSegment);
        // 限制集合大小，避免内存泄漏
        if (this.lastProcessedSegments.size > 100) {
          // 移除最早添加的项（使用迭代器移除第一个元素）
          const firstItem = this.lastProcessedSegments.values().next().value;
          if (firstItem !== undefined) {
            this.lastProcessedSegments.delete(firstItem);
          }
        }
        
        console.log(`处理TTS片段: "${safeSegment}"，情绪: ${emotion}`);
        
        // 等待前一个语音播放完成
        await speakCompletePromise;
        
        // 创建片段的screenplay
        const segmentTalks = textsToScreenplay([safeSegment], koeiroParam, emotion);
        if (segmentTalks && segmentTalks.length > 0) {
          segmentTalks[0].talk.emotion = emotion;
          
          // 标记当前正在播放
          isSpeaking = true;
          
          // 创建一个新的Promise来跟踪这段语音的完成
          speakCompletePromise = new Promise<void>((resolve) => {
            // 播放语音片段
            this.handleSpeakAi(globalConfig, segmentTalks[0], undefined, () => {
              isSpeaking = false;
              resolve();
            });
          });
        }
      };
      
      // 分割文本为自然段落的函数
      const splitTextIntoNaturalSegments = (text: string): string[] => {
        // 使用标点符号和自然段落分割
        const segments = text.split(/(?<=[。．！？\n])/g)
          .filter(segment => segment.trim() !== '');
          
        // 进一步处理过长的段落
        const result: string[] = [];
        for (const segment of segments) {
          if (segment.length <= MAX_SEGMENT_LENGTH) {
            result.push(segment);
          } else {
            // 尝试在逗号、顿号等处分割
            const subSegments = segment.split(/(?<=[，、：；])/g);
            if (subSegments.length > 1) {
              // 能够在次要标点处分割
              for (const subSegment of subSegments) {
                if (subSegment.length <= MAX_SEGMENT_LENGTH) {
                  result.push(subSegment);
                } else {
                  // 如果子段仍然太长，按固定长度分割
                  let remaining = subSegment;
                  while (remaining.length > MAX_SEGMENT_LENGTH) {
                    result.push(remaining.substring(0, MAX_SEGMENT_LENGTH));
                    remaining = remaining.substring(MAX_SEGMENT_LENGTH);
                  }
                  if (remaining) result.push(remaining);
                }
              }
            } else {
              // 没有次要标点，按固定长度分割
              let remaining = segment;
              while (remaining.length > MAX_SEGMENT_LENGTH) {
                result.push(remaining.substring(0, MAX_SEGMENT_LENGTH));
                remaining = remaining.substring(MAX_SEGMENT_LENGTH);
              }
              if (remaining) result.push(remaining);
            }
          }
        }
        return result;
      };
      
      // 检查并处理累积的文本
      const processAccumulatedText = () => {
        if (accumulatedText.length >= MIN_SEGMENT_LENGTH) {
          const segments = splitTextIntoNaturalSegments(accumulatedText);
          // 处理除了最后一段之外的所有段落
          for (let i = 0; i < segments.length - 1; i++) {
            processTTSSegment(segments[i], currentEmotion);
          }
          
          // 保留最后一段，可能是不完整的句子
          accumulatedText = segments.length > 0 ? segments[segments.length - 1] : "";
          
          // 如果最后一段很短，而且不是完整句子，保留它
          if (accumulatedText.length < MIN_SEGMENT_LENGTH && 
              !accumulatedText.match(/[。．！？\n]$/)) {
            return;
          }
          
          // 如果最后一段是完整句子，也处理它
          if (accumulatedText.match(/[。．！？\n]$/)) {
            processTTSSegment(accumulatedText, currentEmotion);
            accumulatedText = "";
          }
        }
      };
      
      // 处理流式响应
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 更新获取到的文本和情绪
        const newContent = value.text || "";
        fullResponse = value.fullText || fullResponse + newContent;
        
        // 更新文本显示
        this.startTypewriterEffect(fullResponse);
        
        // 累积文本用于TTS
        accumulatedText += newContent;
        
        // 如果情绪发生变化，更新情绪状态
        if (value.emotion && value.emotion.type !== currentEmotion) {
          // 处理当前已积累的文本，因为情绪要变了
          processAccumulatedText();
          
          // 更新当前情绪
          currentEmotion = value.emotion.type;
          this.setCurrentEmote(currentEmotion);
        }
        
        // 处理累积的文本，看是否达到了处理条件
        processAccumulatedText();
        
        // 实时更新聊天记录中的助手消息
        // 每次接收到新的文本块时，更新聊天记录中最后一条助手消息
        // 或者添加一条新的助手消息（如果尚不存在）
        
        // 使用类型断言确保类型正确
        const characterName = (globalConfig?.characterConfig?.character_name || "AI") as string;
        
        // 创建新的消息数组副本，避免修改原数组
        const updatedMessageLog = [...messageLog];
        
        // 检查是否已经有助手消息在当前对话中
        let hasAssistantMessage = false;
        
        // 找出最后一条消息及其索引
        const lastMessageIndex = updatedMessageLog.length - 1;
        const lastMessage = lastMessageIndex >= 0 ? updatedMessageLog[lastMessageIndex] : null;
        
        // 如果最后一条消息是用户消息，则需要添加一条助手消息
        // 如果最后一条消息是助手消息，则更新它
        if (lastMessage && lastMessage.role === "assistant") {
          // 最后一条消息已经是助手消息，更新它
          hasAssistantMessage = true;
          updatedMessageLog[lastMessageIndex] = {
            ...lastMessage,
            content: fullResponse
          };
          this.updateChatLog(updatedMessageLog);
        } else {
          // 需要添加新的助手消息
          this.updateChatLog([
            ...updatedMessageLog,
            { 
              role: "assistant", 
              content: fullResponse, 
              user_name: characterName
            }
          ]);
        }
      }
      
      // 处理最后剩余的文本
      if (accumulatedText) {
        processTTSSegment(accumulatedText, currentEmotion);
      }
      
      // 等待所有语音播放完成
      await speakCompletePromise;
      
      // 流式响应已经实时更新聊天记录，这里不需要再次添加完整响应
      console.log("流式聊天完成，最终回复:", fullResponse);
      
    } catch (error) {
      console.error("流式聊天出错:", error);
      
      // 出错时回退到非流式聊天或显示错误消息
      try {
        // 添加错误消息到聊天记录
        const errorMessage: Message = {
          role: "assistant",
          content: "抱歉，我暂时无法回应。请稍后再试。",
          user_name: globalConfig?.characterConfig?.character_name || "AI"
        };
        this.updateChatLog([...messageLog, errorMessage]);
      } catch (fallbackError) {
        console.error("处理错误回退失败:", fallbackError);
      }
    } finally {
      // 确保状态被重置
      console.log("Chat processing state changing to false");
      this.setChatProcessing(false);
      this.isProcessingChat = false;
    }
  }
} 