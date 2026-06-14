// ============================================================================
// Quantum Sync: Hardware Command Issuance & Operations Center
// Path: app/dashboard/commands/page.tsx
// ============================================================================
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { pool } from "../../../lib/db";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

interface ActiveDevice {
  sn: string;
  device_name: string;
  is_online: boolean;
}

interface PendingCommand {
  command_id: string;
  device_name: string;
  device_sn: string;
  command_string: string;
  status: string;
  created_at: string;
}

// Fetch available target micro-nodes
async function getConnectedDevices(): Promise<ActiveDevice[]> {
  const { rows } = await pool.query(`
    SELECT sn, device_name, is_online FROM devices ORDER BY device_name ASC;
  `);
  return rows;
}

// Fetch pending transmission streams
async function getPendingCommands(): Promise<PendingCommand[]> {
  const { rows } = await pool.query(`
    SELECT 
      cq.command_id::text as command_id,
      d.device_name,
      cq.device_sn,
      cq.command_string,
      cq.status,
      to_char(cq.created_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'HH24:MI:SS') as created_at
    FROM device_command_queue cq
    LEFT JOIN devices d ON cq.device_sn = d.sn
    WHERE cq.status = 'PENDING'
    ORDER BY cq.created_at DESC;
  `);
  return rows;
}

export default async function CommandsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Enforce access control parameters
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard?error=unauthorized_operations");
  }

  const [devices, pendingCmds] = await Promise.all([
    getConnectedDevices(),
    getPendingCommands()
  ]);

  // Master Server Action to handle secure transactional insertion parameters
  async function queueHardwareCommand(formData: FormData) {
    "use server";
    
    const deviceSn = formData.get("device_sn") as string;
    const operationType = formData.get("operation_type") as string;
    const targetPin = formData.get("target_pin") as string;

    if (!deviceSn || !operationType) return;

    let commandString = "";

    // Parse command parameters matching ZKTeco ADMS structural criteria
    switch (operationType) {
      case "REBOOT":
        commandString = "REBOOT";
        break;
      case "CLEAR_LOGS":
        commandString = "CLEAR LOGS";
        break;
      case "DELETE_USER":
        if (!targetPin) return;
        commandString = `DATA DELETE USER PIN=${targetPin}`;
        break;
      default:
        return;
    }

    try {
      await pool.query(`
        INSERT INTO device_command_queue (device_sn, command_string, status)
        VALUES ($1, $2, 'PENDING');
      `, [deviceSn, commandString]);

      revalidatePath("/dashboard/commands");
    } catch (err) {
      console.error("❌ [QUEUE_COMMAND_ERROR] Failure inserting transmission packet:", err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* COCKPIT NAVIGATION MATRIX */}
      <div className="max-w-7xl mx-auto flex justify-between items-center border-b border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">ADMS Operations & Command Terminal</h1>
          <p className="text-xs font-mono text-slate-500 uppercase mt-1">Quantum Sync Biometric Distribution Link</p>
        </div>
        <a href="/dashboard" className="text-xs font-mono bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-xl transition-all">
          ← Back To Main Trace
        </a>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ACTION INJECTION CARD */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 h-fit backdrop-blur-sm">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4">Inject Remote Command</h2>
          
          <form action={queueHardwareCommand} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5">Target Hardware Node</label>
              <select name="device_sn" required className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all">
                <option value="">Select Active Device...</option>
                {devices.map((dev) => (
                  <option key={dev.sn} value={dev.sn}>
                    {dev.device_name} ({dev.sn}) — {dev.is_online ? "🟢 ONLINE" : "🔴 OFFLINE"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5">Operation Execution Protocol</label>
              <select name="operation_type" required className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all">
                <option value="">Select Operation...</option>
                <option value="REBOOT">🔄 Remote Hardware System Reboot</option>
                <option value="CLEAR_LOGS">🚯 Clear Device Punch Buffer Logs</option>
                <option value="DELETE_USER">🚨 Revoke Employee Token Authorization (Delete User)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1.5">Target Employee PIN (If Revoking Access)</label>
              <input type="text" name="target_pin" placeholder="e.g. 1975" className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono" />
            </div>

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-950/20">
              ⚡ Transmit Operation Pack
            </button>
          </form>
        </div>

        {/* ACTIVE QUEUE DISPLAY WIREFRAME */}
        <div className="lg:col-span-2 bg-slate-900/10 border border-slate-900 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4">Pending Transmission Buffer Pipeline</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 text-[10px] font-mono uppercase tracking-wider">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Target Node</th>
                  <th className="pb-3">Command Signature</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs font-mono">
                {pendingCmds.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-600">
                      Pipeline transparent. No commands currently waiting for middleware polling requests.
                    </td>
                  </tr>
                ) : (
                  pendingCmds.map((cmd) => (
                    <tr key={cmd.command_id} className="hover:bg-slate-900/5 transition-colors">
                      <td className="py-3 text-slate-400">{cmd.created_at}</td>
                      <td className="py-3 text-slate-200">{cmd.device_name}</td>
                      <td className="py-3 text-emerald-400 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-900/40 w-fit">{cmd.command_string}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-900/30 text-[10px] font-bold rounded">
                          {cmd.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}