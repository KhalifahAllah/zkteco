// ============================================================================
// Quantum Sync: Unified Application Root Layout Framework
// Path: app/layout.tsx
// ============================================================================
import React from 'react';
import "./globals.css";
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-slate-100 antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}