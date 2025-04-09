import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GlobalConfig } from "@/features/config/configApi"
import { voiceData, getVoices, getEmotions } from '@/features/tts/ttsApi'
import { useState, useEffect } from "react"
import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type VoiceSettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  form: UseFormReturn<any>
}

// 预定义情绪选项，确保值不为空
const emotionOptions = [
  { value: "happy", label: "高兴" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "fearful", label: "害怕" },
  { value: "disgusted", label: "厌恶" },
  { value: "surprised", label: "惊讶" },
  { value: "neutral", label: "中性" }
];

export function VoiceSettings({
  globalConfig,
  onChangeGlobalConfig,
  form
}: VoiceSettingsProps) {
  const [voices, setVoices] = useState([voiceData]);
  const [emotions, setEmotions] = useState<string[]>([]);

  useEffect(() => {
    getVoices().then(data => setVoices(data));
    getEmotions().then(data => {
      // 过滤掉可能的空字符串
      setEmotions(data.filter((emotion: string) => emotion && emotion.trim() !== ""));
    });
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">语音引擎设置</CardTitle>
          <CardDescription>配置角色的语音合成服务和情绪</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
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
                          <SelectItem key={voice.id} value={voice.id || `voice-${voice.name}`}>
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
                        {/* 使用预定义的情绪选项 */}
                        {emotionOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 