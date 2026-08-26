import { z } from 'zod';

export const CreateDeviceSchema = z.object({
  assetTag: z.string().min(2, 'Asset tag must be at least 2 characters'),
  serialNumber: z.string().optional().nullable().or(z.literal('')),
  categoryId: z.string().min(1, 'Category is required'),
  deviceType: z.string().min(1, 'Device type is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  locationId: z.string().min(1, 'Location is required'),
  acquisitionDate: z.string().optional().nullable().or(z.literal('')),
  yearAcquired: z.coerce.number().int().min(1990).max(2050).optional().nullable(),
  acquisitionSource: z.string().optional().nullable().or(z.literal('')),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  warrantyInfo: z.string().optional().nullable().or(z.literal('')),
  status: z
    .enum(['AVAILABLE', 'BORROWED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'])
    .default('AVAILABLE'),
  condition: z
    .enum(['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'CRITICAL'])
    .default('GOOD'),
  description: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
  photoUrl: z.string().optional().nullable().or(z.literal('')),
});

export type CreateDeviceInput = z.infer<typeof CreateDeviceSchema>;

export const UpdateDeviceSchema = z.object({
  assetTag: z.string().min(2).optional(),
  serialNumber: z.string().optional().nullable().or(z.literal('')),
  categoryId: z.string().min(1).optional(),
  deviceType: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  acquisitionDate: z.string().optional().nullable().or(z.literal('')),
  yearAcquired: z.coerce.number().int().min(1990).max(2050).optional().nullable(),
  acquisitionSource: z.string().optional().nullable().or(z.literal('')),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  warrantyInfo: z.string().optional().nullable().or(z.literal('')),
  status: z
    .enum(['AVAILABLE', 'BORROWED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'])
    .optional(),
  condition: z
    .enum(['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'CRITICAL'])
    .optional(),
  description: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
  photoUrl: z.string().optional().nullable().or(z.literal('')),
});

export type UpdateDeviceInput = z.infer<typeof UpdateDeviceSchema>;
