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
import { BasicSettings } from "./settings/basic-settings"
import { CharacterSettings } from "./settings/character-settings"
import { VoiceSettings } from "./settings/voice-settings"
import { LLMSettings } from "./settings/llm-settings"
import { MemorySettings } from "./settings/memory-settings"
import { AdvancedSettings } from "./settings/advanced-settings"

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
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
            <TabsContent value="basic">
              <BasicSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                selectedRoleId={selectedRoleId}
                enableCreateRole={enableCreateRole}
                form={form}
              />
            </TabsContent>
            <TabsContent value="character">
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
            <TabsContent value="voice">
              <VoiceSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                form={form}
              />
            </TabsContent>
            <TabsContent value="llm">
              <LLMSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                form={form}
              />
            </TabsContent>
            <TabsContent value="memory">
              <MemorySettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                form={form}
              />
            </TabsContent>
            <TabsContent value="advanced">
              <AdvancedSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                form={form}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
} 