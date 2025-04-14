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
import { Settings2, Plus, Trash2, Save, ChevronLeft, ChevronRight } from "lucide-react"
import { GlobalConfig } from "@/features/config/configApi"
import { Message } from "@/features/messages/messages"
import { KoeiroParam } from "@/features/constants/koeiroParam"
import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { ViewerContext } from "@/features/vrmViewer/viewerContext"
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { custoRoleFormData, customrolEdit, customroleCreate, customroleDelete, customroleList } from "@/features/customRole/customRoleApi"
import { uploadBackground, queryBackground, backgroundModelData, deleteBackground, uploadVrmModel, queryUserVrmModels, querySystemVrmModels, vrmModelData, deleteVrmModel, generateMediaUrl, buildVrmModelUrl, uploadRolePackage } from "@/features/media/mediaApi"
import { voiceData, getVoices } from '@/features/tts/ttsApi'
import { saveConfig } from "@/features/config/configApi"
import { BasicSettings } from "./settings/basic-settings"
import { CharacterSettings } from "./settings/character-settings"
import { VoiceSettings } from "./settings/voice-settings"
import { LLMSettings } from "./settings/llm-settings"
import { MemorySettings } from "./settings/memory-settings"
import { AdvancedSettings } from "./settings/advanced-settings"
import { AssetsSettings } from "./settings/assets-settings"
import { showSuccess, showError } from "@/lib/toast"
import { Card, CardContent } from "./ui/card"
import { EmotionSettings } from "./settings/emotion-settings"
import { z } from "zod"

const llm_enums = ["openai", "ollama", 'zhipuai'];

