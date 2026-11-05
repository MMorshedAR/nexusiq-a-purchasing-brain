import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Cable, CircleOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/app/integrations")({
  head: () => ({ meta: [
    { title: "Integrations — NexusIQ" }, { name: "description", content: "Review available supply chain and commerce integrations." },
    { property: "og:title", content: "Integrations — NexusIQ" }, { property: "og:description", content: "Review available integrations." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Integrations,
});

const integrations = [
  { name: "Shopify", category: "Commerce", detail: "Product, order and inventory sync" },
  { name: "Accounting platforms", category: "Finance", detail: "Purchases, suppliers and accounting exports" },
  { name: "Commerce platforms", category: "Commerce", detail: "Catalog and order data exchange" },
  { name: "Custom API", category: "Developer tools", detail: "Connect your internal systems" },
];

function Integrations() {
  return <>
    <PageHeader title="Integrations" description="Connect external systems to your purchasing workspace." />
    <div className="flex items-center gap-3 border-y py-4 text-sm text-muted-foreground"><CircleOff className="h-4 w-4" />No external systems are connected to this workspace.</div>
    <div className="divide-y">
      {integrations.map((item) => <article key={item.name} className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted"><Cable className="h-4 w-4" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{item.name}</h2><Badge variant="outline">{item.category}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p></div></div>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">Not connected <ArrowUpRight className="h-4 w-4" /></span>
      </article>)}
    </div>
  </>;
}