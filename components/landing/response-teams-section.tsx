import { Cross, Shield, Flame } from "lucide-react";

const TEAMS = [
  {
    eyebrow: "01 · Care",
    title: "Medical Response",
    detail:
      "Prioritize medical assistance, review reported symptoms, and coordinate care for people who need it most.",
    icon: Cross,
    accent: "bg-blue-50 text-brand-blue border-t-brand-blue",
  },
  {
    eyebrow: "02 · Rescue",
    title: "Military and Specialized Rescue",
    detail:
      "Locate people at risk and coordinate complex rescue operations across affected areas.",
    icon: Shield,
    accent: "bg-emerald-50 text-emerald-700 border-t-emerald-600",
  },
  {
    eyebrow: "03 · Protect",
    title: "Fire and Emergency Response",
    detail:
      "Surface fire hazards, assess incident reports, and coordinate urgent on-the-ground response.",
    icon: Flame,
    accent: "bg-orange-50 text-orange-700 border-t-orange-600",
  },
];

export function ResponseTeamsSection() {
  return (
    <section id="response-teams" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-brand-blue">
              03 · Coordinated by people
            </p>
            <h2 className="mt-4 max-w-sm text-3xl font-semibold leading-tight text-text-primary sm:text-[2.2rem]">
              Different expertise. One response.
            </h2>
          </div>
          <p className="max-w-xs text-sm text-text-secondary">
            Give authorized teams a shared operational picture, without
            losing the context that matters to each role.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAMS.map((team) => (
            <div
              key={team.title}
              className={`rounded-[var(--radius-md)] border-t-[3px] p-6 ${team.accent}`}
            >
              <team.icon size={22} strokeWidth={1.75} />
              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-text-secondary">
                {team.eyebrow}
              </p>
              <p className="mt-1.5 text-lg font-medium text-text-primary">
                {team.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {team.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
