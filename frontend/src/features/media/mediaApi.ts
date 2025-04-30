import { buildUrl } from "@/utils/buildUrl";
import { getRequest, postRequest } from "../httpclient/httpclient";


export const backgroundModelData = {
    id: -1,
    original_name: "",
    image: ""
}
export type BackgroundModel = typeof backgroundModelData;

export const vrmModelData = {
    id: -1,
    type: "",
    original_name: "",
    vrm: ""
}
export type VrmModel = typeof vrmModelData;

// 添加接口定义
export interface AssetFile {
  name: string;
  path: string;
  size: number;
  type?: string;
  thumbnail?: string;  // 添加可选的缩略图属性
}

export interface AssetCategory {
  vrm: AssetFile[];
  background: AssetFile[];
  animation: AssetFile[];
}

export interface SaveAssetResult {
  success: boolean;
  assetUrl: string;
  fileName: string;
}

// 获取公共资产
export async function fetchPublicAssets(): Promise<AssetCategory> {
  try {
    const response = await fetch('/api/v1/assets');
    
    if (!response.ok) {
      throw new Error(`获取资产失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取资产失败:', error);
    return {
      vrm: [],
      background: [],
      animation: []
    };
  }
}

export async function deleteBackground(id: number) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    
    try {
        // 使用新的API删除背景
        return await deleteAsset(`${id}`, 'backgrounds');
    } catch (error) {
        console.error("删除背景图片错误:", error);
        throw error;
    }
}

export async function uploadBackground(formData: FormData) {
    try {
        console.log("准备上传背景图片FormData:", formData);
        // 检查FormData是否包含文件
        if (formData.has('image')) {
            const file = formData.get('image') as File;
            console.log("上传的文件信息:", file.name, file.size, file.type);
            
            // 检查文件类型是否是图片
            if (!file.type.startsWith('image/')) {
                throw new Error("只能上传图片文件");
            }
            
            // 检查文件大小是否超过限制
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error(`文件大小不能超过5MB，当前大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            }
            
            // 检查文件名长度
            if (file.name.length > 50) {
                console.warn("文件名过长，可能会导致保存失败");
            }
        } else {
            console.error("FormData中没有'image'字段");
            throw new Error("未找到要上传的图片文件");
        }
        
        try {
            // 使用新的API上传背景
            const file = formData.get('image') as File;
            const newFormData = new FormData();
            newFormData.append('file', file);
            
            const result = await saveAsset(file, 'backgrounds');
            console.log("上传背景图片响应:", result);
            
            // 刷新assets列表
            const assetData = await fetchPublicAssets();
            console.log("刷新assets列表:", assetData);
            
            return result;
        } catch (error) {
            console.error("上传背景错误:", error);
            throw error;
        }
    } catch (error) {
        console.error("上传背景错误:", error);
        throw error;
    }
}

export async function queryBackground() {
    try {
        // 使用新的API获取背景列表
        const assets = await fetchPublicAssets();
        // 转换为旧格式，保持兼容性
        return assets.background.map((item, index) => ({
            id: index,
            original_name: item.name,
            image: item.path
        }));
    } catch (error) {
        console.error("获取背景列表错误:", error);
        throw error;
    }
}

export async function deleteVrmModel(id: number) {
    try {
        // 使用新的API删除VRM模型
        return await deleteAsset(`${id}`, 'vrm');
    } catch (error) {
        console.error("删除VRM模型错误:", error);
        throw error;
    }
}

