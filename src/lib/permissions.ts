/**
 * 角色权限配置
 * 定义各角色可访问的管理后台模块
 */

export type UserRole = 'ADMIN' | 'STAFF' | 'WAREHOUSE' | 'FINANCE' | 'CUSTOMER' | 'PARTNER';

export type AdminModule = 
  | 'overview'      // 概览
  | 'articles'      // 文章管理
  | 'quotes'        // 询价管理
  | 'users'         // 用户管理
  | 'messages'      // 消息管理
  | 'pages'         // 页面管理
  | 'skuScan'       // 扫码对账
  | 'settings';     // 系统设置

// 定义各角色可访问的管理模块
export const rolePermissions: Record<UserRole, AdminModule[]> = {
  ADMIN: ['overview', 'articles', 'quotes', 'users', 'messages', 'pages', 'skuScan', 'settings'],
  STAFF: ['messages', 'skuScan'],  // 员工默认只能访问消息管理和扫码对账
  WAREHOUSE: ['messages', 'skuScan'],  // 仓库管理员可以使用扫码对账
  FINANCE: ['messages', 'skuScan'],  // 财务可以使用扫码对账
  CUSTOMER: [],
  PARTNER: [],
};

// 需要管理员权限才能访问的模块
export const adminOnlyModules: AdminModule[] = ['users', 'settings', 'pages'];

// 检查用户是否可以访问指定模块
export function canAccessModule(
  role: UserRole,
  module: AdminModule,
  canManageArticles?: boolean
): boolean {
  // 管理员可以访问所有模块
  if (role === 'ADMIN') {
    return true;
  }

  // 员工且被授予文章管理权限
  if (role === 'STAFF' && module === 'articles' && canManageArticles) {
    return true;
  }

  // 检查角色默认权限
  const allowedModules = rolePermissions[role] || [];
  return allowedModules.includes(module);
}

// 检查用户是否可以访问管理后台
export function canAccessAdmin(role: UserRole): boolean {
  return ['ADMIN', 'STAFF', 'WAREHOUSE', 'FINANCE'].includes(role);
}

// 获取用户可访问的模块列表
export function getAccessibleModules(
  role: UserRole,
  canManageArticles?: boolean
): AdminModule[] {
  if (role === 'ADMIN') {
    return rolePermissions.ADMIN;
  }

  const modules = [...(rolePermissions[role] || [])];

  // 如果员工有文章管理权限，添加文章模块
  if (role === 'STAFF' && canManageArticles) {
    if (!modules.includes('articles')) {
      modules.push('articles');
    }
  }

  return modules;
}

// 模块路径映射
export const modulePathMap: Record<AdminModule, string> = {
  overview: '/admin',
  articles: '/admin/articles',
  quotes: '/admin/quotes',
  users: '/admin/users',
  messages: '/admin/messages',
  pages: '/admin/pages',
  skuScan: '/admin/sku-scan',
  settings: '/admin/settings',
};

// 根据路径获取模块
export function getModuleFromPath(path: string): AdminModule | null {
  if (path === '/admin') {
    return 'overview';
  }
  
  for (const [module, modulePath] of Object.entries(modulePathMap)) {
    if (path.startsWith(modulePath) && modulePath !== '/admin') {
      return module as AdminModule;
    }
  }
  
  return null;
}

// 检查用户是否可以访问指定路径
export function canAccessPath(
  role: UserRole,
  path: string,
  canManageArticles?: boolean
): boolean {
  const module = getModuleFromPath(path);
  
  if (!module) {
    return false;
  }
  
  return canAccessModule(role, module, canManageArticles);
}
