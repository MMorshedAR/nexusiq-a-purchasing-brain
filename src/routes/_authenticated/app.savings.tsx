import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { loadPlanning } from "@/lib/plan-data";
import { formatBDT, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/savings")({
  head: () => ({ meta: [{ title: "Savings & Impact — NexusIQ" }, { name: "description", content: "Cash tied up in overstock, revenue at risk and planner-driven purchasing." }, { property: "og:title", content: "Savings & Impact — NexusIQ" }, { property: "og:description", content: "Financial impact of your purchasing." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Savings,
});

const OVERSTOCK_DAYS = 90;

function Savings() {
  const { company } = useWorkspace();
  const cur = company?.currency;
  const plan = useQuery({ queryKey: ["planning", company?.id], enabled: !!company, queryFn: () => loadPlanning(company!.id) });
  const pos = useQuery({
    queryKey: ["pos-impact", company?.id], enabled: !!company,
    queryFn: async () => (await supabase.from("purchase_orders").select("status, notes, items:po_items(quantity, unit_cost)").eq("company_id", company!.id)).data ?? [],
  });
  const rows = plan.data?.rows ?? [];
  const over = rows.filter((r) => r.hasHistory && r.avgDaily > 0).map((r) => {
    const excess = Math.max(0, r.onHand - (r.rop + r.avgDaily * OVERSTOCK_DAYS));
    return { ...r, excess, tied: excess * r.unitCost };
  }).filter((r) => r.excess > 0).sort((a, b) => b.tied - a.tied);
  const tied = over.reduce((a, r) => a + r.tied, 0);
  const atRisk = rows.filter((r) => r.hasHistory && r.daysCover !== null && r.daysCover < r.leadDays)
    .reduce((a, r) => a + Math.max(0, r.leadDays - (r.daysCover ?? 0)) * r.avgDaily * r.sellPrice, 0);
  const val = (p: any) => p.items.reduce((a: number, i: any) => a + i.quantity * Number(i.unit_cost), 0);
  const plannerPOs = (pos.data ?? []).filter((p) => p.notes?.includes("Smart Reorder Planner") && p.status !== "cancelled");
  const received = (pos.data ?? []).filter((p) => p.status === "received");

  return (
    <>
      <PageHeader title="Savings & Impact" description="Measured from your data today. These are estimates, not booked savings." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Cash tied in overstock (>${OVERSTOCK_DAYS}d cover)`} value={formatBDT(tied, cur)} tone={tied ? "text-warning-foreground" : ""} />
        <Stat label="Revenue at risk before next delivery" value={formatBDT(atRisk, cur)} tone={atRisk ? "text-destructive" : ""} />
        <Stat label="Purchases guided by planner" value={`${plannerPOs.length} · ${formatBDT(plannerPOs.reduce((a, p) => a + val(p), 0), cur)}`} />
        <Stat label="Orders received" value={`${received.length} · ${formatBDT(received.reduce((a, p) => a + val(p), 0), cur)}`} tone="text-success" />
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Where cash is tied up</h2>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">On hand</TableHead><TableHead className="text-right">Days of cover</TableHead><TableHead className="text-right">Excess units</TableHead><TableHead className="text-right">Cash freed if cleared</TableHead></TableRow></TableHeader>
          <TableBody>
            {over.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{rows.some((r) => r.hasHistory) ? "No overstock — nice." : "Import sales history to measure overstock."}</TableCell></TableRow>}
            {over.slice(0, 25).map((r) => (
              <TableRow key={r.id}>
                <TableCell><div className="font-medium">{r.name}</div><div className="tabular text-xs text-muted-foreground">{r.sku}</div></TableCell>
                <TableCell className="tabular text-right">{formatNumber(r.onHand)}</TableCell>
                <TableCell className="tabular text-right">{Math.floor(r.daysCover ?? 0)} d</TableCell>
                <TableCell className="tabular text-right">{formatNumber(Math.round(r.excess))}</TableCell>
                <TableCell className="tabular text-right font-medium">{formatBDT(r.tied, cur)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Overstock = on hand beyond reorder point + {OVERSTOCK_DAYS} days of average demand, valued at unit cost.</p>
    </>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-xs text-muted-foreground">{label}</div><div className={"tabular mt-2 text-lg font-medium " + tone}>{value}</div></div>;
}
