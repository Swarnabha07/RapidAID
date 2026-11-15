export function CitizenFooter() {
  return (
    <footer className="border-t border-black/8 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-5 py-6 text-[12.5px] text-text-secondary sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-blue text-[11px] font-bold text-white">
            +
          </span>
          <span className="font-medium text-text-primary">RapidAID</span>
          <span className="hidden text-text-secondary/70 sm:inline">
            · Built to help communities respond faster.
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-text-primary">
            Privacy
          </a>
          <a href="#" className="hover:text-text-primary">
            Accessibility
          </a>
          <a href="#" className="hover:text-text-primary">
            Help
          </a>
        </div>
      </div>
    </footer>
  );
}
