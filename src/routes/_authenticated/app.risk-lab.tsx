import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { loadPlanning } from "@/lib/plan-data";
import { simulate } from "@/lib/intel";
import { formatBDT, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/risk-lab")({
  head: () => ({ meta: [{ title: "Risk & Disruption Lab — NexusIQ" }, { name: "description", content: "Simulate supplier delays, demand surges and price shocks." }, { property: "og:title", content: "Risk & Disruption Lab — NexusIQ" }, { property: "og:description", content: "Simulate supply chain disruptions." }] }),
  component: RiskLab,
});

const presets = [
  { label: "Chattogram port congestion", delayDays: 14, demandPct: 0, pricePct: 5 },
  { label: "Eid demand surge", delayDays: 0, demandPct: 60, pricePct: 0 },
  { label: "Taka depreciation", delayDays: 0, demandPct: 0, pricePct: 12 },
  { label: "Hartal / transport strike", delayDays: 5, demandPct: 10, pricePct: 3 },
];

function RiskLab() {
  const { company } = useWorkspace();
  const cur = company?.currency;
  const q = useQuery({ queryKey: ["planning", company?.id], enabled: !!company, queryFn: () => loadPlanning(company!.id) });
  const sup = useQuery({ queryKey: ["suppliers", company?.id, "options"], enabled: !!company, queryFn: async () => (await supabase.from("suppliers").select("id, name").eq("company_id", company!.id).order("name")).data ?? [] });
  const [s, setS] = useState({ delayDays: 7, supplierId: "all" as string, demandPct: 0, pricePct: 0, horizon: 30 });
  const res = useMemo(() => simulate(q.data?.rows ?? [], s), [q.data, s]);
  const byId = new Map((q.data?.rows ?? []).map((r) => [r.id, r]));
  const hit = res.rows.filter((r) => r.stockoutDays > 0 || r.extraCost > 0).sort((a, b) => b.lostRevenue - a.lostRevenue);
  const noDemand = (q.data?.rows ?? []).every((r) => !r.hasHistory);

  return (
    <>
      <PageHeader title="Risk & Disruption Lab" description="Test a scenario against today's stock and demand. Nothing is saved or changed." />
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map((p) => <Button key={p.label} size="sm" variant="outline" onClick={() => setS({ ...s, ...p })}>{p.label}</Button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-5 rounded-xl border bg-card p-5 shadow-card">
          <div className="space-y-1.5"><Label>Affected supplier</Label>
            <Select value={s.supplierId} onValueChange={(v) => setS({ ...s, supplierId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All suppliers</SelectItem>{sup.data?.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Knob label="Delivery delay" value={s.delayDays} max={60} unit=" days" onChange={(v) => setS({ ...s, delayDays: v })} />
          <Knob label="Demand change" value={s.demandPct} min={-50} max={150} unit="%" onChange={(v) => setS({ ...s, demandPct: v })} />
          <Knob label="Purchase price change" value={s.pricePct} min={0} max={50} unit="%" onChange={(v) => setS({ ...s, pricePct: v })} />
          <Knob label="Horizon" value={s.horizon} min={7} max={90} unit=" days" onChange={(v) => setS({ ...s, horizon: v })} />
        </div>
        <div className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Products that run out" value={formatNumber(res.atRisk)} tone={res.atRisk ? "text-destructive" : "text-success"} />
            <Stat label="Revenue at risk" value={formatBDT(res.lostRevenue, cur)} tone={res.lostRevenue ? "text-destructive" : ""} />
            <Stat label="Extra purchase cost" value={formatBDT(res.extraCost, cur)} tone={res.extraCost ? "text-warning-foreground" : ""} />
          </div>
          {noDemand && <p className="mt-3 rounded-lg bg-warning/15 p-3 text-sm text-warning-foreground">No sales history yet — import sales so the lab knows how fast stock moves.</p>}
          <div className="mt-4 overflow-x-auto rounded-xl border bg-card shadow-card">
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Cover now</TableHead><TableHead className="text-right">Stockout days</TableHead><TableHead className="text-right">Lost units</TableHead><TableHead className="text-right">Revenue at risk</TableHead><TableHead className="text-right">Extra cost</TableHead></TableRow></TableHeader>
              <TableBody>
                {hit.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No product is hurt by this scenario.</TableCell></TableRow>}
                {hit.slice(0, 50).map((r) => {
                  const p = byId.get(r.id)!;
                  return (
                    <TableRow key={r.id}>
                      <TableCell><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.supplier ?? "No supplier"}</div></TableCell>
                      <TableCell className="tabular text-right">{isFinite(r.coverDays) ? Math.floor(r.coverDays) + " d" : "—"}</TableCell>
                      <TableCell className="tabular text-right text-destructive">{r.stockoutDays}</TableCell>
                      <TableCell className="tabular text-right">{formatNumber(r.lostUnits)}</TableCell>
                      <TableCell className="tabular text-right">{formatBDT(r.lostRevenue, cur)}</TableCell>
                      <TableCell className="tabular text-right">{formatBDT(r.extraCost, cur)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Method: demand × (1 + change); affected lead time + delay; days the on-hand stock can't cover within the horizon count as stockout days.</p>
        </div>
      </div>
    </>
  );
}

function Knob({ label, value, min = 0, max, unit, onChange }: { label: string; value: number; min?: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm"><Label>{label}</Label><span className="tabular">{value > 0 && unit === "%" ? "+" : ""}{value}{unit}</span></div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0] ?? 0)} aria-label={label} />
    </div>
  );
}
function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-xs text-muted-foreground">{label}</div><div className={"tabular mt-2 text-xl font-medium " + tone}>{value}</div></div>;
}
