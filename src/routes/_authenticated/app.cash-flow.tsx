import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, Bar, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";
import { loadPlanning } from "@/lib/plan-data";
import { projectCash, type CashOut } from "@/lib/intel";
import { formatBDT } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/app/cash-flow")({
  head: () => ({ meta: [{ title: "Cash Flow Optimizer — NexusIQ" }, { name: "description", content: "12-week cash projection from forecast sales and purchase orders." }, { property: "og:title", content: "Cash Flow Optimizer — NexusIQ" }, { property: "og:description", content: "12-week cash projection." }] }),
  component: CashFlow,
});

function CashFlow() {
  const { company } = useWorkspace();
  const cur = company?.currency;
  const plan = useQuery({ queryKey: ["planning", company?.id], enabled: !!company, queryFn: () => loadPlanning(company!.id) });
  const pos = useQuery({
    queryKey: ["pos-open", company?.id], enabled: !!company,
    queryFn: async () => (await supabase.from("purchase_orders").select("po_number, status, order_date, expected_date, items:po_items(quantity, unit_cost)").eq("company_id", company!.id).in("status", ["draft", "approved"])).data ?? [],
  });
  const [openingStr, setOpening] = useState("");
  const opening = Number(openingStr || company?.monthly_budget || 0);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [includePlan, setIncludePlan] = useState(false);

  const weeklyInflow = (plan.data?.rows ?? []).reduce((a, r) => a + (r.forecast30 / 30) * 7 * r.sellPrice, 0);
  const outflows = useMemo<CashOut[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const list: CashOut[] = (pos.data ?? []).filter((p) => includeDrafts || p.status === "approved").map((p) => ({
      date: p.expected_date ?? p.order_date ?? today, label: p.po_number,
      amount: p.items.reduce((a, i) => a + i.quantity * Number(i.unit_cost), 0),
    }));
    if (includePlan) {
      const planned = (plan.data?.rows ?? []).reduce((a, r) => a + r.suggested * r.unitCost, 0);
      if (planned) list.push({ date: today, amount: planned, label: "Reorder plan" });
    }
    return list;
  }, [pos.data, plan.data, includeDrafts, includePlan]);
  const data = projectCash(opening, weeklyInflow, outflows, 12, new Date());
  const low = data.reduce((m, d) => (d.balance < m.balance ? d : m), data[0] ?? { balance: 0, label: "", week: 0 });

  return (
    <>
      <PageHeader title="Cash Flow Optimizer" description="12 weeks ahead: forecast sales revenue in, purchase orders out on their expected date." />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <Label htmlFor="open" className="text-xs text-muted-foreground">Cash available today ({cur})</Label>
          <Input id="open" type="number" className="tabular mt-1" value={openingStr} placeholder={String(company?.monthly_budget ?? 0)} onChange={(e) => setOpening(e.target.value)} />
        </div>
        <Stat label="Forecast inflow / week" value={formatBDT(weeklyInflow, cur)} />
        <Stat label="Committed outflows" value={formatBDT(outflows.reduce((a, o) => a + o.amount, 0), cur)} />
        <Stat label={`Lowest balance (wk ${low.week})`} value={formatBDT(low.balance, cur)} tone={low.balance < 0 ? "text-destructive" : "text-success"} />
      </div>
      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><Switch checked={includeDrafts} onCheckedChange={setIncludeDrafts} /> Include draft POs</label>
        <label className="flex items-center gap-2"><Switch checked={includePlan} onCheckedChange={setIncludePlan} /> Include current reorder plan</label>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-card">
        <div className="h-80">
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} width={90} tickFormatter={(v) => formatBDT(v, cur)} />
              <Tooltip formatter={(v: number) => formatBDT(v, cur)} />
              <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="4 4" />
              <Bar dataKey="outflow" name="Outflow" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
              <Area dataKey="balance" name="Balance" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {low.balance < 0
          ? <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Cash goes negative in week {low.week}. Lower the budget in the Reorder Planner, or push non-urgent orders later.</p>
          : <p className="mt-3 text-sm text-muted-foreground">Cash stays positive across all 12 weeks under these settings.</p>}
        <p className="mt-2 text-xs text-muted-foreground">Inflow assumes forecast units are sold at your listed sell price and paid the same week. Orders without an expected date are counted on their order date.</p>
      </div>
    </>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-xl border bg-card p-4 shadow-card"><div className="text-xs text-muted-foreground">{label}</div><div className={"tabular mt-2 text-xl font-medium " + tone}>{value}</div></div>;
}
