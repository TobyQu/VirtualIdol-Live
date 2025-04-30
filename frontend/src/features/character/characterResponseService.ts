import { GlobalConfig } from "@/features/config/configApi";
import { EmotionType, Screenplay, VRMEmotionType, textsToScreenplay } from "@/features/messages/messages";
import { speakCharacter } from "@/features/messages/speakCharacter";
import { buildUrl } from "@/utils/buildUrl";
import { Viewer } from "@/features/vrmViewer/viewer";
import { KoeiroParam } from "@/features/constants/koeiroParam";

// 定义回调类型
export type OnStartCallback = () => void;
export type OnEndCallback = () => void;

export class CharacterResponseService {
  // 字幕更新回调函数
  private setSubtitle: (text: string) => void;
  // 情绪更新回调函数
  private setCurrentEmote: (emote: string) => void;
  // 更新对话记录的回调函数
  private updateChatLog: (role: string, content: string, userName: string) => void;
  // VRM模型引用
  private viewer: Viewer | null;

  constructor(
    setSubtitle: (text: string) => void,
    setCurrentEmote: (emote: string) => void,
    updateChatLog: (role: string, content: string, userName: string) => void,
    viewer: Viewer | null
  ) {
    this.setSubtitle = setSubtitle;
    this.setCurrentEmote = setCurrentEmote;
    this.updateChatLog = updateChatLog;
    this.viewer = viewer;
  }

  /**
   * 播放角色的语音和情绪表现
   */
  public speakCharacter = async (
    globalConfig: GlobalConfig,
    screenplay: Screenplay,
    onStart?: OnStartCallback,
    onEnd?: OnEndCallback
  ) => {
    if (!this.viewer) {
      console.warn("VRM viewer not initialized");
      return;
    }

    // 调用外部功能播放角色语音和动画
    speakCharacter(globalConfig, screenplay, this.viewer, onStart, onEnd);
  }

  /**
   * 处理用户消息并生成角色响应
   */
  public handleUserMessage = (
    globalConfig: GlobalConfig,
    type: string,
    user_name: string,
    content: string,
    emote: string
  ) => {
    console.log("RobotMessage:", content, "emote:", emote);
    
    // 如果content为空，不进行处理
    if (!content || content.trim() === '') {
      return;
    }

    // 获取koeiroParam，默认为空对象
    const koeiroParam = (globalConfig as any).koeiroParam || {};
    
    // 创建对话脚本
    const aiTextLog = content;
    const aiTalks = textsToScreenplay([aiTextLog], koeiroParam, emote);
    
    // 检查aiTalks是否为空或无效
    if (!aiTalks || aiTalks.length === 0) {
      console.warn("[handleUserMessage] 无效的aiTalks:", aiTalks);
      return;
    }
    
    // 确保情绪被正确设置
    if (emote && aiTalks[0]) {
      aiTalks[0].talk.emotion = emote;
    }
    
    // 清空字幕并设置当前情绪
    this.setSubtitle("");  // 先清空字幕，防止文本叠加
    this.setCurrentEmote(emote || "neutral");
    
    // 播放角色语音并显示字幕
    this.speakCharacter(globalConfig, aiTalks[0], () => {
      // 开始打字机效果
      this.startTypewriterEffect(aiTextLog);

      // 更新聊天记录
      this.updateChatLog("assistant", aiTextLog, user_name);
    });
  }

  /**
   * 处理弹幕消息
   */
  public handleDanmakuMessage = (
    globalConfig: GlobalConfig,
    type: string,
    user_name: string,
    content: string,
    emote: string,
    action?: string
  ) => {
    console.log("DanmakuMessage:", content, "emote:", emote);
    
    // 如果content为空，不进行处理
    if (!content || content.trim() === '') {
      return;
    }

    // 获取koeiroParam，默认为空对象
    const koeiroParam = (globalConfig as any).koeiroParam || {};
    
    // 创建对话脚本
    const aiTextLog = content;
    const aiTalks = textsToScreenplay([aiTextLog], koeiroParam, emote);
    
    // 检查aiTalks是否为空或无效
    if (!aiTalks || aiTalks.length === 0) {
      console.warn("[handleDanmakuMessage] 无效的aiTalks:", aiTalks);
      return;
    }
    
    // 确保情绪被正确设置
    if (emote && aiTalks[0]) {
      aiTalks[0].talk.emotion = emote;
    }
    
    // 清空字幕并设置当前情绪
    this.setSubtitle("");  // 先清空字幕，防止文本叠加
    this.setCurrentEmote(emote || "neutral");
    
    // 播放角色语音并显示字幕
    this.speakCharacter(globalConfig, aiTalks[0], () => {
      // 开始打字机效果
      this.startTypewriterEffect(aiTextLog);

      // 如果有，则播放相应动作
      if (action && action !== '') {
        this.handleBehaviorAction("behavior_action", action, emote);
      }

      // 更新聊天记录
      this.updateChatLog("user", content, user_name);
    }, () => {
      // 语音播放完后恢复到原动画
      if (action && action !== '') {
        this.handleBehaviorAction("behavior_action", "idle_01", "neutral");
      }
    });
  }

  /**
   * 处理行为动作
   */
  public handleBehaviorAction = (
    type: string,
    content: string,
    emote: string
  ) => {
    console.log("BehaviorActionMessage:", content, "emote:", emote);

    if (!this.viewer || !this.viewer.model) {
      console.warn("VRM model not initialized");
      return;
    }

    // 设置表情和动作
    this.viewer.model.emote(emote as VRMEmotionType);
    this.viewer.model.loadFBX(buildUrl(content));
  }

  /**
   * 开始打字机效果
   */
  public startTypewriterEffect = (text: string) => {
    // 检查并确保不传递undefined
    if (!text || text === "undefined") {
      console.log("[startTypewriterEffect] 收到无效文本，已忽略：", text);
      return;
    }
    
    // 先清空字幕，触发组件重置
    this.setSubtitle("");
    
    // 通过setTimeout延迟设置新字幕，确保状态更新
    setTimeout(() => {
      // 当接收到新的文本时，直接更新字幕状态，SubtitleBubble组件会负责显示效果
      console.log("[startTypewriterEffect] 设置字幕：", text);
      this.setSubtitle(text);
    }, 50);
  }
} 