import { z } from 'zod';

export const CreateStockOpnameSessionSchema = z.object({
  sessionName: z.string().min(3, 'Session name is required (min 3 chars)'),
  locationScope: z.array(z.string()).default([]),
  categoryScope: z.array(z.string()).default([]),
  startDate: z.string().min(1, 'Start date is required'),
  assignedVerifierId: z.string().min(1, 'Assigned verifier is required'),
  notes: z.string().optional().nullable(),
});

export type CreateStockOpnameSessionInput = z.infer<typeof CreateStockOpnameSessionSchema>;

export const ScanRecordSchema = z.object({
  recordId: z.string().optional(),
  scannedTagOrQr: z.string().optional(),
  verificationResult: z.enum(['FOUND', 'MISSING', 'WRONG_LOCATION', 'DAMAGED', 'UNVERIFIED']),
  physicalLocationId: z.string().optional().nullable(),
  physicalCondition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'CRITICAL']).optional().nullable(),
});

export type ScanRecordInput = z.infer<typeof ScanRecordSchema>;

export const ReconcileRecordSchema = z.object({
  recordIds: z.array(z.string()).min(1, 'Select at least one record to reconcile'),
  action: z.enum(['SYNC_ALL_DISCREPANCIES', 'UPDATE_LOCATION', 'UPDATE_CONDITION', 'MARK_LOST']),
  notes: z.string().optional().nullable(),
});

export type ReconcileRecordInput = z.infer<typeof ReconcileRecordSchema>;
