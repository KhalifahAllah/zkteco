// ============================================================================
// Quantum Sync: Canonical Next.js 14 Root Application HTML Layout Wrapper
// Path: app/layout.tsx
// ============================================================================
import React from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-slate-100 antialiased m-0 p-0 min-h-screen">
        {children}
      </body>
    </html>
  );
}