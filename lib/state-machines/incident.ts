import { IncidentStatus, VerificationOutcome } from '@prisma/client';

/**
 * State machine guard for Incident Status transitions (PRD §3.4).
 */
export function canTransitionIncidentStatus(
  current: IncidentStatus,
  next: IncidentStatus
): boolean {
  if (current === next) return true;

  switch (current) {
    case 'REPORTED':
      return next === 'UNDER_REVIEW' || next === 'VERIFIED' || next === 'RESOLVED';

    case 'UNDER_REVIEW':
      return next === 'VERIFIED' || next === 'RESOLVED';

    case 'VERIFIED':
      return next === 'IN_PROGRESS' || next === 'RESOLVED';

    case 'IN_PROGRESS':
      return next === 'RESOLVED';

    case 'RESOLVED':
      return false; // Terminal state

    default:
      return false;
  }
}
