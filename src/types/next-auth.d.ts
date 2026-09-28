// Module augmentation: adds our officer-specific fields (officerId,
// isAdmin, isTankOfficer) to NextAuth's Session/User/JWT types, populated
// in src/lib/auth/authOptions.ts's callbacks.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      officerId: string;
      isAdmin: boolean;
      isTankOfficer: boolean;
      name?: string | null;
    };
  }

  interface User {
    id: string;
    isAdmin: boolean;
    isTankOfficer: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    officerId: string;
    isAdmin: boolean;
    isTankOfficer: boolean;
  }
}
