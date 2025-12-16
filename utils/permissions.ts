import { User } from '../types';

export const hasAccess = (user: User, module: 'vehicles' | 'meals' | 'maintenance' | 'calendar'): boolean => {
    // 1. Admins have full access
    if (user.role === 'ADMIN') return true;

    // 2. Default Allow: If permissions object is missing or empty for the module, allow access.
    // We check if the specific module permission exists. If NOT, it's allowed.
    // If it exists, we respect the 'view' flag.

    // 2. Default Allow Logic:
    // - If permissions object is missing/null => This is a standard user who hasn't been restricted => ALLOW ALL.
    if (!user.permissions || Object.keys(user.permissions).length === 0) return true;

    // - If permissions object EXISTS => The user has been configured.
    //   In this case, we switch to "Whitelist" mode. Only explicitly granted permissions are allowed.
    //   Missing keys mean NO ACCESS.

    const modulePerms = user.permissions[module];
    if (!modulePerms) return false; // Config exists but this module is not in it -> Deny

    return modulePerms.view;
};

export const hasAdminAccess = (user: User, module: 'vehicles' | 'meals' | 'maintenance' | 'calendar'): boolean => {
    if (user.role === 'ADMIN') return true;

    // Admin access is stricter. Default is FALSE for standard users unless explicitly granted?
    // Actually, based on "Default Allow", standard users usually just VIEW. Admin rights are extra.
    // So for ADMIN rights, we should probably default to FALSE.

    if (!user.permissions) return false;

    const modulePerms = user.permissions[module];
    if (!modulePerms) return false;

    return modulePerms.admin;
};
