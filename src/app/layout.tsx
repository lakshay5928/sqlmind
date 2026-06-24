import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "SQLMind AI — Intelligent SQL Copilot",
  description: "AI-powered SQL query generator, optimizer, and explainer. Schema-aware, role-based, with real-time analysis.",
  keywords: ["SQL", "AI", "query optimizer", "NL to SQL", "database", "PostgreSQL", "MySQL"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </head>
      <body className="antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: { background: "#111113", border: "1px solid #1C1C1F", color: "#FAFAFA" },
          }}
        />
      </body>
    </html>
  );
}
