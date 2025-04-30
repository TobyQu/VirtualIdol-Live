import { LipSyncAnalyzeResult } from "./lipSyncAnalyzeResult";

const TIME_DOMAIN_DATA_LENGTH = 2048;

export class LipSync {
  public readonly audio: AudioContext;
  public readonly analyser: AnalyserNode;
  public readonly timeDomainData: Float32Array;
  public previousValue: number ;

  public constructor(audio: AudioContext) {
    this.audio = audio;
    this.previousValue = 0
    this.analyser = audio.createAnalyser();
    this.timeDomainData = new Float32Array(TIME_DOMAIN_DATA_LENGTH);
  }

  public update(): LipSyncAnalyzeResult {
    this.analyser.getFloatTimeDomainData(this.timeDomainData);
    
    let volume = 0.0;
    for (let i = 0; i < TIME_DOMAIN_DATA_LENGTH; i++) {
      volume = Math.max(volume, Math.abs(this.timeDomainData[i]));
    }
    
    // 引入随机性因素
    const randomFactor = (Math.random() * 0.1) + 0.95;
    volume = 1 / (1 + Math.exp(-45 * volume * randomFactor + 5));
    
    if (volume < 0.1) {
      volume = 0;
    } else if (volume > 0.9) {
      volume = 1;
    }
    
    // 应用缓动函数进行平滑和细腻的变化
    const easedVolume = this.easeValue(volume, 0.3) * 3; // 调整缓动因子以控制变化速度
    return {
      volume: easedVolume,
    };
  }
  
  private easeValue(currentValue: number, easingFactor: number): number {
    // 使用缓动函数调整数值变化速度
    const targetValue = currentValue;
    const easedValue = (targetValue - this.previousValue) * easingFactor + this.previousValue;
    this.previousValue = easedValue;
    return easedValue;
  }

