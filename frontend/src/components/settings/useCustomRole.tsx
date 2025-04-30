import { useState, useEffect } from 'react';
import { custoRoleFormData, customrolEdit, customroleCreate, customroleDelete, customroleList } from "@/features/customRole/customRoleApi";

export function useCustomRole() {
  const [customRoles, setCustomRoles] = useState([custoRoleFormData]);
  const [customRole, setCustomRole] = useState(custoRoleFormData);
  const [enableCreateRole, setEnableCreateRole] = useState(false);
  const [customRoleLog, setCustomRoleLog] = useState("");
  const [deleteCustomRoleLog, setDeleteCustomRoleLog] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(-1);
  const [isClient, setIsClient] = useState(false);

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 初始化数据
  useEffect(() => {
    if (!isClient) return;
    
    // 获取角色列表
    customroleList().then(data => setCustomRoles(data));
  }, [isClient]);

  const handleCustomRole = () => {
    if (enableCreateRole) {
      customroleCreate(customRole)
        .then(() => {
          customroleList().then(data => setCustomRoles(data));
          setCustomRoleLog("创建成功");
        })
        .catch(() => setCustomRoleLog("创建失败"));
    } else {
      customrolEdit(customRole.id, customRole)
        .then(() => {
          customroleList().then(data => setCustomRoles(data));
          setCustomRoleLog("更新成功");
        })
        .catch(() => setCustomRoleLog("更新失败"));
    }
  };

  const handleCustomRoleDelete = (roleId: number) => {
    customroleDelete(roleId)
      .then(() => {
        customroleList().then(data => setCustomRoles(data));
        setDeleteCustomRoleLog("删除成功");
      })
      .catch(() => setDeleteCustomRoleLog("删除失败"));
  };

  const refreshCustomRoles = () => {
    customroleList().then(data => setCustomRoles(data));
  };

  return {
    customRoles,
    setCustomRoles,
    customRole,
    setCustomRole,
    enableCreateRole,
    setEnableCreateRole,
    customRoleLog,
    setCustomRoleLog,
    deleteCustomRoleLog,
    setDeleteCustomRoleLog,
    selectedRoleId,
    setSelectedRoleId,
    handleCustomRole,
    handleCustomRoleDelete,
    refreshCustomRoles
  };
} 