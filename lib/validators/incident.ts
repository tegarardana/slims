import { z } from 'zod';

export const CreateIncidentSchema = z.object({
  deviceId: z.string().min(1, 'Device selection is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  locationId: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;

export const VerifyIncidentSchema = z.object({
  verificationOutcome: z.enum([
    'NO_ISSUE_FOUND',
    'MINOR_ISSUE',
    'MAJOR_ISSUE',
    'MAINTENANCE_REQUIRED',
    'REPLACEMENT_REQUIRED',
    'RETIREMENT_RECOMMENDED',
  ]),
  notes: z.string().optional().nullable(),
});

export type VerifyIncidentInput = z.infer<typeof VerifyIncidentSchema>;

export const ResolveIncidentSchema = z.object({
  notes: z.string().optional().nullable(),
});

export type ResolveIncidentInput = z.infer<typeof ResolveIncidentSchema>;
