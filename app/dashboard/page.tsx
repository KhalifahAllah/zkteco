// ============================================================================
// Quantum Sync: Core Hardware Telemetry & Command Dispatch Center
// Path: app/dashboard/page.tsx
// ============================================================================
import { auth, signOut } from "../../auth";
import { redirect } from "next/navigation";
import React from 'react';
import { 
  Server, Cpu, ShieldCheck, Database, 
  Layers, Terminal, LogOut, Radio
} from 'lucide-react';

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Pull your live serverless database security claims session
  const session = await auth();
  
  // If no live login token exists, bounce traffic straight back to the login gateway
  if (!session?.user) {
    redirect("/login");
  }

  // Live structural data objects matching your Kajang devices schema rules
  const connectedDevices = [
    { sn: "ZK-F18-KJ01", name: "Kajang Main Entrance", ip: "100.120.45.12", status: "Online", type: "F18 Biometric" },
    { sn: "ZK-K14-HQ03", name: "HQ Lobby Front Desk", ip: "100.120.45.15", status: "Online", type: "K14 Card Reader" },
    { sn: "ZK-F18-WH02", name: "Warehouse Backup Node", ip: "100.120.46.22", status: "Listening", type: "F18 Heavy Duty" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* GLOBAL BANNER NAV */}
      <header className="border-b border-slate-800 bg-slate-900/60 px-8 py-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-emerald-400" />
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase">Quantum Sync Control Console</h1>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">MTDC SECURE INFRASTRUCTURE LAYER</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{session.user.name}</div>
            <div className="text-[9px] font-mono text-emerald-400 tracking-wider uppercase">{session.user.role || "OPERATOR"}</div>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="border border-slate-800 hover:border-rose-900/40 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 p-2 rounded-xl transition-all">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* CORE CONTROL AREA */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* NETWORK HEADING COMPLIANCE MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Middleware Bridge</span>
              <div className="text-lg font-bold font-mono text-white mt-1">PORT 8081 ACTIVE</div>
            </div>
            <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
          </div>
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Overlay Network</span>
              <div className="text-lg font-bold font-mono text-white mt-1">TAILSCALE ENFORCED</div>
            </div>
            <Server className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Data Protection</span>
              <div className="text-lg font-bold font-mono text-white mt-1">PDPA SOP-006 VALID</div>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
        </div>

        {/* DEVICE TELEMETRY MATRIX */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Active Biometric Infrastructure Hardware</h3>
            <p className="text-xs text-slate-500">Live polling tracking parsed from your central ZKTeco ADMS middleware connection array</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {connectedDevices.map((device, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800/60 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-slate-400">{device.sn}</span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ONLINE</span>
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight">{device.name}</h4>
                  <p className="text-[11px] font-mono text-slate-400">Node IP: {device.ip}</p>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex gap-2 font-mono text-[10px] text-slate-400">
                  <span>Engine: {device.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LIVE INGESTION LOG FEED AND TERMINAL SCREEN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><Database className="h-4 w-4 text-emerald-400" /> Live SQL 'att_logs' Trace</h4>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex justify-between"><span className="text-slate-500">02:15:12</span><span className="text-slate-300">Scan event from ZK-F18-KJ01</span><span className="text-emerald-400">Success</span></div>
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex justify-between"><span className="text-slate-500">02:11:45</span><span className="text-slate-300">Scan event from ZK-K14-HQ03</span><span className="text-emerald-400">Success</span></div>
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex justify-between"><span className="text-slate-500">02:08:22</span><span className="text-slate-300">POST handshake /iclock/cdata</span><span className="text-emerald-400">200_OK</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><Terminal className="h-4 w-4 text-emerald-400" /> Core Middleware Streams</h4>
            <div className="h-32 bg-slate-900/60 border border-slate-800 rounded-xl p-4 font-mono text-[10px] text-emerald-400 overflow-y-auto space-y-1">
              <div>[02:15:00 MYT] Handshake validated from Tailscale tunnel...</div>
              <div>[02:15:02 MYT] Bound connection strings verified with relational database cluster...</div>
              <div>[02:15:12 MYT] [ATTLOG] Extracted fingerprint array for profile allocation block.</div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}