import { LoanRequestStatus, LoanItemStatus } from '@prisma/client';

/**
 * State machine guard for Loan Request Status transitions (PRD §3.3).
 */
export function canTransitionLoanRequestStatus(
  current: LoanRequestStatus,
  next: LoanRequestStatus
): boolean {
  if (current === next) return true;

  switch (current) {
    case 'PENDING_APPROVAL':
      return next === 'APPROVED' || next === 'REJECTED';

    case 'APPROVED':
      return next === 'ACTIVE' || next === 'REJECTED';

    case 'ACTIVE':
      return next === 'RETURNED' || next === 'PARTIALLY_RETURNED';

    case 'PARTIALLY_RETURNED':
      return next === 'RETURNED';

    case 'RETURNED':
    case 'REJECTED':
      return false; // Terminal states

    default:
      return false;
  }
}

/**
 * State machine guard for individual Loan Item Status transitions.
 */
export function canTransitionLoanItemStatus(
  current: LoanItemStatus,
  next: LoanItemStatus
): boolean {
  if (current === next) return true;

  switch (current) {
    case 'PENDING':
      return next === 'APPROVED' || next === 'REJECTED';

    case 'APPROVED':
      return next === 'ACTIVE' || next === 'REJECTED';

    case 'ACTIVE':
      return next === 'RETURNED';

    case 'RETURNED':
    case 'REJECTED':
      return false;

    default:
      return false;
  }
}

/**
 * Overdue calculation helper (BR-009).
 */
export function isLoanOverdue(
  expectedReturnDate: Date | string,
  status: LoanRequestStatus
): boolean {
  if (status !== 'ACTIVE' && status !== 'PARTIALLY_RETURNED') {
    return false;
  }
  const returnDate = new Date(expectedReturnDate);
  const now = new Date();
  return now.getTime() > returnDate.getTime();
}
