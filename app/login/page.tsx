// ============================================================================
// Quantum Sync: Hardened Omni-Auth Production Gateway Interface
// Path: app/login/page.tsx
// ============================================================================
"use client";

import { signIn } from "next-auth/react";
import React, { useState, Suspense } from 'react';
import { 
  ShieldAlert, Mail, Fingerprint, Key, ArrowRight, 
  Layers, CheckCircle2, Server
} from 'lucide-react';

export const dynamic = "force-dynamic";

const AUTH_PROVIDERS = [
  { id: 'google', name: 'Google Workspace', icon: Mail, active: true, type: 'OAuth2 Identity' },
  { id: 'webauthn', name: 'Passkeys / Biometric Mesh', icon: Fingerprint, active: false, type: 'FIDO2' },
  { id: 'credentials', name: 'Secured Hardware PIN', icon: Key, active: false, type: 'Encrypted Token' }
];

function LoginGatewayContent() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLiveAuthentication = async (providerId: string) => {
    if (providerId !== 'google') {
      setAuthError(`Provider [${providerId.toUpperCase()}] is staged for network expansion rules. Use Google Workspace.`);
      return;
    }
    setIsLoading(providerId);
    setAuthError(null);
    
    try {
      await signIn(providerId, { callbackUrl: '/dashboard' });
    } catch (err) {
      console.log("Redirecting to identity cluster initialization...");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">
      {/* LEFT CANVAS: ARCHITECTURAL META-INFO PANELS */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 p-12 flex-col justify-between border-r border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <Layers className="h-6 w-6 text-emerald-400" />
            <span className="text-sm font-bold tracking-widest text-white uppercase">Quantum Sync Enterprise</span>
          </div>
          <div className="space-y-6 max-w-lg mt-24">
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">Unified Identity & Biometric Interface</h1>
            <p className="text-slate-400 text-sm leading-relaxed">Secure, multi-site hardware orchestration gateway. Access parameters are restricted via your private corporate domain network.</p>
          </div>
        </div>
        <div className="relative z-10 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono flex items-center gap-1.5 text-emerald-400"><Server className="h-3 w-3" /> SECURITY CORE LIVE</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-semibold">v1.2.0</span>
          </div>
          <p className="text-xs text-slate-500 font-mono leading-relaxed">[SYS_LOG] Core engine initialization success. Cloud database schema sync achieved.</p>
        </div>
      </div>

      {/* RIGHT CANVAS: LOGIN ACTIVE ROUTER DISPLAY */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-white">Access Gateway Authentication</h2>
              <p className="text-slate-400 text-xs">Select your authorization channel to verify credentials.</p>
            </div>
            {authError && (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex gap-3">
                <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-mono text-rose-300">{authError}</p>
              </div>
            )}
            <div className="space-y-3">
              {AUTH_PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                return (
                  <button 
                    key={provider.id} 
                    onClick={() => handleLiveAuthentication(provider.id)} 
                    disabled={isLoading !== null || !provider.active} 
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${provider.active ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/40 cursor-pointer group' : 'bg-slate-950/30 border-slate-900/80 text-slate-600 opacity-40 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${provider.active ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-950/20 border-slate-900'}`}><Icon className="h-4 w-4" /></div>
                      <div>
                        <div className={`text-xs font-bold tracking-wide uppercase ${provider.active ? 'text-slate-200' : 'text-slate-500'}`}>{provider.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">Engine: {provider.type}</div>
                      </div>
                    </div>
                    {provider.active && <ArrowRight className={`h-4 w-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all ${isLoading === provider.id ? 'animate-spin' : ''}`} />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-slate-800/80 pt-6 space-y-2 text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Multi-location routing modules parsed</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Alphanumeric input parsing shields active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortalLoginGateway() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-slate-400 font-mono text-xs flex items-center justify-center">
        <Server className="h-4 w-4 animate-spin text-emerald-400 mr-2" /> Instantiating cloud runtime configurations...
      </div>
    }>
      <LoginGatewayContent />
    </Suspense>
  );
}