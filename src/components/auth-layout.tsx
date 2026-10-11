import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="bg-hero relative hidden flex-col justify-between p-10 text-navy-foreground lg:flex">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <Link to="/" className="relative"><Logo className="text-lg" /></Link>
        <div className="relative">
          <p className="font-display text-3xl font-semibold leading-tight">Make every purchase a smarter decision.</p>
          <p className="mt-3 text-sidebar-foreground">Predict demand. Protect cash flow. Build a resilient supply chain.</p>
        </div>
        <p className="relative text-xs text-sidebar-foreground">Your company data is isolated to your workspace.</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block lg:hidden"><Logo /></Link>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
