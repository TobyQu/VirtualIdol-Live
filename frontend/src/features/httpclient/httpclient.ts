// 导入axios库
import axios from "axios";

// 获取当前环境变量，假设为PRODUCT_ENV
const environment = process.env.NODE_ENV;

// 定义基础URL
let baseUrl = "";
let mediaUrl = "";

if (environment === "development") {
  baseUrl = "http://localhost:8000";
  mediaUrl = "http://localhost:8000";
} else if (environment === "production") {
  baseUrl = "/api/chatbot";
  mediaUrl = "/api/media";
} else {
  throw new Error("未知环境变量");
}

// 添加一个辅助函数来确保URL路径格式正确
function ensureTrailingSlash(url: string): string {
  try {
    // 解析URL以分离路径和查询参数
    const urlObj = new URL(url, 'http://example.com');
    const path = urlObj.pathname;
    const query = urlObj.search; // 包含?
    
    // 确保路径以斜杠结尾
    const pathWithSlash = path.endsWith('/') ? path : `${path}/`;
    
    // 返回组合后的URL（不包含基础URL部分）
    return `${pathWithSlash}${query}`;
  } catch (error) {
    // 如果URL解析失败，使用简单的字符串处理
    if (url.includes('?')) {
      const [path, query] = url.split('?', 2); // 最多分割成两部分
      const pathWithSlash = path.endsWith('/') ? path : `${path}/`;
      return `${pathWithSlash}?${query}`;
    } else {
      return url.endsWith('/') ? url : `${url}/`;
    }
  }
}

// 定义一个发送POST请求的函数
export async function postRequest(endpoint: string, headers: Record<string, string>, data: object | FormData): Promise<any> {
  const url = ensureTrailingSlash(endpoint);
  console.log(`Sending POST request to: ${baseUrl}${url}`);
  
  // 如果数据是FormData对象，则输出其中的文件名而不是整个对象
  if (data instanceof FormData) {
    const fileEntries = [];
    for (const pair of data.entries()) {
      if (pair[1] instanceof File) {
        const file = pair[1] as File;
        fileEntries.push(`${pair[0]}: ${file.name} (${file.size} bytes, ${file.type})`);
      } else {
        fileEntries.push(`${pair[0]}: ${pair[1]}`);
      }
    }
    console.log(`FormData: {${fileEntries.join(', ')}}`);
  } else {
    console.log(`Data:`, data);
  }
  
  const response = await axios.post(`${baseUrl}${url}`, data, { headers });
  console.log(`POST response:`, response.data);
  return response.data; // 返回解析后的数据
}

export async function postRequestArraybuffer(endpoint: string, headers: Record<string, string>, data: object): Promise<any> {
  const url = ensureTrailingSlash(endpoint);
  console.log(`Sending POST request (arraybuffer) to: ${baseUrl}${url}`);
  const response = await axios.post(`${baseUrl}${url}`, data, {
    responseType: 'arraybuffer',
    headers: headers,
  });
  return response.data; // 返回解析后的数据
}

// 定义一个发送Get请求的函数
export async function getRequest(endpoint: string, headers: Record<string, string>): Promise<any> {
  const url = ensureTrailingSlash(endpoint);
  console.log(`Sending GET request to: ${baseUrl}${url}`);
  const response = await axios.get(`${baseUrl}${url}`, { headers });
  console.log(`GET response:`, response.data);
  return response.data; // 返回响应对象
}

export function buildMediaUrl(imageUrl: string) {
    return `${mediaUrl}${imageUrl}`
}