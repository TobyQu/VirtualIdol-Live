import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type AdvancedSettingsProps = {
  globalConfig: GlobalConfig
  onChangeGlobalConfig: (config: GlobalConfig) => void
  form: UseFormReturn<any>
}

export function AdvancedSettings({
  globalConfig,
  onChangeGlobalConfig,
  form
}: AdvancedSettingsProps) {
  return (
    <div className="space-y-6">
      {/* HTTP 代理设置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">HTTP 代理设置</CardTitle>
          <CardDescription>配置HTTP代理服务器以连接到外部API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="proxyEnabled"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormControl>
                    <RadioGroup
                      value={globalConfig?.enableProxy ? "true" : "false"}
                      onValueChange={(value) => {
                        const enabled = value === "true";
                        field.onChange(enabled);
                        onChangeGlobalConfig({
                          ...globalConfig,
                          enableProxy: enabled
                        });
                      }}
                    >
                      <div className="flex space-x-4">
                        <div className="flex items-center">
                          <RadioGroupItem value="true" id="proxy-on" />
                          <Label className="ml-2 mt-1" htmlFor="proxy-on">开启</Label>
                        </div>
                        <div className="flex items-center">
                          <RadioGroupItem value="false" id="proxy-off" />
                          <Label className="ml-2 mt-1" htmlFor="proxy-off">关闭</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {globalConfig?.enableProxy && (
              <FormField
                control={form.control}
                name="httpProxy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-foreground/70">代理服务器地址</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        value={globalConfig?.httpProxy || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          onChangeGlobalConfig({
                            ...globalConfig,
                            httpProxy: e.target.value
                          });
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* 语音自动播放设置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">语音自动播放设置</CardTitle>
          <CardDescription>配置语音合成后是否自动播放</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="autoPlayTts"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormControl>
                    <RadioGroup
                      value={globalConfig?.ttsConfig?.autoPlayTts ? "true" : "false"}
                      onValueChange={(value) => {
                        const enabled = value === "true";
                        field.onChange(enabled);
                        onChangeGlobalConfig({
                          ...globalConfig,
                          ttsConfig: {
                            ...globalConfig?.ttsConfig,
                            autoPlayTts: enabled
                          }
                        });
                      }}
                    >
                      <div className="flex space-x-4">
                        <div className="flex items-center">
                          <RadioGroupItem value="true" id="autoplay-on" />
                          <Label className="ml-2 mt-1" htmlFor="autoplay-on">开启</Label>
                        </div>
                        <div className="flex items-center">
                          <RadioGroupItem value="false" id="autoplay-off" />
                          <Label className="ml-2 mt-1" htmlFor="autoplay-off">关闭</Label>
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

      {/* B站直播配置 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">B站直播配置</CardTitle>
          <CardDescription>配置B站直播弹幕接收功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="liveEnabled"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormControl>
                    <RadioGroup
                      value={globalConfig?.enableLive ? "true" : "false"}
                      onValueChange={(value) => {
                        const enabled = value === "true";
                        field.onChange(enabled);
                        onChangeGlobalConfig({
                          ...globalConfig,
                          enableLive: enabled
                        });
                      }}
                    >
                      <div className="flex space-x-4">
                        <div className="flex items-center">
                          <RadioGroupItem value="true" id="live-on" />
                          <Label className="ml-2 mt-1" htmlFor="live-on">开启</Label>
                        </div>
                        <div className="flex items-center">
                          <RadioGroupItem value="false" id="live-off" />
                          <Label className="ml-2 mt-1" htmlFor="live-off">关闭</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {globalConfig?.enableLive && (
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-foreground/70">直播间ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        value={globalConfig?.liveStreamingConfig?.B_ROOM_ID || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          onChangeGlobalConfig({
                            ...globalConfig,
                            liveStreamingConfig: {
                              ...globalConfig?.liveStreamingConfig,
                              B_ROOM_ID: e.target.value
                            }
                          });
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 