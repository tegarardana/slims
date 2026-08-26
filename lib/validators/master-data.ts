import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

export const CreateLocationSchema = z.object({
  name: z.string().min(2, 'Location name must be at least 2 characters'),
  parentLocationId: z.string().optional().nullable(),
});

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;

export const UpdateLocationSchema = z.object({
  name: z.string().min(2, 'Location name must be at least 2 characters').optional(),
  parentLocationId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
