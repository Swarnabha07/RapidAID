const COLUMNS = [
  {
    heading: "Platform",
    links: ["How It Works", "Response Teams"],
  },
  {
    heading: "Trust",
    links: ["Privacy & Security", "Responsible AI"],
  },
  {
    heading: "Get in touch",
    links: ["Contact", "Sign In"],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-teal text-[13px] font-bold text-white">
                +
              </span>
              <span className="text-sm font-semibold text-text-primary">
                RapidAID
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Resilient connections.
              <br />
              Coordinated response.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-sm font-medium text-text-primary">{col.heading}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-text-secondary hover:text-text-primary"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-black/8 pt-6">
          <p className="text-xs leading-relaxed text-text-secondary/80">
            RapidAID supports emergency reporting and coordination.
            AI-generated urgency estimates are decision-support signals, not
            medical diagnoses or autonomous dispatch decisions.
          </p>
          <div className="mt-4 flex flex-col gap-2 text-xs text-text-secondary/70 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 RapidAID</span>
            <span>Designed for resilience.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
