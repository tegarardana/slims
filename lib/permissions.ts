export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  baseRole: Role;
  isTechnician: boolean;
  canApproveLoans?: boolean;
}

export type Action =
  | 'VIEW_INVENTORY'
  | 'VIEW_DEVICE_DETAIL'
  | 'CREATE_LOAN_REQUEST'
  | 'VIEW_LOAN_HISTORY'
  | 'APPROVE_REJECT_LOAN'
  | 'REPORT_INCIDENT'
  | 'VIEW_INCIDENT_STATUS'
  | 'VERIFY_INCIDENT'
  | 'MANAGE_MAINTENANCE'
  | 'CHANGE_DEVICE_STATUS_CONDITION'
  | 'CRUD_DEVICE'
  | 'CRUD_CATEGORY_LOCATION'
  | 'BULK_ACTIONS'
  | 'IMPORT_DATA'
  | 'MANAGE_USERS'
  | 'CREATE_STOCK_OPNAME'
  | 'VERIFY_STOCK_OPNAME'
  | 'VIEW_REPORTS'
  | 'VIEW_AUDIT_LOG'
  | 'MANAGE_SETTINGS';

export interface ResourceContext {
  ownerId?: string;
  assignedVerifierId?: string;
}

/**
 * Single source of truth for permission checks across API and UI.
 * Implements Section 4 (Permission Matrix) of PRD.md
 */
export function hasPermission(
  user: UserSession | null | undefined,
  action: Action,
  resource?: ResourceContext
): boolean {
  if (!user) return false;

  // Admin has access to everything
  if (user.baseRole === 'ADMIN') return true;

  switch (action) {
    case 'VIEW_INVENTORY':
    case 'VIEW_DEVICE_DETAIL':
    case 'CREATE_LOAN_REQUEST':
    case 'REPORT_INCIDENT':
      return true;

    case 'VIEW_LOAN_HISTORY':
      // Own data only for non-admin
      return resource?.ownerId ? resource.ownerId === user.id : true;

    case 'APPROVE_REJECT_LOAN':
      return !!user.canApproveLoans;

    case 'VIEW_INCIDENT_STATUS':
      if (user.isTechnician) return true;
      return resource?.ownerId ? resource.ownerId === user.id : true;

    case 'VERIFY_INCIDENT':
    case 'MANAGE_MAINTENANCE':
    case 'CHANGE_DEVICE_STATUS_CONDITION':
      return user.isTechnician;

    case 'VERIFY_STOCK_OPNAME':
      return !!(resource?.assignedVerifierId && resource.assignedVerifierId === user.id);

    case 'CRUD_DEVICE':
    case 'CRUD_CATEGORY_LOCATION':
    case 'BULK_ACTIONS':
    case 'IMPORT_DATA':
    case 'MANAGE_USERS':
    case 'CREATE_STOCK_OPNAME':
    case 'VIEW_REPORTS':
    case 'VIEW_AUDIT_LOG':
    case 'MANAGE_SETTINGS':
      return false;

    default:
      return false;
  }
}
