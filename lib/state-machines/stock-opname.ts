import { StockOpnameStatus } from '@prisma/client';

/**
 * State machine guard for Stock Opname Session transitions.
 */
export function canTransitionStockOpnameStatus(
  current: StockOpnameStatus,
  next: StockOpnameStatus
): boolean {
  if (current === next) return true;

  switch (current) {
    case 'OPEN':
      return next === 'IN_PROGRESS' || next === 'COMPLETED';

    case 'IN_PROGRESS':
      return next === 'COMPLETED';

    case 'COMPLETED':
      return false; // Terminal state

    default:
      return false;
  }
}
