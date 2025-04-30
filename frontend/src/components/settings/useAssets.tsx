import { useState, useEffect } from 'react';
import { queryBackground, backgroundModelData, deleteBackground, queryUserVrmModels, querySystemVrmModels, vrmModelData, deleteVrmModel } from "@/features/media/mediaApi";

export function useAssets() {
  const [backgroundModels, setBackgroundModels] = useState([backgroundModelData]);
  const [systemVrmModels, setSystemVrmModels] = useState<any[]>([]);
  const [userVrmModels, setUserVrmModels] = useState<any[]>([]);
  const [selectedVrmModelId, setSelectedVrmModelId] = useState(-1);
  const [deleteVrmModelLog, setDeleteVrmModelLog] = useState("");
  const [isClient, setIsClient] = useState(false);

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 初始化数据
  useEffect(() => {
    if (!isClient) return;
    
    // 获取背景列表
    queryBackground().then(data => setBackgroundModels(data));
    // 获取系统VRM模型列表
    querySystemVrmModels().then(data => setSystemVrmModels(data));
    // 获取用户VRM模型列表
    queryUserVrmModels().then(data => setUserVrmModels(data));
  }, [isClient]);

  const handleVrmModelDelete = (vrmModelId: number) => {
    deleteVrmModel(vrmModelId)
      .then(() => {
        setDeleteVrmModelLog("删除成功");
        queryUserVrmModels().then(data => {
          setUserVrmModels(data);
        });
      })
      .catch(() => setDeleteVrmModelLog("删除失败"));
  };

  const handleBackgroundDelete = (backgroundId: number) => {
    deleteBackground(backgroundId)
      .then(() => {
        queryBackground().then(data => {
          setBackgroundModels(data);
        });
      })
      .catch(error => {
        console.error('删除背景图片失败:', error);
      });
  };

  const refreshAssets = () => {
    queryBackground().then(data => setBackgroundModels(data));
    querySystemVrmModels().then(data => setSystemVrmModels(data));
    queryUserVrmModels().then(data => setUserVrmModels(data));
  };

  return {
    backgroundModels,
    setBackgroundModels,
    systemVrmModels,
    setSystemVrmModels,
    userVrmModels,
    setUserVrmModels,
    selectedVrmModelId,
    setSelectedVrmModelId,
    deleteVrmModelLog,
    setDeleteVrmModelLog,
    handleVrmModelDelete,
    handleBackgroundDelete,
    refreshAssets
  };
} 