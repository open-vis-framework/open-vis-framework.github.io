import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { verifyPassword } from "@/lib/password";

const ORCID_ISSUER = process.env.AUTH_ORCID_ISSUER ?? "https://orcid.org";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // JWT, not database, sessions: Auth.js requires this whenever a
  // Credentials provider is present (throws UnsupportedStrategy
  // otherwise - confirmed by hitting it directly). The adapter is still
  // used for user/account records and OAuth account linking; it just
  // doesn't manage session rows in this configuration.
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        // No user, or an OAuth-only account with no password set.
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        return valid ? user : null;
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    {
      // ORCID isn't a built-in Auth.js provider; it's a standard OIDC
      // provider so this is enough for auto-discovery
      // (${issuer}/.well-known/openid-configuration). If that discovery
      // doc ever proves incomplete, fall back to explicit
      // authorization/token/userinfo URLs per ORCID's OAuth guide
      // (https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/).
      id: "orcid",
      name: "ORCID",
      type: "oidc",
      issuer: ORCID_ISSUER,
      clientId: process.env.AUTH_ORCID_ID,
      clientSecret: process.env.AUTH_ORCID_SECRET,
      authorization: { params: { scope: "/authenticate openid" } },
      profile(profile) {
        // ORCID's OIDC `sub` claim is the ORCID iD itself. ORCID rarely
        // exposes an email via OAuth, so treat it as absent - the schema
        // already allows a null email (see src/db/schema.ts).
        return {
          id: profile.sub,
          name: profile.name ?? profile.sub,
          email: null,
        };
      },
    },
  ],
  callbacks: {
    // JWT strategy: user.id only exists on the token param at sign-in
    // time (when `user` is passed in), not on every subsequent request -
    // persist it onto the token so `session()` can read it every time.
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
