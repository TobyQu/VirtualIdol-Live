import { useState, useEffect, useContext } from "react"
import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ViewerContext } from "@/features/vrmViewer/viewerContext"
import { getAssets, AssetFile, AssetCategory, uploadBackground, uploadVrmModel, queryBackground, queryUserVrmModels, generateMediaUrl, saveAsset, deleteAsset } from "@/features/media/mediaApi"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"
import { Trash2, Upload } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type AssetsSettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  onChangeBackgroundImageUrl: (url: string) => void
  form: UseFormReturn<any>
}

export function AssetsSettings({
  globalConfig,
  onChangeGlobalConfig,
  onChangeBackgroundImageUrl,
  form
}: AssetsSettingsProps) {
  const [assets, setAssets] = useState<AssetCategory>({ vrm: [], background: [], animation: [] })
  const [selectedVrmFile, setSelectedVrmFile] = useState<string>(form.getValues("vrmModel") || "")
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<string>(form.getValues("backgroundUrl") || "")
  const [activeTab, setActiveTab] = useState<string>("vrm-models")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const { viewer } = useContext(ViewerContext)

  // 加载资产并设置初始选中状态
  const loadAssets = async () => {
    try {
      const data = await getAssets();
      
      // 过滤掉大小为0的文件
      const filteredData = {
        vrm: data.vrm.filter((file: AssetFile) => file.size > 0),
        background: data.background.filter((file: AssetFile) => file.size > 0),
        animation: data.animation.filter((file: AssetFile) => file.size > 0)
      }

      setAssets(filteredData)
      
      // 尝试从form获取值，如果没有则从globalConfig获取
      const formVrmModel = form.getValues("vrmModel");
      const formBackgroundUrl = form.getValues("backgroundUrl");
      
      // 如果有设置的VRM模型，则选择它
      const vrmPath = formVrmModel || globalConfig?.characterConfig?.vrmModel || ""
      if (vrmPath && filteredData.vrm.some((v: AssetFile) => v.path === vrmPath)) {
        setSelectedVrmFile(vrmPath)
        form.setValue("vrmModel", vrmPath, { shouldDirty: false });
      }
      
      // 如果有设置的背景图片，则选择它
      const bgPath = formBackgroundUrl || globalConfig?.background_url || ""
      if (bgPath && filteredData.background.some((b: AssetFile) => b.path === bgPath)) {
        setSelectedBackgroundFile(bgPath)
        form.setValue("backgroundUrl", bgPath, { shouldDirty: false });
      }
    } catch (error) {
      console.error("加载资产出错:", error);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [globalConfig, form]);
  
  // 监听form字段变化并同步到组件状态
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "vrmModel" && value.vrmModel && value.vrmModel !== selectedVrmFile) {
        setSelectedVrmFile(value.vrmModel);
      }
      if (name === "backgroundUrl" && value.backgroundUrl && value.backgroundUrl !== selectedBackgroundFile) {
        setSelectedBackgroundFile(value.backgroundUrl);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, selectedVrmFile, selectedBackgroundFile]);

  // 选择VRM模型文件
  const handleVrmFileChange = (value: string) => {
    setSelectedVrmFile(value)
    // 同步更新form表单的值，确保Select组件的值也被更新
    form.setValue("vrmModel", value);
    
    // 如果选择"none"，则不更新全局配置
    if (value === "none") {
      return
    }
    
    // 更新全局配置
    onChangeGlobalConfig({
      ...globalConfig,
      characterConfig: {
        ...globalConfig.characterConfig,
        vrmModel: value,
        vrmModelType: 'system' // 使用system类型，因为是从assets目录加载的
      }
    })
    
    // 加载VRM模型
    viewer?.loadVrm(value)
  }
  
  // 选择背景图片
  const handleBackgroundFileChange = (value: string) => {
    setSelectedBackgroundFile(value)
    // 同步更新form表单的值，确保Select组件的值也被更新
    form.setValue("backgroundUrl", value);
    
    // 如果选择"none"，则不更新背景
    if (value === "none") {
      return
    }
    
    // 更新背景图片
    onChangeBackgroundImageUrl(value)
    
    // 更新全局配置
    onChangeGlobalConfig({
      ...globalConfig,
      background_url: value
    })
  }

  // 上传自定义VRM模型
  const handleClickOpenVrmFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.vrm'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          // 创建临时URL用于即时显示
          const tempUrl = URL.createObjectURL(file)
          viewer?.loadVrm(tempUrl)
          
          // 显示上传中提示
          alert("正在处理VRM模型，请稍候...")
          
          // 同时保存到前端资产目录和后端
          try {
            // 将文件保存到前端资产目录
            const assetUrl = await saveAsset(file, 'vrm');
            console.log("前端VRM资产URL:", assetUrl);
            
            // 同时上传到后端（为了保持兼容）
            const formData = new FormData();
            formData.append('vrm', file);
            await uploadVrmModel(formData);
            
            // 刷新资产列表
            const assetData = await getAssets();
            const filteredData = {
              vrm: assetData.vrm.filter((file: AssetFile) => file.size > 0),
              background: assetData.background.filter((file: AssetFile) => file.size > 0),
              animation: assetData.animation.filter((file: AssetFile) => file.size > 0)
            };
            setAssets(filteredData);
            
            // 更新全局配置
            onChangeGlobalConfig({
              ...globalConfig,
              characterConfig: {
                ...globalConfig.characterConfig,
                vrmModel: assetUrl,
                vrmModelType: 'system'
              }
            });
            
            // 更新选中状态
            setSelectedVrmFile(assetUrl);
            
            // 加载VRM模型
            viewer?.loadVrm(assetUrl);
            
            // 显示成功消息
            alert("VRM模型上传成功");
          } catch (error) {
            console.error("上传VRM模型失败:", error);
            alert(`上传VRM模型失败: ${error}`);
          }
        } catch (error) {
          console.error("处理VRM模型时出错:", error);
          alert(`处理VRM模型时出错: ${error}`);
        }
      }
    }
    input.click()
  }

  // 上传自定义背景图片
  const handleClickOpenBackgroundFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          // 创建临时URL用于即时显示
          const tempUrl = URL.createObjectURL(file)
          
          // 更新UI显示（临时效果）
          onChangeBackgroundImageUrl(tempUrl)
          form.setValue("backgroundUrl", tempUrl)
          setSelectedBackgroundFile(tempUrl)
          onChangeGlobalConfig({
            ...globalConfig,
            background_url: tempUrl
          })
          
          // 显示上传中提示
          alert("正在处理图片，请稍候...")
          
          // 同时保存到前端资产目录和后端
          try {
            // 将文件保存到前端资产目录
            const assetUrl = await saveAsset(file, 'backgrounds');
            console.log("前端资产URL:", assetUrl);
            
            // 同时上传到后端（为了保持兼容）
            const formData = new FormData();
            formData.append('image', file);
            await uploadBackground(formData);
            
            // 刷新资产列表
            const assetData = await getAssets();
            const filteredData = {
              vrm: assetData.vrm.filter((file: AssetFile) => file.size > 0),
              background: assetData.background.filter((file: AssetFile) => file.size > 0),
              animation: assetData.animation.filter((file: AssetFile) => file.size > 0)
            };
            setAssets(filteredData);
            
            // 更新UI使用前端资产路径
            onChangeBackgroundImageUrl(assetUrl);
            form.setValue("backgroundUrl", assetUrl);
            setSelectedBackgroundFile(assetUrl);
            onChangeGlobalConfig({
              ...globalConfig,
              background_url: assetUrl
            });
            
            // 显示成功消息
            alert("背景图片上传成功");
          } catch (error) {
            console.error("上传背景图片失败:", error);
            alert(`上传背景图片失败: ${error}`);
          }
        } catch (error) {
          console.error("处理图片时出错:", error)
          alert(`处理图片时出错: ${error}`)
        }
      }
    }
    input.click()
  }

  // 检查文件是否可以删除 (不是当前使用的文件，且不是default开头的文件)
  const canDeleteFile = (filePath: string, fileType: 'vrm' | 'background'): boolean => {
    // 检查文件名是否以default开头（忽略大小写）
    const fileName = filePath.split('/').pop() || '';
    if (fileName.toLowerCase().startsWith('default')) {
      return false;
    }
    
    // 检查文件是否当前正在使用
    if (fileType === 'vrm' && filePath === selectedVrmFile) {
      return false;
    } else if (fileType === 'background' && filePath === selectedBackgroundFile) {
      return false;
    }
    
    return true;
  }
  
  // 删除VRM模型
  const handleDeleteVrm = async (filePath: string) => {
    if (!canDeleteFile(filePath, 'vrm')) {
      alert("无法删除正在使用的模型或默认模型");
      return;
    }
    
    try {
      setDeleteLoading(filePath);
      await deleteAsset(filePath, 'vrm');
      
      // 刷新资产列表
      const assetData = await getAssets();
      const filteredData = {
        vrm: assetData.vrm.filter((file: AssetFile) => file.size > 0),
        background: assetData.background.filter((file: AssetFile) => file.size > 0),
        animation: assetData.animation.filter((file: AssetFile) => file.size > 0)
      };
      setAssets(filteredData);
      
      alert("模型已成功删除");
    } catch (error) {
      console.error("删除VRM模型失败:", error);
      alert(`删除VRM模型失败: ${error}`);
    } finally {
      setDeleteLoading(null);
    }
  }
  
  // 删除背景图片
  const handleDeleteBackground = async (filePath: string) => {
    if (!canDeleteFile(filePath, 'background')) {
      alert("无法删除正在使用的背景图片或默认背景");
      return;
    }
    
    try {
      setDeleteLoading(filePath);
      await deleteAsset(filePath, 'backgrounds');
      
      // 刷新资产列表
      const assetData = await getAssets();
      const filteredData = {
        vrm: assetData.vrm.filter((file: AssetFile) => file.size > 0),
        background: assetData.background.filter((file: AssetFile) => file.size > 0),
        animation: assetData.animation.filter((file: AssetFile) => file.size > 0)
      };
      setAssets(filteredData);
      
      alert("背景图片已成功删除");
    } catch (error) {
      console.error("删除背景图片失败:", error);
      alert(`删除背景图片失败: ${error}`);
    } finally {
      setDeleteLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs 
        defaultValue="vrm-models" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="vrm-models">3D模型</TabsTrigger>
          <TabsTrigger value="backgrounds">背景图片</TabsTrigger>
        </TabsList>
        
        {/* VRM模型选项卡 */}
        <TabsContent value="vrm-models" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">选择VRM模型</CardTitle>
              <CardDescription>从预设模型中选择或上传自定义模型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="vrmModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>系统模型</FormLabel>
                      <FormControl>
                        <Select
                          value={selectedVrmFile || "none"}
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleVrmFileChange(value);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择VRM模型" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">请选择</SelectItem>
                            {assets.vrm.map((file) => (
                              <SelectItem key={file.path} value={file.path}>
                                {file.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClickOpenVrmFile}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" /> 上传自定义VRM模型
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                {assets.vrm.map((file) => (
                  <div 
                    key={file.path} 
                    className={`
                      relative border rounded p-1 cursor-pointer hover:border-primary
                      ${selectedVrmFile === file.path ? 'border-primary border-2' : 'border-gray-200'}
                    `}
                    onClick={() => handleVrmFileChange(file.path)}
                  >
                    <div className="flex justify-center items-center h-20 bg-gray-100 rounded">
                      <span className="text-xs text-center">3D模型</span>
                    </div>
                    <p className="text-xs text-center mt-1 truncate">{file.name}</p>
                    
                    {canDeleteFile(file.path, 'vrm') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 bg-white rounded-full opacity-70 hover:opacity-100"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            disabled={deleteLoading === file.path}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除模型 "{file.name}" 吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDeleteVrm(file.path);
                              }}
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 背景图片选项卡 */}
        <TabsContent value="backgrounds" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">选择背景图片</CardTitle>
              <CardDescription>从预设背景中选择一个作为虚拟角色的背景</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="backgroundUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>系统背景</FormLabel>
                      <FormControl>
                        <Select
                          value={selectedBackgroundFile || "none"}
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleBackgroundFileChange(value);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择背景图片" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">请选择</SelectItem>
                            {assets.background.map((file) => (
                              <SelectItem key={file.path} value={file.path}>
                                {file.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClickOpenBackgroundFile}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" /> 上传自定义背景图片
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                {assets.background.map((file) => (
                  <div 
                    key={file.path} 
                    className={`
                      relative border rounded p-1 cursor-pointer hover:border-primary
                      ${selectedBackgroundFile === file.path ? 'border-primary border-2' : 'border-gray-200'}
                    `}
                    onClick={() => handleBackgroundFileChange(file.path)}
                  >
                    <img 
                      src={file.path} 
                      alt={file.name} 
                      className="w-full h-20 object-cover rounded"
                    />
                    <p className="text-xs text-center mt-1 truncate">{file.name}</p>
                    
                    {canDeleteFile(file.path, 'background') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 bg-white rounded-full opacity-70 hover:opacity-100"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            disabled={deleteLoading === file.path}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除背景图片 "{file.name}" 吗？此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDeleteBackground(file.path);
                              }}
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 