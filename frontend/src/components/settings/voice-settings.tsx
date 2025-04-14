import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GlobalConfig } from "@/features/config/configApi"
import { voiceData, getVoices } from '@/features/tts/ttsApi'
import { useState, useEffect } from "react"
import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type VoiceSettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  form: UseFormReturn<any>
}

export function VoiceSettings({
  globalConfig,
  onChangeGlobalConfig,
  form
}: VoiceSettingsProps) {
  const [voices, setVoices] = useState([voiceData]);

  useEffect(() => {
    getVoices().then(data => setVoices(data));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">语音引擎设置</CardTitle>
          <CardDescription>配置角色的语音合成服务</CardDescription>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 