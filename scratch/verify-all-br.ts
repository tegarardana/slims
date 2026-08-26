import { prisma } from '../lib/prisma';
import { computeAvailability } from '../lib/availability';
import { canTransitionDeviceStatus, canTransitionDeviceCondition } from '../lib/state-machines/device';
import { canTransitionLoanRequestStatus, canTransitionLoanItemStatus, isLoanOverdue } from '../lib/state-machines/loan';
import { canTransitionIncidentStatus } from '../lib/state-machines/incident';
import { canTransitionMaintenanceStatus } from '../lib/state-machines/maintenance';
import { canTransitionStockOpnameStatus } from '../lib/state-machines/stock-opname';

async function runFullQAPass() {
  console.log('🧪 Running Complete SLIMS Business Rules & Integrity Verification...\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean) {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Device State Machine & Availability (BR-001, BR-005)
  console.log('--- 1. Device Availability & State Machine Guards ---');
  assert('AVAILABLE + GOOD condition => available = true', computeAvailability({ status: 'AVAILABLE', condition: 'GOOD' }) === true);
  assert('BORROWED status => available = false', computeAvailability({ status: 'BORROWED', condition: 'GOOD' }) === false);
  assert('UNDER_MAINTENANCE status => available = false', computeAvailability({ status: 'UNDER_MAINTENANCE', condition: 'EXCELLENT' }) === false);
  assert('AVAILABLE status transition to BORROWED allowed', canTransitionDeviceStatus('AVAILABLE', 'BORROWED') === true);
  assert('BORROWED status transition to DISPOSED blocked', canTransitionDeviceStatus('BORROWED', 'DISPOSED') === false);

  // 2. Loan State Machine & Overdue Engine (BR-004, BR-006, BR-007, BR-008, BR-009)
  console.log('\n--- 2. Loan State Machine & Overdue Engine ---');
  assert('PENDING_APPROVAL -> APPROVED allowed', canTransitionLoanRequestStatus('PENDING_APPROVAL', 'APPROVED') === true);
  assert('APPROVED -> ACTIVE allowed', canTransitionLoanRequestStatus('APPROVED', 'ACTIVE') === true);
  assert('ACTIVE -> RETURNED allowed', canTransitionLoanRequestStatus('ACTIVE', 'RETURNED') === true);
  assert('REJECTED -> APPROVED blocked', canTransitionLoanRequestStatus('REJECTED', 'APPROVED') === false);
  assert('Past expectedReturnDate with ACTIVE loan is overdue (BR-009)', isLoanOverdue(new Date(Date.now() - 86400000), 'ACTIVE') === true);
  assert('Future expectedReturnDate with ACTIVE loan is not overdue', isLoanOverdue(new Date(Date.now() + 86400000), 'ACTIVE') === false);
  assert('Past expectedReturnDate with RETURNED loan is not overdue', isLoanOverdue(new Date(Date.now() - 86400000), 'RETURNED') === false);

  // 3. Incident State Machine & Routing (BR-010, BR-011, BR-012)
  console.log('\n--- 3. Incident State Machine & Auto-Routing ---');
  assert('REPORTED -> UNDER_REVIEW allowed', canTransitionIncidentStatus('REPORTED', 'UNDER_REVIEW') === true);
  assert('UNDER_REVIEW -> VERIFIED allowed', canTransitionIncidentStatus('UNDER_REVIEW', 'VERIFIED') === true);
  assert('VERIFIED -> IN_PROGRESS allowed', canTransitionIncidentStatus('VERIFIED', 'IN_PROGRESS') === true);
  assert('IN_PROGRESS -> RESOLVED allowed', canTransitionIncidentStatus('IN_PROGRESS', 'RESOLVED') === true);
  assert('RESOLVED -> REPORTED blocked', canTransitionIncidentStatus('RESOLVED', 'REPORTED') === false);

  // 4. Maintenance State Machine (BR-013, BR-014)
  console.log('\n--- 4. Maintenance State Machine ---');
  assert('OPEN -> IN_PROGRESS allowed', canTransitionMaintenanceStatus('OPEN', 'IN_PROGRESS') === true);
  assert('IN_PROGRESS -> WAITING_PARTS allowed', canTransitionMaintenanceStatus('IN_PROGRESS', 'WAITING_PARTS') === true);
  assert('IN_PROGRESS -> COMPLETED allowed', canTransitionMaintenanceStatus('IN_PROGRESS', 'COMPLETED') === true);
  assert('COMPLETED -> OPEN blocked', canTransitionMaintenanceStatus('COMPLETED', 'OPEN') === false);

  // 5. Stock Opname State Machine (BR-018, BR-019, BR-020)
  console.log('\n--- 5. Stock Opname Lifecycle ---');
  assert('OPEN -> IN_PROGRESS allowed', canTransitionStockOpnameStatus('OPEN', 'IN_PROGRESS') === true);
  assert('IN_PROGRESS -> COMPLETED allowed', canTransitionStockOpnameStatus('IN_PROGRESS', 'COMPLETED') === true);
  assert('COMPLETED -> OPEN blocked', canTransitionStockOpnameStatus('COMPLETED', 'OPEN') === false);

  // 6. Database Health & Records Integrity
  console.log('\n--- 6. Database Entities Verification ---');
  const [deviceCount, userCount, catCount, locCount] = await Promise.all([
    prisma.device.count(),
    prisma.user.count(),
    prisma.category.count(),
    prisma.location.count(),
  ]);

  assert(`Device count >= 1 (Current: ${deviceCount})`, deviceCount >= 1);
  assert(`User count >= 3 (Current: ${userCount})`, userCount >= 3);
  assert(`Category count >= 3 (Current: ${catCount})`, catCount >= 3);
  assert(`Location count >= 3 (Current: ${locCount})`, locCount >= 3);

  console.log(`\n========================================`);
  console.log(`QA Pass Result: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  await prisma.$disconnect();

  if (failed > 0) process.exit(1);
}

runFullQAPass();
