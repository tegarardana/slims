import { z } from 'zod';

export const CreateMaintenanceSchema = z.object({
  deviceId: z.string().min(1, 'Device is required'),
  technicianId: z.string().optional().nullable(),
  maintenanceType: z.enum(['CORRECTIVE', 'PREVENTIVE', 'CALIBRATION', 'UPGRADE']),
  problem: z.string().min(3, 'Problem / scope description is required'),
  startDate: z.string().min(1, 'Start date is required'),
  expectedEndDate: z.string().optional().nullable(),
  relatedIncidentId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED']).default('OPEN'),
});

export type CreateMaintenanceInput = z.infer<typeof CreateMaintenanceSchema>;

export const UpdateMaintenanceSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED']).optional(),
  technicianId: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  actionTaken: z.string().optional().nullable(),
  partsReplaced: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
});

export const CompleteMaintenanceSchema = z.object({
  diagnosis: z.string().optional().nullable(),
  actionTaken: z.string().min(3, 'Action taken is required when completing maintenance'),
  partsReplaced: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  result: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  deviceNewCondition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'CRITICAL']).default('GOOD'),
});

export type CompleteMaintenanceInput = z.infer<typeof CompleteMaintenanceSchema>;
