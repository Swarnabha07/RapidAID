import { BrandPanel } from "@/components/login/brand-panel";
import { MobileBrandHeader } from "@/components/login/mobile-brand-header";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <div className="hidden lg:block lg:w-[46%] lg:flex-none xl:w-[42%]">
        <div className="sticky top-0 h-screen">
          <BrandPanel />
        </div>
      </div>

      <MobileBrandHeader />

      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
