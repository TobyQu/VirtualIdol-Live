import { getRequest, postRequest } from "../httpclient/httpclient";

/**
 * 获取情绪状态
 * @param userId 用户ID
 * @param roleId 角色ID
 * @returns 情绪状态信息
 */
export async function getEmotionState(userId: number = 1, roleId: number = 1) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    try {
        // 确保参数值是有效的数字
        const safeUserId = Number(userId) || 1;
        const safeRoleId = Number(roleId) || 1;
        
        const response = await getRequest(`/chatbot/emotion/state?user_id=${safeUserId}&role_id=${safeRoleId}`, headers);
        if (response.code !== 0) {
            throw new Error(`获取情绪状态失败: ${response.message || '未知错误'}`);
        }
        return response.data || {};
    } catch (error) {
        console.error("获取情绪状态出错:", error);
        throw error;
    }
}

/**
 * 更新情绪偏好
 * @param emotion 情绪类型
 * @param response 响应内容
 * @param feedback 反馈值（1表示喜欢，0表示无感，-1表示不喜欢）
 * @param userId 用户ID
 * @param roleId 角色ID
 * @returns 操作结果
 */
export async function updateEmotionPreference(
    emotion: string, 
    response: string, 
    feedback: number = 1,
    userId: number = 1, 
    roleId: number = 1
) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    // 确保参数值是有效的数字
    const safeUserId = Number(userId) || 1;
    const safeRoleId = Number(roleId) || 1;
    const safeFeedback = Number(feedback) || 1;

    const body = {
        user_id: safeUserId,
        role_id: safeRoleId,
        emotion,
        response,
        feedback: safeFeedback
    };

    try {
        const response = await postRequest("/chatbot/emotion/preference", headers, body);
        if (response.code !== 0) {
            throw new Error(`更新情绪偏好失败: ${response.message || '未知错误'}`);
        }
        return true;
    } catch (error) {
        console.error("更新情绪偏好出错:", error);
        throw error;
    }
}

/**
 * 情绪类型枚举
 */
export enum EmotionType {
    HAPPY = "happy",
    SAD = "sad",
    ANGRY = "angry",
    FEARFUL = "fearful",
    DISGUSTED = "disgusted",
    SURPRISED = "surprised",
    NEUTRAL = "neutral"
}

/**
 * 情绪类型中文描述映射
 */
export const EmotionLabel: Record<string, string> = {
    [EmotionType.HAPPY]: "高兴",
    [EmotionType.SAD]: "悲伤",
    [EmotionType.ANGRY]: "愤怒",
    [EmotionType.FEARFUL]: "害怕",
    [EmotionType.DISGUSTED]: "厌恶",
    [EmotionType.SURPRISED]: "惊讶",
    [EmotionType.NEUTRAL]: "中性"
}; 