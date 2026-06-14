// ============================================================================
// Quantum Sync: Core Identity Matrix & Postgres DB Data Binder (Admin Safelisted)
// Path: auth.ts (Root Directory)
// ============================================================================
import NextAuth, { DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email || "";
      
      // Enforce corporate domain boundary OR explicit admin safelist match
      if (!email.endsWith("@mtdc.com.my") && email !== "rapidgold@gmail.com") {
        console.error(`🚫 [AUTH_DENIED] Unauthorized connection attempt from: ${email}`);
        return false;
      }

      try {
        // Sync administrative profile claims cleanly to your PostgreSQL schema
        await pool.query(`
          INSERT INTO hr_users (email, full_name, role, last_login, pdpa_consent_at)
          VALUES ($1, $2, 'ADMINISTRATOR', NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET last_login = NOW()
        `, [email, profile?.name || "Admin User"]);
        
        return true;
      } catch (err) {
        console.error("❌ [DB_SYNC_ERROR] Failed to map profile attributes to hr_users table:", err);
        return true;
      }
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        try {
          const { rows } = await pool.query(
            "SELECT role, department, zkteco_user_id, is_active FROM hr_users WHERE email = $1",
            [profile.email]
          );
          const user = rows[0];
          
          if (user && user.is_active) {
            token.role = user.role;
            token.department = user.department;
            token.zktecoId = user.zkteco_user_id;
            token.hrLinked = true;
          }
        } catch (err) {
          console.error("Error fetching token claims from database:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.zktecoId = token.zktecoId as string;
        session.user.hrLinked = token.hrLinked as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  }
});