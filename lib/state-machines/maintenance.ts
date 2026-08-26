import { MaintenanceStatus } from '@prisma/client';

/**
 * State machine guard for Maintenance Status transitions (PRD §3.5).
 */
export function canTransitionMaintenanceStatus(
  current: MaintenanceStatus,
  next: MaintenanceStatus
): boolean {
  if (current === next) return true;

  switch (current) {
    case 'OPEN':
      return next === 'IN_PROGRESS' || next === 'WAITING_PARTS' || next === 'CANCELLED' || next === 'COMPLETED';

    case 'IN_PROGRESS':
      return next === 'WAITING_PARTS' || next === 'COMPLETED' || next === 'CANCELLED';

    case 'WAITING_PARTS':
      return next === 'IN_PROGRESS' || next === 'COMPLETED' || next === 'CANCELLED';

    case 'COMPLETED':
    case 'CANCELLED':
      return false; // Terminal states

    default:
      return false;
  }
}