export async function uploadVrmModel(formData: FormData) {
    try {
        console.log("准备上传VRM模型FormData:", formData);
        // 检查FormData是否包含文件
        if (formData.has('vrm')) {
            const file = formData.get('vrm') as File;
            console.log("上传的VRM文件信息:", file.name, file.size, file.type);
            
            // 检查文件类型
            if (!file.name.toLowerCase().endsWith('.vrm')) {
                throw new Error("只能上传VRM格式文件");
            }
            
            // 检查文件大小是否超过限制
            const maxSize = 30 * 1024 * 1024; // 30MB
            if (file.size > maxSize) {
                throw new Error(`文件大小不能超过30MB，当前大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            }
        } else {
            console.error("FormData中没有'vrm'字段");
            throw new Error("未找到要上传的VRM文件");
        }
        
        try {
            // 使用新的API上传VRM模型
            const file = formData.get('vrm') as File;
            const result = await saveAsset(file, 'vrm');
            console.log("上传VRM模型响应:", result);
            
            // 刷新assets列表
            const assetData = await fetchPublicAssets();
            console.log("刷新assets列表:", assetData);
            
            return result;
        } catch (error) {
            console.error("上传VRM模型错误:", error);
            throw error;
        }
    } catch (error) {
        console.error("上传VRM模型错误:", error);
        throw error;
    }
}

export async function uploadRolePackage(formData: FormData) {
    const headers: Record<string, string> = {
        "Content-Type": "multipart/form-data"
    };
    const chatRes = await postRequest("/api/v1/chatbot/rolepackage/upload", headers, formData);
    if (chatRes.code !== '200') {
        throw new Error("Something went wrong");
    }
    return chatRes.response;
}

export async function queryUserVrmModels() {
    try {
        // 使用新的API获取用户VRM模型列表
        const assets = await fetchPublicAssets();
        // 过滤用户类型的VRM模型，转换为旧格式，保持兼容性
        return assets.vrm
            .filter(item => !item.name.toLowerCase().startsWith('default'))
            .map((item, index) => ({
                id: index,
                type: "user",
                original_name: item.name,
                vrm: item.path
            }));
    } catch (error) {
        console.error("获取用户VRM模型列表错误:", error);
        throw error;
    }
}

export async function querySystemVrmModels() {
    try {
        // 使用新的API获取系统VRM模型列表
        const assets = await fetchPublicAssets();
        // 过滤系统类型的VRM模型，转换为旧格式，保持兼容性
        return assets.vrm
            .filter(item => item.name.toLowerCase().startsWith('default'))
            .map((item, index) => ({
                id: index,
                type: "system",
                original_name: item.name,
                vrm: item.path
            }));
    } catch (error) {
        console.error("获取系统VRM模型列表错误:", error);
        throw error;
    }
}


export function generateMediaUrl(url: string) {
  // 如果url以'/assets/'开头，直接返回
  if (url.startsWith('/assets/')) {
    return url;
  }
  
  // 如果不是以"/"开头，添加前缀
  if (!url.startsWith('/')) {
    return `/api/media/${url}`;
  }
  
  return url;
}

export function buildVrmModelUrl(url: string, type: string) {
  // 如果url以'/assets/'开头，直接返回
  if (url.startsWith('/assets/')) {
    return url;
  }
  
  let vrm_url = ""
  if (type === "user") {
    vrm_url = generateMediaUrl(url);
  } else {
    vrm_url = buildUrl(url);
  }
  return vrm_url
}

// 保存资产文件
export async function saveAsset(file: File, assetType: string, category?: string): Promise<SaveAssetResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (category) {
      formData.append('category', category);
    }
    
    let endpoint = '';
    switch(assetType) {
      case 'backgrounds':
        endpoint = '/api/v1/assets/background';
        break;
      case 'vrm':
        endpoint = '/api/v1/assets/vrm';
        break;
      case 'animations':
        endpoint = '/api/v1/assets/animation';
        break;
      default:
        throw new Error('无效的资产类型');
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '上传失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('上传资产失败:', error);
    throw error;
  }
}

// 删除资产文件
export async function deleteAsset(fileName: string, assetType: string): Promise<boolean> {
  try {
    let endpoint = '';
    let queryParams = `?filePath=${encodeURIComponent(fileName)}`;
    
    switch(assetType) {
      case 'backgrounds':
        endpoint = '/api/v1/assets/background';
        break;
      case 'vrm':
        endpoint = '/api/v1/assets/vrm';
        break;
      case 'animations':
        // 对于动画，需要解析出类别
        const parts = fileName.split('/');
        if (parts.length >= 3) {
          const category = parts[parts.length - 2]; // 获取路径中的类别
          endpoint = '/api/v1/assets/animation';
          queryParams += `&category=${category}`;
        } else {
          throw new Error('无效的动画文件路径');
        }
        break;
      default:
        throw new Error('无效的资产类型');
    }
    
    const response = await fetch(`${endpoint}${queryParams}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '删除失败');
    }
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('删除资产失败:', error);
    throw error;
  }
}
