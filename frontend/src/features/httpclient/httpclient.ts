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
  // 如果URL已经以斜杠结尾，就直接返回
  if (url.endsWith('/')) {
    return url;
  }
  // 否则添加斜杠并返回
  return `${url}/`;
}

// 定义一个发送POST请求的函数
export async function postRequest(endpoint: string, headers: Record<string, string>, data: object): Promise<any> {
  const url = ensureTrailingSlash(endpoint);
  console.log(`Sending POST request to: ${baseUrl}${url}`, data);
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