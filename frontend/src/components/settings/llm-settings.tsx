import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type LLMSettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  form: UseFormReturn<any>
}

const llmOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama" },
  { value: "zhipuai", label: "智谱AI" }
];

export function LLMSettings({
  globalConfig,
  onChangeGlobalConfig,
  form
}: LLMSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">语言模型选择</CardTitle>
          <CardDescription>选择用于对话和生成内容的大语言模型</CardDescription>
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
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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

      {/* 模型配置表单 */}
      {globalConfig?.conversationConfig?.languageModel && (
        <>
          {globalConfig?.conversationConfig?.languageModel === "openai" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">OpenAI 配置</CardTitle>
                <CardDescription>配置OpenAI API密钥和基础URL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
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
              </CardContent>
            </Card>
          )}
          
          {globalConfig?.conversationConfig?.languageModel === "zhipuai" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">智谱AI 配置</CardTitle>
                <CardDescription>配置智谱AI API密钥</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
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
                </div>
              </CardContent>
            </Card>
          )}
          
          {globalConfig?.conversationConfig?.languageModel === "ollama" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ollama 配置</CardTitle>
                <CardDescription>配置Ollama API基础URL和模型名称</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
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
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
} 