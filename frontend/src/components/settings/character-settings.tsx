import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, X, Save, Upload, Edit, User } from "lucide-react"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"
import { useState, useEffect, useRef, useContext, Dispatch, SetStateAction } from "react"
import { custoRoleFormData, customrolEdit, customroleCreate, customroleDelete, customroleList } from "@/features/customRole/customRoleApi"
import { uploadRolePackage, fetchPublicAssets, AssetFile, AssetCategory } from "@/features/media/mediaApi"
import { ViewerContext } from "@/features/vrmViewer/viewerContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useRoleStore } from "@/features/role/roleStore"
import { showSuccess, showError } from "@/lib/toast"
import { useViewerStore } from "@/features/vrmViewer/viewerStore"

type CharacterSettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  onChangeBackgroundImageUrl: (url: string) => void
  form: UseFormReturn<any>
  selectedRoleId: number
  setSelectedRoleId: Dispatch<SetStateAction<number>>
  enableCreateRole: boolean
  setEnableCreateRole: Dispatch<SetStateAction<boolean>>
}

export function CharacterSettings({
  globalConfig,
  onChangeGlobalConfig,
  onChangeBackgroundImageUrl,
  form,
  selectedRoleId,
  setSelectedRoleId,
  enableCreateRole,
  setEnableCreateRole
}: CharacterSettingsProps) {
  const [customRoles, setCustomRoles] = useState([custoRoleFormData]);
  const [customRole, setCustomRole] = useState(custoRoleFormData);
  const [customRoleLog, setCustomRoleLog] = useState("");
  const [deleteCustomRoleLog, setDeleteCustomRoleLog] = useState("");
  const [uploadRolePackageLog, setUploadRolePackageLog] = useState("");
  const [publicAssets, setPublicAssets] = useState<AssetCategory>({ vrm: [], background: [], animation: [] });
  const [selectedVrmFile, setSelectedVrmFile] = useState<string>("");
  const [selectedBackgroundFile, setSelectedBackgroundFile] = useState<string>("");
  const RolePackagelFileInputRef = useRef<HTMLInputElement>(null);
  const { viewer } = useContext(ViewerContext);
  const [activeTab, setActiveTab] = useState<string>("select");
  const [vrmAssets, setVrmAssets] = useState<AssetFile[]>([]);

  useEffect(() => {
    customroleList().then(data => setCustomRoles(data));
    
    // 获取assets目录下的资源文件
    fetchPublicAssets().then((data: AssetCategory) => {
      // 过滤掉大小为0的文件
      const filteredData = {
        vrm: data.vrm.filter((file: AssetFile) => file.size > 0),
        background: data.background.filter((file: AssetFile) => file.size > 0),
        animation: data.animation.filter((file: AssetFile) => file.size > 0)
      };

      setPublicAssets(filteredData);
      
      // 如果有设置的VRM模型，则选择它
      const vrmPath = globalConfig?.characterConfig?.vrmModel || "";
      if (vrmPath && filteredData.vrm.some((v: AssetFile) => v.path === vrmPath)) {
        setSelectedVrmFile(vrmPath);
      }
      
      // 如果有设置的背景图片，则选择它
      const bgPath = globalConfig?.background_url || "";
      if (bgPath && filteredData.background.some((b: AssetFile) => b.path === bgPath)) {
        setSelectedBackgroundFile(bgPath);
      }
    }).catch(err => {
      console.error("加载VRM资产失败:", err);
    });
  }, []);

  const handleCustomRole = () => {
    if (enableCreateRole) {
      customroleCreate(customRole)
        .then(() => {
          customroleList().then(data => setCustomRoles(data));
          setCustomRoleLog("创建成功");
          // 重置状态，返回到角色选择
          setTimeout(() => {
            setEnableCreateRole(false);
            setActiveTab("select");
            setCustomRoleLog("");
          }, 1500);
        })
        .catch(() => setCustomRoleLog("创建失败"));
    } else {
      customrolEdit(customRole.id, customRole)
        .then(() => {
          customroleList().then(data => setCustomRoles(data));
          setCustomRoleLog("更新成功");
          // 更新全局配置中的角色名称（如果编辑的是当前选择的角色）
          if (selectedRoleId === customRole.id) {
            onChangeGlobalConfig({
              ...globalConfig,
              characterConfig: {
                ...globalConfig?.characterConfig,
                character_name: customRole.role_name
              }
            });
            // 更新表单中的角色名称字段
            form.setValue("characterName", customRole.role_name);
          }
          // 返回角色选择
          setTimeout(() => {
            setActiveTab("select");
            setCustomRoleLog("");
          }, 1500);
        })
        .catch(() => setCustomRoleLog("更新失败"));
    }
  };

  const handleCustomRoleDelete = (roleId: number) => {
    // 检查是否为缺省角色（ID为1），如果是则阻止删除
    if (roleId === 1) {
      setDeleteCustomRoleLog("默认角色不能删除");
      setTimeout(() => {
        setDeleteCustomRoleLog("");
      }, 1500);
      return;
    }
    
    customroleDelete(roleId)
      .then(() => {
        customroleList().then(data => setCustomRoles(data));
        setDeleteCustomRoleLog("删除成功");
        
        // 如果删除的是当前选中的角色，重置选中状态
        if (roleId === selectedRoleId) {
          setSelectedRoleId(-1);
          onChangeGlobalConfig({
            ...globalConfig,
            characterConfig: {
              ...globalConfig?.characterConfig,
              character: -1,
              character_name: ""
            }
          });
          form.setValue("characterName", "");
        }

        // 延迟清除消息
        setTimeout(() => {
          setDeleteCustomRoleLog("");
        }, 1500);
      })
      .catch(() => {
        setDeleteCustomRoleLog("删除失败");
        setTimeout(() => {
          setDeleteCustomRoleLog("");
        }, 1500);
      });
  };

  const handleRolePackageButtonClick = () => {
    RolePackagelFileInputRef?.current?.click();
  };

  const handleRolePackageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const selectedFile = event.target.files[0];
      if (!selectedFile) {
        return;
      }
      const formData = new FormData();
      formData.append('role_package', selectedFile);
      uploadRolePackage(formData)
        .then(() => {
          setUploadRolePackageLog("上传成功");
          customroleList().then(roleData => {
            setCustomRoles(roleData);
          });
          setTimeout(() => {
            setUploadRolePackageLog("");
          }, 1500);
        })
        .catch(() => {
          setUploadRolePackageLog("上传失败");
          setTimeout(() => {
            setUploadRolePackageLog("");
          }, 1500);
        });
    }
  };

  const handleClickOpenVrmFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vrm';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        viewer?.loadVrm(url);
      }
    };
    input.click();
  };

  const selectRole = (roleId: number) => {
    const selectedRoleName = customRoles.find(role => role.id === roleId)?.role_name || "";
    
    // 更新全局配置
    onChangeGlobalConfig({
      ...globalConfig,
      characterConfig: {
        ...globalConfig?.characterConfig,
        character: roleId,
        character_name: selectedRoleName
      }
    });
    
    // 更新表单中的角色名称字段
    form.setValue("characterName", selectedRoleName);
    
    setSelectedRoleId(roleId);
    setEnableCreateRole(false);
    
    const selectedRole = customRoles.find(role => role.id === roleId);
    if (selectedRole) {
      setCustomRole(selectedRole);
    }
  };
  
  const startEditRole = (role) => {
    setCustomRole(role);
    setEnableCreateRole(false);
    setActiveTab("manage");
  };
  
  const startCreateRole = () => {
    setCustomRole(custoRoleFormData);
    setEnableCreateRole(true);
    setActiveTab("manage");
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="select" className="text-sm">角色选择</TabsTrigger>
          <TabsTrigger value="manage" className="text-sm">角色管理</TabsTrigger>
          <TabsTrigger value="settings" className="text-sm">基本设置</TabsTrigger>
        </TabsList>
        
        {/* 角色选择选项卡 */}
        <TabsContent value="select" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">选择角色</CardTitle>
              <CardDescription>选择一个角色作为你的虚拟伴侣</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customRoles.length > 0 ? (
                  customRoles.map((role) => (
                    <Card 
                      key={role.id} 
                      className={`cursor-pointer transition-all ${selectedRoleId === role.id ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                      onClick={() => selectRole(role.id)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium flex justify-between items-center">
                          <span>{role.role_name || "未命名角色"}</span>
                          {selectedRoleId === role.id && (
                            <Badge variant="outline" className="ml-2 bg-primary/10">已选择</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                          {role.personality || "无性格描述"}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditRole(role);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          编辑
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCustomRoleDelete(role.id);
                          }}
                          disabled={role.id === 1}
                          title={role.id === 1 ? "默认角色不能删除" : "删除角色"}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          删除
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-6 text-muted-foreground">
                    没有找到角色，请创建新角色或上传角色包
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={startCreateRole}
              >
                <Plus className="h-4 w-4 mr-2" />
                创建新角色
              </Button>
              <Button
                variant="outline"
                onClick={handleRolePackageButtonClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                上传角色包
              </Button>
              <input
                type="file"
                ref={RolePackagelFileInputRef}
                onChange={handleRolePackageFileChange}
                accept=".zip"
                className="hidden"
              />
            </CardFooter>
            {(deleteCustomRoleLog || uploadRolePackageLog) && (
              <div className="px-6 pb-4">
                <p className="text-sm text-center text-muted-foreground">
                  {deleteCustomRoleLog || uploadRolePackageLog}
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
        
        {/* 角色管理选项卡 */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {enableCreateRole ? "创建角色" : "编辑角色"}
              </CardTitle>
              <CardDescription>
                {enableCreateRole ? "创建新的虚拟角色" : `编辑角色 "${customRole.role_name}"`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormLabel>角色名称</FormLabel>
                <Input
                  value={customRole.role_name}
                  onChange={(e) => {
                    setCustomRole({
                      ...customRole,
                      role_name: e.target.value
                    });
                  }}
                  placeholder="请输入角色名称"
                />
              </div>
              
              <FormField
                control={form.control}
                name="persona"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色基本信息定义</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="resize-none"
                        rows={6}
                        value={customRole.persona}
                        onChange={(e) => {
                          field.onChange(e);
                          setCustomRole({
                            ...customRole,
                            persona: e.target.value
                          });
                        }}
                        placeholder="描述角色的基本信息，如性别、年龄、职业等"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="personality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色性格描述</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="resize-none"
                        rows={4}
                        value={customRole.personality}
                        onChange={(e) => {
                          field.onChange(e);
                          setCustomRole({
                            ...customRole,
                            personality: e.target.value
                          });
                        }}
                        placeholder="描述角色的性格特点，如开朗、内向、温柔等"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scenario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>对话场景和背景</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="resize-none"
                        rows={4}
                        value={customRole.scenario}
                        onChange={(e) => {
                          field.onChange(e);
                          setCustomRole({
                            ...customRole,
                            scenario: e.target.value
                          });
                        }}
                        placeholder="描述角色所处的环境和背景故事"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="examples_of_dialogue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>对话样例</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        className="resize-none"
                        rows={4}
                        value={customRole.examples_of_dialogue}
                        onChange={(e) => {
                          field.onChange(e);
                          setCustomRole({
                            ...customRole,
                            examples_of_dialogue: e.target.value
                          });
                        }}
                        placeholder="提供一些示例对话，帮助AI理解角色的说话风格"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="custom_role_template_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色模板类型</FormLabel>
                    <FormControl>
                      <Select
                        value={customRole.custom_role_template_type || "default"}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setCustomRole({
                            ...customRole,
                            custom_role_template_type: value
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">请选择</SelectItem>
                          <SelectItem value="zh">zh</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setActiveTab("select");
                  setEnableCreateRole(false);
                  setCustomRole(custoRoleFormData);
                  setCustomRoleLog("");
                }}
              >
                <X className="mr-1 h-4 w-4" /> 取消
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleCustomRole}
              >
                <Save className="mr-1 h-4 w-4" /> 保存
              </Button>
            </CardFooter>
            {customRoleLog && (
              <div className="px-6 pb-4">
                <p className="text-sm text-center text-muted-foreground">
                  {customRoleLog}
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
        
        {/* 角色设置选项卡 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">当前角色信息</CardTitle>
              <CardDescription>当前选择的角色及基本设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="characterName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色名称</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Input
                            {...field}
                            className="w-full"
                            type="text"
                            readOnly={true}
                            value={globalConfig?.characterConfig?.character_name || ""}
                            disabled
                          />
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2"
                            onClick={() => setActiveTab("select")}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="yourName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>你的名字</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <Input
                            {...field}
                            className="w-full"
                            type="text"
                            value={globalConfig?.characterConfig?.yourName || ""}
                            onChange={(e) => {
                              field.onChange(e);
                              onChangeGlobalConfig({
                                ...globalConfig,
                                characterConfig: {
                                  ...globalConfig?.characterConfig,
                                  yourName: e.target.value,
                                },
                              })
                            }}
                            placeholder="请输入你希望被角色称呼的名字"
                          />
                          <Button variant="ghost" size="sm" className="ml-2">
                            <User className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 