const PROBLEMS = [
  {
    title: "Unstable internet connectivity",
    detail: "The moment a network drops, help should not.",
  },
  {
    title: "Delayed emergency reporting",
    detail: "Critical information needs a path to responders.",
  },
  {
    title: "Disconnected response teams",
    detail: "Shared awareness makes coordinated action possible.",
  },
  {
    title: "Difficulty identifying urgent cases",
    detail: "Urgency signals help teams focus their attention.",
  },
];

export function CriticalGapSection() {
  return (
    <section id="platform" className="bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-xs font-medium text-brand-blue">01 · The critical gap</p>
          <h2 className="mt-4 max-w-sm text-3xl font-semibold leading-tight text-text-primary sm:text-[2.2rem]">
            When infrastructure fails, communication matters most.
          </h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-text-secondary">
            A crisis does not wait for a stable connection. The tools we rely
            on must work when everything else does not.
          </p>
          <p className="mt-6 max-w-sm text-lg font-medium leading-snug text-text-primary">
            One connected response.
            <br />
            Even in a disconnected world.
          </p>
        </div>

        <div>
          <ul className="divide-y divide-black/8 border-t border-black/8">
            {PROBLEMS.map((item, i) => (
              <li key={item.title} className="flex gap-4 py-5">
                <span className="pt-0.5 text-sm text-text-secondary/60">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[15px] font-medium text-text-primary">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-[var(--radius-md)] bg-brand-blue/8 px-4 py-3 text-sm text-brand-blue">
            RapidAID keeps reports moving. People stay in control.
          </p>
        </div>
      </div>
    </section>
  );
}
