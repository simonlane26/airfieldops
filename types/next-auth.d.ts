import { DefaultSession } from 'next-auth';
import { UserRole, UserPermissions } from '@/lib/types/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      airportId: string | null;
      airport: {
        id: string;
        name: string;
        icaoCode: string;
      } | null;
      permissions: UserPermissions | null;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role: UserRole;
    airportId: string | null;
    airport: {
      id: string;
      name: string;
      icaoCode: string;
    } | null;
    permissions: UserPermissions | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    airportId: string | null;
    airport: {
      id: string;
      name: string;
      icaoCode: string;
    } | null;
    permissions: UserPermissions | null;
  }
}
