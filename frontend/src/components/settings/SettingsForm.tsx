import { useForm } from "react-hook-form"
import { z } from "zod"
import { GlobalConfig } from "@/features/config/configApi"
import { showSuccess, showError } from "@/lib/toast"
import { saveConfig } from "@/features/config/configApi"

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
  vrmModelType: string
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
  cameraDistance: string
}

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
  vrmModelType: z.string().optional(),
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
  cameraDistance: z.string().optional(),
})

interface SettingsFormProps {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  customRole?: any
}

export function useSettingsForm({ globalConfig, onChangeGlobalConfig, customRole }: SettingsFormProps) {
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
      vrmModelType: globalConfig?.characterConfig?.vrmModelType || "system",
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
      ttsVoiceId: globalConfig?.ttsConfig?.ttsVoiceId || "-1",
      cameraDistance: typeof globalConfig?.characterConfig?.cameraDistance === 'number' 
        ? globalConfig.characterConfig.cameraDistance.toString() 
        : (globalConfig?.characterConfig?.cameraDistance || "1.0")
    }
  });

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
            vrmModelType: values.vrmModelType,
            cameraDistance: parseFloat(values.cameraDistance)
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

  return {
    form,
    handleSubmit
  };
} 