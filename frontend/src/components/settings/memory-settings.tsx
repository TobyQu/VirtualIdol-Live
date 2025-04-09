import { Form, FormField, FormItem, FormControl } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type MemorySettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  form: UseFormReturn<any>
}

export function MemorySettings({
  globalConfig,
  onChangeGlobalConfig,
  form
}: MemorySettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">长期记忆设置</CardTitle>
          <CardDescription>配置角色的长期记忆存储功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="enableLongMemory"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={globalConfig?.memoryStorageConfig?.enableLongMemory ? "true" : "false"}
                      onValueChange={(value) => {
                        field.onChange(value);
                        onChangeGlobalConfig({
                          ...globalConfig,
                          memoryStorageConfig: {
                            ...globalConfig?.memoryStorageConfig,
                            enableLongMemory: value === "true"
                          }
                        });
                      }}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="enable-memory" />
                        <Label htmlFor="enable-memory">开启</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="disable-memory" />
                        <Label htmlFor="disable-memory">关闭</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Milvus 配置 */}
      {globalConfig?.memoryStorageConfig?.enableLongMemory && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Milvus 向量数据库配置</CardTitle>
            <CardDescription>配置Milvus向量数据库连接参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="milvusHost"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-medium text-foreground/70">Host</Label>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        value={globalConfig?.memoryStorageConfig?.milvusMemory?.host || ""}
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
                    <Label className="text-xs font-medium text-foreground/70">端口</Label>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        value={globalConfig?.memoryStorageConfig?.milvusMemory?.port || ""}
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
                    <Label className="text-xs font-medium text-foreground/70">用户名</Label>
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
                    <Label className="text-xs font-medium text-foreground/70">密码</Label>
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
                    <Label className="text-xs font-medium text-foreground/70">数据库名称</Label>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        value={globalConfig?.memoryStorageConfig?.milvusMemory?.dbName || ""}
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
          </CardContent>
        </Card>
      )}
    </div>
  )
} 