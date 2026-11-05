import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { riskBand, scoreSupplier } from "@/lib/intel";
import { formatBDT } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/supplier-intelligence")({
  head: () => ({ meta: [{ title: "Supplier Intelligence — NexusIQ" }, { name: "description", content: "Reliability and risk scores for every supplier." }, { property: "og:title", content: "Supplier Intelligence — NexusIQ" }, { property: "og:description", content: "Reliability and risk scores for every supplier." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SupplierIntel,
});

const bandCls = { low: "bg-success/10 text-success", medium: "bg-warning/20 text-warning-foreground", high: "bg-destructive/10 text-destructive", unknown: "bg-muted text-muted-foreground" };
const bandLabel = { low: "Low risk", medium: "Medium risk", high: "High risk", unknown: "Not enough data" };

function SupplierIntel() {
  const { company } = useWorkspace();
  const cur = company?.currency;
  const q = useQuery({
    queryKey: ["supplier-intel", company?.id], enabled: !!company,
    queryFn: async () => {
      const [s, po, p] = await Promise.all([
        supabase.from("suppliers").select("id, name, lead_time_days, country").eq("company_id", company!.id).order("name"),
        supabase.from("purchase_orders").select("supplier_id, order_date, expected_date, received_at, status, items:po_items(quantity, unit_cost)").eq("company_id", company!.id),
        supabase.from("products").select("id, supplier_id").eq("company_id", company!.id),
      ]);
      const totalProducts = p.data?.length ?? 0;
      return (s.data ?? []).map((sup) => {
        const orders = (po.data ?? []).filter((o) => o.supplier_id === sup.id).map((o) => ({
          ...o, value: o.items.reduce((a, i) => a + i.quantity * Number(i.unit_cost), 0),
        }));
        const products = (p.data ?? []).filter((x) => x.supplier_id === sup.id).length;
        return { ...sup, ...scoreSupplier(orders, sup.lead_time_days), products, dependency: totalProducts ? products / totalProducts : 0 };
      }).sort((a, b) => (b.spend - a.spend));
    },
  });
  const rows = q.data ?? [];

  return (
    <>
      <PageHeader title="Supplier Intelligence" description="Scores come from your received purchase orders: 60% on-time delivery, 40% lead-time accuracy." />
      {!q.isLoading && rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">No suppliers yet</h2>
          <Button asChild className="mt-4"><Link to="/app/suppliers">Add suppliers</Link></Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Supplier</TableHead><TableHead className="w-40">Score</TableHead><TableHead>Risk</TableHead>
              <TableHead className="text-right">On-time</TableHead><TableHead className="text-right">Lead time (promised / actual)</TableHead>
              <TableHead className="text-right">Orders received</TableHead><TableHead className="text-right">Spend</TableHead><TableHead className="text-right">Product dependency</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {q.isLoading && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows.map((r) => {
                const band = riskBand(r.score);
                return (
                  <TableRow key={r.id}>
                    <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.country}</div></TableCell>
                    <TableCell>{r.score === null ? <span className="text-xs text-muted-foreground">—</span> : <div className="flex items-center gap-2"><Progress value={r.score} className="h-1.5" /><span className="tabular text-sm">{r.score}</span></div>}</TableCell>
                    <TableCell><span className={"rounded-full px-2 py-0.5 text-xs font-medium " + bandCls[band]}>{bandLabel[band]}</span></TableCell>
                    <TableCell className="tabular text-right">{r.onTimeRate === null ? "—" : Math.round(r.onTimeRate * 100) + "%"}</TableCell>
                    <TableCell className="tabular text-right">{r.lead_time_days} d / {r.avgLead === null ? "—" : r.avgLead.toFixed(1) + " d"}</TableCell>
                    <TableCell className="tabular text-right">{r.received} / {r.total}</TableCell>
                    <TableCell className="tabular text-right">{formatBDT(r.spend, cur)}</TableCell>
                    <TableCell className={"tabular text-right " + (r.dependency > 0.4 ? "text-warning-foreground font-medium" : "")}>{r.products} ({Math.round(r.dependency * 100)}%)</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="border-t p-3 text-xs text-muted-foreground">Dependency above 40% of your catalogue on one supplier is flagged as concentration risk. Set an expected date on orders to measure on-time delivery.</p>
        </div>
      )}
    </>
  );
}
