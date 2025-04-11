import React, { useEffect, useState } from 'react';
import { useEmotionState } from '@/features/emotion/useEmotionState';
import { EmotionLabel, EmotionType } from '@/features/emotion/emotionApi';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';

interface EmotionIndicatorProps {
  userId?: number;
  roleId?: number;
  showLabel?: boolean;
  showIntensity?: boolean;
  className?: string;
  style?: React.CSSProperties;
  inConversation?: boolean; // 是否在对话上下文中
  refreshInterval?: number; // 可选的刷新间隔
}

export const EmotionIndicator: React.FC<EmotionIndicatorProps> = ({
  userId,
  roleId,
  showLabel = true,
  showIntensity = true,
  className = '',
  style,
  inConversation = false,
  refreshInterval = 15000
}) => {
  const { emotionState, loading, error, fetchEmotionState } = useEmotionState({
    userId,
    roleId,
    refreshInterval: refreshInterval,
    autoRefresh: inConversation, // 只有在对话中才自动刷新
    immediateMode: !inConversation // 非对话中使用立即模式
  });
  
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

  // 获取情绪对应的图标
  const getEmotionIcon = (emotion: EmotionType): string => {
    switch (emotion) {
      case EmotionType.HAPPY:
        return '😊';
      case EmotionType.SAD:
        return '😢';
      case EmotionType.ANGRY:
        return '😠';
      case EmotionType.FEARFUL:
        return '😨';
      case EmotionType.DISGUSTED:
        return '😒';
      case EmotionType.SURPRISED:
        return '😲';
      case EmotionType.NEUTRAL:
      default:
        return '😐';
    }
  };

  // 计算强度样式
  const intensityStyle = {
    opacity: emotionState.intensity,
  };

  if (loading && !emotionState.emotion) {
    return <div className={`emotion-indicator ${className}`} style={style}>加载中...</div>;
  }

  if (error) {
    return null; // 出错时不显示
  }

  return (
    <div className={`emotion-indicator-container ${className}`} style={{ display: 'flex', alignItems: 'center', ...style }}>
      <div 
        className="emotion-indicator"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          borderRadius: '12px',
          backgroundColor: getEmotionColor(emotionState.emotion),
          color: '#fff',
          fontSize: '14px',
          ...intensityStyle
        }}
      >
        <span className="emotion-icon" style={{ marginRight: '4px', fontSize: '16px' }}>
          {getEmotionIcon(emotionState.emotion)}
        </span>
        
        {showLabel && (
          <span className="emotion-label">
            {EmotionLabel[emotionState.emotion] || '未知'}
          </span>
        )}
        
        {showIntensity && (
          <span className="emotion-intensity" style={{ marginLeft: '4px', fontSize: '12px' }}>
            {Math.round(emotionState.intensity * 100)}%
          </span>
        )}
      </div>
      
      {!inConversation && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-2 h-6 w-6" 
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}; 