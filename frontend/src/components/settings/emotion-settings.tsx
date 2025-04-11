import React, { useState, useEffect } from 'react';
import { EmotionType, EmotionLabel } from '@/features/emotion/emotionApi';
import { GlobalConfig } from '@/features/config/configApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FormItem, FormLabel, FormControl } from "@/components/ui/form";

interface EmotionSettingsProps {
  globalConfig: GlobalConfig;
  onChangeGlobalConfig: (config: GlobalConfig) => void;
}

export function EmotionSettings({ globalConfig, onChangeGlobalConfig }: EmotionSettingsProps) {
  // 初始化情绪配置，如果不存在则创建默认值
  const [config, setConfig] = useState(() => {
    return globalConfig.emotionConfig || {
      enabled: true,
      sensitivity: 0.5,
      changeSpeed: 0.5,
      defaultEmotion: EmotionType.NEUTRAL,
      expressionIntensity: 0.7,
    };
  });

  // 当全局配置更新时，更新本地状态
  useEffect(() => {
    if (globalConfig.emotionConfig) {
      setConfig(globalConfig.emotionConfig);
    }
  }, [globalConfig.emotionConfig]);

  // 处理配置变更
  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    
    // 更新全局配置
    onChangeGlobalConfig({
      ...globalConfig,
      emotionConfig: newConfig
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>情绪系统设置</CardTitle>
        <CardDescription>配置虚拟人物的情绪系统参数</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="emotion-enabled" className="flex-grow">启用情绪系统</Label>
          <Switch
            id="emotion-enabled"
            checked={config.enabled}
            onCheckedChange={(checked: boolean) => handleChange('enabled', checked)}
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>情绪敏感度</Label>
            <span className="text-sm text-muted-foreground">{Math.round(config.sensitivity * 100)}%</span>
          </div>
          <Slider
            value={[config.sensitivity * 100]}
            min={0}
            max={100}
            step={10}
            onValueChange={(value: number[]) => handleChange('sensitivity', value[0] / 100)}
            className="w-full"
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>情绪变化速度</Label>
            <span className="text-sm text-muted-foreground">{Math.round(config.changeSpeed * 100)}%</span>
          </div>
          <Slider
            value={[config.changeSpeed * 100]}
            min={0}
            max={100}
            step={10}
            onValueChange={(value: number[]) => handleChange('changeSpeed', value[0] / 100)}
            className="w-full"
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="default-emotion">默认情绪</Label>
          <Select
            value={config.defaultEmotion}
            onValueChange={(value: string) => handleChange('defaultEmotion', value)}
          >
            <SelectTrigger id="default-emotion">
              <SelectValue placeholder="选择默认情绪" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(EmotionType).map((emotion) => (
                <SelectItem key={emotion} value={emotion}>
                  {EmotionLabel[emotion]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>表情强度</Label>
            <span className="text-sm text-muted-foreground">{Math.round(config.expressionIntensity * 100)}%</span>
          </div>
          <Slider
            value={[config.expressionIntensity * 100]}
            min={0}
            max={100}
            step={10}
            onValueChange={(value: number[]) => handleChange('expressionIntensity', value[0] / 100)}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
} 