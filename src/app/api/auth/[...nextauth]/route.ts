// NextAuth's catch-all route — handles /api/auth/signin, /callback/credentials,
// /session, /csrf, etc. The only REST endpoint in the app; everything else
// is a Server Action.
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
