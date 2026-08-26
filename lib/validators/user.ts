import { z } from 'zod';

export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  studentOrEmployeeId: z.string().optional().or(z.literal('')),
  baseRole: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
  isTechnician: z.boolean().default(false),
  department: z.string().optional().or(z.literal('')),
  contact: z.string().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional().or(z.literal('')),
  studentOrEmployeeId: z.string().optional().or(z.literal('')),
  baseRole: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(),
  isTechnician: z.boolean().optional(),
  department: z.string().optional().or(z.literal('')),
  contact: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const BulkUserActionSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user must be selected'),
  action: z.enum(['ACTIVATE', 'DEACTIVATE', 'SET_TECHNICIAN', 'UNSET_TECHNICIAN']),
});

export type BulkUserActionInput = z.infer<typeof BulkUserActionSchema>;

export const ImportUserRowSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  username: z.string().optional(),
  studentOrEmployeeId: z.string().optional(),
  baseRole: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).default('STUDENT'),
  isTechnician: z.boolean().default(false),
  department: z.string().optional(),
  contact: z.string().optional(),
  password: z.string().min(6).default('Password123!'),
});

export type ImportUserRow = z.infer<typeof ImportUserRowSchema>;
