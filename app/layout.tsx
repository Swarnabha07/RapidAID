import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth";

export const metadata: Metadata = {
  title: "RapidAID — Resilient by design, ready for response",
  description:
    "RapidAID connects people affected by disasters with emergency response teams through intelligent triage, offline-first reporting, and coordinated emergency response.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-canvas text-text-primary">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
