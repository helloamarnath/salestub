import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';

export interface RBACHook {
  // Roles
  roles: string[];
  hasRole: (role: string | string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;

  // Permissions
  permissions: string[];
  hasPermission: (permission: string | string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;

  // User info
  isInternal: boolean;
  orgId?: string;
  membershipId?: string;
  userId?: string;

  // Helpers for common CRUD operations
  canCreate: (module: string) => boolean;
  canRead: (module: string) => boolean;
  canUpdate: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  canExport: (module: string) => boolean;

  // State helpers
  isLoaded: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook for Role-Based Access Control (RBAC) in the mobile app
 *
 * @example
 * ```typescript
 * const rbac = useRBAC()
 *
 * // Check permissions
 * if (rbac.canCreate("leads")) {
 *   // Show create button
 * }
 *
 * // Check if user can read leads
 * if (!rbac.canRead("leads")) {
 *   return <AccessDenied />
 * }
 *
 * // Check if RBAC data is loaded
 * if (!rbac.isLoaded) {
 *   return <Loading />
 * }
 * ```
 */
export function useRBAC(): RBACHook {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Memoize extracted RBAC data to prevent unnecessary recalculations
  const rbacData = useMemo(() => {
    return {
      roles: user?.roles || [],
      permissions: user?.permissions || [],
      isInternal: user?.isInternal || false,
      orgId: user?.orgId,
      membershipId: user?.membershipId,
      userId: user?.id,
      isAuthenticated,
    };
  }, [user, isAuthenticated]);

  const { roles, permissions, isInternal, orgId, membershipId, userId } = rbacData;

  // Role checks - memoized callbacks
  const hasRole = useCallback(
    (role: string | string[]): boolean => {
      if (Array.isArray(role)) {
        return role.some((r) => roles.includes(r));
      }
      return roles.includes(role);
    },
    [roles]
  );

  const hasAnyRole = useCallback(
    (requiredRoles: string[]): boolean => {
      return requiredRoles.some((role) => roles.includes(role));
    },
    [roles]
  );

  const hasAllRoles = useCallback(
    (requiredRoles: string[]): boolean => {
      return requiredRoles.every((role) => roles.includes(role));
    },
    [roles]
  );

  // Permission checks - memoized callbacks
  const hasPermission = useCallback(
    (permission: string | string[]): boolean => {
      // Platform admins have all permissions
      if (isInternal) {
        return true;
      }

      return Array.isArray(permission)
        ? permission.some((p) => permissions.includes(p))
        : permissions.includes(permission);
    },
    [permissions, isInternal]
  );

  const hasAnyPermission = useCallback(
    (requiredPermissions: string[]): boolean => {
      if (isInternal) return true;
      return requiredPermissions.some((perm) => permissions.includes(perm));
    },
    [permissions, isInternal]
  );

  const hasAllPermissions = useCallback(
    (requiredPermissions: string[]): boolean => {
      if (isInternal) return true;
      return requiredPermissions.every((perm) => permissions.includes(perm));
    },
    [permissions, isInternal]
  );

  // Helper methods for common CRUD operations - memoized callbacks
  const canCreate = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}.create`);
    },
    [hasPermission]
  );

  const canRead = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}.read`);
    },
    [hasPermission]
  );

  const canUpdate = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}.update`);
    },
    [hasPermission]
  );

  const canDelete = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}.delete`);
    },
    [hasPermission]
  );

  const canExport = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}.export`);
    },
    [hasPermission]
  );

  // isLoaded indicates if RBAC data is available
  const isLoaded = useMemo(() => {
    if (isLoading) return false;
    // Internal users don't need permissions/roles array
    if (isInternal) return true;
    // For regular users, return true once loading is complete
    // Even if they have no permissions (they just won't have access)
    return isAuthenticated;
  }, [isAuthenticated, isInternal, isLoading]);

  return {
    roles,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isInternal,
    orgId,
    membershipId,
    userId,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canExport,
    isLoaded,
    isAuthenticated,
  };
}
