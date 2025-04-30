
import { useEffect, useState } from 'react';

export default function BackendStatus() {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isElectron, setIsElectron] = useState<boolean>(false);

  useEffect(() => {
    // 检查是否在Electron环境中
    const electronAPI = window.electronAPI;
    setIsElectron(typeof electronAPI !== 'undefined');

    if (!electronAPI) return;

    // 检查后端状态
    const checkStatus = async () => {
      try {
        const status = await electronAPI.getBackendStatus();
        setIsReady(status.ready);
      } catch (error) {
        console.error('检查后端状态时出错:', error);
      }
    };

    // 订阅后端就绪事件
    const unsubscribe = electronAPI.onBackendReady(() => {
      setIsReady(true);
    });

    checkStatus();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 如果不在Electron环境中，不显示任何内容
  if (!isElectron) return null;

  // 如果后端未就绪，显示加载页面
  if (!isReady) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-medium text-gray-700">正在启动后端服务，请稍候...</p>
      </div>
    );
  }

  // 后端已就绪，不需要显示任何内容
  return null;
}
