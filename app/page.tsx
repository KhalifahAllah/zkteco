// ============================================================================
// Quantum Sync: Root Index Redirection Module
// Path: app/page.tsx
// ============================================================================
import React from 'react';
import { redirect } from 'next/navigation';

export default function RootIndexPage() {
  // Automatically bounce root landing parameters to the secure auth gateway
  redirect('/login');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400 font-mono text-xs">
      [SYS_LOG] Routing execution parameters active... Bouncing context to access node gateway.
    </div>
  );
}