import { z } from 'zod';

export const CreateLoanRequestSchema = z.object({
  purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
  startDate: z.string().min(1, 'Start date is required'),
  expectedReturnDate: z.string().min(1, 'Expected return date is required'),
  notes: z.string().optional().nullable(),
  deviceIds: z.array(z.string()).min(1, 'Please select at least 1 device to borrow'),
});

export type CreateLoanRequestInput = z.infer<typeof CreateLoanRequestSchema>;

export const ApproveLoanSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const RejectLoanSchema = z.object({
  rejectionReason: z.string().min(3, 'Rejection reason is required'),
});

export const ReturnLoanItemSchema = z.object({
  loanItemId: z.string().min(1, 'Loan Item ID is required'),
  returnCondition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'CRITICAL']),
  returnNotes: z.string().optional().nullable(),
});

export type ReturnLoanItemInput = z.infer<typeof ReturnLoanItemSchema>;
