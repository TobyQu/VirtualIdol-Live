import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"
import { useState, useEffect, useRef, useContext, Dispatch, SetStateAction } from "react"
import { custoRoleFormData, customrolEdit, customroleCreate, customroleDelete, customroleList } from "@/features/customRole/customRoleApi"
import { uploadRolePackage, getAssets, AssetFile, AssetCategory } from "@/features/media/mediaApi"
import { ViewerContext } from "@/features/vrmViewer/viewerContext"

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

  useEffect(() => {
    customroleList().then(data => setCustomRoles(data));
    
    // 获取assets目录下的资源文件
    getAssets().then((data: AssetCategory) => {
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
    });
  }, [globalConfig]);

  const handleCustomRole = () => {
    if (enableCreateRole) {
      customroleCreate(customRole)
        .then(() => {
          customroleList().then(data => setCustomRoles(data));
          setCustomRoleLog("创建成功");
        })
        .catch(() => setCustomRoleLog("创建失败"));
    } else {
      customrolEdit(customRole.id, customRole)
        .then(() => {
          customroleList().then(data => setCustomRoles(data));
          setCustomRoleLog("更新成功");
        })
        .catch(() => setCustomRoleLog("更新失败"));
    }
  };

  const handleCustomRoleDelete = (selectedRoleId: number) => {
    customroleDelete(selectedRoleId)
      .then(() => {
        customroleList().then(data => setCustomRoles(data));
        setDeleteCustomRoleLog("删除成功");
      })
      .catch(() => setDeleteCustomRoleLog("删除失败"));
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
        })
        .catch(() => setUploadRolePackageLog("上传失败"));
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
  


  return (
    <Form {...form}>
      <div className="grid gap-6">
        {/* 选择角色 */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h4 className="text-sm font-medium text-foreground/90">选择角色</h4>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              defaultValue={selectedRoleId === -1 ? "-1" : selectedRoleId.toString()}
              onValueChange={(value) => {
                const selectedRoleId = Number(value);
                onChangeGlobalConfig({
                  ...globalConfig,
                  characterConfig: {
                    ...globalConfig?.characterConfig,
                    character: selectedRoleId,
                    character_name: customRoles.find(role => role.id === selectedRoleId)?.role_name || ""
                  }
                });
                setSelectedRoleId(selectedRoleId);
                setEnableCreateRole(false);
                setCustomRoleLog("");
                setDeleteCustomRoleLog("");
                const selectedRole = customRoles.find(role => role.id === selectedRoleId);
                if (selectedRole) {
                  setCustomRole(selectedRole);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">请选择</SelectItem>
                {customRoles.map(role => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                setEnableCreateRole(true);
                setCustomRole(custoRoleFormData);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (selectedRoleId !== -1) {
                  handleCustomRoleDelete(selectedRoleId);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {deleteCustomRoleLog && (
            <p className="text-sm text-muted-foreground">
              {deleteCustomRoleLog}
            </p>
          )}
        </div>

        {/* 选择VRM模型 */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h4 className="text-sm font-medium text-foreground/90">选择VRM模型</h4>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <FormLabel>系统模型</FormLabel>
              <Select
                value={selectedVrmFile || "none"}
                onValueChange={handleVrmFileChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择VRM模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">请选择</SelectItem>
                  {publicAssets.vrm.map((file) => (
                    <SelectItem key={file.path} value={file.path}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClickOpenVrmFile}
                className="w-full"
              >
                上传自定义VRM模型
              </Button>
            </div>
          </div>
        </div>
        
        {/* 选择背景图片 */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h4 className="text-sm font-medium text-foreground/90">选择背景图片</h4>
          </div>
          
          <div className="space-y-2">
            <FormLabel>系统背景</FormLabel>
            <Select
              value={selectedBackgroundFile || "none"}
              onValueChange={handleBackgroundFileChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择背景图片" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">请选择</SelectItem>
                {publicAssets.background.map((file) => (
                  <SelectItem key={file.path} value={file.path}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 编辑角色 */}
        {(selectedRoleId !== -1 || enableCreateRole) && (
          <div className="space-y-4">
            <div className="pb-2 border-b">
              <h4 className="text-sm font-medium text-foreground/90">
                {enableCreateRole ? "创建角色" : "编辑角色"}
              </h4>
            </div>
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
                      rows={10}
                      value={customRole.persona}
                      onChange={(e) => {
                        field.onChange(e);
                        setCustomRole({
                          ...customRole,
                          persona: e.target.value
                        });
                      }}
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
                      value={customRole.personality}
                      onChange={(e) => {
                        field.onChange(e);
                        setCustomRole({
                          ...customRole,
                          personality: e.target.value
                        });
                      }}
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
                      value={customRole.scenario}
                      onChange={(e) => {
                        field.onChange(e);
                        setCustomRole({
                          ...customRole,
                          scenario: e.target.value
                        });
                      }}
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
                      value={customRole.examples_of_dialogue}
                      onChange={(e) => {
                        field.onChange(e);
                        setCustomRole({
                          ...customRole,
                          examples_of_dialogue: e.target.value
                        });
                      }}
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
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEnableCreateRole(false);
                  setSelectedRoleId(-1);
                  setCustomRole(custoRoleFormData);
                  setCustomRoleLog("");
                }}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleCustomRole();
                  setEnableCreateRole(false);
                  setSelectedRoleId(-1);
                  setCustomRole(custoRoleFormData);
                  setCustomRoleLog("");
                }}
              >
                提交
              </Button>
            </div>
            {customRoleLog && (
              <p className="text-sm text-muted-foreground">
                {customRoleLog}
              </p>
            )}
          </div>
        )}

        {/* 角色包上传及以下所有表单 */}
        {!(selectedRoleId !== -1 || enableCreateRole) && (
          <>
            {/* 角色包上传 */}
            <div className="space-y-4">
              <div className="pb-2 border-b">
                <h4 className="text-sm font-medium text-foreground/90">加载角色安装包</h4>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRolePackageButtonClick}
                  className="w-full"
                >
                  上传角色包
                </Button>
                <input
                  type="file"
                  ref={RolePackagelFileInputRef}
                  onChange={handleRolePackageFileChange}
                  accept=".zip"
                  className="hidden"
                />
              </div>
              {uploadRolePackageLog && (
                <p className="text-sm text-muted-foreground">
                  {uploadRolePackageLog}
                </p>
              )}
            </div>

            {/* 角色名称 */}
            <div className="space-y-4">
              <div className="pb-2 border-b">
                <h4 className="text-sm font-medium text-foreground/90">角色名称</h4>
              </div>
              <FormField
                control={form.control}
                name="characterName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        readOnly={true}
                        value={globalConfig?.characterConfig?.character_name}
                        onChange={(e) => {
                          field.onChange(e);
                          onChangeGlobalConfig({
                            ...globalConfig,
                            characterConfig: {
                              ...globalConfig?.characterConfig,
                              character_name: e.target.value,
                            },
                          })
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* 你的名字 */}
            <div className="space-y-4">
              <div className="pb-2 border-b">
                <h4 className="text-sm font-medium text-foreground/90">你的名字</h4>
              </div>
              <FormField
                control={form.control}
                name="yourName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        value={globalConfig?.characterConfig?.yourName}
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
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
      </div>
    </Form>
  )
} 