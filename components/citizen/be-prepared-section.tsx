import { ShieldAlert, MapPin, BatteryCharging, Phone } from "lucide-react";

const TIPS = [
  {
    icon: ShieldAlert,
    title: "Prioritize your safety",
    detail: "Move away from immediate danger if it is safe to do so.",
  },
  {
    icon: MapPin,
    title: "Share a clear location",
    detail: "Include a nearby landmark when a street address is unavailable.",
  },
  {
    icon: BatteryCharging,
    title: "Preserve your battery",
    detail: "Reduce screen brightness and keep your phone dry and powered.",
  },
];

export function BePreparedSection() {
  return (
    <section>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        Be prepared
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-text-primary">
        Emergency information
      </h2>
      <p className="mt-1.5 max-w-lg text-[13.5px] text-text-secondary">
        Simple guidance to help you stay safe while assistance is being
        arranged.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {TIPS.map((tip) => (
          <div
            key={tip.title}
            className="rounded-[var(--radius-md)] border border-black/8 bg-white p-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue">
              <tip.icon size={17} strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-[13.5px] font-medium text-text-primary">
              {tip.title}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
              {tip.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-[var(--radius-md)] border border-black/8 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-subtle text-text-secondary">
            <Phone size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-text-primary">
              Important contacts
            </p>
            <p className="mt-1 text-[12.5px] text-text-secondary">
              Use the verified emergency numbers published by your local
              authorities.
            </p>
            <a
              href="#"
              className="mt-2 inline-block text-[13px] font-medium text-brand-blue hover:underline"
            >
              View saved contacts
            </a>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[12px] text-text-secondary/80">
        RapidAID does not replace local emergency telephone services.
      </p>
    </section>
  );
}
