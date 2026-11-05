import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, MailQuestion } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/app/help")({
  head: () => ({ meta: [
    { title: "Help — NexusIQ" }, { name: "description", content: "Find help with the NexusIQ purchasing and inventory workspace." },
    { property: "og:title", content: "Help — NexusIQ" }, { property: "og:description", content: "Find help with NexusIQ." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Help,
});

const guides = [
  { title: "Set up your catalogue", text: "Add products, supplier details, costs and replenishment settings.", to: "/app/products", label: "Products" },
  { title: "Track inventory", text: "Create warehouses and update each product’s available stock.", to: "/app/inventory", label: "Inventory" },
  { title: "Import workspace data", text: "Map columns and validate CSV or Excel data before importing.", to: "/app/import", label: "Data import" },
  { title: "Plan replenishment", text: "Review demand forecasts, stock cover and suggested order quantities.", to: "/app/reorder", label: "Reorder planner" },
];

function Help() {
  return <>
    <PageHeader title="Help" description="Guidance for day-to-day purchasing and inventory work." />
    <div className="flex items-center gap-3 border-y py-5"><div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary"><BookOpen /></div><div><h2 className="font-medium">Getting started</h2><p className="mt-1 text-sm text-muted-foreground">Use real workspace records throughout NexusIQ; empty reports reflect data that has not been added yet.</p></div></div>
    <div className="divide-y">{guides.map((guide) => <Link key={guide.title} to={guide.to} className="flex items-center justify-between gap-4 py-5 transition-colors hover:text-primary"><div><h3 className="font-medium">{guide.title}</h3><p className="mt-1 text-sm text-muted-foreground">{guide.text}</p></div><span className="flex shrink-0 items-center gap-2 text-sm">{guide.label}<ArrowRight className="h-4 w-4" /></span></Link>)}</div>
    <div className="mt-8 flex items-center gap-3 border-t pt-5 text-sm text-muted-foreground"><MailQuestion className="h-4 w-4" />Support contact is not configured for this workspace.</div>
  </>;
}