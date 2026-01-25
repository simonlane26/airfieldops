import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { validateCredentials, getUserById, getAirportById } from '@/lib/auth';
import { UserRole } from '@/lib/types/auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await validateCredentials(
          credentials.email,
          credentials.password
        );

        if (!user) {
          return null;
        }

        // Get airport data if user has an airport assigned
        let airport = null;
        if (user.airportId) {
          airport = await getAirportById(user.airportId);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          airportId: user.airportId,
          airport: airport,
          permissions: user.permissions ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.airportId = user.airportId;
        token.airport = user.airport;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.airportId = token.airportId as string | null;
        session.user.airport = token.airport as any;
        session.user.permissions = token.permissions as any;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
