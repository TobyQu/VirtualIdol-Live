import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Settings2, Plus, Trash2 } from "lucide-react"
import { GlobalConfig } from "@/features/config/configApi"
import { Message } from "@/features/messages/messages"
import { KoeiroParam } from "@/features/constants/koeiroParam"
import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { ViewerContext } from "@/features/vrmViewer/viewerContext"
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { custoRoleFormData, customrolEdit, customroleCreate, customroleDelete, customroleList } from "@/features/customRole/customRoleApi"
import { uploadBackground, queryBackground, backgroundModelData, deleteBackground, uploadVrmModel, queryUserVrmModels, querySystemVrmModels, vrmModelData, deleteVrmModel, generateMediaUrl, buildVrmModelUrl, uploadRolePackage } from "@/features/media/mediaApi"
import { voiceData, getVoices, getEmotions } from '@/features/tts/ttsApi'
import { saveConfig } from "@/features/config/configApi"

const llm_enums = ["openai", "ollama", 'zhipuai'];

type FormValues = {
  proxyEnabled: boolean
  liveEnabled: boolean
  httpProxy: string
  httpsProxy: string
  socks5Proxy: string
  roomId: string
  cookie: string
  conversationType: string
  languageModel: string
  characterName: string
  yourName: string
  backgroundUrl: string
  openaiApiKey: string
  openaiBaseUrl: string
  zhipuaiApiKey: string
  ollamaApiBase: string
  ollamaModelName: string
  enableLongMemory: boolean
  milvusHost: string
  milvusPort: string
  milvusUser: string
  milvusPassword: string
  milvusDbName: string
  persona: string
  personality: string
  scenario: string
  examples_of_dialogue: string
  custom_role_template_type: string
  ttsVoiceId: string
  emotion: string
}

type Props = {
  globalConfig: GlobalConfig
  openAiKey: string
  systemPrompt: string
  chatLog: Message[]
  koeiroParam: KoeiroParam
  assistantMessage: string
  onChangeSystemPrompt: (systemPrompt: string) => void
  onChangeAiKey: (key: string) => void
  onChangeBackgroundImageUrl: (key: string) => void
  onChangeChatLog: (index: number, text: string) => void
  onChangeKoeiromapParam: (param: KoeiroParam) => void
  onChangeGlobalConfig: (globalConfig: GlobalConfig) => void
  handleClickResetChatLog: () => void
  handleClickResetSystemPrompt: () => void
}

