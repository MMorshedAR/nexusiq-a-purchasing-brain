import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BrainCircuit, ShieldAlert, Wallet, TrendingUp, Truck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NexusIQ — Make Every Purchase a Smarter Decision" },
      { name: "description", content: "AI purchasing and supply chain intelligence for Bangladeshi wholesalers, importers, distributors and retailers." },
      { property: "og:title", content: "NexusIQ — Make Every Purchase a Smarter Decision" },
      { property: "og:description", content: "Predict demand. Protect cash flow. Build a resilient supply chain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: TrendingUp, title: "Demand forecasting", text: "Baseline forecasts from your own sales history, per product and warehouse." },
  { icon: Wallet, title: "Cash-aware purchasing", text: "Reorder plans that fit your monthly budget in Taka, ranked by impact." },
  { icon: Truck, title: "Supplier intelligence", text: "Lead-time reliability and risk scores for every supplier you buy from." },
  { icon: ShieldAlert, title: "Disruption lab", text: "Simulate port delays, price shocks and supplier failures before they hit." },
  { icon: Upload, title: "Import your data", text: "Bring products, stock and sales in from CSV or Excel in minutes." },
  { icon: BrainCircuit, title: "Explained decisions", text: "Every recommendation shows the numbers behind it. No black boxes." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <section className="bg-hero text-navy-foreground relative overflow-hidden">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo className="text-lg" />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-navy-foreground hover:bg-sidebar-accent hover:text-navy-foreground">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild><Link to="/register">Create company account</Link></Button>
          </nav>
        </header>
        <div className="relative mx-auto max-w-6xl px-6 pb-28 pt-20">
          <p className="mb-5 inline-block rounded-full border border-sidebar-border px-3 py-1 text-xs uppercase tracking-widest text-sidebar-primary">
            Built for Bangladesh · Priced in ৳
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] md:text-6xl">
            Make every purchase a smarter decision.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-sidebar-foreground">
            Predict demand. Protect cash flow. Build a resilient supply chain.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/register">Start your workspace <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline" className="border-sidebar-border bg-transparent text-navy-foreground hover:bg-sidebar-accent hover:text-navy-foreground">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl font-semibold">Not a POS. A purchasing brain.</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">NexusIQ sits on top of the data you already have and tells you what to buy, when, from whom, and what it does to your cash.</p>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-card p-6">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">© {2026} NexusIQ</footer>
    </div>
  );
}
