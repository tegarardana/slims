import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export function handleApiError(error: unknown) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('API Error:', error);
  }

  // Handle Prisma errors specifically
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Resource already exists' } },
        { status: 409 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } },
        { status: 404 }
      );
    }
    // Mask other database errors
    return NextResponse.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'A database error occurred' } },
      { status: 500 }
    );
  }

  if (error instanceof Error) {
    // Return a generic message to prevent leaking internal paths or sensitive details
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'An internal server error occurred' } },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: false, error: { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' } },
    { status: 500 }
  );
}
