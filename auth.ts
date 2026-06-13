// ============================================================================
// Quantum Sync: Core Identity Matrix & Postgres DB Data Binder
// Path: auth.ts (Root Directory)
// ============================================================================
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { Pool } from "pg";

// Establish a connection pool to your PostgreSQL instance (Kajang or Cloud DR)
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
      // PDPA SOP-006 Enforced: Only allow authorized corporate domains
      if (!profile?.email?.endsWith("@mtdc.com.my")) {
        console.error(`🚫 [AUTH_DENIED] Unauthorized connection attempt from: ${profile?.email}`);
        return false;
      }

      try {
        // Sync or register the employee directly into the hr_users schema layout
        await pool.query(`
          INSERT INTO hr_users (email, full_name, role, last_login, pdpa_consent_at)
          VALUES ($1, $2, 'OPERATOR', NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET last_login = NOW()
        `, [profile.email, profile.name]);
        
        return true;
      } catch (err) {
        console.error("❌ [DB_SYNC_ERROR] Failed to map profile attributes to hr_users table:", err);
        return false;
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