import { Form, FormField, FormItem, FormControl } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CircleCheck, CircleX, RefreshCw, InfoIcon, XCircleIcon, CheckCircleIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import axiosInstance from "@/utils/api"
import { API_ENDPOINTS } from "@/utils/api"
import { toast } from "sonner"

type MemorySettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  form: UseFormReturn<any>
}

// 记忆状态接口
interface MemoryStatus {
  memory_enabled: boolean;
  memory_driver_initialized: boolean;
  faiss_index_exists: boolean;
  faiss_index_info: {
    path: string;
    size: number;
    dimensions: number;
    vectors_count: number;
    last_modified: number;
  };
  metadata_db_exists: boolean;
  metadata_db_count: number;
  data_dir: string;
  data_dir_exists: boolean;
  metadata_db_error?: string;
}

export function MemorySettings({
  globalConfig,
  onChangeGlobalConfig,
  form
}: MemorySettingsProps) {
  const [status, setStatus] = useState<MemoryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 获取记忆状态
  const checkMemoryStatus = async () => {
    if (!globalConfig?.memoryStorageConfig?.enableLongMemory) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 打印API请求信息
      console.log("请求长期记忆状态:", API_ENDPOINTS.MEMORY.CHECK_STATUS);
      
      // 使用axiosInstance替代axios
      const response = await axiosInstance.get(API_ENDPOINTS.MEMORY.CHECK_STATUS);
      console.log("记忆状态响应:", response.data);
      
      if (response.data.code === 0) {
        setStatus(response.data.data);
      } else {
        setError(`请求失败: ${response.data.message}`);
      }
    } catch (error: any) {
      console.error("记忆状态请求错误:", error);
      // 记录详细错误信息
      if (error.response) {
        // 服务器返回了响应，但状态码不在2xx范围内
        console.error("错误响应数据:", error.response.data);
        console.error("错误响应状态:", error.response.status);
        console.error("错误响应头:", error.response.headers);
      } else if (error.request) {
        // 请求已发送，但没有收到响应
        console.error("未收到响应的请求:", error.request);
      } else {
        // 设置请求时发生错误
        console.error("请求错误:", error.message);
      }
      
      setError(`请求错误: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 重新初始化记忆服务
  const reinitializeMemoryService = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 打印API请求信息
      console.log("请求重新初始化长期记忆:", API_ENDPOINTS.MEMORY.REINITIALIZE);
      
      // 使用axiosInstance替代axios
      const response = await axiosInstance.post(API_ENDPOINTS.MEMORY.REINITIALIZE);
      console.log("重新初始化响应:", response.data);
      
      if (response.data.code === 0) {
        toast.success("长期记忆服务已成功重新初始化");
        // 更新状态
        await checkMemoryStatus();
      } else {
        setError(`重新初始化失败: ${response.data.message}`);
        toast.error("重新初始化失败");
      }
    } catch (error: any) {
      console.error("重新初始化请求错误:", error);
      // 记录详细错误信息
      if (error.response) {
        // 服务器返回了响应，但状态码不在2xx范围内
        console.error("错误响应数据:", error.response.data);
        console.error("错误响应状态:", error.response.status);
        console.error("错误响应头:", error.response.headers);
      } else if (error.request) {
        // 请求已发送，但没有收到响应
        console.error("未收到响应的请求:", error.request);
      } else {
        // 设置请求时发生错误
        console.error("请求错误:", error.message);
      }
      
      setError(`请求错误: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("重新初始化请求错误");
    } finally {
      setLoading(false);
    }
  };
  
  // 当启用状态改变或组件加载时检查状态
  useEffect(() => {
    if (globalConfig?.memoryStorageConfig?.enableLongMemory) {
      checkMemoryStatus();
    }
  }, [globalConfig?.memoryStorageConfig?.enableLongMemory]);
  
  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">长期记忆设置</CardTitle>
          <CardDescription>配置角色的长期记忆存储功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="enableLongMemory"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={globalConfig?.memoryStorageConfig?.enableLongMemory ? "true" : "false"}
                      onValueChange={(value) => {
                        field.onChange(value);
                        onChangeGlobalConfig({
                          ...globalConfig,
                          memoryStorageConfig: {
                            ...globalConfig?.memoryStorageConfig,
                            enableLongMemory: value === "true"
                          }
                        });
                      }}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="enable-memory" />
                        <Label htmlFor="enable-memory">开启</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="disable-memory" />
                        <Label htmlFor="disable-memory">关闭</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* FAISS 配置 */}
      {globalConfig?.memoryStorageConfig?.enableLongMemory && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">FAISS 本地向量存储配置</CardTitle>
              <CardDescription>配置FAISS向量存储参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="faissDataDir"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-xs font-medium text-foreground/70">数据存储目录</Label>
                      <FormControl>
                        <Input
                          {...field}
                          className="w-full"
                          type="text"
                          placeholder="storage/memory"
                          value={globalConfig?.memoryStorageConfig?.faissMemory?.dataDir || "storage/memory"}
                          onChange={(e) => {
                            field.onChange(e);
                            onChangeGlobalConfig({
                              ...globalConfig,
                              memoryStorageConfig: {
                                ...globalConfig?.memoryStorageConfig,
                                faissMemory: {
                                  ...globalConfig?.memoryStorageConfig?.faissMemory,
                                  dataDir: e.target.value
                                }
                              }
                            });
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* 记忆状态与调试 */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">长期记忆状态</CardTitle>
                  <CardDescription>查看和管理长期记忆模块的状态</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={checkMemoryStatus}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  刷新状态
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <XCircleIcon className="h-4 w-4" />
                  <AlertTitle>出错了</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {status ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between p-2 border rounded">
                      <span className="text-sm text-muted-foreground">长期记忆启用</span>
                      <Badge variant={status.memory_enabled ? "default" : "outline"}>
                        {status.memory_enabled ? "已启用" : "未启用"}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between p-2 border rounded">
                      <span className="text-sm text-muted-foreground">驱动初始化</span>
                      <Badge variant={status.memory_driver_initialized ? "default" : "outline"}>
                        {status.memory_driver_initialized ? "已初始化" : "未初始化"}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between p-2 border rounded">
                      <span className="text-sm text-muted-foreground">数据目录</span>
                      <Badge variant={status.data_dir_exists ? "default" : "outline"}>
                        {status.data_dir_exists ? "已创建" : "未创建"}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between p-2 border rounded">
                      <span className="text-sm text-muted-foreground">元数据库</span>
                      <Badge variant={status.metadata_db_exists ? "default" : "outline"}>
                        {status.metadata_db_exists ? "已创建" : "未创建"}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">记忆索引状态</h4>
                    {status.faiss_index_exists ? (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between p-2 border rounded">
                          <span className="text-muted-foreground">向量维度</span>
                          <span>{status.faiss_index_info.dimensions}</span>
                        </div>
                        <div className="flex justify-between p-2 border rounded">
                          <span className="text-muted-foreground">向量数量</span>
                          <span>{status.faiss_index_info.vectors_count}</span>
                        </div>
                        <div className="flex justify-between p-2 border rounded">
                          <span className="text-muted-foreground">索引大小</span>
                          <span>{formatFileSize(status.faiss_index_info.size)}</span>
                        </div>
                        <div className="flex justify-between p-2 border rounded">
                          <span className="text-muted-foreground">修改时间</span>
                          <span>{formatDate(status.faiss_index_info.last_modified)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-yellow-600 mb-2">
                        <InfoIcon className="h-4 w-4 mr-2" />
                        FAISS索引文件尚未创建，将在首次保存记忆时创建
                      </div>
                    )}
                  </div>
                  
                  {status.metadata_db_exists && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">元数据统计</h4>
                      <div className="flex justify-between p-2 border rounded">
                        <span className="text-sm text-muted-foreground">记忆条数</span>
                        <Badge variant="outline">{status.metadata_db_count}</Badge>
                      </div>
                    </div>
                  )}
                  
                  {!status.memory_driver_initialized && (
                    <Alert variant="warning" className="mt-4">
                      <InfoIcon className="h-4 w-4" />
                      <AlertTitle>长期记忆模块未完全初始化</AlertTitle>
                      <AlertDescription>
                        虽然已启用长期记忆，但模块未完全初始化。点击下方按钮重新初始化。
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    className="w-full" 
                    onClick={reinitializeMemoryService}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    重新初始化长期记忆
                  </Button>
                  
                  <div className="text-xs text-muted-foreground">
                    提示：修改长期记忆配置后，您需要手动重新初始化服务以应用更改。
                  </div>
                </div>
              ) : loading ? (
                <div className="flex justify-center py-6">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <InfoIcon className="h-5 w-5 mr-2" />
                  <span>点击刷新查看长期记忆状态</span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 