export type SettingsFormValues = {
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
  vrmModel: string
  openaiApiKey: string
  openaiBaseUrl: string
  zhipuaiApiKey: string
  ollamaApiBase: string
  ollamaModelName: string
  enableLongMemory: string
  enableSummary: string
  enableReflection: string
  languageModelForSummary: string
  languageModelForReflection: string
  faissDataDir: string
  persona: string
  personality: string
  scenario: string
  examples_of_dialogue: string
  custom_role_template_type: string
  ttsVoiceId: string
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
  isDetachedWindow?: boolean
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
  isDetachedWindow = false,
}: Props) {
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
  const [systemVrmModels, setSystemVrmModels] = useState<any[]>([]);
  const [userVrmModels, setUserVrmModels] = useState<any[]>([]);
  const [selectedVrmModelId, setSelectedVrmModelId] = useState(-1);
  const [deleteVrmModelLog, setDeleteVrmModelLog] = useState("");
  const [uploadRolePackageLog, setUploadRolePackageLog] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);

  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const VrmModelFileInputRef = useRef<HTMLInputElement>(null);
  const RolePackagelFileInputRef = useRef<HTMLInputElement>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 监听标签滚动
  useEffect(() => {
    if (!isClient || !tabsListRef.current) return;

    const checkScroll = () => {
      const element = tabsListRef.current;
      if (!element) return;
      
      // 判断是否可以向左滚动（当前滚动位置>0）
      setShowLeftScroll(element.scrollLeft > 5);
      
      // 判断是否可以向右滚动（总宽度 - 当前滚动位置 - 可见宽度 > 5px）
      const canScrollRight = element.scrollWidth - element.scrollLeft - element.clientWidth > 5;
      setShowRightScroll(canScrollRight);
      
      // 如果内容宽度大于容器宽度，但还没开始滚动，强制显示右滚动按钮
      if (element.scrollWidth > element.clientWidth && element.scrollLeft === 0) {
        setShowRightScroll(true);
      }
      
      // 强制显示右键按钮在窄屏幕上或分离窗口中
      if (window.innerWidth < 768 || isDetachedWindow) {
        setShowRightScroll(true);
      }
    };
    
    // 初始检查
    checkScroll();
    
    // 添加滚动事件监听
    const tabsList = tabsListRef.current;
    tabsList.addEventListener('scroll', checkScroll);
    
    // 窗口大小变化时也检查
    window.addEventListener('resize', checkScroll);
    
    // 确保在较窄屏幕上初始时就显示右滚动按钮 - 多次检测以确保准确性
    setTimeout(checkScroll, 100);
    setTimeout(checkScroll, 500); 
    setTimeout(checkScroll, 1000);
    
    return () => {
      tabsList.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [isClient, isDetachedWindow]);

  // 初始化数据
  useEffect(() => {
    if (!isClient) return;
    
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
    
    // 确保一开始就显示右滚动按钮
    setShowRightScroll(true);
    
    // 在分离窗口中，延迟设置tabsList引用以确保DOM已完全加载
    if (isDetachedWindow) {
      setTimeout(() => {
        // 强制触发滚动检查
        if (tabsListRef.current) {
          const event = new Event('scroll');
          tabsListRef.current.dispatchEvent(event);
        }
      }, 300);
    }
  }, [isClient, isDetachedWindow]);

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
    VrmModelFileInputRef?.current?.click();
  }

  const handleClickChangeBgFile = () => {
    backgroundFileInputRef?.current?.click();
  }

  const handleVrmModelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const selectedFile = event.target.files[0];
      if (!selectedFile) {
        return;
      }
      const formData = new FormData();
      formData.append('vrm_model', selectedFile);
      uploadVrmModel(formData)
        .then(() => {
          queryUserVrmModels().then(data => {
            setUserVrmModels(data);
          });
        })
        .catch(error => {
          console.error('上传VRM模型失败:', error);
        });
    }
  }

  const handleBackgroundFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const selectedFile = event.target.files[0];
      if (!selectedFile) {
        return;
      }
      const formData = new FormData();
      formData.append('background', selectedFile);
      uploadBackground(formData)
        .then(() => {
          queryBackground().then(data => {
            setBackgroundModels(data);
          });
        })
        .catch(error => {
          console.error('上传背景图片失败:', error);
        });
    }
  }

  const handleVrmModelDelete = (vrmModelId: number) => {
    deleteVrmModel(vrmModelId)
      .then(() => {
        setDeleteVrmModelLog("删除成功");
        queryUserVrmModels().then(data => {
          setUserVrmModels(data);
        });
      })
      .catch(() => setDeleteVrmModelLog("删除失败"));
  };

  const handleBackgroundDelete = (backgroundId: number) => {
    deleteBackground(backgroundId)
      .then(() => {
        queryBackground().then(data => {
          setBackgroundModels(data);
        });
      })
      .catch(error => {
        console.error('删除背景图片失败:', error);
      });
  };

  const handleSubmit = () => {
    form.handleSubmit(
      (values) => {
        const formData = {
          ...globalConfig,
          enableProxy: values.proxyEnabled,
          enableLive: values.liveEnabled,
          httpProxy: values.httpProxy,
          httpsProxy: values.httpsProxy,
          socks5Proxy: values.socks5Proxy,
          liveStreamingConfig: {
            ...globalConfig.liveStreamingConfig,
            B_ROOM_ID: values.roomId,
            B_COOKIE: values.cookie,
          },
          conversationConfig: {
            ...globalConfig.conversationConfig,
            conversationType: values.conversationType,
            languageModel: values.languageModel,
          },
          characterConfig: {
            ...globalConfig.characterConfig,
            character_name: values.characterName,
            yourName: values.yourName,
            vrmModel: values.vrmModel,
          },
          background_url: values.backgroundUrl,
          languageModelConfig: {
            ...globalConfig.languageModelConfig,
            openai: {
              ...globalConfig.languageModelConfig.openai,
              OPENAI_API_KEY: values.openaiApiKey,
              OPENAI_BASE_URL: values.openaiBaseUrl,
            },
            zhipuai: {
              ...globalConfig.languageModelConfig.zhipuai,
              ZHIPUAI_API_KEY: values.zhipuaiApiKey,
            },
            ollama: {
              ...globalConfig.languageModelConfig.ollama,
              OLLAMA_API_BASE: values.ollamaApiBase,
              OLLAMA_API_MODEL_NAME: values.ollamaModelName,
            },
          },
          memoryStorageConfig: {
            ...globalConfig.memoryStorageConfig,
            enableLongMemory: values.enableLongMemory === "true",
            enableSummary: values.enableSummary === "true",
            enableReflection: values.enableReflection === "true",
            languageModelForSummary: values.languageModelForSummary,
            languageModelForReflection: values.languageModelForReflection,
            faissMemory: {
              ...globalConfig.memoryStorageConfig.faissMemory,
              dataDir: values.faissDataDir,
            },
          },
          ttsConfig: {
            ...globalConfig.ttsConfig,
            ttsVoiceId: values.ttsVoiceId,
          },
        };

        saveConfig(formData).then(() => {
          showSuccess("设置保存成功");
          onChangeGlobalConfig(formData);
        }).catch(error => {
          showError("设置保存失败");
          console.error('保存设置失败:', error);
        });
      }
    )();
  };

  // 添加左右滚动函数
  const scrollTabsLeft = () => {
    if (tabsListRef.current) {
      tabsListRef.current.scrollBy({ left: -120, behavior: 'smooth' });
    }
  };

  const scrollTabsRight = () => {
    if (tabsListRef.current) {
      tabsListRef.current.scrollBy({ left: 120, behavior: 'smooth' });
    }
  };

  const formSchema = z.object({
    proxyEnabled: z.boolean().optional(),
    liveEnabled: z.boolean().optional(),
    httpProxy: z.string().optional(),
    httpsProxy: z.string().optional(),
    socks5Proxy: z.string().optional(),
    roomId: z.string().optional(),
    cookie: z.string().optional(),
    conversationType: z.string().optional(),
    languageModel: z.string().optional(),
    characterName: z.string().optional(),
    yourName: z.string().optional(),
    backgroundUrl: z.string().optional(),
    vrmModel: z.string().optional(),
    openaiApiKey: z.string().optional(),
    openaiBaseUrl: z.string().optional(),
    zhipuaiApiKey: z.string().optional(),
    ollamaApiBase: z.string().optional(),
    ollamaModelName: z.string().optional(),
    enableLongMemory: z.string().optional(),
    enableSummary: z.string().optional(),
    enableReflection: z.string().optional(),
    languageModelForSummary: z.string().optional(),
    languageModelForReflection: z.string().optional(),
    faissDataDir: z.string().optional(),
    persona: z.string().optional(),
    personality: z.string().optional(),
    scenario: z.string().optional(),
    examples_of_dialogue: z.string().optional(),
    custom_role_template_type: z.string().optional(),
    ttsVoiceId: z.string().optional(),
  })

  const form = useForm<SettingsFormValues>({
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
      vrmModel: globalConfig?.characterConfig?.vrmModel || "",
      openaiApiKey: globalConfig?.languageModelConfig?.openai?.OPENAI_API_KEY || "",
      openaiBaseUrl: globalConfig?.languageModelConfig?.openai?.OPENAI_BASE_URL || "",
      zhipuaiApiKey: globalConfig?.languageModelConfig?.zhipuai?.ZHIPUAI_API_KEY || "",
      ollamaApiBase: globalConfig?.languageModelConfig?.ollama?.OLLAMA_API_BASE || "",
      ollamaModelName: globalConfig?.languageModelConfig?.ollama?.OLLAMA_API_MODEL_NAME || "",
      enableLongMemory: globalConfig?.memoryStorageConfig?.enableLongMemory ? "true" : "false",
      enableSummary: globalConfig?.memoryStorageConfig?.enableSummary ? "true" : "false",
      enableReflection: globalConfig?.memoryStorageConfig?.enableReflection ? "true" : "false",
      languageModelForSummary: globalConfig?.memoryStorageConfig?.languageModelForSummary || "openai",
      languageModelForReflection: globalConfig?.memoryStorageConfig?.languageModelForReflection || "openai",
      faissDataDir: globalConfig?.memoryStorageConfig?.faissMemory?.dataDir || "storage/memory",
      persona: customRole?.persona || "",
      personality: customRole?.personality || "",
      scenario: customRole?.scenario || "",
      examples_of_dialogue: customRole?.examples_of_dialogue || "",
      custom_role_template_type: customRole?.custom_role_template_type || "",
      ttsVoiceId: globalConfig?.ttsConfig?.ttsVoiceId || "-1"
    }
  });

  return (
    <Card className={`h-full flex flex-col border-0 rounded-none shadow-none ${isDetachedWindow ? 'detached-window-card' : ''}`}>
      <CardContent className="flex-1 overflow-auto p-4 pt-2 pb-16">
        <Form {...form}>
          <Tabs defaultValue="basic" className="w-full">
            <div className={`relative sticky top-0 z-10 mb-6 ${isDetachedWindow ? 'bg-white pb-2' : ''}`}>
              <div className="flex items-center relative">
                {/* 左滚动渐变区域（替代独立按钮） */}
                <div 
                  onClick={scrollTabsLeft}
                  className={`absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-background via-background/90 to-transparent z-20 flex items-center justify-start pl-1 cursor-pointer ${showLeftScroll ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  <ChevronLeft className="h-5 w-5 text-primary drop-shadow-md" />
                </div>
                
                {/* TabsList容器 */}
                <div className="w-full relative">
                  <TabsList 
                    className={`flex w-full overflow-x-auto scroll-hidden p-1.5 bg-gradient-to-b from-background to-muted/60 rounded-lg shadow-md border ${isDetachedWindow ? 'detached-tabs-list' : ''}`}
                    ref={tabsListRef}
                  >
                    <TabsTrigger value="basic" className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0">基础设置</TabsTrigger>
                    <TabsTrigger value="character" className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0">角色设置</TabsTrigger>
                    <TabsTrigger value="voice" className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0">语音设置</TabsTrigger>
                    <TabsTrigger value="llm" className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0">语言模型</TabsTrigger>
                    <TabsTrigger value="memory" className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0">记忆模块</TabsTrigger>
                    <TabsTrigger value="emotion" className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0">情绪设置</TabsTrigger>
                    <TabsTrigger value="advanced" className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0">高级设置</TabsTrigger>
                    <TabsTrigger value="assets" className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0">资产设置</TabsTrigger>
                  </TabsList>
                </div>
                
                {/* 右滚动渐变区域（替代独立按钮） */}
                <div
                  onClick={scrollTabsRight}
                  className={`absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-background via-background/90 to-transparent z-20 flex items-center justify-end pr-1 cursor-pointer ${showRightScroll ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  <ChevronRight className="h-5 w-5 text-primary drop-shadow-md" />
                </div>
              </div>
            </div>
            
            <TabsContent value="basic" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <BasicSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                selectedRoleId={selectedRoleId}
                enableCreateRole={enableCreateRole}
                form={form}
              />
            </TabsContent>
            
            <TabsContent value="character" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <CharacterSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                onChangeBackgroundImageUrl={onChangeBackgroundImageUrl}
                selectedRoleId={selectedRoleId}
                setSelectedRoleId={setSelectedRoleId}
                enableCreateRole={enableCreateRole}
                setEnableCreateRole={setEnableCreateRole}
                form={form}
              />
            </TabsContent>
            
            <TabsContent value="voice" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <VoiceSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                form={form}
              />
            </TabsContent>
            
            <TabsContent value="llm" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <LLMSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                form={form}
              />
            </TabsContent>
            
            <TabsContent value="memory" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <MemorySettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                form={form}
              />
            </TabsContent>
            
            <TabsContent value="emotion" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <EmotionSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
              />
            </TabsContent>
            
            <TabsContent value="advanced" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <AdvancedSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                form={form}
              />
            </TabsContent>
            
            <TabsContent value="assets" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <AssetsSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                onChangeBackgroundImageUrl={onChangeBackgroundImageUrl}
                form={form}
              />
            </TabsContent>
          </Tabs>
        </Form>
        
        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={backgroundFileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleBackgroundFileChange}
        />
        <input
          type="file"
          ref={VrmModelFileInputRef}
          style={{ display: 'none' }}
          accept=".vrm"
          onChange={handleVrmModelFileChange}
        />
        <input
          type="file"
          ref={RolePackagelFileInputRef}
          style={{ display: 'none' }}
          accept=".zip"
          onChange={handleRolePackageFileChange}
        />
        
        {/* 右下角的浮动保存按钮 */}
        <div className="fixed bottom-6 right-6 flex flex-col items-center z-10 group">
          <div className="mb-2 bg-white/90 text-sm font-medium px-3 py-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            保存修改
          </div>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-transform hover:scale-105"
            size="icon"
          >
            <Save className="h-6 w-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 