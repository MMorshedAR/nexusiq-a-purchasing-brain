export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={"inline-flex items-center gap-2 font-display font-semibold tracking-tight " + className}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 19V5l14 14V5" />
        </svg>
      </span>
      Nexus<span className="text-primary">IQ</span>
    </span>
  );
}
