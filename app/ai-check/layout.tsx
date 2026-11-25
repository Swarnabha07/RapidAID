import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI diagnostics",
  robots: { index: false, follow: false },
};

export default function AiCheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
