import { useEffect } from "react";
import { ChatContainer } from "@/components/chat-container";
import { SettingsSheet } from "@/components/settings-sheet";
import { SYSTEM_PROMPT } from "@/features/constants/systemPromptConstants";
import Head from "next/head";
import { PanelLeftClose } from "lucide-react";
import { useDetachedWindow } from "@/features/windowManager/useDetachedWindow";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmotionControlPanel } from '@/components/EmotionControlPanel';

// 为Window对象添加isClosingAllowed属性
declare global {
  interface Window {
    isClosingAllowed: boolean;
    _closeOverridden?: boolean;
  }
}

export default function ChatPage() {
  // 使用自定义Hook处理分离窗口的状态和通信
  const {
    globalConfig,
    systemPrompt,
    chatLog,
    koeiroParam,
    chatProcessing,
    isClient,
    sendChatMessage,
    handleChangeChatLog,
    handleResetChatLog,
    handleChangeGlobalConfig,
    handleCloseWindow,
    setSystemPrompt,
    setKoeiroParam,
  } = useDetachedWindow();

  // 阻止关闭窗口（除非明确允许）
  useEffect(() => {
    if (!isClient) return;

    // 如果已经设置过，不重复设置
    if (window._closeOverridden) return;
    
    // 标记已经设置过关闭拦截
    window._closeOverridden = true;
    
    // 保存原始关闭方法
    const originalClose = window.close;
    
    // 重写关闭方法
    window.close = function() {
      // 如果允许关闭，则直接关闭
      if (window.isClosingAllowed) {
        originalClose.call(window);
      } else {
        console.log("窗口关闭被拦截，请使用左上角的关闭按钮");
      }
    };
    
    // 拦截页面关闭事件
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!window.isClosingAllowed) {
        // 显示确认对话框
        e.preventDefault();
        e.returnValue = "确定要关闭此窗口吗？聊天记录会自动保存到主窗口。";
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 恢复原始close方法
      if (window._closeOverridden) {
        window.close = originalClose;
        window._closeOverridden = false;
      }
    };
  }, [isClient]);

  // 添加全局样式修复ScrollTabs按钮在分离窗口中的问题
  useEffect(() => {
    if (!isClient) return;
    
    // 给分离窗口添加一个特殊样式类，确保tabsList样式正确
    document.body.classList.add('detached-window');
    
    return () => {
      document.body.classList.remove('detached-window');
    };
  }, [isClient]);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes" />
        <title>{globalConfig?.characterConfig?.character_name || '聊天窗口'}</title>
        <style jsx global>{`
          /* 确保分离窗口中的滚动按钮样式正确 */
          .detached-chat-window .scroll-hidden {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          .detached-chat-window .scroll-hidden::-webkit-scrollbar {
            display: none;
          }
          
          /* 确保分离窗口中的标签样式 */
          .detached-chat-window [role="tabslist"] {
            width: 100%;
          }
          
          .detached-chat-window [role="tab"] {
            position: relative;
            transition: all 0.2s ease;
            text-align: center;
          }
          
          /* 优化消息滚动区域 */
          .detached-chat-window .scroll-pt-2 {
            scroll-padding-top: 0.5rem;
          }
          
          /* 确保清除按钮在聚焦状态下有合适的样式 */
          .detached-chat-window button:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
          }
        `}</style>
      </Head>
      
      {isClient ? (
        <div className="detached-chat-window h-full w-full flex flex-col">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseWindow}
                title="关闭窗口"
                className="h-8 w-8 mr-2"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-medium text-gray-800">
                {globalConfig?.characterConfig?.character_name || "聊天窗口"}
              </h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList className="flex bg-gray-50 border-b border-gray-200 justify-between items-center p-0 m-0 rounded-none">
                <TabsTrigger 
                  value="chat" 
                  className="flex-1 py-3 px-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:border-b-[3px] data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold font-medium transition-colors"
                >
                  聊天
                </TabsTrigger>
                <TabsTrigger 
                  value="action" 
                  className="flex-1 py-3 px-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:border-b-[3px] data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold font-medium transition-colors"
                >
                  动作
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="flex-1 py-3 px-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:border-b-[3px] data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:font-semibold font-medium transition-colors"
                >
                  设置
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="flex-1 overflow-hidden p-0 mt-0">
                <ChatContainer
                  chatLog={chatLog}
                  isChatProcessing={chatProcessing}
                  onChatProcessStart={(config, type, user_name, content) => {
                    sendChatMessage(content, user_name);
                    return Promise.resolve();
                  }}
                  globalConfig={globalConfig}
                  isDetachedWindow={true}
                  onResetChat={handleResetChatLog}
                />
              </TabsContent>
              <TabsContent value="action" className="flex-1 overflow-auto p-4 mt-0">
                {globalConfig?.emotionConfig?.enabled ? (
                  <EmotionControlPanel className="mb-4" />
                ) : (
                  <div className="bg-white rounded-lg p-6 mb-4">
                    <h3 className="text-lg font-medium text-red-600 mb-2">情绪系统未启用</h3>
                    <p className="text-sm text-gray-500">请在设置中启用情绪系统以使用此功能</p>
                  </div>
                )}
                
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">更多动作功能即将上线</h3>
                  <p className="text-sm text-gray-500">该区域将展示更多角色动作和表情控制</p>
                </div>
              </TabsContent>
              <TabsContent value="settings" className="flex-1 overflow-auto p-0 mt-0">
                <SettingsSheet
                  globalConfig={globalConfig}
                  openAiKey=""
                  systemPrompt={systemPrompt}
                  chatLog={chatLog}
                  koeiroParam={koeiroParam}
                  assistantMessage=""
                  onChangeAiKey={() => {}}
                  onChangeBackgroundImageUrl={() => {}}
                  onChangeSystemPrompt={setSystemPrompt}
                  onChangeChatLog={handleChangeChatLog}
                  onChangeKoeiromapParam={setKoeiroParam}
                  onChangeGlobalConfig={handleChangeGlobalConfig}
                  handleClickResetChatLog={handleResetChatLog}
                  handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
                  isDetachedWindow={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p>
        </div>
      )}
    </>
  );
} 