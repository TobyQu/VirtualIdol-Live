import { buildUrl } from "@/utils/buildUrl";
import { getRequest, postRequest, buildMediaUrl } from "../httpclient/httpclient";


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
}

export interface AssetCategory {
  vrm: AssetFile[];
  background: AssetFile[];
  animation: AssetFile[];
}

// 获取assets目录下的资源文件
export async function getAssets(): Promise<AssetCategory> {
  try {
    const response = await fetch('/api/public-assets');
    if (!response.ok) {
      throw new Error('Failed to fetch assets');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching assets:', error);
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
    const chatRes = await postRequest(`/chatbot/config/background/delete/${id}`, headers, {});
    if (chatRes.code !== '200') {
        throw new Error("Something went wrong");
    }
    return chatRes.response;
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
            // 引入axios
            const axios = await import('axios');
            const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:8000" : "/api/chatbot";
            const url = `${baseUrl}/chatbot/config/background/upload/`;
            
            console.log(`发送请求到: ${url}`);
            
            // 创建新的FormData对象（有时可以解决一些格式问题）
            const newFormData = new FormData();
            const file = formData.get('image') as File;
            
            // 确保文件名符合后端要求（不要太长）
            // 后端模型限制了original_name字段长度为50
            const fileName = file.name.length > 45 ? 
                file.name.substring(0, 45) + ".jpg" : 
                file.name;
            
            // 使用短文件名添加到FormData
            newFormData.append('image', file, fileName);
            
            // 调试FormData内容
            console.log("FormData详情:");
            for (const pair of newFormData.entries()) {
                console.log(`${pair[0]}: ${pair[1] instanceof File ? 
                  `${(pair[1] as File).name} (${(pair[1] as File).size} bytes)` : pair[1]}`);
            }
            
            // 确保不设置Content-Type，让浏览器自动添加boundary
            const response = await axios.default.post(url, newFormData, {
                headers: {},
                withCredentials: true
            });
            
            console.log("上传背景图片响应:", response.data);
            
            // 检查响应状态
            if (response.data && response.data.code === '200') {
                console.log("上传成功，刷新背景列表");
                
                // 等待一小段时间，确保服务器处理完毕
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 刷新背景列表
                const backgroundList = await queryBackground();
                console.log("获取到新的背景列表:", backgroundList);
                
                // 确保背景图片有完整的URL
                const mediaUrl = backgroundList && backgroundList.length > 0 ? 
                    generateMediaUrl(backgroundList[backgroundList.length - 1].image) : '';
                    
                console.log("生成的媒体URL:", mediaUrl);
                
                // 刷新assets列表
                const assetData = await getAssets();
                console.log("刷新assets列表:", assetData);
                
                return response.data.response;
            } else {
                console.error("上传失败:", response.data);
                throw new Error(`上传失败: ${JSON.stringify(response.data)}`);
            }
        } catch (axiosError: any) {
            console.error("请求错误:", axiosError);
            if (axiosError.response) {
                console.error("服务器响应状态:", axiosError.response.status);
                console.error("服务器响应数据:", axiosError.response.data);
                throw new Error(`服务器错误: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
            } else {
                throw axiosError;
            }
        }
    } catch (error) {
        console.error("上传背景错误:", error);
        throw error;
    }
}

export async function queryBackground() {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    const chatRes = await getRequest("/chatbot/config/background/show", headers);
    if (chatRes.code !== '200') {
        throw new Error("Something went wrong");
    }
    return chatRes.response;
}

export async function deleteVrmModel(id: number) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    const chatRes = await postRequest(`/chatbot/config/vrm/delete/${id}`, headers, {});
    if (chatRes.code !== '200') {
        throw new Error("Something went wrong");
    }
    return chatRes.response;
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
            // 引入axios
            const axios = await import('axios');
            const baseUrl = process.env.NODE_ENV === "development" ? "http://localhost:8000" : "/api/chatbot";
            const url = `${baseUrl}/chatbot/config/vrm/upload/`;
            
            console.log(`发送请求到: ${url}`);
            
            // 调试FormData内容
            console.log("FormData详情:");
            for (const pair of formData.entries()) {
                console.log(`${pair[0]}: ${pair[1] instanceof File ? 
                  `${(pair[1] as File).name} (${(pair[1] as File).size} bytes)` : pair[1]}`);
            }
            
            // 确保不设置Content-Type，让浏览器自动添加boundary
            const response = await axios.default.post(url, formData, {
                headers: {},
                // 添加withCredentials支持跨域Cookie
                withCredentials: true
            });
            
            console.log("上传VRM模型响应:", response.data);
            
            // 检查响应状态
            if (response.data && response.data.code === '200') {
                console.log("上传成功，刷新VRM模型列表");
                
                // 等待一小段时间，确保服务器处理完毕
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 刷新VRM模型列表
                const vrmList = await queryUserVrmModels();
                console.log("获取到新的VRM模型列表:", vrmList);
                
                // 刷新assets列表
                const assetData = await getAssets();
                console.log("刷新assets列表:", assetData);
                
                return response.data.response;
            } else {
                console.error("上传失败:", response.data);
                throw new Error(`上传失败: ${JSON.stringify(response.data)}`);
            }
        } catch (axiosError: any) {
            console.error("请求错误:", axiosError);
            if (axiosError.response) {
                console.error("服务器响应状态:", axiosError.response.status);
                console.error("服务器响应数据:", axiosError.response.data);
                throw new Error(`服务器错误: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
            } else {
                throw axiosError;
            }
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
    const chatRes = await postRequest("/chatbot/rolepackage/upload", headers, formData);
    if (chatRes.code !== '200') {
        throw new Error("Something went wrong");
    }
    return chatRes.response;
}

export async function queryUserVrmModels() {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    const chatRes = await getRequest("/chatbot/config/vrm/user/show", headers);
    if (chatRes.code !== '200') {
        throw new Error("Something went wrong");
    }
    return chatRes.response;
}

export async function querySystemVrmModels() {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };
    const chatRes = await getRequest("/chatbot/config/vrm/system/show", headers);
    if (chatRes.code !== '200') {
        throw new Error("Something went wrong");
    }
    return chatRes.response;
}


export function generateMediaUrl(url: string) {
  // 如果url以'/assets/'开头，直接返回
  if (url.startsWith('/assets/')) {
    return url;
  }
  return buildMediaUrl(url);
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

// 将文件保存到前端资产目录
export async function saveAsset(file: File, assetType: 'backgrounds' | 'vrm' | 'animations' = 'backgrounds'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('assetType', assetType);
  
  try {
    const response = await fetch('/api/save-asset', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`服务器返回错误: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || '保存资产失败');
    }
    
    console.log('资产已保存到前端目录:', data.assetUrl);
    return data.assetUrl;
  } catch (error) {
    console.error('保存资产失败:', error);
    throw error;
  }
}

// 删除前端资产目录中的文件
export async function deleteAsset(filePath: string, assetType: 'backgrounds' | 'vrm' | 'animations'): Promise<boolean> {
  try {
    // 从文件路径中提取文件名
    const fileName = filePath.split('/').pop();
    
    if (!fileName) {
      throw new Error('无效的文件路径');
    }
    
    const response = await fetch(`/api/delete-asset?filePath=${encodeURIComponent(fileName)}&assetType=${assetType}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '删除资产失败');
    }
    
    const data = await response.json();
    console.log('资产已从前端目录删除:', filePath);
    return data.success;
  } catch (error) {
    console.error('删除资产失败:', error);
    throw error;
  }
}
