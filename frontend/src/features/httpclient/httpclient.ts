// 导入axios库
import axios from "axios";

// 定义一个发送POST请求的函数
export async function postRequest(endpoint: string, headers: Record<string, string>, data: object | FormData): Promise<any> {
  console.log(`POST: ${endpoint}`);
  
  const response = await axios.post(endpoint, data, { headers });
  return response.data;
}

// 二进制响应的POST请求
export async function postRequestArraybuffer(endpoint: string, headers: Record<string, string>, data: object): Promise<any> {
  console.log(`POST (arraybuffer): ${endpoint}`);
  
  const response = await axios.post(endpoint, data, {
    responseType: 'arraybuffer',
    headers: headers,
  });
  return response.data;
}

// GET请求
export async function getRequest(endpoint: string, headers: Record<string, string>): Promise<any> {
  console.log(`GET: ${endpoint}`);
  
  const response = await axios.get(endpoint, { headers });
  return response.data;
}

// 获取完整的API URL
export function getFullApiUrl(endpoint: string): string {
  return endpoint;
}