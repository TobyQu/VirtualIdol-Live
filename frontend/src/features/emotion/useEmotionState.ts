import { useState, useEffect, useCallback } from 'react';
import { getEmotionState, updateEmotionPreference, EmotionType } from './emotionApi';

// 情绪状态数据接口
export interface EmotionState {
    emotion: EmotionType; 
    intensity: number;
    last_update: number;
}

interface UseEmotionStateProps {
    userId?: number;
    roleId?: number;
    refreshInterval?: number; // 刷新间隔时间（毫秒）
    autoRefresh?: boolean; // 是否自动刷新
    immediateMode?: boolean; // 立即模式，禁用自动刷新，提供手动刷新函数
}

export const useEmotionState = ({
    userId = 1,
    roleId = 1,
    refreshInterval = 10000, // 默认10秒刷新一次
    autoRefresh = false, // 默认不自动刷新
    immediateMode = false // 默认不使用立即模式
}: UseEmotionStateProps = {}) => {
    const [emotionState, setEmotionState] = useState<EmotionState>({
        emotion: EmotionType.NEUTRAL,
        intensity: 0.5,
        last_update: Date.now()
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // 获取情绪状态
    const fetchEmotionState = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getEmotionState(userId, roleId);
            setEmotionState({
                emotion: data.emotion || EmotionType.NEUTRAL,
                intensity: data.intensity || 0.5,
                last_update: data.last_update || Date.now()
            });
            return data;
        } catch (err) {
            console.error('获取情绪状态失败:', err);
            setError(err instanceof Error ? err : new Error('未知错误'));
            return null;
        } finally {
            setLoading(false);
        }
    }, [userId, roleId]);

    // 更新情绪偏好
    const updatePreference = useCallback(async (
        emotion: string,
        response: string,
        feedback: number = 1
    ) => {
        try {
            await updateEmotionPreference(emotion, response, feedback, userId, roleId);
            // 成功后重新获取情绪状态
            await fetchEmotionState();
            return true;
        } catch (err) {
            console.error('更新情绪偏好失败:', err);
            setError(err instanceof Error ? err : new Error('未知错误'));
            return false;
        }
    }, [userId, roleId, fetchEmotionState]);

    // 初始化获取
    useEffect(() => {
        // 仅在组件挂载时获取一次情绪状态
        fetchEmotionState();
        
        // 不再使用自动刷新逻辑
    }, [fetchEmotionState]);

    return {
        emotionState,
        loading,
        error,
        fetchEmotionState, // 导出fetchEmotionState方法，允许手动刷新
        updatePreference
    };
}; 