import { DeviceStatus, DeviceCondition } from '@prisma/client';

/**
 * State machine guard for Device Status transitions (PRD §3.1).
 */
export function canTransitionDeviceStatus(
  current: DeviceStatus,
  next: DeviceStatus
): boolean {
  if (current === next) return true;

  // Terminal state: DISPOSED cannot transition to anything
  if (current === 'DISPOSED') {
    return false;
  }

  // Semi-terminal state: RETIRED can only transition to DISPOSED
  if (current === 'RETIRED') {
    return next === 'DISPOSED';
  }

  switch (current) {
    case 'AVAILABLE':
      return ['BORROWED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED'].includes(next);

    case 'BORROWED':
      return ['AVAILABLE', 'UNDER_MAINTENANCE', 'LOST'].includes(next);

    case 'UNDER_MAINTENANCE':
      return ['AVAILABLE', 'LOST', 'RETIRED', 'DISPOSED'].includes(next);

    case 'LOST':
      return ['AVAILABLE', 'RETIRED', 'DISPOSED'].includes(next);

    default:
      return false;
  }
}

/**
 * Device Condition can transition non-linearly (PRD §3.2), but is recorded in audit logs.
 */
export function canTransitionDeviceCondition(
  current: DeviceCondition,
  next: DeviceCondition
): boolean {
  return true;
}
