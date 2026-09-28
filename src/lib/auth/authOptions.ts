// NextAuth config: Credentials-only login against the Officer table, with
// isAdmin/isTankOfficer carried through the JWT so session checks (see
// session.ts) never need an extra DB round trip.
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/officer/login",
  },
  providers: [
    CredentialsProvider({
      name: "Officer login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // Returning null (rather than throwing) on any failure keeps NextAuth's
      // generic "invalid credentials" behavior — no username enumeration.
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const officer = await prisma.officer.findUnique({
          where: { username: credentials.username },
        });
        if (!officer) return null;

        const valid = await bcrypt.compare(credentials.password, officer.passwordHash);
        if (!valid) return null;

        return {
          id: officer.id,
          name: officer.displayName,
          isAdmin: officer.isAdmin,
          isTankOfficer: officer.isTankOfficer,
        };
      },
    }),
  ],
  callbacks: {
    // Runs on sign-in: stashes the officer's role flags in the JWT itself.
    async jwt({ token, user }) {
      if (user) {
        token.officerId = user.id;
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin;
        token.isTankOfficer = (user as { isTankOfficer: boolean }).isTankOfficer;
      }
      return token;
    },
    // Runs on every session read: copies the JWT's role flags onto session.user
    // (typed via src/types/next-auth.d.ts) so server components can just read them.
    async session({ session, token }) {
      if (session.user) {
        session.user.officerId = token.officerId as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isTankOfficer = token.isTankOfficer as boolean;
      }
      return session;
    },
  },
};
