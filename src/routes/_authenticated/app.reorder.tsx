import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { loadPlanning, ORDER_COST, HOLDING_RATE } from "@/lib/plan-data";
import { allocateBudget } from "@/lib/planning";
import { formatBDT, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/reorder")({
  head: () => ({ meta: [{ title: "Smart Reorder Planner — NexusIQ" }, { name: "description", content: "Budget-aware reorder recommendations." }, { property: "og:title", content: "Smart Reorder Planner — NexusIQ" }, { property: "og:description", content: "Budget-aware reorder recommendations." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Planner,
});

function Planner() {
  const { company, canEdit } = useWorkspace();
  const cur = company?.currency;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["planning", company?.id], enabled: !!company, queryFn: () => loadPlanning(company!.id) });
  const [budgetStr, setBudgetStr] = useState<string | null>(null);
  const budget = Number(budgetStr ?? company?.monthly_budget ?? 0);
  const [warehouse, setWarehouse] = useState<string>("");
  const wh = warehouse || q.data?.warehouses[0]?.id || "";

  const needs = useMemo(() => (q.data?.rows ?? []).filter((r) => r.suggested > 0), [q.data]);
  const alloc = useMemo(() => allocateBudget(needs.map((r) => ({ id: r.id, qty: r.suggested, unitCost: r.unitCost, priority: r.priority })), budget > 0 ? budget : Infinity), [needs, budget]);
  const byId = new Map(alloc.allocations.map((a) => [a.id, a]));
  const ordered = alloc.allocations.map((a) => needs.find((n) => n.id === a.id)!);
  const totalNeed = needs.reduce((s, r) => s + r.suggested * r.unitCost, 0);
  const funded = ordered.filter((r) => (byId.get(r.id)?.fundedQty ?? 0) > 0);

  const create = useMutation({
    mutationFn: async () => {
      const groups = new Map<string, typeof funded>();
      for (const r of funded) { const k = r.supplierId ?? "none"; groups.set(k, [...(groups.get(k) ?? []), r]); }
      const { data: { user } } = await supabase.auth.getUser();
      const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      let n = 0;
      for (const [sup, items] of groups) {
        n++;
        const { data: po, error } = await supabase.from("purchase_orders").insert({
          company_id: company!.id, po_number: `PO-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          supplier_id: sup === "none" ? null : sup, warehouse_id: wh || null, created_by: user?.id ?? null, notes: "Created from Smart Reorder Planner",
        }).select("id").single();
        if (error) throw error;
        const { error: e2 } = await supabase.from("po_items").insert(items.map((r) => ({ company_id: company!.id, po_id: po.id, product_id: r.id, quantity: byId.get(r.id)!.fundedQty, unit_cost: r.unitCost })));
        if (e2) throw e2;
      }
      return n;
    },
    onSuccess: (n) => { toast.success(`${n} draft purchase order${n > 1 ? "s" : ""} created`); qc.invalidateQueries({ queryKey: ["pos"] }); navigate({ to: "/app/purchase-orders" }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Smart Reorder Planner" description="What to buy now, ranked by stockout urgency and fitted to your budget." />
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <Label htmlFor="budget" className="text-xs text-muted-foreground">Purchasing budget ({cur})</Label>
          <Input id="budget" type="number" min={0} value={budgetStr ?? String(company?.monthly_budget ?? "")} placeholder="No limit" onChange={(e) => setBudgetStr(e.target.value)} className="tabular mt-1" />
        </div>
        <Stat label="Total needed" value={formatBDT(totalNeed, cur)} />
        <Stat label="Funded within budget" value={formatBDT(alloc.spent, cur)} tone="text-success" />
        <Stat label="Deferred" value={formatBDT(Math.max(0, totalNeed - alloc.spent), cur)} tone={totalNeed > alloc.spent ? "text-warning" : ""} />
      </div>

      {!q.isLoading && needs.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Nothing to reorder right now</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Every product's stock (plus approved orders on the way) is above its reorder point. Import sales history for sharper reorder points.</p>
          <Button asChild variant="outline" className="mt-5"><Link to="/app/import">Import sales</Link></Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <TooltipProvider>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead><TableHead>Supplier</TableHead>
                <TableHead className="text-right">On hand</TableHead><TableHead className="text-right">On order</TableHead>
                <TableHead className="text-right">Reorder pt</TableHead><TableHead className="text-right">Suggested</TableHead>
                <TableHead className="text-right">Funded</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="w-8" />
              </TableRow></TableHeader>
              <TableBody>
                {q.isLoading && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Calculating…</TableCell></TableRow>}
                {ordered.map((r) => {
                  const a = byId.get(r.id)!;
                  return (
                    <TableRow key={r.id}>
                      <TableCell><div className="font-medium">{r.name}</div><div className="tabular text-xs text-muted-foreground">{r.sku}</div></TableCell>
                      <TableCell className="text-sm">{r.supplier ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="tabular text-right">{formatNumber(r.onHand)}</TableCell>
                      <TableCell className="tabular text-right">{formatNumber(r.onOrder)}</TableCell>
                      <TableCell className="tabular text-right">{formatNumber(r.rop)}</TableCell>
                      <TableCell className="tabular text-right">{formatNumber(r.suggested)}</TableCell>
                      <TableCell className={"tabular text-right font-medium " + (a.deferredQty ? "text-warning-foreground" : "text-success")}>{formatNumber(a.fundedQty)}</TableCell>
                      <TableCell className="tabular text-right">{formatBDT(a.cost, cur)}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger aria-label="Why this recommendation"><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs leading-relaxed">
                            {r.hasHistory
                              ? <>Avg demand {r.avgDaily.toFixed(1)}/day (σ {r.sd.toFixed(1)}) over {r.leadDays}-day lead time → safety stock {r.ss}, reorder point {r.rop}. </>
                              : <>No sales history — using your manual reorder point {r.rop}. </>}
                            Stock position {r.onHand + r.onOrder} ≤ {r.rop}, so order up to reorder point + 30 days of demand{r.eoq ? ` (at least EOQ ${r.eoq})` : ""}.
                            {a.deferredQty > 0 && <> Budget covers {a.fundedQty} of {r.suggested}; {a.deferredQty} deferred.</>}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
          <div className="flex flex-wrap items-center gap-3 border-t p-4">
            <p className="mr-auto text-xs text-muted-foreground">Assumptions: {formatBDT(ORDER_COST, cur)} per order, holding cost {HOLDING_RATE * 100}% of unit cost per year, 95% service level.</p>
            {canEdit && (
              <>
                <Select value={wh} onValueChange={setWarehouse}>
                  <SelectTrigger className="w-48" aria-label="Receiving warehouse"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                  <SelectContent>{q.data?.warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button disabled={!funded.length || create.isPending} onClick={() => create.mutate()}>
                  {create.isPending && <Loader2 className="animate-spin" />} Create draft POs ({funded.length})
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-xs text-muted-foreground">{label}</div><div className={"tabular mt-2 text-xl font-medium " + tone}>{value}</div></div>;
}
