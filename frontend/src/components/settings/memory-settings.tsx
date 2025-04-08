import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"

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
    <Form {...form}>
      <div className="grid gap-6">
        {/* 长期记忆设置 */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h4 className="text-sm font-medium text-foreground/90">长期记忆设置</h4>
          </div>
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

        {/* Milvus 配置 */}
        {globalConfig?.memoryStorageConfig?.enableLongMemory && (
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
                    <FormLabel className="text-xs font-medium text-foreground/70">Port</FormLabel>
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
                    <FormLabel className="text-xs font-medium text-foreground/70">Database</FormLabel>
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
          </div>
        )}
      </div>
    </Form>
  )
} 