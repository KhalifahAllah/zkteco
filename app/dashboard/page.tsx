// ============================================================================
// Quantum Sync: Hardened Relational Telemetry Dashboard Viewport
// Path: app/dashboard/page.tsx
// ============================================================================
import { auth, signOut } from "../../auth";           // Up 2 steps to root auth.ts
import { redirect } from "next/navigation";
import { pool } from "../../lib/db";                  // Up 2 steps to root lib/db.ts
import { AttendancePunchLog } from "../../types/attendance"; // Up 2 steps to root types/

export const dynamic = "force-dynamic";
export const revalidate = 5; // You.com 5-second selective caching guard rule

async function getLiveAttendanceData(): Promise<AttendancePunchLog[]> {
  try {
    const { rows } = await pool.query(`
      SELECT 
        al.log_id::text as log_id,
        al.device_sn,
        d.device_name,
        al.user_pin,
        u.full_name,
        to_char(al.timestamp AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI:SS') as timestamp,
        al.state,
        al.verify_mode,
        al.work_code
      FROM attendance_logs al
      LEFT JOIN devices d ON al.device_sn = d.sn
      LEFT JOIN hr_users u ON al.user_pin = u.pin
      ORDER BY al.timestamp DESC
      LIMIT 50;
    `);
    return rows;
  } catch (err) {
    console.error("❌ [DASHBOARD_FETCH_ERROR] Failure loading logs from PostgreSQL cluster:", err);
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const logs = await getLiveAttendanceData();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* HEADER COCKPIT MATRIX */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-900 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white bg-clip-text">Quantum Sync Control Console</h1>
          <p className="text-xs font-mono text-slate-500 uppercase mt-1">MTDC Secure Infrastructure Layer</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/40 border border-slate-900 p-3 rounded-2xl w-full md:w-auto">
          <div className="text-left font-mono">
            <div className="text-xs font-bold text-white">{session.user.name}</div>
            <div className="text-[10px] text-emerald-400 tracking-wider uppercase mt-0.5">{session.user.role || "OPERATOR"}</div>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }} className="ml-auto md:ml-0">
            <button type="submit" className="text-xs border border-slate-800 hover:border-rose-900/40 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 px-3 py-2 rounded-xl transition-all">
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* SYSTEM TELEMETRY STREAM */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6">
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Live SQL 'attendance_logs' Trace</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time biometric data sync stream over Tailscale VPN link</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wide animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> LIVE BROADCAST
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[11px] font-mono uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Timestamp (MYT)</th>
                  <th className="pb-3 font-semibold">Terminal SN / Node</th>
                  <th className="pb-3 font-semibold">User ID</th>
                  <th className="pb-3 font-semibold">Full Name</th>
                  <th className="pb-3 font-semibold text-center">State</th>
                  <th className="pb-3 font-semibold text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs font-mono">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-600 font-mono">
                      No hardware scan signatures currently registered in attendance_logs. Waiting for device data streams...
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isCheckIn = log.state === 0;
                    return (
                      <tr key={log.log_id} className="hover:bg-slate-900/10 transition-colors group">
                        <td className="py-3.5 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                        <td className="py-3.5">
                          <span className="text-slate-200 block font-sans font-medium">{log.device_name || "Unregistered Node"}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{log.device_sn}</span>
                        </td>
                        <td className="py-3.5 text-slate-300">{log.user_pin}</td>
                        <td className="py-3.5 text-white font-sans font-semibold">{log.full_name || "Unknown Profile"}</td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isCheckIn ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-rose-950/40 text-rose-400 border border-rose-900/30'}`}>
                            {isCheckIn ? "IN" : "OUT"}
                          </span>
                        </td>
                        <td className="py-3.5 text-right text-slate-400">
                          {log.verify_mode === 1 ? "🧬 Fingerprint" : log.verify_mode === 15 ? "📷 Face ID" : "💳 Card Reader"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}