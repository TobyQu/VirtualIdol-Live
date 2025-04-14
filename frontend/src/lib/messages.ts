export function textsToScreenplay(
  texts: string[],
  param: KoeiroParam,
  emote: string
): Talk[] {
  const screenplay: Talk[] = [];
  for (const text of texts) {
    // 检查文本是否为null或undefined
    if (text == null || text.trim() === '') {
      console.warn("textsToScreenplay收到null或空文本，已跳过");
      continue;
    }
    
    // 安全处理文本，确保不会有null.replace()错误
    const trimmedText = text.trim();
    
    // 忽略全角空格
    if (trimmedText.replace(/　/g, "").length === 0) {
      continue;
    }

    // 处理和解析文本
    const talks = parseText(trimmedText, param, emote);
    for (const talk of talks) {
      if (talk.message) {
        screenplay.push(talk);
      }
    }
  }
  return screenplay;
}

function parseText(
  text: string,
  param: KoeiroParam,
  emote: string
): Talk[] {
  // 安全检查文本
  if (!text) {
    return [];
  }

  // 创建安全的emotion对象
  let emotion = {
    type: 'neutral',
    intensity: 0.5
  };
  
  // 仅当emote不为null/undefined时设置emotion类型
  if (emote) {
    emotion.type = emote;
  }

  return [
    {
      message: text,
      // 设置初始的说话参数
      talk: {
        text: text,
        koeiroParam: {
          speakerX: param.speakerX,
          speakerY: param.speakerY,
        },
        emotion: emotion,
      },
    },
  ];
} 