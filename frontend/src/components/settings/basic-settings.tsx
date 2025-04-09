import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type BasicSettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  form: UseFormReturn<any>
  selectedRoleId: number
  enableCreateRole: boolean
}

const llmOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama" },
  { value: "zhipuai", label: "智谱AI" }
];

export function BasicSettings({
  globalConfig,
  onChangeGlobalConfig,
  form,
  selectedRoleId,
  enableCreateRole
}: BasicSettingsProps) {
  return (
    <div className="space-y-6">
      {!(selectedRoleId !== -1 || enableCreateRole) && (
        <>
          {/* 对话模式 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">对话模式</CardTitle>
              <CardDescription>选择与虚拟角色的对话方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="conversationType"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <RadioGroup
                          value={globalConfig?.conversationConfig?.conversationType || "default"}
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
            </CardContent>
          </Card>

          {/* 语言模型选择 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">语言模型选择</CardTitle>
              <CardDescription>选择驱动虚拟角色对话的语言模型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="languageModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          value={globalConfig?.conversationConfig?.languageModel || "openai"}
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
                            {llmOptions.map(option => (
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
        </>
      )}
    </div>
  )
} 