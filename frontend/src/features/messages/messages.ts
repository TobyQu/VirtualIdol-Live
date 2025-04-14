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

const emotions = ["neutral", "happy", "angry", "sad", "relaxed"] as const;
export type EmotionType = (typeof emotions)[number] & VRMExpressionPresetName;

/**
 * 発話文と音声の感情と、モデルの感情表現がセットになった物
 */
export type Screenplay = {
  expression: EmotionType;
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
      expression: expression as EmotionType,
      talk: {
        style: emotionToTalkStyle(expression as EmotionType),
        speakerX: koeiroParam.speakerX,
        speakerY: koeiroParam.speakerY,
        message: message,
        emotion: mapEmotionTypeToTTS(expression as EmotionType)
      },
    });
  }

  return screenplays;
};

const emotionToTalkStyle = (emotion: EmotionType): TalkStyle => {
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

const mapEmotionTypeToTTS = (emotion: EmotionType): string => {
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
