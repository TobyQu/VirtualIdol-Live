import { VRMExpression, VRMExpressionPresetName } from "@pixiv/three-vrm";
import { KoeiroParam } from "../constants/koeiroParam";

// ChatGPT API
export type Message = {
  role: "assistant" | "system" | "user";
  content: string;
  user_name: string;
};

const talkStyles = [
  "talk",
  "happy",
  "sad",
  "angry",
  "fear",
  "surprised",
] as const;
export type TalkStyle = (typeof talkStyles)[number];

export type Talk = {
  style: TalkStyle;
  speakerX: number;
  speakerY: number;
  message: string;
  emotion?: string;
};

// 定义完整的情绪类型列表，包含emotionApi中的类型
export enum EmotionType {
  HAPPY = "happy",
  SAD = "sad",
  ANGRY = "angry",
  FEARFUL = "fearful", 
  DISGUSTED = "disgusted",
  SURPRISED = "surprised",
  NEUTRAL = "neutral",
  RELAXED = "relaxed"
}

// 情绪类型的中文标签映射
export const EmotionLabel: Record<string, string> = {
  [EmotionType.HAPPY]: "高兴",
  [EmotionType.SAD]: "悲伤",
  [EmotionType.ANGRY]: "愤怒",
  [EmotionType.FEARFUL]: "害怕",
  [EmotionType.DISGUSTED]: "厌恶",
  [EmotionType.SURPRISED]: "惊讶",
  [EmotionType.NEUTRAL]: "中性",
  [EmotionType.RELAXED]: "放松"
};

// 定义情绪类型集合，用于模型表情
const emotions = ["neutral", "happy", "angry", "sad", "relaxed"] as const;
export type VRMEmotionType = (typeof emotions)[number] & VRMExpressionPresetName;

/**
 * 発話文と音声の感情と、モデルの感情表現がセットになった物
 */
export type Screenplay = {
  expression: VRMEmotionType;
  talk: Talk;
};

export const splitSentence = (text: string): string[] => {
  const splitMessages = text.split(/(?<=[。．！？\n])/g);
  return splitMessages.filter((msg) => msg !== "");
};

export const textsToScreenplay = (
  texts: string[],
  koeiroParam: KoeiroParam,
  emote: string
): Screenplay[] => {
  const screenplays: Screenplay[] = [];
  
  // 检查texts是否为null或空数组
  if (!texts || texts.length === 0) {
    console.warn("textsToScreenplay收到空数组，返回空结果");
    return screenplays;
  }
  
  // 确保emote有效
  const validEmote = emote || "neutral";
  
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (text == null || text.trim() === "") {
      console.warn("textsToScreenplay收到null或空文本，已跳过");
      continue;
    }
    const message = text.replace(/\[(.*?)\]/g, "");
    let expression = validEmote;
    screenplays.push({
      expression: expression as VRMEmotionType,
      talk: {
        style: emotionToTalkStyle(expression as VRMEmotionType),
        speakerX: koeiroParam.speakerX,
        speakerY: koeiroParam.speakerY,
        message: message,
        emotion: mapEmotionTypeToTTS(expression as VRMEmotionType)
      },
    });
  }

  return screenplays;
};

const emotionToTalkStyle = (emotion: VRMEmotionType): TalkStyle => {
  switch (emotion) {
    case "angry":
      return "angry";
    case "happy":
      return "happy";
    case "sad":
      return "sad";
    default:
      return "talk";
  }
};

const mapEmotionTypeToTTS = (emotion: VRMEmotionType): string => {
  switch (emotion) {
    case "happy":
      return "happy";
    case "sad":
      return "sad";
    case "angry":
      return "angry";
    case "relaxed":
      return "neutral";
    default:
      return "neutral";
  }
};

// 为兼容旧的情绪API，提供getEmotionState函数实现
export async function getEmotionState(userId: number = 1, roleId: number = 1) {
  // 返回默认状态
  return {
    emotion: EmotionType.NEUTRAL,
    intensity: 0.5,
    last_update: Date.now()
  };
}

// 为兼容旧的情绪API，提供updateEmotionPreference函数实现
export async function updateEmotionPreference(
  emotion: string, 
  response: string, 
  feedback: number = 1,
  userId: number = 1, 
  roleId: number = 1
) {
  // 直接返回成功
  return true;
}
