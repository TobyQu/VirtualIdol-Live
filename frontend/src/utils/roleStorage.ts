import fs from 'fs';
import path from 'path';

// 角色数据文件路径
const DATA_DIR = path.join(process.cwd(), 'data');
const ROLES_FILE_PATH = path.join(DATA_DIR, 'roles.json');
const TEMP_ROLES_FILE_PATH = path.join(DATA_DIR, 'roles.json.tmp');

// 角色模型定义
export interface CustomRole {
  id: number;
  role_name: string;
  persona: string;
  personality: string;
  scenario: string;
  examples_of_dialogue: string;
  custom_role_template_type: string;
  role_package_id: number;
  created_at?: string;
  updated_at?: string;
}

// 缓存
let rolesCache: CustomRole[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 缓存有效期：1分钟

/**
 * 确保数据目录存在
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * 获取所有角色列表
 * @returns 角色列表
 */
export async function getRoles(): Promise<CustomRole[]> {
  // 检查缓存是否有效
  const now = Date.now();
  if (rolesCache && (now - cacheTimestamp < CACHE_TTL)) {
    return rolesCache;
  }

  ensureDataDir();

  try {
    // 检查文件是否存在
    if (fs.existsSync(ROLES_FILE_PATH)) {
      // 读取文件
      const rolesData = fs.readFileSync(ROLES_FILE_PATH, 'utf-8');
      
      try {
        // 解析JSON
        const roles = JSON.parse(rolesData) as CustomRole[];
        
        // 更新缓存
        rolesCache = roles;
        cacheTimestamp = now;
        
        return roles;
      } catch (jsonError) {
        console.error('角色数据文件JSON格式无效:', jsonError);
        // 返回空列表
        return [];
      }
    } else {
      // 文件不存在，创建空列表
      await saveRoles([]);
      return [];
    }
  } catch (error) {
    console.error('获取角色列表时出错:', error);
    return [];
  }
}

/**
 * 保存角色列表
 * @param roles 角色列表
 * @returns 是否保存成功
 */
export async function saveRoles(roles: CustomRole[]): Promise<boolean> {
  ensureDataDir();

  try {
    // 格式化JSON字符串（美化输出）
    const rolesString = JSON.stringify(roles, null, 2);
    
    // 先写入临时文件
    fs.writeFileSync(TEMP_ROLES_FILE_PATH, rolesString, 'utf-8');
    
    // 如果原文件存在，则备份
    if (fs.existsSync(ROLES_FILE_PATH)) {
      const backupPath = `${ROLES_FILE_PATH}.bak`;
      fs.copyFileSync(ROLES_FILE_PATH, backupPath);
    }
    
    // 用临时文件替换原文件（原子操作）
    fs.renameSync(TEMP_ROLES_FILE_PATH, ROLES_FILE_PATH);
    
    // 更新缓存
    rolesCache = roles;
    cacheTimestamp = Date.now();
    
    return true;
  } catch (error) {
    console.error('保存角色列表时出错:', error);
    return false;
  }
}

/**
 * 获取单个角色
 * @param id 角色ID
 * @returns 角色信息，如果未找到则返回null
 */
export async function getRole(id: number): Promise<CustomRole | null> {
  const roles = await getRoles();
  const role = roles.find(r => r.id === id);
  return role || null;
}

/**
 * 添加新角色
 * @param role 角色信息，无需提供ID
 * @returns 添加后的角色信息（含ID）
 */
export async function addRole(role: Omit<CustomRole, 'id'>): Promise<CustomRole> {
  const roles = await getRoles();
  
  // 生成新的ID
  const maxId = roles.length > 0 ? Math.max(...roles.map(r => r.id)) : 0;
  const newId = maxId + 1;
  
  // 创建完整角色对象
  const now = new Date().toISOString();
  const newRole: CustomRole = {
    id: newId,
    role_name: role.role_name,
    persona: role.persona,
    personality: role.personality,
    scenario: role.scenario,
    examples_of_dialogue: role.examples_of_dialogue,
    custom_role_template_type: role.custom_role_template_type || 'zh', // 默认模板类型
    role_package_id: role.role_package_id || -1, // 默认无角色包
    created_at: now,
    updated_at: now
  };
  
  // 添加到列表
  roles.push(newRole);
  
  // 保存
  const success = await saveRoles(roles);
  if (!success) {
    throw new Error('保存角色失败');
  }
  
  return newRole;
}

/**
 * 更新角色
 * @param id 角色ID
 * @param roleData 角色更新数据
 * @returns 更新后的角色信息，如果角色不存在则返回null
 */
export async function updateRole(id: number, roleData: Partial<CustomRole>): Promise<CustomRole | null> {
  const roles = await getRoles();
  const roleIndex = roles.findIndex(r => r.id === id);
  
  if (roleIndex === -1) {
    return null;
  }
  
  // 更新角色，并保留不变的字段
  const updatedRole: CustomRole = {
    ...roles[roleIndex],
    ...roleData,
    id, // 确保ID不变
    updated_at: new Date().toISOString()
  };
  
  // 替换数组中的角色
  roles[roleIndex] = updatedRole;
  
  // 保存
  const success = await saveRoles(roles);
  if (!success) {
    throw new Error('更新角色失败');
  }
  
  return updatedRole;
}

/**
 * 删除角色
 * @param id 角色ID
 * @returns 是否删除成功
 */
export async function deleteRole(id: number): Promise<boolean> {
  const roles = await getRoles();
  const roleIndex = roles.findIndex(r => r.id === id);
  
  if (roleIndex === -1) {
    return false;
  }
  
  // 获取要删除的角色
  const roleToDelete = roles[roleIndex];
  
  // 从列表中移除
  roles.splice(roleIndex, 1);
  
  // 保存
  const success = await saveRoles(roles);
  if (!success) {
    throw new Error('删除角色失败');
  }
  
  return true;
}

/**
 * 清除角色缓存
 */
export function clearRolesCache(): void {
  rolesCache = null;
  cacheTimestamp = 0;
} 