import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWorkspace } from "@/lib/workspace";
import { loadPlanning, HISTORY_DAYS } from "@/lib/plan-data";
import { formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/forecasts")({
  head: () => ({ meta: [{ title: "Demand Forecasts — NexusIQ" }, { name: "description", content: "30-day demand forecasts from your sales history." }, { property: "og:title", content: "Demand Forecasts — NexusIQ" }, { property: "og:description", content: "30-day demand forecasts from your sales history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Forecasts,
});

function Forecasts() {
  const { company } = useWorkspace();
  const q = useQuery({ queryKey: ["planning", company?.id], enabled: !!company, queryFn: () => loadPlanning(company!.id) });
  const [sel, setSel] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const rows = (q.data?.rows ?? []).filter((r) => !search || (r.name + r.sku).toLowerCase().includes(search.toLowerCase()));
  const withHistory = (q.data?.rows ?? []).filter((r) => r.hasHistory);
  const current = (q.data?.rows ?? []).find((r) => r.id === sel) ?? withHistory[0] ?? null;

  const chart = useMemo(() => {
    if (!current) return [];
    const today = Date.now();
    const hist = current.series.map((v, i) => ({ day: new Date(today - (HISTORY_DAYS - 1 - i) * 86400000).toISOString().slice(5, 10), actual: v }));
    const fc = current.forecastDaily.map((v, i) => ({ day: new Date(today + (i + 1) * 86400000).toISOString().slice(5, 10), forecast: Math.round(v * 10) / 10 }));
    return [...hist, ...fc];
  }, [current]);

  return (
    <>
      <PageHeader title="Demand Forecasts" description={`Baseline: 28-day moving average adjusted by the ${HISTORY_DAYS}-day trend.`} />
      {!q.isLoading && withHistory.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">No sales history yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Forecasts need daily sales per product. Import a sales file with date, SKU and quantity.</p>
          <Button asChild className="mt-5"><Link to="/app/import">Import sales history</Link></Button>
        </div>
      ) : current && (
        <div className="mb-6 rounded-xl border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">{current.name} <span className="tabular text-xs text-muted-foreground">{current.sku}</span></h2>
            <p className="text-sm text-muted-foreground">Next 30 days: <b className="tabular text-foreground">{formatNumber(Math.round(current.forecast30))}</b> units</p>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} interval={14} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip />
                <Area dataKey="actual" name="Actual" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.12} />
                <Line dataKey="forecast" name="Forecast" stroke="var(--chart-1)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <Input placeholder="Search product…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3 max-w-xs bg-card" />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Product</TableHead><TableHead className="text-right">Avg / day</TableHead><TableHead className="text-right">Variability (σ)</TableHead>
            <TableHead>Trend</TableHead><TableHead className="text-right">30-day forecast</TableHead><TableHead className="text-right">Days of cover</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id} onClick={() => setSel(r.id)} className={"cursor-pointer " + (current?.id === r.id ? "bg-accent/50" : "")}>
                <TableCell><div className="font-medium">{r.name}</div><div className="tabular text-xs text-muted-foreground">{r.sku}</div></TableCell>
                {r.hasHistory ? (
                  <>
                    <TableCell className="tabular text-right">{r.avgDaily.toFixed(1)}</TableCell>
                    <TableCell className="tabular text-right">{r.sd.toFixed(1)}</TableCell>
                    <TableCell><Trend slope={r.slope} /></TableCell>
                    <TableCell className="tabular text-right font-medium">{formatNumber(Math.round(r.forecast30))}</TableCell>
                    <TableCell className="tabular text-right">{r.daysCover === null ? "—" : Math.floor(r.daysCover) + " d"}</TableCell>
                  </>
                ) : <TableCell colSpan={5} className="text-sm text-muted-foreground">No sales in the last {HISTORY_DAYS} days</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function Trend({ slope }: { slope: number }) {
  if (Math.abs(slope) < 0.01) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" />Flat</span>;
  return slope > 0
    ? <span className="inline-flex items-center gap-1 text-xs text-success"><TrendingUp className="h-3 w-3" />Rising</span>
    : <span className="inline-flex items-center gap-1 text-xs text-destructive"><TrendingDown className="h-3 w-3" />Falling</span>;
}
