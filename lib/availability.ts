import { DeviceStatus, DeviceCondition } from '@prisma/client';

export interface DeviceAvailabilityContext {
  status: DeviceStatus;
  condition: DeviceCondition;
  activeLoanItemCount?: number;
}

/**
 * Derived availability logic as required by PRD §1.3 and §2.4.
 * Never stored directly in DB as a boolean to prevent stale state.
 */
export function computeAvailability(device: DeviceAvailabilityContext): boolean {
  if (device.status !== 'AVAILABLE') {
    return false;
  }

  // If status is in terminal / unavailable states
  const unavailableStatuses: DeviceStatus[] = [
    'UNDER_MAINTENANCE',
    'LOST',
    'RETIRED',
    'DISPOSED',
    'BORROWED',
  ];

  if (unavailableStatuses.includes(device.status)) {
    return false;
  }

  // If there is any active or approved pending loan item referencing this device
  if (device.activeLoanItemCount && device.activeLoanItemCount > 0) {
    return false;
  }

  return true;
}
