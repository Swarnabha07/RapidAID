const STAGES = [
  {
    step: "01",
    title: "Report",
    headline: "Citizens submit emergency requests.",
    detail: "The first signal starts with a person.",
  },
  {
    step: "02",
    title: "Triage",
    headline: "AI helps classify requests and estimate urgency.",
    detail: "Decision support, not automated dispatch.",
  },
  {
    step: "03",
    title: "Synchronize",
    headline: "Reports saved offline synchronize when connectivity returns.",
    detail: "Saved locally. Sent when connected.",
  },
  {
    step: "04",
    title: "Respond",
    headline: "Authorized teams review, acknowledge, and coordinate incidents.",
    detail: "Human judgment at every critical step.",
  },
];

export function SignalToResponseSection() {
  return (
    <section id="how-it-works" className="bg-subtle py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-brand-blue">
              02 · From signal to response
            </p>
            <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight text-text-primary sm:text-[2.2rem]">
              A clear path from help to action.
            </h2>
          </div>
          <p className="max-w-xs text-sm text-text-secondary">
            Four connected stages. One shared mission.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STAGES.map((stage, i) => (
            <li key={stage.step} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-blue text-xs font-semibold text-white">
                  {stage.step}
                </span>
                {i < STAGES.length - 1 && (
                  <span className="hidden h-px flex-1 bg-black/10 lg:block" />
                )}
              </div>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-text-secondary">
                {stage.title}
              </p>
              <p className="mt-2 text-[15px] font-medium leading-snug text-text-primary">
                {stage.headline}
              </p>
              <p className="mt-1.5 text-sm text-text-secondary">{stage.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
