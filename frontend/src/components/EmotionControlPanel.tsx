import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { RefreshCw } from 'lucide-react';
import { useEmotionState } from '@/features/emotion/useEmotionState';
import { EmotionLabel, EmotionType } from '@/features/emotion/emotionApi';

interface EmotionControlPanelProps {
  className?: string;
  style?: React.CSSProperties;
}

export const EmotionControlPanel: React.FC<EmotionControlPanelProps> = ({ 
  className,
  style
}) => {
  const { emotionState, loading, error, fetchEmotionState, updatePreference } = useEmotionState({
    immediateMode: true, // 使用立即模式
    autoRefresh: false // 不自动刷新
  });
  
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>(EmotionType.NEUTRAL);
  const [intensity, setIntensity] = useState<number>(0.5);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 手动刷新情绪状态
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEmotionState();
    setIsRefreshing(false);
  };
  
  // 获取情绪对应的颜色
  const getEmotionColor = (emotion: EmotionType): string => {
    switch (emotion) {
      case EmotionType.HAPPY:
        return '#FFD700'; // 金色
      case EmotionType.SAD:
        return '#6495ED'; // 蓝色
      case EmotionType.ANGRY:
        return '#FF4500'; // 红色
      case EmotionType.FEARFUL:
        return '#9370DB'; // 紫色
      case EmotionType.DISGUSTED:
        return '#8FBC8F'; // 绿色
      case EmotionType.SURPRISED:
        return '#FF69B4'; // 粉色
      case EmotionType.NEUTRAL:
      default:
        return '#A9A9A9'; // 灰色
    }
  };

  // 设置并应用某个情绪
  const handleSetEmotion = async (emotion: EmotionType) => {
    try {
      await updatePreference(
        emotion,
        `用户手动设置情绪为${EmotionLabel[emotion]}`,
        1
      );
    } catch (err) {
      console.error('设置情绪失败:', err);
    }
  };

  return (
    <Card className={`w-full ${className}`} style={style}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">情绪控制面板</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">当前情绪:</span>
            <span 
              className="px-2 py-1 rounded text-white text-sm"
              style={{ backgroundColor: getEmotionColor(emotionState.emotion) }}
            >
              {EmotionLabel[emotionState.emotion] || '未知'} ({Math.round(emotionState.intensity * 100)}%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          {Object.values(EmotionType).map((emotion) => (
            <Button
              key={emotion}
              variant={emotionState.emotion === emotion ? "default" : "outline"}
              onClick={() => handleSetEmotion(emotion)}
              className="text-sm h-auto py-2"
              style={
                emotionState.emotion === emotion 
                  ? { backgroundColor: getEmotionColor(emotion), color: '#fff' } 
                  : {}
              }
            >
              {EmotionLabel[emotion]}
            </Button>
          ))}
        </div>

        <div className="space-y-4 mt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">情绪强度:</Label>
              <span className="text-sm text-muted-foreground">{Math.round(intensity * 100)}%</span>
            </div>
            <Slider
              value={[intensity * 100]}
              min={0}
              max={100}
              step={10}
              onValueChange={(value: number[]) => setIntensity(value[0] / 100)}
              className="w-full"
            />
            <div className="flex justify-end mt-2">
              <Button 
                size="sm"
                onClick={() => {
                  // 使用当前选择的情绪和强度更新情绪状态
                  updatePreference(
                    emotionState.emotion,
                    `用户手动调整情绪强度为${Math.round(intensity * 100)}%`,
                    intensity * 2 // 将强度值转换为评分，范围从0-1变为0-2
                  );
                }}
              >
                应用强度
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 