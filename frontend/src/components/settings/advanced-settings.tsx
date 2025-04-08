import { Form, FormField, FormItem, FormControl, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { GlobalConfig } from "@/features/config/configApi"
import { UseFormReturn } from "react-hook-form"

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
    <Form {...form}>
      <div className="grid gap-6">
        {/* HTTP 代理设置 */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h4 className="text-sm font-medium text-foreground/90">HTTP 代理设置</h4>
          </div>
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
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="httpProxy"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        placeholder="HTTP Proxy"
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
              <FormField
                control={form.control}
                name="httpsProxy"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        placeholder="HTTPS Proxy"
                        value={globalConfig?.httpsProxy || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          onChangeGlobalConfig({
                            ...globalConfig,
                            httpsProxy: e.target.value
                          });
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="socks5Proxy"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        placeholder="SOCKS5 Proxy"
                        value={globalConfig?.socks5Proxy || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          onChangeGlobalConfig({
                            ...globalConfig,
                            socks5Proxy: e.target.value
                          });
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* B站直播配置 */}
        <div className="space-y-4">
          <div className="pb-2 border-b">
            <h4 className="text-sm font-medium text-foreground/90">B站直播配置</h4>
          </div>
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
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-foreground/70">直播间 ID</FormLabel>
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
                              ...globalConfig.liveStreamingConfig,
                              B_ROOM_ID: e.target.value
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
                name="cookie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-foreground/70">Cookie</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="w-full"
                        type="text"
                        value={globalConfig?.liveStreamingConfig?.B_COOKIE || ""}
                        onChange={(e) => {
                          field.onChange(e);
                          onChangeGlobalConfig({
                            ...globalConfig,
                            liveStreamingConfig: {
                              ...globalConfig.liveStreamingConfig,
                              B_COOKIE: e.target.value
                            }
                          });
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      </div>
    </Form>
  )
} 