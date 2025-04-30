import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Save } from "lucide-react"
import { GlobalConfig } from "@/features/config/configApi"
import { Message } from "@/features/messages/messages"
import { KoeiroParam } from "@/features/constants/koeiroParam"
import { useContext } from "react"
import { ViewerContext } from "@/features/vrmViewer/viewerContext"
import { Form } from "@/components/ui/form"
import { Card, CardContent } from "@/components/ui/card"

import { ScrollableTabsList } from "@/components/settings/ScrollableTabsList"
import { useSettingsForm } from "@/components/settings/SettingsForm"
import { useFileInputs } from "@/components/settings/FileInputs"
import { useCustomRole } from "@/components/settings/useCustomRole"
import { useAssets } from "@/components/settings/useAssets"
import { useVoices } from "@/components/settings/useVoices"

import { BasicSettings } from "@/components/settings/basic-settings"
import { CharacterSettings } from "@/components/settings/character-settings"
import { VoiceSettings } from "@/components/settings/voice-settings"
import { LLMSettings } from "@/components/settings/llm-settings"
import { MemorySettings } from "@/components/settings/memory-settings"
import { AdvancedSettings } from "@/components/settings/advanced-settings"
import { AssetsSettings } from "@/components/settings/assets-settings"

interface Props {
  globalConfig: GlobalConfig
  openAiKey: string
  systemPrompt: string
  chatLog: Message[]
  koeiroParam: KoeiroParam
  assistantMessage: string
  onChangeSystemPrompt: (systemPrompt: string) => void
  onChangeAiKey: (key: string) => void
  onChangeBackgroundImageUrl: (backgroundImageUrl: string) => void
  onChangeChatLog: (index: number, text: string) => void
  onChangeKoeiroParam: (param: KoeiroParam) => void
  onChangeGlobalConfig: (globalConfig: GlobalConfig) => void
  handleClickResetChatLog: () => void
  handleClickResetSystemPrompt: () => void
  onClickClose?: () => void
  onClickOpenVrmFile?: () => void
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
  onChangeKoeiroParam,
  onChangeGlobalConfig,
  handleClickResetChatLog,
  handleClickResetSystemPrompt,
  onClickClose,
  onClickOpenVrmFile,
}: Props) {
  const { viewer } = useContext(ViewerContext)

  // 使用自定义钩子管理状态和逻辑
  const customRoleHook = useCustomRole();
  const assetsHook = useAssets();
  const voicesHook = useVoices();
  
  // 文件输入处理
  const { 
    FileInputComponents,
    handleClickChangeBgFile,
    handleClickOpenVrmFile: localHandleClickOpenVrmFile,
    handleRolePackageButtonClick 
  } = useFileInputs({
    onBackgroundUploaded: (data) => assetsHook.setBackgroundModels(data),
    onVrmModelUploaded: (data) => assetsHook.setUserVrmModels(data),
    onRolePackageUploaded: () => {
      customRoleHook.refreshCustomRoles();
    }
  });

  // 表单处理
  const { form, handleSubmit } = useSettingsForm({
    globalConfig,
    onChangeGlobalConfig,
    customRole: customRoleHook.customRole
  });

  // 标签定义
  const settingsTabs = [
    { value: "basic", label: "基本设置" },
    { value: "general", label: "角色设置" },
    { value: "llm", label: "语言模型" },
    { value: "voice", label: "语音设置" },
    { value: "memory", label: "记忆系统" },
    { value: "advanced", label: "高级设置" },
    { value: "assets", label: "资源管理" },
  ];

  // 优先使用传入的onClickOpenVrmFile，如果没有则使用本地的
  const handleVrmFileClick = onClickOpenVrmFile || localHandleClickOpenVrmFile;

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
      <CardContent className="flex-1 overflow-auto p-4 pt-2 pb-16">
        <Form {...form}>
          <Tabs defaultValue="basic" className="w-full">
            <ScrollableTabsList tabs={settingsTabs} />
            
            <TabsContent value="basic" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <BasicSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                selectedRoleId={customRoleHook.selectedRoleId}
                enableCreateRole={customRoleHook.enableCreateRole}
                form={form}
              />
            </TabsContent>
            
            <TabsContent value="general" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <CharacterSettings
                globalConfig={globalConfig}
                onChangeGlobalConfig={onChangeGlobalConfig}
                onChangeBackgroundImageUrl={onChangeBackgroundImageUrl}
                selectedRoleId={customRoleHook.selectedRoleId}
                setSelectedRoleId={customRoleHook.setSelectedRoleId}
                enableCreateRole={customRoleHook.enableCreateRole}
                setEnableCreateRole={customRoleHook.setEnableCreateRole}
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
            
            <TabsContent value="voice" className="p-4 rounded-lg border bg-card shadow-sm mb-4">
              <VoiceSettings
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
        <FileInputComponents />
        
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