  public async playFromArrayBuffer(buffer: ArrayBuffer, onEnded?: () => void) {
    let bufferSource;

    try {
      console.log(`尝试解码音频数据，大小: ${buffer.byteLength} 字节`);
      
      if (!buffer || buffer.byteLength === 0) {
        console.error('收到空的音频数据');
        throw new Error('Empty audio buffer received');
      }
      
      // 打印音频数据的前几个字节用于调试
      const dataView = new DataView(buffer);
      let hexString = '';
      // 查看前20个字节来判断文件格式
      for (let i = 0; i < Math.min(20, buffer.byteLength); i++) {
        const byte = dataView.getUint8(i).toString(16).padStart(2, '0');
        hexString += byte + ' ';
      }
      console.log(`音频数据头部: ${hexString}`);
      
      // 检查是否是JSON格式响应（以 "data:" 或 "{" 开头）
      const firstBytes = new Uint8Array(buffer.slice(0, 10));
      const potentialStart = new TextDecoder().decode(firstBytes);
      
      let audioData = buffer;
      if (potentialStart.includes('data:') || potentialStart.startsWith('{')) {
        console.log("检测到JSON格式数据，尝试提取音频数据");
        try {
          // 尝试直接从二进制数据中提取MP3数据
          // 搜索MP3文件头标记 (0xFF 0xFB 或 0xFF 0xF3 或 0xFF 0xF2)
          const array = new Uint8Array(buffer);
          let mp3StartIndex = -1;
          
          for (let i = 0; i < array.length - 2; i++) {
            if (array[i] === 0xFF && (array[i + 1] === 0xFB || array[i + 1] === 0xF3 || array[i + 1] === 0xF2)) {
              mp3StartIndex = i;
              break;
            }
          }
          
          if (mp3StartIndex !== -1) {
            console.log(`在字节位置 ${mp3StartIndex} 找到MP3文件头`);
            audioData = buffer.slice(mp3StartIndex);
            console.log(`提取的MP3数据大小: ${audioData.byteLength} 字节`);
          } else {
            // 没有找到MP3文件头，尝试解析JSON
            const jsonText = new TextDecoder().decode(buffer);
            
            // 尝试提取所有可能的hex数据
            const hexPattern = /"data"\s*:\s*"([0-9a-fA-F]+)"/g;
            let allHexData = '';
            let match;
            
            while ((match = hexPattern.exec(jsonText)) !== null) {
              if (match[1]) {
                allHexData += match[1];
              }
            }
            
            if (allHexData) {
              console.log(`提取到hex编码数据，总长度: ${allHexData.length}`);
              try {
                // 将hex字符串转换为二进制数据
                const bytes = new Uint8Array(allHexData.length / 2);
                for (let i = 0; i < allHexData.length; i += 2) {
                  bytes[i / 2] = parseInt(allHexData.substring(i, i + 2), 16);
                }
                audioData = bytes.buffer;
                console.log(`转换后的音频数据大小: ${audioData.byteLength} 字节`);
              } catch (e) {
                console.error("转换hex数据到二进制时出错:", e);
              }
            } else {
              console.error("无法在响应中找到有效的音频数据");
            }
          }
        } catch (e) {
          console.error("提取音频数据时出错:", e);
          // 继续使用原始buffer
        }
      }
      
      // 确保数据是有效的MP3格式
      const ensureValidMp3 = (data: ArrayBuffer): ArrayBuffer => {
        const dataArr = new Uint8Array(data);
        // 检查是否已经有MP3头
        let hasValidHeader = false;
        for (let i = 0; i < Math.min(dataArr.length - 1, 100); i++) {
          if (dataArr[i] === 0xFF && (dataArr[i + 1] === 0xFB || dataArr[i + 1] === 0xF3 || dataArr[i + 1] === 0xF2)) {
            hasValidHeader = true;
            // 如果头不在开始位置，则截取
            if (i > 0) {
              console.log(`MP3头在位置 ${i}，截取数据`);
              return data.slice(i);
            }
            break;
          }
        }
        
        // 如果没有有效头，添加一个简单的MP3头
        if (!hasValidHeader) {
          console.log('未检测到有效MP3头，添加标准MP3头');
          const mp3Header = new Uint8Array([
            0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00
          ]);
          const newBuffer = new Uint8Array(mp3Header.length + dataArr.length);
          newBuffer.set(mp3Header, 0);
          newBuffer.set(dataArr, mp3Header.length);
          return newBuffer.buffer;
        }
        
        return data;
      };
      
      // 确保我们有有效的MP3数据
      audioData = ensureValidMp3(audioData);
      
      // 尝试多种方法播放音频
      let decodeSuccess = false;
      
      // 方法1: 使用AudioContext.decodeAudioData
      try {
        console.log(`尝试方法1：使用AudioContext.decodeAudioData解码，大小: ${audioData.byteLength} 字节`);
        const audioBuffer = await this.audio.decodeAudioData(audioData);
        console.log(`音频解码成功，时长: ${audioBuffer.duration} 秒，采样率: ${audioBuffer.sampleRate} Hz`);
        
        bufferSource = this.audio.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.audio.destination);
        bufferSource.connect(this.analyser);
        
        console.log('开始播放音频');
        bufferSource.start();
        
        if (onEnded) {
          console.log('注册音频播放结束事件');
          bufferSource.addEventListener("ended", () => {
            console.log('音频播放完成');
            onEnded();
          });
        }
        decodeSuccess = true;
      } catch (decodeError) {
        console.error('方法1解码失败:', decodeError);
      }
      
      // 如果方法1失败，尝试方法2: 使用Audio元素
      if (!decodeSuccess) {
        try {
          console.log('尝试方法2：使用Audio元素播放');
          const audioElement = new Audio();
          const blob = new Blob([audioData], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          
          // 设置音频播放完成回调
          if (onEnded) {
            audioElement.onended = () => {
              console.log('Audio元素播放完成');
              onEnded();
              URL.revokeObjectURL(url);
            };
          }
          
          // 连接到AudioContext进行可视化
          const mediaElementSource = this.audio.createMediaElementSource(audioElement);
          mediaElementSource.connect(this.analyser);
          mediaElementSource.connect(this.audio.destination);
          
          audioElement.src = url;
          
          // 使用事件监听器捕获错误
          audioElement.onerror = (e) => {
            console.error('Audio元素加载错误:', e);
            throw new Error(`Audio元素加载失败: ${audioElement.error?.message || '未知错误'}`);
          };
          
          // 尝试播放
          const playPromise = audioElement.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.error('Audio元素播放失败:', err);
              throw err;
            });
          }
          
          console.log('开始通过Audio元素播放');
          decodeSuccess = true;
          return;
        } catch (audioElementError) {
          console.error('方法2播放失败:', audioElementError);
        }
      }
      
      // 如果方法2也失败，尝试方法3: 使用Web Audio API的OfflineAudioContext
      if (!decodeSuccess) {
        try {
          console.log('尝试方法3：使用OfflineAudioContext解码');
          // 创建一个离线音频上下文，用于解码
          const offlineCtx = new OfflineAudioContext(2, 44100 * 40, 44100);
          
          const offlineBuffer = await offlineCtx.decodeAudioData(audioData);
          console.log(`离线解码成功，时长: ${offlineBuffer.duration} 秒`);
          
          // 使用主音频上下文播放
          bufferSource = this.audio.createBufferSource();
          bufferSource.buffer = offlineBuffer;
          bufferSource.connect(this.audio.destination);
          bufferSource.connect(this.analyser);
          
          console.log('使用离线解码的音频开始播放');
          bufferSource.start();
          
          if (onEnded) {
            bufferSource.addEventListener("ended", () => {
              console.log('离线解码音频播放完成');
              onEnded();
            });
          }
          decodeSuccess = true;
        } catch (offlineError) {
          console.error('方法3离线解码失败:', offlineError);
        }
      }
      
      // 如果所有方法都失败，使用静音MP3
      if (!decodeSuccess) {
        console.error('所有解码方法都失败，使用静音MP3');
        // 创建一个简单的静音MP3
        const silentMp3 = new Uint8Array([
          0xFF, 0xFB, 0x30, 0xC0, 0x00, 0x00, 0x00, 0x00, 
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);
        
        try {
          const silentBuffer = await this.audio.decodeAudioData(silentMp3.buffer);
          bufferSource = this.audio.createBufferSource();
          bufferSource.buffer = silentBuffer;
          bufferSource.connect(this.audio.destination);
          bufferSource.connect(this.analyser);
          
          console.log('播放静音MP3作为后备方案');
          bufferSource.start();
          
          if (onEnded) {
            setTimeout(() => {
              console.log('静音MP3播放完成');
              onEnded();
            }, 500);
          }
        } catch (silentError) {
          console.error('连静音MP3也无法播放:', silentError);
          if (onEnded) {
            setTimeout(onEnded, 100);
          }
        }
      }
    } catch (error) {
      console.error('音频播放过程中出错:', error);
      // 确保即使出错也调用onEnded回调
      if (onEnded) {
        console.log('由于错误调用结束回调');
        setTimeout(() => onEnded(), 100); // 小延迟确保不会太快调用
      }
    }
  }

  public async playFromURL(url: string, onEnded?: () => void) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    this.playFromArrayBuffer(buffer, onEnded);
  }
}
