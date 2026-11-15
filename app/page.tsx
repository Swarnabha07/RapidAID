import { SiteNavbar } from "@/components/landing/site-navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { CapabilityStrip } from "@/components/landing/capability-strip";
import { CriticalGapSection } from "@/components/landing/critical-gap-section";
import { SignalToResponseSection } from "@/components/landing/signal-to-response-section";
import { ResponseTeamsSection } from "@/components/landing/response-teams-section";
import { OfflineSection } from "@/components/landing/offline-section";
import { ClosingCtaSection } from "@/components/landing/closing-cta-section";
import { SiteFooter } from "@/components/landing/site-footer";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteNavbar />
      <HeroSection />
      <CapabilityStrip />
      <CriticalGapSection />
      <SignalToResponseSection />
      <ResponseTeamsSection />
      <OfflineSection />
      <ClosingCtaSection />
      <SiteFooter />
    </main>
  );
}
