// Route-level auth gate: every /officer/** page except the login page
// itself requires a signed-in officer session, enforced before the page
// even renders. Everything outside /officer (the public roster/items/master
// list pages) is intentionally left open.
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/officer/login",
  },
});

export const config = {
  matcher: ["/officer/((?!login).*)"],
};
