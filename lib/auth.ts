import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { LoginSchema } from '@/lib/validators/user';

if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET && !process.env.CI) {
  throw new Error('AUTH_SECRET environment variable is required');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validated = LoginSchema.safeParse(credentials);
        if (!validated.success) {
          return null;
        }

        const { identifier, password } = validated.data;

        // Search by email or username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier, mode: 'insensitive' } },
              { username: { equals: identifier, mode: 'insensitive' } },
            ],
          },
        });

        if (!user) {
          return null;
        }

        if (user.status !== 'ACTIVE') {
          throw new Error('USER_INACTIVE');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          baseRole: user.baseRole,
          isTechnician: user.isTechnician,
          canApproveLoans: user.canApproveLoans,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.baseRole = (user as any).baseRole;
        token.isTechnician = (user as any).isTechnician;
        token.canApproveLoans = (user as any).canApproveLoans;
        token.status = (user as any).status;
        token.lastRevalidated = Date.now();
      }

      // Revalidate every 5 minutes
      const shouldRevalidate = !token.lastRevalidated || (Date.now() - (token.lastRevalidated as number) > 300000);
      
      if (shouldRevalidate && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { baseRole: true, isTechnician: true, canApproveLoans: true, status: true },
          });
          
          if (dbUser) {
            token.baseRole = dbUser.baseRole;
            token.isTechnician = dbUser.isTechnician;
            token.canApproveLoans = dbUser.canApproveLoans;
            token.status = dbUser.status;
            token.lastRevalidated = Date.now();
          } else {
            token.status = 'INACTIVE';
          }
        } catch (error) {
          console.error('Session revalidation error:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.status !== 'ACTIVE') {
        // Invalidate session for inactive or deleted users
        return { ...session, user: undefined as any };
      }

      if (session.user && token) {
        session.user.id = token.id as string;
        (session.user as any).baseRole = token.baseRole;
        (session.user as any).isTechnician = token.isTechnician;
        (session.user as any).canApproveLoans = token.canApproveLoans;
        (session.user as any).status = token.status;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET || 'slims-secret-key-32-characters-long-key-for-dev-12345',
});
