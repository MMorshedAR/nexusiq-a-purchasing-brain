import { createFileRoute } from "@tanstack/react-router";
import { Check, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useWorkspace } from "@/lib/workspace";
import { plans } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/app/billing")({
  head: () => ({ meta: [
    { title: "Billing & Plans — NexusIQ" },
    { name: "description", content: "Review NexusIQ plans and current workspace settings." },
    { property: "og:title", content: "Billing & Plans — NexusIQ" }, { property: "og:description", content: "Review NexusIQ plans." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Billing,
});

function Billing() {
  const { company } = useWorkspace();
  return <>
    <PageHeader title="Billing & Plans" description="Plan information for your NexusIQ workspace." />
    <section className="flex flex-wrap items-center justify-between gap-4 border-y py-5">
      <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><CreditCard /></div><div><p className="text-sm text-muted-foreground">Workspace</p><p className="font-medium">{company?.name ?? "—"}</p></div></div>
      <Badge variant="outline">Billing actions unavailable</Badge>
    </section>
    <div className="mt-8 grid gap-0 divide-y border-y md:grid-cols-3 md:divide-x md:divide-y-0">
      {plans.map((plan) => <article key={plan.name} className="px-5 py-6 md:px-7">
        <h2 className="font-display text-lg font-semibold">{plan.name}</h2><p className="mt-3 font-display text-3xl font-semibold">৳{plan.price.toLocaleString("en-IN")}</p><p className="text-sm text-muted-foreground">per month</p>
        <ul className="mt-6 space-y-3 text-sm">{plan.items.map((item) => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>{item}</span></li>)}</ul>
        <p className="mt-7 border-t pt-4 text-xs text-muted-foreground">Plan information only. Payment and plan changes are not enabled.</p>
      </article>)}
    </div>
  </>;
}