export function SettingsSheet({
  globalConfig,
  openAiKey,
  systemPrompt,
  chatLog,
  koeiroParam,
  assistantMessage,
  onChangeSystemPrompt,
  onChangeAiKey,
  onChangeBackgroundImageUrl,
  onChangeChatLog,
  onChangeKoeiromapParam,
  onChangeGlobalConfig,
  handleClickResetChatLog,
  handleClickResetSystemPrompt,
}: Props) {
  const [open, setOpen] = useState(false)
  const { viewer } = useContext(ViewerContext)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [enableProxy, setEnableProxy] = useState(globalConfig?.enableProxy || false);
  const [enableLive, setEnableLive] = useState(globalConfig?.enableLive || false);
  const [enableLongMemory, setEnableLongMemory] = useState(globalConfig?.memoryStorageConfig?.enableLongMemory || false);
  const [customRoles, setCustomRoles] = useState([custoRoleFormData]);
  const [customRole, setCustomRole] = useState(custoRoleFormData);
  const [enableCreateRole, setEnableCreateRole] = useState(false);
  const [customRoleLog, setCustomRoleLog] = useState("");
  const [deleteCustomRoleLog, setDeleteCustomRoleLog] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(-1);
  const [backgroundModels, setBackgroundModels] = useState([backgroundModelData]);
  const [voices, setVoices] = useState([voiceData]);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [systemVrmModels, setSystemVrmModels] = useState<any[]>([]);
  const [userVrmModels, setUserVrmModels] = useState<any[]>([]);
  const [selectedVrmModelId, setSelectedVrmModelId] = useState(-1);
  const [deleteVrmModelLog, setDeleteVrmModelLog] = useState("");
  const [uploadRolePackageLog, setUploadRolePackageLog] = useState("");

  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const VrmModelFileInputRef = useRef<HTMLInputElement>(null);
  const RolePackagelFileInputRef = useRef<HTMLInputElement>(null);

  // 初始化数据
  useEffect(() => {
    // 获取角色列表
    customroleList().then(data => setCustomRoles(data));
    // 获取背景列表
    queryBackground().then(data => setBackgroundModels(data));
    // 获取系统VRM模型列表
    querySystemVrmModels().then(data => setSystemVrmModels(data));
    // 获取用户VRM模型列表
    queryUserVrmModels().then(data => setUserVrmModels(data));
    // 获取语音列表
    getVoices().then(data => setVoices(data));
    // 获取情绪列表
    getEmotions().then(data => setEmotions(data));
  }, []);

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

  const form = useForm<FormValues>({
    defaultValues: {
      proxyEnabled: globalConfig?.enableProxy || false,
      liveEnabled: globalConfig?.enableLive || false,
      httpProxy: globalConfig?.httpProxy || "",
      httpsProxy: globalConfig?.httpsProxy || "",
      socks5Proxy: globalConfig?.socks5Proxy || "",
      roomId: globalConfig?.liveStreamingConfig?.B_ROOM_ID || "",
      cookie: globalConfig?.liveStreamingConfig?.B_COOKIE || "",
      conversationType: globalConfig?.conversationConfig?.conversationType || "default",
      languageModel: globalConfig?.conversationConfig?.languageModel || "openai",
      characterName: globalConfig?.characterConfig?.character_name || "",
      yourName: globalConfig?.characterConfig?.yourName || "",
      backgroundUrl: globalConfig?.background_url || "",
      openaiApiKey: globalConfig?.languageModelConfig?.openai?.OPENAI_API_KEY || "",
      openaiBaseUrl: globalConfig?.languageModelConfig?.openai?.OPENAI_BASE_URL || "",
      zhipuaiApiKey: globalConfig?.languageModelConfig?.zhipuai?.ZHIPUAI_API_KEY || "",
      ollamaApiBase: globalConfig?.languageModelConfig?.ollama?.OLLAMA_API_BASE || "",
      ollamaModelName: globalConfig?.languageModelConfig?.ollama?.OLLAMA_API_MODEL_NAME || "",
      enableLongMemory: globalConfig?.memoryStorageConfig?.enableLongMemory || false,
      milvusHost: globalConfig?.memoryStorageConfig?.milvusMemory?.host || "",
      milvusPort: globalConfig?.memoryStorageConfig?.milvusMemory?.port || "",
      milvusUser: globalConfig?.memoryStorageConfig?.milvusMemory?.user || "",
      milvusPassword: globalConfig?.memoryStorageConfig?.milvusMemory?.password || "",
      milvusDbName: globalConfig?.memoryStorageConfig?.milvusMemory?.dbName || "",
      persona: customRole?.persona || "",
      personality: customRole?.personality || "",
      scenario: customRole?.scenario || "",
      examples_of_dialogue: customRole?.examples_of_dialogue || "",
      custom_role_template_type: customRole?.custom_role_template_type || "",
      ttsVoiceId: globalConfig?.ttsConfig?.ttsVoiceId || "-1",
      emotion: globalConfig?.ttsConfig?.emotion || "neutral"
    }
  });

  const handleChangeSystemPrompt = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChangeSystemPrompt(event.target.value)
    },
    [onChangeSystemPrompt]
  )

  const handleAiKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeAiKey(event.target.value)
    },
    [onChangeAiKey]
  )

  const handleChangeKoeiroParam = useCallback(
    (x: number, y: number) => {
      onChangeKoeiromapParam({
        speakerX: x,
        speakerY: y,
      })
    },
    [onChangeKoeiromapParam]
  )

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

  const handleChangeVrmFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files) return

      const file = files[0]
      if (!file) return

      loadVrmFile(file)
      event.target.value = ""
    },
    [viewer]
  )

  function loadVrmFile(file: File) {
    const file_type = file.name.split(".").pop()
    if (file_type === "vrm") {
      const blob = new Blob([file], { type: "application/octet-stream" })
      const url = window.URL.createObjectURL(blob)
      viewer.loadVrm(url)
    }
  }

  const handleSubmit = () => {
    try {
      // 确保配置对象包含所有必要的字段
      const configToSave = {
        ...globalConfig,
        characterConfig: {
          ...globalConfig?.characterConfig,
          character: globalConfig?.characterConfig?.character || -1,
          character_name: globalConfig?.characterConfig?.character_name || "",
          yourName: globalConfig?.characterConfig?.yourName || "",
          vrmModel: globalConfig?.characterConfig?.vrmModel || "",
          vrmModelType: globalConfig?.characterConfig?.vrmModelType || ""
        },
        ttsConfig: {
          ...globalConfig?.ttsConfig,
          ttsType: globalConfig?.ttsConfig?.ttsType || "minimax",
          ttsVoiceId: globalConfig?.ttsConfig?.ttsVoiceId || "-1",
          emotion: globalConfig?.ttsConfig?.emotion || "neutral"
        },
        conversationConfig: {
          ...globalConfig?.conversationConfig,
          conversationType: globalConfig?.conversationConfig?.conversationType || "default",
          languageModel: globalConfig?.conversationConfig?.languageModel || "openai"
        },
        memoryStorageConfig: {
          ...globalConfig?.memoryStorageConfig,
          enableLongMemory: globalConfig?.memoryStorageConfig?.enableLongMemory || false,
          enableSummary: globalConfig?.memoryStorageConfig?.enableSummary || false,
          enableReflection: globalConfig?.memoryStorageConfig?.enableReflection || false,
          languageModelForSummary: globalConfig?.memoryStorageConfig?.languageModelForSummary || "openai",
          languageModelForReflection: globalConfig?.memoryStorageConfig?.languageModelForReflection || "openai",
          milvusMemory: {
            ...globalConfig?.memoryStorageConfig?.milvusMemory,
            host: globalConfig?.memoryStorageConfig?.milvusMemory?.host || "localhost",
            port: globalConfig?.memoryStorageConfig?.milvusMemory?.port || "19530",
            user: globalConfig?.memoryStorageConfig?.milvusMemory?.user || "",
            password: globalConfig?.memoryStorageConfig?.milvusMemory?.password || "",
            dbName: globalConfig?.memoryStorageConfig?.milvusMemory?.dbName || "virtualwife"
          }
        },
        languageModelConfig: {
          ...globalConfig?.languageModelConfig,
          openai: {
            ...globalConfig?.languageModelConfig?.openai,
            OPENAI_API_KEY: globalConfig?.languageModelConfig?.openai?.OPENAI_API_KEY || "",
            OPENAI_BASE_URL: globalConfig?.languageModelConfig?.openai?.OPENAI_BASE_URL || ""
          },
          zhipuai: {
            ...globalConfig?.languageModelConfig?.zhipuai,
            ZHIPUAI_API_KEY: globalConfig?.languageModelConfig?.zhipuai?.ZHIPUAI_API_KEY || ""
          },
          ollama: {
            ...globalConfig?.languageModelConfig?.ollama,
            OLLAMA_API_BASE: globalConfig?.languageModelConfig?.ollama?.OLLAMA_API_BASE || "http://localhost:11434",
            OLLAMA_API_MODEL_NAME: globalConfig?.languageModelConfig?.ollama?.OLLAMA_API_MODEL_NAME || "qwen:7b"
          }
        },
        liveStreamingConfig: {
          ...globalConfig?.liveStreamingConfig,
          B_ROOM_ID: globalConfig?.liveStreamingConfig?.B_ROOM_ID || "",
          B_COOKIE: globalConfig?.liveStreamingConfig?.B_COOKIE || ""
        },
        enableProxy: globalConfig?.enableProxy || false,
        enableLive: globalConfig?.enableLive || false,
        httpProxy: globalConfig?.httpProxy || "",
        httpsProxy: globalConfig?.httpsProxy || "",
        socks5Proxy: globalConfig?.socks5Proxy || "",
        background_id: globalConfig?.background_id || -1,
        background_url: globalConfig?.background_url || ""
      };

      console.log("Saving configuration:", configToSave);
      saveConfig(configToSave)
        .then(() => {
          console.log("Configuration saved successfully");
          alert("设置已成功保存!");
        })
        .catch(error => {
          console.error("Failed to save configuration:", error);
          alert(`保存设置失败: ${error.message}`);
        });
    } catch (e: unknown) {
      console.error("Error in handleSubmit:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`保存设置时出错: ${errorMessage}`);
    }
  }

  return (
    <Sheet open={open} modal={false} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-800">
          <Settings2 className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <div className="flex justify-between items-center">
            <SheetTitle>设置</SheetTitle>
            
          </div>
          <SheetDescription className="flex justify-between items-center">
            <h2>调整虚拟角色的各项设置</h2>
            <Button
              type="button"
            
              onClick={handleSubmit}
            >
              保存
            </Button>
          </SheetDescription>
        </SheetHeader>
        <div className="py-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">基础设置</TabsTrigger>
              <TabsTrigger value="character">角色设置</TabsTrigger>
              <TabsTrigger value="voice">语音设置</TabsTrigger>
              <TabsTrigger value="llm">语言模型</TabsTrigger>
              <TabsTrigger value="memory">记忆模块</TabsTrigger>
              <TabsTrigger value="advanced">高级设置</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 px-3">
              {!(selectedRoleId !== -1 || enableCreateRole) && (
                <Form {...form}>
                  <div className="grid gap-6">
                    {/* 对话模式 */}
                    <div className="space-y-4">
                      <div className="pb-2 border-b">
                        <h4 className="text-sm font-medium text-foreground/90">对话模式</h4>
                      </div>
                      <FormField
                        control={form.control}
                        name="conversationType"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormControl>
                              <RadioGroup
                                value={globalConfig?.conversationConfig?.conversationType}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  onChangeGlobalConfig({
                                    ...globalConfig,
                                    conversationConfig: {
                                      ...globalConfig.conversationConfig,
                                      conversationType: value
                                    }
                                  });
                                }}
                              >
                                <div className="flex space-x-4">
                                  <div className="flex items-center">
                                    <RadioGroupItem value="default" id="default" />
                                    <Label className="ml-2 mt-1" htmlFor="default">普通对话模式</Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* 语言模型选择 */}
                    <div className="space-y-4">
                      <div className="pb-2 border-b">
                        <h4 className="text-sm font-medium text-foreground/90">语言模型选择</h4>
                      </div>
                      <FormField
                        control={form.control}
                        name="languageModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Select
                                value={globalConfig?.conversationConfig?.languageModel || ""}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  onChangeGlobalConfig({
                                    ...globalConfig,
                                    conversationConfig: {
                                      ...globalConfig.conversationConfig,
                                      languageModel: value
                                    }
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="选择语言模型" />
                                </SelectTrigger>
                                <SelectContent>
                                  {llm_enums.map(llm => (
                                    <SelectItem key={llm} value={llm}>{llm}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </Form>
              )}
            </TabsContent>
            <TabsContent value="character" className="space-y-4">
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

                  {/* 编辑角色 */}
                  {(selectedRoleId !== -1 || enableCreateRole) && (
                    <div className="space-y-4">
                      <div className="pb-2 border-b">
                        <h4 className="text-sm font-medium text-foreground/90">
                          {enableCreateRole ? "创建角色" : "编辑角色"}
                        </h4>
                      </div>
                      <div className="space-y-2">
                        <Label>角色名称</Label>
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
                                value={customRole.custom_role_template_type}
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
                                  <SelectItem value="-1">请选择</SelectItem>
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

                      {/* VRM 模型 */}
                      <div className="space-y-4">
                        <div className="pb-2 border-b">
                          <h4 className="text-sm font-medium text-foreground/90">VRM 模型</h4>
                        </div>
                        <Button onClick={handleClickOpenVrmFile} variant="outline" className="w-full">
                          选择 VRM 文件
                        </Button>
                      </div>

                      {/* 背景图片 */}
                      <div className="space-y-4">
                        <div className="pb-2 border-b">
                          <h4 className="text-sm font-medium text-foreground/90">背景图片 URL</h4>
                        </div>
                        <FormField
                          control={form.control}
                          name="backgroundUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full"
                                  type="text"
                                  value={globalConfig?.background_url}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    onChangeBackgroundImageUrl(e.target.value)
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
            </TabsContent>
            <TabsContent value="voice" className="space-y-4">
              <Form {...form}>
                <div className="grid gap-6">
                  {/* 语音设置 */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b">
                      <h4 className="text-sm font-medium text-foreground/90">语音引擎设置</h4>
                    </div>
                    <div className="field">
                      <label className="text-xs font-medium text-foreground/70">语音引擎:</label>
                      <div className="text-xs text-muted-foreground mt-1">
                        仅支持Minimax语音合成服务
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="ttsVoiceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-foreground/70">选择语音模型:</FormLabel>
                          <FormControl>
                            <Select
                              value={globalConfig?.ttsConfig?.ttsVoiceId || "-1"}
                              onValueChange={(value) => {
                                field.onChange(value);
                                onChangeGlobalConfig({
                                  ...globalConfig,
                                  ttsConfig: {
                                    ...globalConfig?.ttsConfig,
                                    ttsType: "minimax",
                                    ttsVoiceId: value
                                  }
                                });
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="请选择" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="-1">请选择</SelectItem>
                                {voices.map(voice => (
                                  <SelectItem key={voice.id} value={voice.id}>
                                    {voice.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emotion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-foreground/70">语音情绪:</FormLabel>
                          <FormControl>
                            <Select
                              value={globalConfig?.ttsConfig?.emotion || "neutral"}
                              onValueChange={(value) => {
                                field.onChange(value);
                                onChangeGlobalConfig({
                                  ...globalConfig,
                                  ttsConfig: {
                                    ...globalConfig?.ttsConfig,
                                    emotion: value
                                  }
                                });
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="请选择" />
                              </SelectTrigger>
                              <SelectContent>
                                {emotions.map(emotion => (
                                  <SelectItem key={emotion} value={emotion}>
                                    {emotion === 'happy' && '高兴'}
                                    {emotion === 'sad' && '悲伤'}
                                    {emotion === 'angry' && '愤怒'}
                                    {emotion === 'fearful' && '害怕'}
                                    {emotion === 'disgusted' && '厌恶'}
                                    {emotion === 'surprised' && '惊讶'}
                                    {emotion === 'neutral' && '中性'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </Form>
            </TabsContent>
            <TabsContent value="llm" className="space-y-4">
              <Form {...form}>
                <div className="grid gap-6">
                  {/* 语言模型选择 */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b">
                      <h4 className="text-sm font-medium text-foreground/90">语言模型选择</h4>
                    </div>
                    <FormField
                      control={form.control}
                      name="languageModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select
                              value={globalConfig?.conversationConfig?.languageModel || ""}
                              onValueChange={(value) => {
                                field.onChange(value);
                                onChangeGlobalConfig({
                                  ...globalConfig,
                                  conversationConfig: {
                                    ...globalConfig?.conversationConfig,
                                    languageModel: value
                                  }
                                });
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择语言模型" />
                              </SelectTrigger>
                              <SelectContent>
                                {llm_enums.map(llm => (
                                  <SelectItem key={llm} value={llm}>{llm}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 模型配置表单 */}
                  {globalConfig?.conversationConfig?.languageModel && (
                    <div className="space-y-4">
                      <div className="pb-2 border-b">
                        <h4 className="text-sm font-medium text-foreground/90">模型配置</h4>
                      </div>
                      {globalConfig?.conversationConfig?.languageModel === "openai" && (
                        <div className="grid gap-4">
                          <FormField
                            control={form.control}
                            name="openaiApiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-foreground/70">API Key</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="w-full"
                                    type="password"
                                    value={globalConfig?.languageModelConfig?.openai?.OPENAI_API_KEY || ""}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      onChangeGlobalConfig({
                                        ...globalConfig,
                                        languageModelConfig: {
                                          ...globalConfig?.languageModelConfig,
                                          openai: {
                                            ...globalConfig?.languageModelConfig?.openai,
                                            OPENAI_API_KEY: e.target.value
                                          }
                                        }
                                      });
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="openaiBaseUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-foreground/70">Base URL</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="w-full"
                                    type="text"
                                    value={globalConfig?.languageModelConfig?.openai?.OPENAI_BASE_URL || ""}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      onChangeGlobalConfig({
                                        ...globalConfig,
                                        languageModelConfig: {
                                          ...globalConfig?.languageModelConfig,
                                          openai: {
                                            ...globalConfig?.languageModelConfig?.openai,
                                            OPENAI_BASE_URL: e.target.value
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
                      )}
                      {globalConfig?.conversationConfig?.languageModel === "zhipuai" && (
                        <FormField
                          control={form.control}
                          name="zhipuaiApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-foreground/70">API Key</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full"
                                  type="password"
                                  value={globalConfig?.languageModelConfig?.zhipuai?.ZHIPUAI_API_KEY || ""}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    onChangeGlobalConfig({
                                      ...globalConfig,
                                      languageModelConfig: {
                                        ...globalConfig?.languageModelConfig,
                                        zhipuai: {
                                          ...globalConfig?.languageModelConfig?.zhipuai,
                                          ZHIPUAI_API_KEY: e.target.value
                                        }
                                      }
                                    });
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      {globalConfig?.conversationConfig?.languageModel === "ollama" && (
                        <div className="grid gap-4">
                          <FormField
                            control={form.control}
                            name="ollamaApiBase"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-foreground/70">API URL</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="w-full"
                                    type="text"
                                    value={globalConfig?.languageModelConfig?.ollama?.OLLAMA_API_BASE || "http://localhost:11434"}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      onChangeGlobalConfig({
                                        ...globalConfig,
                                        languageModelConfig: {
                                          ...globalConfig?.languageModelConfig,
                                          ollama: {
                                            ...globalConfig?.languageModelConfig?.ollama,
                                            OLLAMA_API_BASE: e.target.value
                                          }
                                        }
                                      });
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ollamaModelName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-foreground/70">Model Name</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="w-full"
                                    type="text"
                                    value={globalConfig?.languageModelConfig?.ollama?.OLLAMA_API_MODEL_NAME || "qwen:7b"}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      onChangeGlobalConfig({
                                        ...globalConfig,
                                        languageModelConfig: {
                                          ...globalConfig?.languageModelConfig,
                                          ollama: {
                                            ...globalConfig?.languageModelConfig?.ollama,
                                            OLLAMA_API_MODEL_NAME: e.target.value
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
                      )}
                    </div>
                  )}
                </div>
              </Form>
            </TabsContent>
            <TabsContent value="memory" className="space-y-4">
              <Form {...form}>
                <div className="grid gap-6">
                  {/* 长期记忆功能 */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b">
                      <h4 className="text-sm font-medium text-foreground/90">长期记忆功能</h4>
                    </div>
                    <FormField
                      control={form.control}
                      name="enableLongMemory"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <RadioGroup
                              value={enableLongMemory ? "true" : "false"}
                              onValueChange={(value) => {
                                const enabled = value === "true";
                                field.onChange(enabled);
                                setEnableLongMemory(enabled);
                                onChangeGlobalConfig({
                                  ...globalConfig,
                                  memoryStorageConfig: {
                                    ...globalConfig.memoryStorageConfig,
                                    enableLongMemory: enabled
                                  }
                                });
                              }}
                            >
                              <div className="flex space-x-4">
                                <div className="flex items-center">
                                  <RadioGroupItem value="true" id="memory-on" />
                                  <Label className="ml-2 mt-1" htmlFor="memory-on">开启</Label>
                                </div>
                                <div className="flex items-center">
                                  <RadioGroupItem value="false" id="memory-off" />
                                  <Label className="ml-2 mt-1" htmlFor="memory-off">关闭</Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {enableLongMemory && (
                      <div className="grid gap-4">
                        {/* Milvus 配置 */}
                        <div className="space-y-4">
                          <div className="pb-2 border-b">
                            <h4 className="text-sm font-medium text-foreground/90">Milvus 配置</h4>
                          </div>
                          <div className="grid gap-4">
                            <FormField
                              control={form.control}
                              name="milvusHost"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-foreground/70">Host</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="w-full"
                                      type="text"
                                      value={globalConfig?.memoryStorageConfig?.milvusMemory?.host || "localhost"}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        onChangeGlobalConfig({
                                          ...globalConfig,
                                          memoryStorageConfig: {
                                            ...globalConfig?.memoryStorageConfig,
                                            milvusMemory: {
                                              ...globalConfig?.memoryStorageConfig?.milvusMemory,
                                              host: e.target.value
                                            }
                                          }
                                        });
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="milvusPort"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-foreground/70">Port</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="w-full"
                                      type="text"
                                      value={globalConfig?.memoryStorageConfig?.milvusMemory?.port || "19530"}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        onChangeGlobalConfig({
                                          ...globalConfig,
                                          memoryStorageConfig: {
                                            ...globalConfig?.memoryStorageConfig,
                                            milvusMemory: {
                                              ...globalConfig?.memoryStorageConfig?.milvusMemory,
                                              port: e.target.value
                                            }
                                          }
                                        });
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="milvusUser"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-foreground/70">User</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="w-full"
                                      type="text"
                                      value={globalConfig?.memoryStorageConfig?.milvusMemory?.user || ""}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        onChangeGlobalConfig({
                                          ...globalConfig,
                                          memoryStorageConfig: {
                                            ...globalConfig?.memoryStorageConfig,
                                            milvusMemory: {
                                              ...globalConfig?.memoryStorageConfig?.milvusMemory,
                                              user: e.target.value
                                            }
                                          }
                                        });
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="milvusPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-foreground/70">Password</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="w-full"
                                      type="password"
                                      value={globalConfig?.memoryStorageConfig?.milvusMemory?.password || ""}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        onChangeGlobalConfig({
                                          ...globalConfig,
                                          memoryStorageConfig: {
                                            ...globalConfig?.memoryStorageConfig,
                                            milvusMemory: {
                                              ...globalConfig?.memoryStorageConfig?.milvusMemory,
                                              password: e.target.value
                                            }
                                          }
                                        });
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="milvusDbName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-foreground/70">Database Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="w-full"
                                      type="text"
                                      value={globalConfig?.memoryStorageConfig?.milvusMemory?.dbName || "virtualwife"}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        onChangeGlobalConfig({
                                          ...globalConfig,
                                          memoryStorageConfig: {
                                            ...globalConfig?.memoryStorageConfig,
                                            milvusMemory: {
                                              ...globalConfig?.memoryStorageConfig?.milvusMemory,
                                              dbName: e.target.value
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Form>
            </TabsContent>
            <TabsContent value="advanced" className="space-y-4">
              <Form {...form}>
                <div className="grid gap-6">
                  {/* HTTP 代理设置 */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b">
                      <h4 className="text-sm font-medium text-foreground/90">HTTP 代理设置</h4>
                    </div>
                    <FormField
                      control={form.control}
                      name="proxyEnabled"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <RadioGroup
                              value={enableProxy ? "true" : "false"}
                              onValueChange={(value) => {
                                const enabled = value === "true";
                                field.onChange(enabled);
                                setEnableProxy(enabled);
                                onChangeGlobalConfig({
                                  ...globalConfig,
                                  enableProxy: enabled
                                });
                              }}
                            >
                              <div className="flex space-x-4">
                                <div className="flex items-center">
                                  <RadioGroupItem value="true" id="proxy-on" />
                                  <Label className="ml-2 mt-1" htmlFor="proxy-on">开启</Label>
                                </div>
                                <div className="flex items-center">
                                  <RadioGroupItem value="false" id="proxy-off" />
                                  <Label className="ml-2 mt-1" htmlFor="proxy-off">关闭</Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {enableProxy && (
                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="httpProxy"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full"
                                  type="text"
                                  placeholder="HTTP Proxy"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    onChangeGlobalConfig({
                                      ...globalConfig,
                                      httpProxy: e.target.value
                                    });
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="httpsProxy"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full"
                                  type="text"
                                  placeholder="HTTPS Proxy"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    onChangeGlobalConfig({
                                      ...globalConfig,
                                      httpsProxy: e.target.value
                                    });
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="socks5Proxy"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full"
                                  type="text"
                                  placeholder="SOCKS5 Proxy"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    onChangeGlobalConfig({
                                      ...globalConfig,
                                      socks5Proxy: e.target.value
                                    });
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {/* B站直播配置 */}
                  <div className="space-y-4">
                    <div className="pb-2 border-b">
                      <h4 className="text-sm font-medium text-foreground/90">B站直播配置</h4>
                    </div>
                    <FormField
                      control={form.control}
                      name="liveEnabled"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormControl>
                            <RadioGroup
                              value={enableLive ? "true" : "false"}
                              onValueChange={(value) => {
                                const enabled = value === "true";
                                field.onChange(enabled);
                                setEnableLive(enabled);
                                onChangeGlobalConfig({
                                  ...globalConfig,
                                  enableLive: enabled
                                });
                              }}
                            >
                              <div className="flex space-x-4">
                                <div className="flex items-center">
                                  <RadioGroupItem value="true" id="live-on" />
                                  <Label className="ml-2 mt-1" htmlFor="live-on">开启</Label>
                                </div>
                                <div className="flex items-center">
                                  <RadioGroupItem value="false" id="live-off" />
                                  <Label className="ml-2 mt-1" htmlFor="live-off">关闭</Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {enableLive && (
                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="roomId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-foreground/70">直播间 ID</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full"
                                  type="text"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    onChangeGlobalConfig({
                                      ...globalConfig,
                                      liveStreamingConfig: {
                                        ...globalConfig.liveStreamingConfig,
                                        B_ROOM_ID: e.target.value
                                      }
                                    });
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="cookie"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-foreground/70">Cookie</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="w-full"
                                  type="text"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    onChangeGlobalConfig({
                                      ...globalConfig,
                                      liveStreamingConfig: {
                                        ...globalConfig.liveStreamingConfig,
                                        B_COOKIE: e.target.value
                                      }
                                    });
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
      <input
        type="file"
        className="hidden"
        accept=".vrm"
        ref={fileInputRef}
        onChange={handleChangeVrmFile}
      />
    </Sheet>
  )
} 