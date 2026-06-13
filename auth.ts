import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        return profile.email.endsWith("@mtdc.com.my");
      }
      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.email === "wan1975@mtdc.com.my" ? "SUPER_ADMIN" : "FIELD_ENG";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET
});