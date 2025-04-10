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

      {/* FAISS 配置 */}
      {globalConfig?.memoryStorageConfig?.enableLongMemory && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">FAISS 本地向量存储配置</CardTitle>
            <CardDescription>配置FAISS向量存储参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="faissDataDir"
                render={({ field }) => (
                  <FormItem>
                    <Label className="text-xs font-medium text-foreground/70">数据存储目录</Label>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        placeholder="storage/memory"
                        value={globalConfig?.memoryStorageConfig?.faissMemory?.dataDir || "storage/memory"}
                        onChange={(e) => {
                          field.onChange(e);
                          onChangeGlobalConfig({
                            ...globalConfig,
                            memoryStorageConfig: {
                              ...globalConfig?.memoryStorageConfig,
                              faissMemory: {
                                ...globalConfig?.memoryStorageConfig?.faissMemory,
                                dataDir: e.target.value
                              }
                            }
                          });
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="text-xs mt-2 text-muted-foreground">
                <p>FAISS是一个轻量级本地向量存储，无需额外服务器支持，适合客户端应用。</p>
                <p>数据将存储在您指定的本地目录中，确保应用有足够的写入权限。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 