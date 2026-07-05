import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ account }) {
      if (account?.provider === "google" && account.access_token) {
        try {
          const existing = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
            },
          });
          if (existing) {
            await db.account.update({
              where: { id: existing.id },
              data: {
                access_token: account.access_token,
                expires_at: account.expires_at,
                scope: account.scope ?? existing.scope,
                id_token: account.id_token ?? existing.id_token,
                token_type: account.token_type ?? existing.token_type,
                ...(account.refresh_token
                  ? { refresh_token: account.refresh_token }
                  : {}),
              },
            });
            console.log(
              "[auth] Updated tokens for returning user:",
              existing.userId
            );
          }
        } catch (err) {
          console.error("[auth] Failed to update account tokens:", err);
        }
      }
      return true;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
