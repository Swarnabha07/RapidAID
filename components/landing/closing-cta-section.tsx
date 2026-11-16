import { Button } from "@/components/ui/button";

export function ClosingCtaSection() {
  return (
    <section className="bg-subtle py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
        <p className="text-xs font-medium text-brand-blue">Ready when it matters</p>
        <h2 className="mx-auto mt-4 max-w-xl text-3xl font-semibold leading-tight text-text-primary sm:text-[2.2rem]">
          Every second matters. Every report counts.
        </h2>
        <p className="mt-4 text-[15px] text-text-secondary">
          A more resilient connection between people and help.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg">Request Emergency Help</Button>
          <Button size="lg" variant="secondary">
            Access Responder Portal ↗
          </Button>
        </div>
      </div>
    </section>
  );
}
